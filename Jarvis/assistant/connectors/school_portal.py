"""King's Hall School Portal connector using Playwright browser automation."""

from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from playwright.async_api import BrowserContext, Page, async_playwright

from assistant.core.config import Config

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


@dataclass
class SchoolEvent:
    title: str
    date: str
    time: str = ""
    location: str = ""
    description: str = ""
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class Newsletter:
    title: str
    term: str = ""
    date: str = ""
    url: str = ""
    description: str = ""
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class PortalData:
    events: list[SchoolEvent] = field(default_factory=list)
    notices: list[dict[str, Any]] = field(default_factory=list)
    calendar_items: list[dict[str, Any]] = field(default_factory=list)
    children: list[str] = field(default_factory=list)
    newsletters: list[Newsletter] = field(default_factory=list)
    fetched_at: str = field(default_factory=lambda: datetime.now().isoformat())


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_SLOW_MO_MS = 400  # ms between actions so a human can follow along


async def _login(page: Page, url: str, username: str, password: str) -> None:
    """Navigate to the portal and log in."""
    await page.goto(url, wait_until="domcontentloaded", timeout=60_000)

    # Step 1 – enter username / email and click Continue
    await page.wait_for_selector("input[type='text'], input[type='email']", timeout=15_000)

    username_input = page.locator(
        "input[type='text'], input[type='email'], input[name*='user'], input[name*='email']"
    ).first
    await username_input.fill(username)

    # Click the Continue / Next button
    continue_btn = page.locator(
        "button:has-text('Continue'), button:has-text('Next'), input[type='submit']"
    ).first
    await continue_btn.click()

    # Step 2 – password field appears after Continue (two-step SPA login)
    await page.wait_for_selector("input[type='password']", timeout=12_000)
    await page.locator("input[type='password']").fill(password)
    sign_in_btn = page.locator(
        "button:has-text('Sign in'), button:has-text('Login'), input[type='submit']"
    ).first
    await sign_in_btn.click()

    # SPAs never reach "networkidle"; wait for the URL to change away from the
    # login page, then give the dashboard a moment to render.
    try:
        await page.wait_for_url(
            lambda u: "login" not in u.lower() and "signin" not in u.lower(),
            timeout=20_000,
        )
    except Exception:
        # If URL doesn't change (e.g. token-based SPA that stays at "/"),
        # fall back to waiting for the login form to disappear.
        try:
            await page.wait_for_selector(
                "input[type='password']",
                state="hidden",
                timeout=15_000,
            )
        except Exception:
            pass

    # Give the dashboard widgets time to render
    await page.wait_for_timeout(2_500)


# ---------------------------------------------------------------------------
# Scrapers for individual portal sections
# ---------------------------------------------------------------------------


async def _scrape_children(page: Page) -> list[str]:
    """Extract children names from the My Children sidebar widget on the dashboard."""
    raw: list[str] = await page.evaluate(
        """() => {
            const out = [];
            const headings = [...document.querySelectorAll('h2, h3, h4, .panel-title, [class*="title"]')];
            for (const h of headings) {
                if (!h.innerText?.includes('Children')) continue;
                const container = h.closest('[class*="panel"], [class*="widget"], [class*="card"], section, div') ?? h.parentElement;
                if (!container) continue;
                for (const a of container.querySelectorAll('a, [class*="name"]')) {
                    const t = a.innerText?.trim();
                    if (t && t.length > 3 && !['View Details','My Children','Event Bookings','Wellbeing'].includes(t)) {
                        out.push(t);
                    }
                }
            }
            if (out.length === 0) {
                for (const el of document.querySelectorAll('[class*="student-name"], [class*="child-name"], [class*="pupil-name"]')) {
                    const t = el.innerText?.trim();
                    if (t) out.push(t);
                }
            }
            return [...new Set(out)];
        }"""
    )
    return raw


