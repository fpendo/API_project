"""
Fetch and print every Summer term event from the school portal.

Summer term = roughly April through July.
We query the API for both the current academic year (2025-2026)
and the previous one (2024-2025) so we get the most complete picture.
"""
import asyncio, sys, json
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv; load_dotenv()
from playwright.async_api import async_playwright
from assistant.core.config import load_config


async def fetch_summer_events(headless: bool = False) -> list[dict]:
    cfg = load_config()

    # Summer term windows to query (British summer term: late April - mid July)
    date_ranges = [
        ("2026-04-01", "2026-08-31", "Summer 2025/2026"),
        ("2025-04-01", "2025-08-31", "Summer 2024/2025"),
    ]

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            channel="msedge", headless=headless, slow_mo=300,
            args=["--start-maximized"]
        )
        ctx = await browser.new_context(viewport=None)
        ctx.set_default_navigation_timeout(60_000)
        ctx.set_default_timeout(30_000)
        page = await ctx.new_page()

        # Login
        print(f"Logging in as {cfg.school_portal_username} ...")
        await page.goto(cfg.school_portal_url, wait_until="domcontentloaded", timeout=60_000)
        await page.wait_for_selector("input[type='email']", timeout=15_000)
        await page.locator("input[type='email']").first.fill(cfg.school_portal_username)
        await page.locator("button:has-text('Continue')").first.click()
        await page.wait_for_selector("input[type='password']", timeout=12_000)
        await page.locator("input[type='password']").fill(cfg.school_portal_password)
        await page.locator("button:has-text('Sign in')").first.click()
        try:
            await page.wait_for_url(lambda u: "login" not in u.lower(), timeout=20_000)
        except Exception:
            pass
        await page.wait_for_timeout(2_500)
        print("Logged in.")

        all_events: list[dict] = []

        for min_date, max_date, label in date_ranges:
            api_url = (
                f"{cfg.school_portal_url}/api/calendarEntrys"
                f"?minStartDate={min_date}&maxStartDate={max_date}"
            )
            print(f"\nFetching {label} ({min_date} to {max_date}) ...")
            try:
                data = await page.evaluate(
                    """async (url) => {
                        const r = await fetch(url, {credentials: 'include'});
                        if (!r.ok) return null;
                        return await r.json();
                    }""",
                    api_url,
                )
            except Exception as exc:
                print(f"  Error: {exc}")
                continue

            entries = (data or {}).get("data", [])
            print(f"  {len(entries)} entries returned.")

            for entry in entries:
                attrs = entry.get("attributes", {})
                title = attrs.get("name", "").strip()
                start_iso = attrs.get("start") or ""
                end_iso = attrs.get("end") or ""
                start_date = start_iso[:10] if start_iso else ""
                start_time = start_iso[11:16] if len(start_iso) > 10 else ""
                end_time = end_iso[11:16] if len(end_iso) > 10 else ""
                location = attrs.get("location", "")
                summary = attrs.get("summary", "")

                if not title:
                    continue

                all_events.append({
                    "term": label,
                    "date": start_date,
                    "time": f"{start_time} - {end_time}" if end_time and end_time != start_time else start_time,
                    "title": title,
                    "location": location,
                    "summary": summary,
                })

        await browser.close()

    # Sort by date then time
    all_events.sort(key=lambda e: (e["date"], e["time"]))
    return all_events


async def main():
    events = await fetch_summer_events(headless=False)

    print("\n" + "=" * 70)
    print(f"SUMMER TERM EVENTS ({len(events)} total)")
    print("=" * 70)

    current_month = ""
    for ev in events:
        month = ev["date"][:7] if ev["date"] else "unknown"
        if month != current_month:
            current_month = month
            print(f"\n--- {month} ---")
        time_str = f"  {ev['time']}" if ev["time"] else ""
        loc_str = f"  @ {ev['location']}" if ev["location"] else ""
        print(f"  {ev['date']}{time_str}  {ev['title']}{loc_str}")

    # Save
    out = Path("data/summer_events.json")
    out.write_text(json.dumps(events, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved {len(events)} events -> {out.resolve()}")


if __name__ == "__main__":
    asyncio.run(main())
