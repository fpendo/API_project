"""Gmail connector: search and read messages (read-only)."""

from __future__ import annotations

import base64
from dataclasses import dataclass
from pathlib import Path

from googleapiclient.discovery import build

from assistant.connectors.google_auth import load_credentials
from assistant.core.config import Config


@dataclass
class EmailSummary:
    id: str
    sender: str
    subject: str
    date: str
    snippet: str


def _service(config: Config, user_id: int):
    creds = load_credentials(config, user_id)
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def _header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def search_email(
    config: Config, user_id: int, query: str, max_results: int = 5
) -> list[EmailSummary]:
    """Search Gmail using Gmail query syntax and return lightweight summaries."""
    service = _service(config, user_id)
    listing = (
        service.users()
        .messages()
        .list(userId="me", q=query, maxResults=max(1, min(max_results, 20)))
        .execute()
    )
    results: list[EmailSummary] = []
    for item in listing.get("messages", []):
        msg = (
            service.users()
            .messages()
            .get(
                userId="me",
                id=item["id"],
                format="metadata",
                metadataHeaders=["From", "Subject", "Date"],
            )
            .execute()
        )
        headers = msg.get("payload", {}).get("headers", [])
        results.append(
            EmailSummary(
                id=msg["id"],
                sender=_header(headers, "From"),
                subject=_header(headers, "Subject"),
                date=_header(headers, "Date"),
                snippet=msg.get("snippet", ""),
            )
        )
    return results


def _decode_part(data: str) -> str:
    return base64.urlsafe_b64decode(data.encode("utf-8")).decode("utf-8", errors="replace")


def _extract_body(payload: dict) -> str:
    """Walk the MIME tree and return the best-effort plain-text body."""
    mime = payload.get("mimeType", "")
    body = payload.get("body", {})
    if mime == "text/plain" and body.get("data"):
        return _decode_part(body["data"])

    parts = payload.get("parts", [])
    # Prefer text/plain, fall back to text/html stripped-ish.
    for part in parts:
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return _decode_part(part["body"]["data"])
    for part in parts:
        text = _extract_body(part)
        if text:
            return text
    if body.get("data"):
        return _decode_part(body["data"])
    return ""


def _collect_attachments(payload: dict, out: list[dict]) -> None:
    """Walk the MIME tree and collect attachment metadata."""
    filename = payload.get("filename", "")
    body = payload.get("body", {})
    attachment_id = body.get("attachmentId")
    if filename and attachment_id:
        out.append(
            {
                "filename": filename,
                "mimeType": payload.get("mimeType", "application/octet-stream"),
                "size": int(body.get("size") or 0),
                "attachment_id": attachment_id,
            }
        )
    for part in payload.get("parts", []):
        _collect_attachments(part, out)


def list_email_attachments(config: Config, user_id: int, message_id: str) -> list[dict]:
    """List attachments on an email (filename, type, size). Does not download them."""
    service = _service(config, user_id)
    msg = (
        service.users()
        .messages()
        .get(userId="me", id=message_id, format="full")
        .execute()
    )
    attachments: list[dict] = []
    _collect_attachments(msg.get("payload", {}), attachments)
    for att in attachments:
        att["message_id"] = message_id
    return attachments


def download_attachment(
    config: Config,
    user_id: int,
    message_id: str,
    attachment_id: str,
    filename: str,
) -> str:
    """Download a Gmail attachment into the user's inbox and return its path
    (relative to DATA_DIR), ready to pass to the vault filing tool."""
    service = _service(config, user_id)
    att = (
        service.users()
        .messages()
        .attachments()
        .get(userId="me", messageId=message_id, id=attachment_id)
        .execute()
    )
    raw = base64.urlsafe_b64decode(att["data"].encode("utf-8"))

    inbox = config.data_dir / str(user_id) / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename or "attachment").name or "attachment"
    dest = inbox / safe_name
    # Avoid clobbering an existing inbox file.
    i = 2
    while dest.exists():
        dest = inbox / f"{Path(safe_name).stem} ({i}){Path(safe_name).suffix}"
        i += 1
    dest.write_bytes(raw)
    return f"{user_id}/inbox/{dest.name}"


def get_email(config: Config, user_id: int, message_id: str) -> dict:
    """Return the full content of a single email."""
    service = _service(config, user_id)
    msg = (
        service.users()
        .messages()
        .get(userId="me", id=message_id, format="full")
        .execute()
    )
    payload = msg.get("payload", {})
    headers = payload.get("headers", [])
    body = _extract_body(payload).strip()
    # Keep token usage sane for the LLM.
    if len(body) > 8000:
        body = body[:8000] + "\n...[truncated]"
    return {
        "id": msg["id"],
        "from": _header(headers, "From"),
        "to": _header(headers, "To"),
        "subject": _header(headers, "Subject"),
        "date": _header(headers, "Date"),
        "body": body,
    }