async def _switch_to_term_view(page: Page, screenshot_dir: str | None) -> None:
    """
    Switch the calendar view to Term.

    The portal uses Bootstrap Select wrapping a hidden <select class="change_view">.
    We set its value directly and fire a 'change' event — no dropdown clicking needed.
    """
    # Directly set the underlying <select> to "term" and trigger the change event
    # so the Bootstrap-Select widget and the SPA both react to it.
    changed = await page.evaluate(
        """() => {
            const sel = document.querySelector('select.change_view');
            if (!sel) return false;
            sel.value = 'term';
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }"""
    )

    if changed:
        print("[school_portal] Switched to Term view via select element.")
        await page.wait_for_timeout(3_000)

        # The portal may default to the earliest term; advance forward until we
        # reach a term that contains the current date or is in the future.
        from datetime import date as _date
        today_year = _date.today().year
        today_month = _date.today().month

        for _ in range(6):  # at most 6 term advances (2 years forward)
            heading = await page.locator("h4.interval-title, .interval-title, [class*='interval']").first.text_content()
            heading = (heading or "").strip()
            print(f"[school_portal] Current term: {heading}")
            # Heading is like "Summer (2025 / 2026)" — extract the last year
            years = re.findall(r"\d{4}", heading)
            last_year = int(years[-1]) if years else 0
            # Stop when we reach the academic year that contains today
            # Academic year containing today = today's year if month >= 9, else today's year - 1
            current_acad_year = today_year if today_month >= 9 else today_year - 1
            if last_year >= current_acad_year + 1:  # we've reached current or future term
                break
            # Click the ">" next-term arrow — find the button that sits to the
            # RIGHT of the interval title heading using bounding boxes.
            advanced = await page.evaluate(
                """() => {
                    const heading = document.querySelector(
                        '.interval-title, [class*="interval-title"], h4.interval-title'
                    );
                    if (!heading) return false;
                    const hr = heading.getBoundingClientRect();
                    // Walk all buttons on the page; pick the one closest to the
                    // right of the heading (within 200px horizontal, same vertical band)
                    let best = null, bestDist = Infinity;
                    for (const btn of document.querySelectorAll('button, a[role="button"]')) {
                        const br = btn.getBoundingClientRect();
                        if (br.width === 0 || br.height === 0) continue;
                        // Must be to the right and at a similar vertical position
                        if (br.left > hr.right - 10 && Math.abs(br.top - hr.top) < 60) {
                            const dist = br.left - hr.right;
                            if (dist < bestDist) { bestDist = dist; best = btn; }
                        }
                    }
                    if (best) { best.click(); return true; }
                    return false;
                }"""
            )
            if not advanced:
                print("[school_portal] Could not find next-term button, stopping.")
                break
            await page.wait_for_timeout(2_000)
    else:
        # Fallback: open the dropdown visually and click the Term option
        print("[school_portal] select.change_view not found, trying visual click ...")
        view_btn = page.locator(
            "button.dropdown-toggle:has-text('Week'), "
            "button.dropdown-toggle:has-text('Month'), "
            "button.dropdown-toggle:has-text('Day')"
        ).first
        if await view_btn.count() > 0:
            await view_btn.click()
            await page.wait_for_timeout(500)
            if screenshot_dir:
                await page.screenshot(
                    path=f"{screenshot_dir}/03_dropdown_open.png", full_page=True
                )
            # Click the Term <a> option inside the open dropdown
            await page.locator(
                "a.dropdown-item[role='option'] span.text:text-is('Term'), "
                "a[role='option']:has-text('Term')"
            ).first.click()
            await page.wait_for_timeout(3_000)


