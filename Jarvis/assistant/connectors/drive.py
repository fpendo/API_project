"""Google Drive connector: search and browse files (read-only)."""

from __future__ import annotations

from googleapiclient.discovery import build

from assistant.connectors.google_auth import load_credentials
from assistant.core.config import Config

# Fields returned for every file listing.
_FILE_FIELDS = "nextPageToken, files(id, name, mimeType, modifiedTime, parents, webViewLink, size)"


def _service(config: Config, user_id: int):
    creds = load_credentials(config, user_id)
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def _summarise(file: dict) -> dict:
    return {
        "id": file.get("id"),
        "name": file.get("name"),
        "mimeType": file.get("mimeType"),
        "modifiedTime": file.get("modifiedTime"),
        "parents": file.get("parents", []),
        "webViewLink": file.get("webViewLink", ""),
        "size": file.get("size"),
    }


def search_drive(
    config: Config,
    user_id: int,
    query: str,
    max_results: int = 20,
) -> list[dict]:
    """Search Drive using Drive query syntax.

    Examples:
        name contains 'invoice'
        mimeType = 'application/pdf'
        modifiedTime > '2026-01-01T00:00:00'
        'root' in parents and trashed = false
    """
    service = _service(config, user_id)
    q = query.strip()
    if "trashed" not in q.lower():
        q = f"({q}) and trashed = false" if q else "trashed = false"

    result = (
        service.files()
        .list(
            q=q,
            pageSize=max(1, min(max_results, 50)),
            fields=_FILE_FIELDS,
            orderBy="modifiedTime desc",
        )
        .execute()
    )
    return [_summarise(f) for f in result.get("files", [])]


def list_folder(
    config: Config,
    user_id: int,
    folder_id: str = "root",
    max_results: int = 30,
) -> list[dict]:
    """List files directly inside a folder. Use folder_id='root' for My Drive root."""
    service = _service(config, user_id)
    q = f"'{folder_id}' in parents and trashed = false"
    result = (
        service.files()
        .list(
            q=q,
            pageSize=max(1, min(max_results, 50)),
            fields=_FILE_FIELDS,
            orderBy="folder,name",
        )
        .execute()
    )
    return [_summarise(f) for f in result.get("files", [])]


def get_file(config: Config, user_id: int, file_id: str) -> dict:
    """Return metadata for a single Drive file."""
    service = _service(config, user_id)
    file = (
        service.files()
        .get(fileId=file_id, fields="id, name, mimeType, modifiedTime, parents, webViewLink, size, description")
        .execute()
    )
    return _summarise(file)
