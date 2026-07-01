"""Google Calendar connector: list and create events."""

from __future__ import annotations

from datetime import datetime, timezone

from googleapiclient.discovery import build

from assistant.connectors.google_auth import load_credentials
from assistant.core.config import Config

# Used when the LLM omits a timezone offset on dateTime values.
DEFAULT_TIMEZONE = "Europe/London"


def _service(config: Config, user_id: int):
    creds = load_credentials(config, user_id)
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _event_time(value: str, tz: str = DEFAULT_TIMEZONE) -> dict:
    """Build a Google Calendar start/end object with an explicit timezone."""
    value = value.strip()
    if not value:
        raise ValueError("Event time is required")

    # All-day event: YYYY-MM-DD
    if "T" not in value:
        return {"date": value[:10]}

    # Already has UTC or offset — pass through as-is.
    if value.endswith("Z") or "+" in value[10:] or "-" in value[10:]:
        return {"dateTime": value}

    # Naive local datetime from the LLM — attach calendar timezone.
    return {"dateTime": value, "timeZone": tz}


def list_events(
    config: Config,
    user_id: int,
    time_min: str | None = None,
    time_max: str | None = None,
    max_results: int = 10,
) -> list[dict]:
    """List upcoming events. Times are RFC3339 (e.g. 2026-06-24T00:00:00Z)."""
    service = _service(config, user_id)
    if not time_min:
        time_min = datetime.now(timezone.utc).isoformat()

    params = {
        "calendarId": "primary",
        "timeMin": time_min,
        "maxResults": max(1, min(max_results, 50)),
        "singleEvents": True,
        "orderBy": "startTime",
    }
    if time_max:
        params["timeMax"] = time_max

    events = service.events().list(**params).execute().get("items", [])
    out: list[dict] = []
    for ev in events:
        start = ev.get("start", {})
        end = ev.get("end", {})
        out.append(
            {
                "id": ev.get("id"),
                "summary": ev.get("summary", "(no title)"),
                "start": start.get("dateTime") or start.get("date"),
                "end": end.get("dateTime") or end.get("date"),
                "location": ev.get("location", ""),
                "link": ev.get("htmlLink", ""),
            }
        )
    return out


def create_event(
    config: Config,
    user_id: int,
    summary: str,
    start: str,
    end: str,
    description: str = "",
    location: str = "",
    attendees: list[str] | None = None,
) -> dict:
    """Create a calendar event. ``start``/``end`` are RFC3339 datetimes."""
    service = _service(config, user_id)
    body: dict = {
        "summary": summary,
        "description": description,
        "location": location,
        "start": _event_time(start),
        "end": _event_time(end),
    }
    if attendees:
        body["attendees"] = [{"email": a} for a in attendees]

    ev = service.events().insert(calendarId="primary", body=body).execute()
    return {
        "id": ev.get("id"),
        "summary": ev.get("summary"),
        "start": ev.get("start", {}).get("dateTime"),
        "end": ev.get("end", {}).get("dateTime"),
        "link": ev.get("htmlLink", ""),
    }