async def _fetch_events_via_api(
    page: Page, base_url: str
) -> list[SchoolEvent]:
    """
    Fetch events directly from the portal's JSON API using the authenticated
    browser session.  The API endpoint is:
        GET /api/calendarEntrys?minStartDate=YYYY-MM-DD&maxStartDate=YYYY-MM-DD

    We query three windows:
    1. Current academic year (Sep → Aug)
    2. Next academic year (in case the current one has no data)
    3. Previous academic year (as a fallback)
    """
    from datetime import date as _date

    today = _date.today()
    # Academic year start: September
    if today.month >= 9:
        acad_start_year = today.year
    else:
        acad_start_year = today.year - 1

    windows = [
        (f"{acad_start_year}-09-01", f"{acad_start_year + 1}-08-31"),        # current
        (f"{acad_start_year + 1}-09-01", f"{acad_start_year + 2}-08-31"),    # next
        (f"{acad_start_year - 1}-09-01", f"{acad_start_year}-08-31"),        # previous
    ]

    all_raw: list[dict] = []
    for min_date, max_date in windows:
        api_url = (
            f"{base_url}/api/calendarEntrys"
            f"?minStartDate={min_date}&maxStartDate={max_date}"
        )
        # Use the browser's fetch() so session cookies are included automatically
        try:
            data = await page.evaluate(
                """async (url) => {
                    const resp = await fetch(url, { credentials: 'include' });
                    if (!resp.ok) return null;
                    return await resp.json();
                }""",
                api_url,
            )
        except Exception:
            data = None

        if data and isinstance(data, dict):
            entries = data.get("data", [])
            if entries:
                print(
                    f"[school_portal]   API {min_date}..{max_date}: "
                    f"{len(entries)} entries"
                )
                all_raw.extend(entries)
                break  # found data — no need to check other windows

    events: list[SchoolEvent] = []
    seen: set[str] = set()

    for entry in all_raw:
        try:
            attrs = entry.get("attributes", {})
            title = attrs.get("name", "").strip()
            if not title:
                title = (attrs.get("title") or "").strip()
            # The API uses ISO8601 "start" / "end" fields
            start_iso: str = attrs.get("start") or attrs.get("startDate") or attrs.get("start_date") or ""
            end_iso: str = attrs.get("end") or attrs.get("endDate") or attrs.get("end_date") or ""
            # Split date and time from ISO string (e.g. "2025-09-06T12:00:00Z")
            start_date = start_iso[:10] if start_iso else ""
            start_time = start_iso[11:16] if len(start_iso) > 10 else ""
            end_time = end_iso[11:16] if len(end_iso) > 10 else ""
            time_str = start_time
            location = attrs.get("venue") or (
                (entry.get("relationships") or {})
                .get("venue", {})
                .get("data", {})
                or {}
            )
            if isinstance(location, dict):
                location = location.get("name", "")

            key = f"{start_date}|{title}"
            if key in seen:
                continue
            seen.add(key)

            time_display = start_time
            if end_time and end_time != start_time:
                time_display = f"{start_time} - {end_time}"

            events.append(
                SchoolEvent(
                    title=title,
                    date=start_date,
                    time=time_display,
                    location=str(location) if location else "",
                    raw=attrs,
                )
            )
        except Exception:
            continue

    return events


async def _scrape_event_list(page: Page) -> list[SchoolEvent]:
    """
    Parse events from the Term list view by reading DOM article elements.

    Each event is an <article class="diary-entry row event published">.
    Date headers are <h6> elements with text like "Monday 21st April 2025".
    """
    structured: list[dict] = await page.evaluate(
        r"""() => {
            const out = [];
            let currentDate = '';

            for (const el of document.querySelectorAll('h6, article.diary-entry')) {
                if (el.tagName === 'H6') {
                    // Date header
                    currentDate = el.innerText?.trim() ?? '';
                    continue;
                }
                // article.diary-entry
                const timeEl = el.querySelector('.start-time');
                const endEl = el.querySelector('.end-time');
                const nameEl = el.querySelector('.name_place a');
                const venueEl = el.querySelector('.venue');

                const time = timeEl?.innerText?.trim() ?? '';
                const endTime = endEl?.innerText?.trim().replace(/^\s*-\s*/, '') ?? '';
                const title = nameEl?.innerText?.trim() ?? '';
                const venue = venueEl?.innerText?.trim() ?? '';

                if (title && currentDate) {
                    out.push({
                        date: currentDate,
                        time: endTime && endTime !== time ? `${time} - ${endTime}` : time,
                        title,
                        location: venue,
                    });
                }
            }

            // Deduplicate
            const seen = new Set();
            return out.filter(e => {
                const k = e.date + '|' + e.title;
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
            });
        }"""
    )

    return [
        SchoolEvent(
            title=item.get("title", ""),
            date=item.get("date", ""),
            time=item.get("time", ""),
            location=item.get("location", ""),
            raw=item,
        )
        for item in structured
    ]


