"""SQLite persistence for Designo projects and photos."""
import json
import sqlite3
import threading
import time
import uuid

from . import config

_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    brief TEXT NOT NULL DEFAULT '{}',
    phase TEXT,
    error TEXT,
    site_generated_at REAL,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT 'gallery',
    caption TEXT NOT NULL DEFAULT '',
    width INTEGER,
    height INTEGER,
    size_bytes INTEGER,
    edit_status TEXT,
    edit_error TEXT,
    original_filename TEXT,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    created_at REAL NOT NULL
);
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _lock, _connect() as conn:
        conn.executescript(SCHEMA)
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(projects)")}
        if "phase" not in cols:
            conn.execute("ALTER TABLE projects ADD COLUMN phase TEXT")
        # Generation runs in daemon threads; any project still 'generating' at
        # startup was orphaned by a restart and would spin forever in the UI.
        conn.execute(
            "UPDATE projects SET status = 'error', phase = NULL, "
            "error = 'Generation was interrupted by a server restart — please retry.' "
            "WHERE status = 'generating'"
        )
        pcols = {r["name"] for r in conn.execute("PRAGMA table_info(photos)")}
        # Edit jobs run in daemon threads; any photo still 'editing' at startup
        # was orphaned by a restart and would spin forever in the UI.
        conn.execute(
            "UPDATE photos SET edit_status = 'error', "
            "edit_error = 'interrupted by a server restart — please retry' "
            "WHERE edit_status = 'editing'"
        )
        for col in ("edit_status", "edit_error", "original_filename"):
            if col not in pcols:
                conn.execute(f"ALTER TABLE photos ADD COLUMN {col} TEXT")


def _row_to_project(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "status": row["status"],
        "brief": json.loads(row["brief"]),
        "phase": row["phase"],
        "error": row["error"],
        "site_generated_at": row["site_generated_at"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _row_to_photo(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "filename": row["filename"],
        "original_name": row["original_name"],
        "tag": row["tag"],
        "caption": row["caption"],
        "width": row["width"],
        "height": row["height"],
        "size_bytes": row["size_bytes"],
        "edit_status": row["edit_status"],
        "edit_error": row["edit_error"],
        "original_filename": row["original_filename"],
        "created_at": row["created_at"],
    }


def _row_to_video(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "filename": row["filename"],
        "model": row["model"],
        "prompt": row["prompt"],
        "status": row["status"],
        "error": row["error"],
        "created_at": row["created_at"],
    }


# --- Projects ---

def create_project(name: str, brief: dict | None = None) -> dict:
    now = time.time()
    project_id = uuid.uuid4().hex
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO projects (id, name, status, brief, created_at, updated_at) VALUES (?, ?, 'draft', ?, ?, ?)",
            (project_id, name, json.dumps(brief or {}), now, now),
        )
    return get_project(project_id)


def list_projects() -> list[dict]:
    with _lock, _connect() as conn:
        rows = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
    return [_row_to_project(r) for r in rows]


def get_project(project_id: str) -> dict | None:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    return _row_to_project(row) if row else None


def update_project(project_id: str, **fields) -> dict | None:
    if "brief" in fields and isinstance(fields["brief"], dict):
        fields["brief"] = json.dumps(fields["brief"])
    fields["updated_at"] = time.time()
    keys = ", ".join(f"{k} = ?" for k in fields)
    with _lock, _connect() as conn:
        conn.execute(f"UPDATE projects SET {keys} WHERE id = ?", (*fields.values(), project_id))
    return get_project(project_id)


def delete_project(project_id: str) -> None:
    with _lock, _connect() as conn:
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))


# --- Photos ---

def add_photo(project_id: str, filename: str, original_name: str, tag: str,
              caption: str, width: int | None, height: int | None, size_bytes: int) -> dict:
    photo_id = uuid.uuid4().hex
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO photos (id, project_id, filename, original_name, tag, caption, width, height, size_bytes, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (photo_id, project_id, filename, original_name, tag, caption, width, height, size_bytes, time.time()),
        )
    return get_photo(photo_id)


def list_photos(project_id: str) -> list[dict]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM photos WHERE project_id = ? ORDER BY created_at", (project_id,)
        ).fetchall()
    return [_row_to_photo(r) for r in rows]


def get_photo(photo_id: str) -> dict | None:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT * FROM photos WHERE id = ?", (photo_id,)).fetchone()
    return _row_to_photo(row) if row else None


def update_photo(photo_id: str, **fields) -> dict | None:
    keys = ", ".join(f"{k} = ?" for k in fields)
    with _lock, _connect() as conn:
        conn.execute(f"UPDATE photos SET {keys} WHERE id = ?", (*fields.values(), photo_id))
    return get_photo(photo_id)


def delete_photo(photo_id: str) -> None:
    with _lock, _connect() as conn:
        conn.execute("DELETE FROM photos WHERE id = ?", (photo_id,))


# --- Videos ---

def add_video(project_id: str, filename: str, model: str, prompt: str) -> dict:
    video_id = uuid.uuid4().hex
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO videos (id, project_id, filename, model, prompt, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, 'pending', ?)",
            (video_id, project_id, filename, model, prompt, time.time()),
        )
    return get_video(video_id)


def list_videos(project_id: str) -> list[dict]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM videos WHERE project_id = ? ORDER BY created_at", (project_id,)
        ).fetchall()
    return [_row_to_video(r) for r in rows]


def get_video(video_id: str) -> dict | None:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
    return _row_to_video(row) if row else None


def update_video(video_id: str, **fields) -> dict | None:
    keys = ", ".join(f"{k} = ?" for k in fields)
    with _lock, _connect() as conn:
        conn.execute(f"UPDATE videos SET {keys} WHERE id = ?", (*fields.values(), video_id))
    return get_video(video_id)
