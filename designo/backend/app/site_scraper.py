"""Scrape a prospect's existing website for real business content.

When a lead already has a website (the dated-website funnel), the rebuild
should keep their true details — services, service areas, about-us story,
team names, accreditations — rather than have Fable infer industry-typical
ones. This module fetches the homepage plus a handful of high-value internal
pages (about / services / contact etc.), extracts readable text, and returns
a compact bundle that is stored on the lead (raw.site_content) and injected
into the brief prompt.

Sites behind Cloudflare-style bot checks that reject plain HTTP fetches are
retried through stealth-patched headless Chromium (playwright-stealth).

Deliberately conservative: same-domain pages only, small page budget, capped
total text so the brief prompt stays lean.
"""
import logging
import re
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger("designo.site_scraper")

MAX_PAGES = 6
MAX_TEXT_PER_PAGE = 4_000
MAX_TOTAL_TEXT = 16_000
TIMEOUT = 12

# Internal links worth following, in priority order.
_INTERESTING_PATHS = (
    "about", "service", "what-we-do", "our-work", "team", "history",
    "contact", "testimonial", "review", "gallery", "project", "area",
    "accreditation", "qualification",
)

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; DesignoAudit/1.0)"}

# Markers that the "page" we got is a bot-check interstitial, not content.
_BLOCK_MARKERS = ("cf-browser-verification", "checking your browser",
                  "cf-challenge", "just a moment", "attention required",
                  "checking the site connection security", "sgcaptcha",
                  "verify you are human")


def _clean_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "noscript", "iframe", "svg"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln and len(ln) > 1]
    # collapse duplicate nav/footer lines that repeat on every page
    seen: set[str] = set()
    out: list[str] = []
    for ln in lines:
        key = ln.lower()
        if key in seen and len(ln) < 60:
            continue
        seen.add(key)
        out.append(ln)
    return "\n".join(out)[:MAX_TEXT_PER_PAGE]


def _page_title(soup: BeautifulSoup) -> str:
    return (soup.title.get_text(strip=True) if soup.title else "")[:150]


def _meta_description(soup: BeautifulSoup) -> str:
    tag = soup.find("meta", attrs={"name": "description"})
    return (tag.get("content") or "").strip()[:300] if tag else ""


def _looks_blocked(html: str) -> bool:
    low = html[:5_000].lower()
    return any(m in low for m in _BLOCK_MARKERS)


def _fetch_rendered(urls: list[str]) -> dict[str, str]:
    """Fetch pages through stealth headless Chromium (bot-check fallback)."""
    from playwright.sync_api import sync_playwright
    from playwright_stealth import Stealth

    out: dict[str, str] = {}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                args=["--no-sandbox", "--disable-dev-shm-usage",
                      "--disable-blink-features=AutomationControlled"])
            try:
                context = browser.new_context(
                    viewport={"width": 1440, "height": 900}, locale="en-GB",
                    ignore_https_errors=True)
                Stealth().apply_stealth_sync(context)
                page = context.new_page()
                for url in urls:
                    try:
                        page.goto(url, wait_until="load", timeout=25_000)
                        # bot challenges clear themselves after a few seconds
                        for _ in range(8):
                            body = (page.content()[:4_000] or "").lower()
                            if not _looks_blocked(body) and "sgcaptcha" not in page.url:
                                break
                            page.wait_for_timeout(5_000)
                        page.wait_for_timeout(3_000)
                        out[url] = page.content()
                    except Exception:
                        log.info("site_scraper: rendered fetch failed for %s", url)
            finally:
                browser.close()
    except Exception as exc:
        log.warning("site_scraper: playwright fallback failed: %s", exc)
    return out


def scrape(url: str) -> dict | None:
    """Fetch homepage + interesting internal pages; return content bundle.

    Returns None when even the homepage is unreachable/blocked.
    """
    if not url.startswith(("http://", "https://")):
        url = "http://" + url

    pages: list[dict] = []
    total = 0
    meta_desc = ""
    home_html = ""
    home_url = url
    try:
        with httpx.Client(timeout=TIMEOUT, follow_redirects=True,
                          headers=_HEADERS, verify=False) as client:
            resp = client.get(url)
            resp.raise_for_status()
            home_url = str(resp.url)
            home_html = resp.text
    except Exception as exc:
        log.info("site_scraper: plain fetch failed for %s (%s) — trying "
                 "rendered fallback", url, exc)

    if not home_html or _looks_blocked(home_html):
        rendered = _fetch_rendered([url])
        home_html = rendered.get(url, "")
        if not home_html or _looks_blocked(home_html):
            log.warning("site_scraper: could not scrape %s (blocked/dead)", url)
            return None

    soup = BeautifulSoup(home_html, "html.parser")
    home_text = _clean_text(soup)
    pages.append({"url": home_url, "title": _page_title(soup),
                  "text": home_text})
    total += len(home_text)
    meta_desc = _meta_description(soup)

    # Collect candidate internal links, prioritised by path keywords.
    host = urlparse(home_url).netloc.lower().removeprefix("www.")
    candidates: list[tuple[int, str]] = []
    seen_urls = {home_url.rstrip("/")}
    for a in soup.find_all("a", href=True):
        link = urljoin(home_url, a["href"]).split("#")[0].rstrip("/")
        parsed = urlparse(link)
        if parsed.scheme not in ("http", "https"):
            continue
        if parsed.netloc.lower().removeprefix("www.") != host:
            continue
        if link in seen_urls:
            continue
        if re.search(r"\.(pdf|jpe?g|png|gif|zip|docx?)$", parsed.path, re.I):
            continue
        path = parsed.path.lower()
        for rank, needle in enumerate(_INTERESTING_PATHS):
            if needle in path:
                seen_urls.add(link)
                candidates.append((rank, link))
                break

    try:
        with httpx.Client(timeout=TIMEOUT, follow_redirects=True,
                          headers=_HEADERS, verify=False) as client:
            for _, link in sorted(candidates)[:MAX_PAGES - 1]:
                if total >= MAX_TOTAL_TEXT:
                    break
                try:
                    r = client.get(link)
                    r.raise_for_status()
                    if _looks_blocked(r.text):
                        continue
                    s = BeautifulSoup(r.text, "html.parser")
                    text = _clean_text(s)
                    if len(text) < 100:
                        continue
                    pages.append({"url": link, "title": _page_title(s),
                                  "text": text[:MAX_TOTAL_TEXT - total]})
                    total += len(pages[-1]["text"])
                except Exception:
                    log.info("site_scraper: skipping %s (fetch failed)", link)
    except Exception:
        pass  # homepage alone is still useful

    return {
        "scraped_from": pages[0]["url"],
        "meta_description": meta_desc,
        "pages": pages,
        "total_chars": total,
    }