async def _scrape_my_calendar_term(
    page: Page, screenshot_dir: str | None
) -> list[SchoolEvent]:
    """
    Full workflow:
      1. Click 'My Calendar' in the top navigation bar.
      2. Switch the view dropdown to 'Term'.
      3. Leave 'My Children' filter as Select All (don't touch it).
      4. Scrape all events from the resulting list.
    """
    # Step 1 — click My Calendar (top bar icon + label)
    cal_link = page.locator("a:has-text('My Calendar')").first
    await cal_link.click()
    await page.wait_for_timeout(2_500)

    if screenshot_dir:
        await page.screenshot(
            path=f"{screenshot_dir}/02_my_calendar_week.png", full_page=True
        )
        print(f"[school_portal] Screenshot -> {screenshot_dir}/02_my_calendar_week.png")

    # Step 2 — switch to Term view
    print("[school_portal] Switching to Term view ...")
    await _switch_to_term_view(page, screenshot_dir)

    if screenshot_dir:
        await page.screenshot(
            path=f"{screenshot_dir}/04_my_calendar_term.png", full_page=True
        )
        print(f"[school_portal] Screenshot -> {screenshot_dir}/04_my_calendar_term.png")

    # Step 3 — My Children filter: leave as Select All (no action needed)

    # Step 4 — try API first (structured JSON), fall back to DOM parsing
    base_url = page.url.rstrip("/")
    # base_url may be a deep path; strip to origin
    from urllib.parse import urlparse
    parsed = urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"

    print("[school_portal] Fetching events via API ...")
    events = await _fetch_events_via_api(page, origin)

    if not events:
        print("[school_portal] API returned no events; falling back to DOM scrape ...")
        events = await _scrape_event_list(page)

    return events


async def _scrape_messages(page: Page, screenshot_dir: str | None) -> list[dict[str, Any]]:
    """Navigate back to dashboard and collect any messages."""
    # Go back to dashboard via the nav
    try:
        dash = page.locator("nav a:has-text('Dashboard'), a:has-text('Dashboard')").first
        await dash.click()
        await page.wait_for_timeout(2_000)
    except Exception:
        pass

    if screenshot_dir:
        await page.screenshot(path=f"{screenshot_dir}/05_messages.png", full_page=True)

    raw = await page.evaluate(
        """() => {
            const out = [];
            const headers = [...document.querySelectorAll('h2, h3, h4, .panel-title')];
            for (const h of headers) {
                if (h.innerText?.includes('Message')) {
                    const container = h.closest('[class*="panel"], [class*="widget"], [class*="card"], section, div');
                    if (container) {
                        out.push({ text: container.innerText?.trim().slice(0, 500), cls: container.className });
                    }
                }
            }
            return out;
        }"""
    )
    return raw


