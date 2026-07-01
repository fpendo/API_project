"""Google Tasks connector: list, create, update, and complete tasks."""

from __future__ import annotations

from datetime import date, datetime, timezone

from googleapiclient.discovery import build

from assistant.connectors.google_auth import load_credentials
from assistant.core.config import Config

DEFAULT_LIST = "@default"


def _service(config: Config, user_id: int):
    creds = load_credentials(config, user_id)
    return build("tasks", "v1", credentials=creds, cache_discovery=False)


def _summarise(task: dict) -> dict:
    return {
        "id": task.get("id"),
        "title": task.get("title", ""),
        "notes": task.get("notes", ""),
        "due": task.get("due", ""),
        "status": task.get("status", "needsAction"),
        "completed": task.get("completed", ""),
        "updated": task.get("updated", ""),
        "parent": task.get("parent", ""),
    }


def _due_to_rfc3339(due: str) -> str:
    """Normalise a due date/datetime to Google Tasks RFC3339 (date at midnight UTC)."""
    due = due.strip()
    if "T" in due:
        # Parse datetime and use its date at midnight UTC.
        dt = datetime.fromisoformat(due.replace("Z", "+00:00"))
        d = dt.date()
    else:
        d = date.fromisoformat(due[:10])
    midnight = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
    return midnight.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def list_task_lists(config: Config, user_id: int) -> list[dict]:
    """Return all task lists (My Tasks, custom lists, etc.)."""
    service = _service(config, user_id)
    result = service.tasklists().list(maxResults=50).execute()
    return [
        {"id": tl.get("id"), "title": tl.get("title", ""), "updated": tl.get("updated", "")}
        for tl in result.get("items", [])
    ]


def list_tasks(
    config: Config,
    user_id: int,
    task_list_id: str = DEFAULT_LIST,
    show_completed: bool = False,
    max_results: int = 50,
) -> list[dict]:
    """List tasks in a task list. Incomplete tasks first by default."""
    service = _service(config, user_id)
    params: dict = {
        "tasklist": task_list_id,
        "maxResults": max(1, min(max_results, 100)),
        "showCompleted": show_completed,
        "showHidden": False,
    }
    result = service.tasks().list(**params).execute()
    return [_summarise(t) for t in result.get("items", [])]


def create_task(
    config: Config,
    user_id: int,
    title: str,
    task_list_id: str = DEFAULT_LIST,
    notes: str = "",
    due: str | None = None,
) -> dict:
    """Create a task. ``due`` is ISO date (YYYY-MM-DD) or RFC3339 datetime."""
    service = _service(config, user_id)
    body: dict = {"title": title}
    if notes:
        body["notes"] = notes
    if due:
        body["due"] = _due_to_rfc3339(due)

    task = service.tasks().insert(tasklist=task_list_id, body=body).execute()
    return _summarise(task)


def update_task(
    config: Config,
    user_id: int,
    task_id: str,
    task_list_id: str = DEFAULT_LIST,
    title: str | None = None,
    notes: str | None = None,
    due: str | None = None,
    completed: bool | None = None,
) -> dict:
    """Update a task. Set ``completed=True`` to mark done, ``False`` to reopen."""
    service = _service(config, user_id)
    existing = (
        service.tasks().get(tasklist=task_list_id, task=task_id).execute()
    )
    body = dict(existing)
    if title is not None:
        body["title"] = title
    if notes is not None:
        body["notes"] = notes
    if due is not None:
        body["due"] = _due_to_rfc3339(due) if due else None
    if completed is True:
        body["status"] = "completed"
        body["completed"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    elif completed is False:
        body["status"] = "needsAction"
        body["completed"] = None

    task = (
        service.tasks()
        .update(tasklist=task_list_id, task=task_id, body=body)
        .execute()
    )
    return _summarise(task)


def delete_task(
    config: Config,
    user_id: int,
    task_id: str,
    task_list_id: str = DEFAULT_LIST,
) -> dict:
    """Permanently delete a task."""
    service = _service(config, user_id)
    service.tasks().delete(tasklist=task_list_id, task=task_id).execute()
    return {"deleted": True, "id": task_id}
