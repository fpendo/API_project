"""
Fetch all newsletters from the school portal's Information > Newsletters section.
Opens a visible browser so you can watch it navigate.
"""
import asyncio, sys, json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv; load_dotenv()
from playwright.async_api import async_playwright
from assistant.core.config import load_config
from assistant.connectors.school_portal import _login, _scrape_newsletters


async def main():
    cfg = load_config()

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            channel="msedge", headless=False, slow_mo=350,
            args=["--start-maximized"],
        )
        ctx = await browser.new_context(viewport=None)
        ctx.set_default_navigation_timeout(60_000)
        ctx.set_default_timeout(30_000)
        page = await ctx.new_page()

        print(f"Logging in as {cfg.school_portal_username} ...")
        await _login(page, cfg.school_portal_url, cfg.school_portal_username, cfg.school_portal_password)
        print(f"Logged in. URL: {page.url}")

        base_url = cfg.school_portal_url.rstrip("/")
        newsletters = await _scrape_newsletters(page, base_url, screenshot_dir="data/screenshots")

        await browser.close()

    print("\n" + "=" * 70)
    print(f"NEWSLETTERS ({len(newsletters)} found)")
    print("=" * 70)

    current_term = ""
    for nl in newsletters:
        if nl.term != current_term:
            current_term = nl.term
            print(f"\n  [{current_term}]")
        link_str = f"  -> {nl.url}" if nl.url else ""
        print(f"    {nl.title}{link_str}")

    out = Path("data/newsletters.json")
    out.parent.mkdir(exist_ok=True)
    data = [
        {"term": nl.term, "title": nl.title, "date": nl.date, "url": nl.url, "description": nl.description}
        for nl in newsletters
    ]
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved -> {out.resolve()}")


if __name__ == "__main__":
    asyncio.run(main())
