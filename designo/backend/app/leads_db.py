"""SQLite persistence for the lead-generation pipeline.

Shares the same database file (and lock) as db.py. A lead moves through:

    new -> researching -> generating -> drafting -> review
        -> sending -> sent -> opened -> logged_in -> won / lost
    (error / skipped can happen at any point)

Transient states (researching/generating/drafting/sending) are driven by
daemon worker threads, so on startup any lead stuck in one is flipped to
error — the same recovery pattern used for photos and projects.
"""
import json
import secrets
import sqlite3
import time
import uuid

from .db import _connect, _lock

TRANSIENT_STATUSES = ("researching", "generating", "drafting", "sending")

SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    business_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    postcode TEXT NOT NULL DEFAULT '',
    town TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    socials TEXT NOT NULL DEFAULT '{}',
    raw TEXT NOT NULL DEFAULT '{}',
    rating REAL,
    reviews_count INTEGER,
    status TEXT NOT NULL DEFAULT 'new',
    status_detail TEXT,
    project_id TEXT,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS prospect_access (
    lead_id TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS outreach_emails (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    subject TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    body_text TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    resend_id TEXT,
    error TEXT,
    created_at REAL NOT NULL,
    sent_at REAL
);

CREATE TABLE IF NOT EXISTS lead_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS suppressed_emails (
    email TEXT PRIMARY KEY,
    reason TEXT NOT NULL DEFAULT '',
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_messages (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
    direction TEXT NOT NULL,              -- 'in' | 'out'
    counterpart TEXT NOT NULL DEFAULT '', -- the prospect's email address
    subject TEXT NOT NULL DEFAULT '',
    body_text TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    message_id TEXT,                      -- RFC 5322 Message-ID (dedupe + threading)
    in_reply_to TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mail_counterpart ON mail_messages (counterpart, created_at);
"""

DEFAULT_SETTINGS = {
    "pricing_build_fee": "£695 one-off",
    "pricing_monthly_fee": "£59/month hosting, updates & SEO",
    "sender_name": "Designo Studio",
    "sender_signoff": "The Designo Studio team",
}


def init_db() -> None:
    with _lock, _connect() as conn:
        conn.executescript(SCHEMA)
        conn.execute(
            "UPDATE leads SET status = 'error', "
            "status_detail = 'interrupted by a server restart — retry from the lead page' "
            f"WHERE status IN ({','.join('?' * len(TRANSIENT_STATUSES))})",
            TRANSIENT_STATUSES,
        )
        for key, value in DEFAULT_SETTINGS.items():
            conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value))
        if not conn.execute("SELECT 1 FROM settings WHERE key = 'secret'").fetchone():
            conn.execute("INSERT INTO settings (key, value) VALUES ('secret', ?)",
                         (secrets.token_hex(32),))


# --- row mappers ---

def _row_to_lead(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["socials"] = json.loads(d.get("socials") or "{}")
    d["raw"] = json.loads(d.get("raw") or "{}")
    return d


# --- leads ---

def create_lead(source: str, business_name: str, **fields) -> dict:
    now = time.time()
    lead_id = uuid.uuid4().hex
    for key in ("socials", "raw"):
        if isinstance(fields.get(key), (dict, list)):
            fields[key] = json.dumps(fields[key])
    cols = ["id", "source", "business_name", "created_at", "updated_at", *fields.keys()]
    vals = [lead_id, source, business_name, now, now, *fields.values()]
    with _lock, _connect() as conn:
        conn.execute(
            f"INSERT INTO leads ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
            vals,
        )
    return get_lead(lead_id)


def list_leads(status: str | None = None) -> list[dict]:
    with _lock, _connect() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM leads WHERE status = ? ORDER BY updated_at DESC", (status,)
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM leads ORDER BY updated_at DESC").fetchall()
    return [_row_to_lead(r) for r in rows]


def get_lead(lead_id: str) -> dict | None:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
    return _row_to_lead(row) if row else None


def update_lead(lead_id: str, **fields) -> dict | None:
    for key in ("socials", "raw"):
        if isinstance(fields.get(key), (dict, list)):
            fields[key] = json.dumps(fields[key])
    fields["updated_at"] = time.time()
    keys = ", ".join(f"{k} = ?" for k in fields)
    with _lock, _connect() as conn:
        conn.execute(f"UPDATE leads SET {keys} WHERE id = ?", (*fields.values(), lead_id))
    return get_lead(lead_id)


def delete_lead(lead_id: str) -> None:
    with _lock, _connect() as conn:
        conn.execute("DELETE FROM leads WHERE id = ?", (lead_id,))


def lead_exists(business_name: str, postcode: str) -> bool:
    """Dedupe: same name + postcode (case/space-insensitive)."""
    name = "".join(business_name.lower().split())
    pc = "".join(postcode.lower().split())
    with _lock, _connect() as conn:
        rows = conn.execute("SELECT business_name, postcode FROM leads").fetchall()
    return any(
        "".join(r["business_name"].lower().split()) == name
        and "".join((r["postcode"] or "").lower().split()) == pc
        for r in rows
    )


# --- prospect access ---

def create_prospect_access(lead_id: str, slug: str, username: str, password: str) -> dict:
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO prospect_access (lead_id, slug, username, password, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (lead_id, slug, username, password, time.time()),
        )
    return get_prospect_access(lead_id)


def get_prospect_access(lead_id: str) -> dict | None:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT * FROM prospect_access WHERE lead_id = ?", (lead_id,)).fetchone()
    return dict(row) if row else None


def get_prospect_by_slug(slug: str) -> dict | None:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT * FROM prospect_access WHERE slug = ?", (slug,)).fetchone()
    return dict(row) if row else None


def slug_taken(slug: str) -> bool:
    with _lock, _connect() as conn:
        return conn.execute("SELECT 1 FROM prospect_access WHERE slug = ?", (slug,)).fetchone() is not None


# --- outreach emails ---

def create_email(lead_id: str, subject: str, body_html: str, body_text: str) -> dict:
    email_id = uuid.uuid4().hex
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO outreach_emails (id, lead_id, subject, body_html, body_text, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, 'draft', ?)",
            (email_id, lead_id, subject, body_html, body_text, time.time()),
        )
    return get_email(email_id)


def get_email(email_id: str) -> dict | None:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT * FROM outreach_emails WHERE id = ?", (email_id,)).fetchone()
    return dict(row) if row else None


def latest_email_for_lead(lead_id: str) -> dict | None:
    with _lock, _connect() as conn:
        row = conn.execute(
            "SELECT * FROM outreach_emails WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1",
            (lead_id,),
        ).fetchone()
    return dict(row) if row else None


def update_email(email_id: str, **fields) -> dict | None:
    keys = ", ".join(f"{k} = ?" for k in fields)
    with _lock, _connect() as conn:
        conn.execute(f"UPDATE outreach_emails SET {keys} WHERE id = ?", (*fields.values(), email_id))
    return get_email(email_id)


def find_email_by_resend_id(resend_id: str) -> dict | None:
    with _lock, _connect() as conn:
        row = conn.execute(
            "SELECT * FROM outreach_emails WHERE resend_id = ?", (resend_id,)
        ).fetchone()
    return dict(row) if row else None


# --- events ---

def add_event(lead_id: str, kind: str, data: dict | None = None) -> None:
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO lead_events (lead_id, kind, data, created_at) VALUES (?, ?, ?, ?)",
            (lead_id, kind, json.dumps(data or {}), time.time()),
        )


def list_events(lead_id: str, limit: int = 200) -> list[dict]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM lead_events WHERE lead_id = ? ORDER BY created_at DESC LIMIT ?",
            (lead_id, limit),
        ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["data"] = json.loads(d.get("data") or "{}")
        out.append(d)
    return out


# --- suppression list ---

def suppress_email(email: str, reason: str = "unsubscribed") -> None:
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO suppressed_emails (email, reason, created_at) VALUES (?, ?, ?)",
            (email.strip().lower(), reason, time.time()),
        )


def is_suppressed(email: str) -> bool:
    with _lock, _connect() as conn:
        return conn.execute(
            "SELECT 1 FROM suppressed_emails WHERE email = ?", (email.strip().lower(),)
        ).fetchone() is not None


# --- mailbox ---

def add_mail_message(direction: str, counterpart: str, subject: str,
                     body_text: str = "", body_html: str = "",
                     lead_id: str | None = None, message_id: str | None = None,
                     in_reply_to: str | None = None, read: bool = False,
                     created_at: float | None = None) -> dict:
    msg_id = uuid.uuid4().hex
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO mail_messages (id, lead_id, direction, counterpart, subject, "
            "body_text, body_html, message_id, in_reply_to, read, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (msg_id, lead_id, direction, counterpart.strip().lower(), subject,
             body_text, body_html, message_id, in_reply_to, int(read),
             created_at or time.time()),
        )
    return get_mail_message(msg_id)


def get_mail_message(msg_id: str) -> dict | None:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT * FROM mail_messages WHERE id = ?", (msg_id,)).fetchone()
    return dict(row) if row else None


def mail_message_id_exists(message_id: str) -> bool:
    if not message_id:
        return False
    with _lock, _connect() as conn:
        return conn.execute(
            "SELECT 1 FROM mail_messages WHERE message_id = ?", (message_id,)
        ).fetchone() is not None


def list_mail_threads() -> list[dict]:
    """One row per counterpart address: latest message + unread count + lead link."""
    with _lock, _connect() as conn:
        rows = conn.execute(
            """
            SELECT m.* FROM mail_messages m
            JOIN (
                SELECT counterpart, MAX(created_at) AS latest
                FROM mail_messages GROUP BY counterpart
            ) t ON m.counterpart = t.counterpart AND m.created_at = t.latest
            ORDER BY m.created_at DESC
            """
        ).fetchall()
        unread = {
            r["counterpart"]: r["n"]
            for r in conn.execute(
                "SELECT counterpart, COUNT(*) AS n FROM mail_messages "
                "WHERE direction = 'in' AND read = 0 GROUP BY counterpart"
            ).fetchall()
        }
    threads = []
    for r in rows:
        d = dict(r)
        d["unread"] = unread.get(d["counterpart"], 0)
        threads.append(d)
    return threads


def list_mail_for_counterpart(counterpart: str) -> list[dict]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM mail_messages WHERE counterpart = ? ORDER BY created_at ASC",
            (counterpart.strip().lower(),),
        ).fetchall()
    return [dict(r) for r in rows]


def mark_mail_read(counterpart: str) -> None:
    with _lock, _connect() as conn:
        conn.execute(
            "UPDATE mail_messages SET read = 1 WHERE counterpart = ? AND direction = 'in'",
            (counterpart.strip().lower(),),
        )


def unread_mail_count() -> int:
    with _lock, _connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM mail_messages WHERE direction = 'in' AND read = 0"
        ).fetchone()
    return row["n"] if row else 0


def latest_inbound_message_id(counterpart: str) -> str | None:
    """Most recent inbound RFC Message-ID for threading replies."""
    with _lock, _connect() as conn:
        row = conn.execute(
            "SELECT message_id FROM mail_messages WHERE counterpart = ? AND direction = 'in' "
            "AND message_id IS NOT NULL ORDER BY created_at DESC LIMIT 1",
            (counterpart.strip().lower(),),
        ).fetchone()
    return row["message_id"] if row else None


def find_lead_by_email(email: str) -> dict | None:
    email = email.strip().lower()
    if not email:
        return None
    with _lock, _connect() as conn:
        row = conn.execute(
            "SELECT * FROM leads WHERE LOWER(TRIM(email)) = ? ORDER BY updated_at DESC LIMIT 1",
            (email,),
        ).fetchone()
    return _row_to_lead(row) if row else None


# --- settings ---

def get_setting(key: str, default: str = "") -> str:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(key: str, value: str) -> None:
    with _lock, _connect() as conn:
        conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))


def all_settings() -> dict:
    hidden = {"secret", "mailbox_imap_password"}
    with _lock, _connect() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
    return {r["key"]: r["value"] for r in rows if r["key"] not in hidden}
