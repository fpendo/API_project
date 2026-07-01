"""Daily morning briefing.

Gathers the day's calendar, tasks due, and recent unread email, then asks the
LLM to phrase a short, friendly briefing suitable for reading aloud.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta

from assistant.agent.llm import completion
from assistant.connectors import calendar as cal
from assistant.connectors import gmail
from assistant.connectors import tasks as gtasks
from assistant.core.config import Config
from assistant.core.store import UserStore

logger = logging.getLogger(__name__)


def _gather(config: Config, user_id: int) -> dict:
    now = datetime.now().astimezone()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    data: dict = {"date": now.strftime("%A %d %B %Y")}

    try:
        data["events"] = cal.list_events(
            config, user_id, start.isoformat(), end.isoformat(), 20
        )
    except Exception as exc:  # noqa: BLE001
        data["events_error"] = str(exc)

    try:
        tasks = gtasks.list_tasks(config, user_id, "@default", False, 50)
        today = now.date()
        due = [
            t for t in tasks
            if t.get("due") and datetime.fromisoformat(
                t["due"].replace("Z", "+00:00")
            ).date() <= today
        ]
        data["tasks_due"] = due or tasks[:5]
    except Exception as exc:  # noqa: BLE001
        data["tasks_error"] = str(exc)

    try:
        unread = gmail.search_email(config, user_id, "is:unread newer_than:2d", 6)
        data["unread_email"] = [
            {"from": e.sender, "subject": e.subject, "snippet": e.snippet}
            for e in unread
        ]
    except Exception as exc:  # noqa: BLE001
        data["email_error"] = str(exc)

    return data


def build_briefing(config: Config, user_id: int) -> str:
    """Return a short natural-language morning briefing for the user."""
    data = _gather(config, user_id)
    system = (
        "You are a personal assistant giving a short spoken morning briefing. "
        "Using ONLY the JSON below, write a warm, concise briefing (a few short "
        "sentences, no markdown, suitable to be read aloud). Cover: today's "
        "calendar (with times), any tasks due, and a one-line note on notable "
        "unread emails (sender + gist) — skip obvious newsletters/spam. If a "
        "section is empty, mention briefly that there's nothing. Don't invent "
        "anything not in the data. End with a friendly sign-off."
    )
    user = "Here is today's data as JSON:\n" + json.dumps(data, default=str)
    try:
        resp = completion(
            config,
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
        )
        text = resp.choices[0].message.content or ""
    except Exception:  # noqa: BLE001
        logger.exception("briefing LLM call failed")
        text = _fallback(data)
    return text.strip() or _fallback(data)


def _fallback(data: dict) -> str:
    """Plain formatting if the LLM is unavailable."""
    lines = [f"Good morning. Here's your briefing for {data.get('date', 'today')}."]
    events = data.get("events") or []
    if events:
        lines.append("\nToday's calendar:")
        for e in events:
            start = (e.get("start") or "")[11:16] or "all day"
            lines.append(f"• {start} {e.get('summary', '')}".rstrip())
    else:
        lines.append("\nNothing in your calendar today.")
    tasks = data.get("tasks_due") or []
    if tasks:
        lines.append("\nTasks due:")
        for t in tasks:
            lines.append(f"• {t.get('title', '')}")
    email = data.get("unread_email") or []
    if email:
        lines.append("\nUnread email:")
        for m in email[:5]:
            lines.append(f"• {m.get('from', '')}: {m.get('subject', '')}")
    return "\n".join(lines)
