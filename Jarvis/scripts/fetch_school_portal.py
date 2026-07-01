"""
Standalone script – opens a real Chrome window, logs into King's Hall School
Portal, and prints/saves all discovered events and notices.

Usage
-----
    python scripts/fetch_school_portal.py

Credentials are read from .env:
    SCHOOL_PORTAL_USERNAME=your_username
    SCHOOL_PORTAL_PASSWORD=your_password

The browser window is VISIBLE by default so you can watch the automation.
Screenshots are saved to data/screenshots/.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

# Allow running from the repo root without installing the package.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from assistant.connectors.school_portal import fetch_portal_data
from assistant.core.config import load_config


async def main() -> None:
    config = load_config()

    if not config.school_portal_username:
        print(
            "ERROR: SCHOOL_PORTAL_USERNAME is not set.\n"
            "Copy .env.example -> .env and fill in your credentials."
        )
        sys.exit(1)

    print("=" * 60)
    print("King's Hall School Portal – automated fetch")
    print("=" * 60)
    print(f"URL      : {config.school_portal_url}")
    print(f"Username : {config.school_portal_username}")
    print(f"Headless : False  (you will see the browser)")
    print("=" * 60)

    data = await fetch_portal_data(
        config,
        headless=False,           # visible browser – watch it work
        save_screenshots=True,
        screenshot_dir="data/screenshots",
        browser_channel="msedge", # uses your installed Microsoft Edge, no download needed
    )

    # ------------------------------------------------------------------ print
    print("\n" + "=" * 60)
    print(f"CHILDREN: {data.children or ['(none found)']}")
    print("=" * 60)

    print("\n" + "=" * 60)
    print(f"EVENTS ({len(data.events)})")
    print("=" * 60)
    for ev in data.events:
        print(f"  [{ev.date}] {ev.title}")
        if ev.time:
            print(f"           Time    : {ev.time}")
        if ev.location:
            print(f"           Location: {ev.location}")
        if ev.description:
            print(f"           Desc    : {ev.description[:120]}")

    print("\n" + "=" * 60)
    print(f"NOTICES / NEWS ({len(data.notices)})")
    print("=" * 60)
    for i, n in enumerate(data.notices, 1):
        snippet = n.get("text", "")[:200].replace("\n", " | ")
        print(f"  [{i}] {snippet}")

    print("\n" + "=" * 60)
    print(f"DASHBOARD WIDGETS ({len(data.calendar_items)})")
    print("=" * 60)
    for i, w in enumerate(data.calendar_items, 1):
        snippet = w.get("text", "")[:200].replace("\n", " | ")
        print(f"  [{i}] {snippet}")

    # ------------------------------------------------------------------ save
    out_path = Path("data/school_portal_data.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fh:
        json.dump(
            {
                "fetched_at": data.fetched_at,
                "children": data.children,
                "events": [
                    {
                        "title": e.title,
                        "date": e.date,
                        "time": e.time,
                        "location": e.location,
                        "description": e.description,
                    }
                    for e in data.events
                ],
                "notices": data.notices,
                "dashboard_widgets": data.calendar_items,
            },
            fh,
            indent=2,
            ensure_ascii=False,
        )
    print(f"\nFull data saved -> {out_path.resolve()}")
    print("Screenshots    -> data/screenshots/")


if __name__ == "__main__":
    asyncio.run(main())