async def _scrape_newsletters(
    page: Page, base_url: str, screenshot_dir: str | None
) -> list[Newsletter]:
    """
    Navigate to Information > Newsletters and scrape every newsletter listed.

    Tries the portal's JSON API first (/api/newsletters), then falls back to
    DOM parsing of the rendered page.
    """
    from urllib.parse import urlparse, urljoin

    parsed = urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"

    # ---- 1. Try the REST API ------------------------------------------------
    api_url = f"{origin}/api/newsletters"
    try:
        data = await page.evaluate(
            """async (url) => {
                const r = await fetch(url, { credentials: 'include' });
                if (!r.ok) return null;
                return await r.json();
            }""",
            api_url,
        )
    except Exception:
        data = None

    if data and isinstance(data, dict):
        entries = data.get("data", [])
        if entries:
            print(f"[school_portal] Newsletters API returned {len(entries)} items.")
            newsletters: list[Newsletter] = []
            for entry in entries:
                attrs = entry.get("attributes", {})
                title = (attrs.get("name") or attrs.get("title") or "").strip()
                date_str = (attrs.get("date") or attrs.get("publishedAt") or attrs.get("created_at") or "")[:10]
                file_url = attrs.get("url") or attrs.get("fileUrl") or attrs.get("file_url") or ""
                if file_url and not file_url.startswith("http"):
                    file_url = urljoin(origin, file_url)
                desc = (attrs.get("description") or attrs.get("summary") or "").strip()
                if title:
                    newsletters.append(Newsletter(title=title, date=date_str, url=file_url, description=desc, raw=attrs))
            if newsletters:
                return newsletters

    # ---- 2. Navigate to the Newsletters page --------------------------------
    print("[school_portal] Navigating to Information > Newsletters ...")

    # First, find the Newsletters href by inspecting the hidden nav links
    # (the portal uses data-casper="menu_Newsletters" on the anchor)
    nl_href: str = await page.evaluate(
        """() => {
            const a = document.querySelector('[data-casper="menu_Newsletters"], a[href*="newsletter" i]');
            return a ? a.getAttribute('href') : '';
        }"""
    )

    if nl_href:
        full_nl_url = nl_href if nl_href.startswith("http") else f"{origin}{nl_href}"
        print(f"[school_portal] Found Newsletters link: {full_nl_url}")
        await page.goto(full_nl_url, wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_timeout(2_500)
    else:
        # Try known URL patterns for this portal CMS
        for candidate_path in ["/page/274", "/information/newsletters", "/newsletters"]:
            try:
                await page.goto(f"{origin}{candidate_path}", wait_until="domcontentloaded", timeout=20_000)
                await page.wait_for_timeout(2_000)
                has_content = await page.evaluate(
                    "() => document.body.innerText.toLowerCase().includes('newsletter')"
                )
                if has_content:
                    print(f"[school_portal] Found newsletter page at {candidate_path}")
                    break
            except Exception:
                continue
        else:
            # Last resort: hover over Information nav to reveal dropdown, then click
            try:
                info_link = page.locator(
                    "nav a:has-text('Information'), a:has-text('Information')"
                ).first
                await info_link.hover()
                await page.wait_for_timeout(800)
                nl_link = page.locator("a:has-text('Newsletter')").first
                await nl_link.click()
                await page.wait_for_timeout(2_000)
            except Exception as exc:
                print(f"[school_portal] Could not navigate to Newsletters: {str(exc)[:120]}")
                return []

    if screenshot_dir:
        await page.screenshot(path=f"{screenshot_dir}/06_newsletters.png", full_page=True)

    # ---- 3. DOM parse -------------------------------------------------------
    # The page groups newsletters under term headings (e.g. "Summer 2025")
    # and each entry is a date-labelled <a> linking to Microsoft Sway or a PDF.
    # Scope to the main content area to avoid picking up sidebar nav links.
    raw_items: list[dict] = await page.evaluate(
        """() => {
            const results = [];

            // Find the main content container (the newsletter list lives here)
            const root = document.querySelector(
                'main, #main, .main-content, .page-content, [class*="content-area"], ' +
                '[class*="page-body"], article, .section-content'
            ) || document.body;

            // Collect all children in document order, track headings as group labels
            let currentTerm = '';
            // Term labels use <b> tags (e.g. <b>Summer 2025</b>)
            const allEls = [...root.querySelectorAll('h1,h2,h3,h4,h5,b,strong,a')];

            for (const el of allEls) {
                const tag = el.tagName;
                const text = (el.innerText || '').trim().replace(/\\s+/g, ' ');
                if (!text) continue;

                if (tag !== 'A') {
                    // It's a heading or bold label — check if it looks like a term label
                    if (/Summer|Lent|Michaelmas|Autumn|Spring/i.test(text) ||
                        (/\\d{4}/.test(text) && text.length < 40)) {
                        currentTerm = text;
                    }
                    continue;
                }

                // It's an <a> — only keep newsletter links
                const href = el.href || '';
                const isSway = href.includes('sway.cloud.microsoft') || href.includes('sway.office.com');
                // Also allow direct PDF newsletters
                const isPdfNewsletter = href.toLowerCase().endsWith('.pdf') && currentTerm !== '';

                if (isSway || isPdfNewsletter) {
                    results.push({ title: text, term: currentTerm, url: href, date: '' });
                }
            }

            // Deduplicate by URL
            const seen = new Set();
            return results.filter(r => {
                if (seen.has(r.url)) return false;
                seen.add(r.url);
                return true;
            });
        }"""
    )

    print(f"[school_portal] DOM parse found {len(raw_items)} newsletter item(s).")
    return [
        Newsletter(
            title=item.get("title", ""),
            term=item.get("term", ""),
            date=item.get("date", ""),
            url=item.get("url", ""),
            raw=item,
        )
        for item in raw_items
        if item.get("title")
    ]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def fetch_portal_data(
    config: Config,
    *,
    headless: bool = False,
    save_screenshots: bool = True,
    screenshot_dir: str = "data/screenshots",
    browser_channel: str = "msedge",
) -> PortalData:
    """
    Launch a real browser, log in to the school portal, and collect data.

    Parameters
    ----------
    config:
        App config (reads school_portal_* fields).
    headless:
        False = visible browser so you can watch the automation live.
    save_screenshots:
        Capture a screenshot at key steps inside ``screenshot_dir``.
    browser_channel:
        ``"msedge"`` uses the system-installed Microsoft Edge (no download).
        ``"chrome"`` uses the system-installed Google Chrome.
        ``""`` (empty) downloads/uses Playwright's bundled Chromium.
    """
    from pathlib import Path

    if save_screenshots:
        Path(screenshot_dir).mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        launch_kwargs: dict = dict(
            headless=headless,
            slow_mo=_SLOW_MO_MS,
            args=["--start-maximized"],
        )
        if browser_channel:
            launch_kwargs["channel"] = browser_channel

        browser = await pw.chromium.launch(**launch_kwargs)
        context: BrowserContext = await browser.new_context(
            viewport=None,  # use the window's full size
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        # Raise default navigation timeout to 60 s for this slow SPA
        context.set_default_navigation_timeout(60_000)
        context.set_default_timeout(30_000)
        page: Page = await context.new_page()

        ss = screenshot_dir if save_screenshots else None

        try:
            print(f"[school_portal] Navigating to {config.school_portal_url} ...")
            await _login(
                page,
                config.school_portal_url,
                config.school_portal_username,
                config.school_portal_password,
            )
            print(f"[school_portal] Logged in. Current URL: {page.url}")

            # --- Dashboard screenshot ---
            if ss:
                await page.screenshot(path=f"{ss}/01_dashboard.png", full_page=True)
                print(f"[school_portal] Screenshot saved -> {ss}/01_dashboard.png")

            # --- Children (from dashboard sidebar) ---
            children = await _scrape_children(page)
            print(f"[school_portal] Children: {children or ['(none found)']}")

            # --- My Calendar → Term view → all events ---
            print("[school_portal] Opening My Calendar ...")
            events = await _scrape_my_calendar_term(page, ss)
            print(f"[school_portal] Found {len(events)} event(s) in Term view.")

            # --- Messages (back on dashboard) ---
            print("[school_portal] Scraping messages ...")
            notices = await _scrape_messages(page, ss)
            print(f"[school_portal] Found {len(notices)} message(s).")

            # --- Newsletters (Information > Newsletters) ---
            print("[school_portal] Fetching newsletters ...")
            base_url = config.school_portal_url.rstrip("/")
            newsletters = await _scrape_newsletters(page, base_url, ss)
            print(f"[school_portal] Found {len(newsletters)} newsletter(s).")

            calendar_items: list[dict] = []  # kept for PortalData compatibility

        finally:
            await context.close()
            await browser.close()

    return PortalData(
        events=events,
        notices=notices,
        calendar_items=calendar_items,
        children=children,
        newsletters=newsletters,
    )


def fetch(
    config: Config,
    *,
    headless: bool = False,
    browser_channel: str = "msedge",
) -> PortalData:
    """Synchronous wrapper around :func:`fetch_portal_data`."""
    return asyncio.run(
        fetch_portal_data(config, headless=headless, browser_channel=browser_channel)
    )
