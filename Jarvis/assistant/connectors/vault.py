"""Obsidian vault connector.

The vault is a plain folder of Markdown notes plus attachments, laid out so it
opens directly in Obsidian. Documents the user sends over Telegram are filed
here: the scan/photo lands in ``<Category>/attachments/`` and a Markdown note
linking to it (Obsidian embed syntax) is written alongside.

Everything is confined to ``config.vault_dir`` — paths are sanitised so a tool
call can never write outside the vault.
"""

from __future__ import annotations

import re
import shutil
from datetime import datetime
from pathlib import Path

from assistant.core.config import Config

# Suggested top-level categories (folders are created on demand if missing).
CATEGORIES = [
    "Utility Bills",
    "Certificates",
    "Financial",
    "Medical",
    "Property & Home",
    "Insurance",
    "Vehicle",
    "Education",
    "Identity",
    "Receipts",
    "Inbox",
]


def _slug(text: str) -> str:
    text = (text or "").strip()
    text = re.sub(r"[^\w\s.&-]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:120] or "untitled"


def _safe_subpath(vault: Path, *parts: str) -> Path:
    """Resolve parts under the vault and refuse anything that escapes it."""
    candidate = vault.joinpath(*[p for p in parts if p]).resolve()
    if vault not in candidate.parents and candidate != vault:
        raise ValueError("Path escapes the vault.")
    return candidate


def _unique(path: Path) -> Path:
    if not path.exists():
        return path
    stem, suffix, parent = path.stem, path.suffix, path.parent
    i = 2
    while True:
        cand = parent / f"{stem} ({i}){suffix}"
        if not cand.exists():
            return cand
        i += 1


def save_note(
    config: Config,
    *,
    category: str,
    title: str,
    content: str,
    tags: list[str] | None = None,
    date: str | None = None,
) -> dict:
    """Write a plain Markdown note into ``category`` and return its vault path."""
    vault = config.vault_dir
    cat = _slug(category) or "Inbox"
    folder = _safe_subpath(vault, cat)
    folder.mkdir(parents=True, exist_ok=True)

    note_path = _unique(folder / f"{_slug(title)}.md")
    fm = _frontmatter(title=title, category=cat, date=date, tags=tags)
    note_path.write_text(fm + "\n" + (content or "").strip() + "\n", encoding="utf-8")
    return {"ok": True, "note": str(note_path.relative_to(vault)), "category": cat}


def file_document(
    config: Config,
    *,
    inbox_path: str,
    category: str,
    title: str,
    summary: str = "",
    tags: list[str] | None = None,
    date: str | None = None,
    fields: dict | None = None,
) -> dict:
    """Move a previously-saved inbox file into ``category/attachments`` and
    write a Markdown note that embeds it."""
    vault = config.vault_dir
    src = Path(inbox_path)
    if not src.is_absolute():
        src = (config.data_dir / inbox_path).resolve()
    if not src.exists():
        return {"error": f"Source file not found: {inbox_path}"}

    cat = _slug(category) or "Inbox"
    folder = _safe_subpath(vault, cat)
    attach_dir = folder / "attachments"
    attach_dir.mkdir(parents=True, exist_ok=True)

    title_slug = _slug(title)
    dest_file = _unique(attach_dir / f"{title_slug}{src.suffix.lower()}")
    shutil.copy2(src, dest_file)
    try:
        src.unlink()
    except OSError:
        pass

    note_path = _unique(folder / f"{title_slug}.md")
    body = [_frontmatter(title=title, category=cat, date=date, tags=tags, source="telegram")]
    body.append(f"\n# {title}\n")
    if summary:
        body.append(summary.strip() + "\n")
    if fields:
        body.append("\n## Details\n")
        for k, v in fields.items():
            if v:
                body.append(f"- **{k}**: {v}")
        body.append("")
    # Obsidian embed of the attachment (relative wiki link).
    body.append(f"\n## Document\n\n![[{cat}/attachments/{dest_file.name}]]\n")
    note_path.write_text("\n".join(body), encoding="utf-8")

    return {
        "ok": True,
        "note": str(note_path.relative_to(vault)),
        "attachment": str(dest_file.relative_to(vault)),
        "category": cat,
    }


_STOP = frozenset({
    # articles / prepositions / conjunctions
    "a", "an", "the", "is", "in", "of", "my", "me", "to", "do", "i",
    "was", "for", "on", "are", "at", "by", "be", "or", "and", "it",
    "its", "he", "she", "we", "you", "his", "her", "as", "up", "can",
    "has", "have", "had", "did", "does", "will", "would", "could", "should",
    # question words (never appear in documents)
    "what", "when", "where", "who", "whom", "whose", "which", "why", "how",
    # misc filler
    "tell", "show", "get", "find", "give", "look", "know", "please",
    "son", "daughter", "child",  # too generic to be meaningful keywords
})


# Max characters of note body returned inline by search (keeps tokens sane).
_MAX_CONTENT = 2000


def _keywords(query: str) -> list[str]:
    """Split query into meaningful lowercase tokens, filtering stop-words.

    Strips possessives / contractions (``'s``, ``'t``, ``'re`` …) and
    normalises punctuation before splitting so "what's my son's date of birth"
    extracts ["date", "birth"] rather than failing on "what's"/"son's".
    """
    # Remove possessives and common contractions first.
    q = re.sub(r"'s\b|'\w+", "", query.lower())
    words = re.split(r"[^\w]+", q.strip())
    keys = [w for w in words if len(w) > 2 and w not in _STOP]
    return keys if keys else [w for w in words if w]


def search(config: Config, query: str, max_results: int = 20) -> list[dict]:
    """Keyword search across note filenames and Markdown contents.

    The query is split into individual keywords (stop-words removed).  A note
    matches if the full query string appears verbatim OR all keywords appear
    somewhere in the filename or body.  This lets multi-word queries like
    "Alfonso date of birth" match a file that contains "Alfonso" and "birth"
    even though those words are on different lines.
    """
    vault = config.vault_dir
    q = (query or "").lower().strip()
    if not q:
        return []
    keywords = _keywords(q)
    hits: list[dict] = []
    for md in sorted(vault.rglob("*.md")):
        try:
            text = md.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        name = md.stem.lower()
        haystack = name + " " + text.lower()
        # Match if literal query string present, or all keywords are present.
        matched = q in haystack or all(kw in haystack for kw in keywords)
        if matched:
            # Build snippet around the first keyword found.
            first_kw = next((kw for kw in keywords if kw in text.lower()), q)
            snippet = _snippet(text, first_kw)
            # Include the full note body (capped) so the model can answer
            # directly without a follow-up vault_read_note call. Notes are
            # small, so this is cheap and removes a whole LLM round-trip.
            content = text.strip()
            truncated = len(content) > _MAX_CONTENT
            hits.append(
                {
                    "path": str(md.relative_to(vault)),
                    "title": md.stem,
                    "category": md.relative_to(vault).parts[0] if md.parent != vault else "",
                    "snippet": snippet,
                    "content": content[:_MAX_CONTENT],
                    "truncated": truncated,
                }
            )
        if len(hits) >= max_results:
            break
    return hits


def read_note(config: Config, path: str) -> dict:
    vault = config.vault_dir
    note = _safe_subpath(vault, *Path(path).parts)
    if not note.exists() or note.suffix != ".md":
        return {"error": f"Note not found: {path}"}
    return {"path": path, "content": note.read_text(encoding="utf-8", errors="ignore")}


def list_vault(config: Config, category: str | None = None) -> dict:
    vault = config.vault_dir
    if category:
        base = _safe_subpath(vault, _slug(category))
        if not base.exists():
            return {"category": category, "notes": [], "error": "Category not found."}
    else:
        base = vault
    notes = [str(p.relative_to(vault)) for p in sorted(base.rglob("*.md"))]
    cats = [p.name for p in sorted(vault.iterdir()) if p.is_dir() and not p.name.startswith(".")]
    return {"categories": cats, "notes": notes}


def _frontmatter(
    *,
    title: str,
    category: str,
    date: str | None,
    tags: list[str] | None,
    source: str | None = None,
) -> str:
    created = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M")
    lines = ["---", f"title: {title}", f"category: {category}"]
    lines.append(f"date: {date or datetime.now().strftime('%Y-%m-%d')}")
    if tags:
        lines.append("tags: [" + ", ".join(_slug(t).replace(" ", "-") for t in tags) + "]")
    if source:
        lines.append(f"source: {source}")
    lines.append(f"added: {created}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def _snippet(text: str, q: str, width: int = 160) -> str:
    low = text.lower()
    idx = low.find(q)
    if idx == -1:
        return text.strip()[:width]
    start = max(0, idx - width // 2)
    end = min(len(text), idx + width // 2)
    return text[start:end].replace("\n", " ").strip()
