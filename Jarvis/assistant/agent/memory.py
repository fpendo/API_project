"""Per-user conversation memory, persisted to disk.

Keeps a rolling window of recent user/assistant turns so the assistant has
context across messages — and now across restarts/deploys. Each user's history
is stored as JSON under ``<DATA_DIR>/<user_id>/history.json``. Only clean text
turns are kept; the internal tool-call/tool-result messages from a single turn
are not persisted, which keeps token usage and complexity down.
"""

from __future__ import annotations

import json
import os
from collections import deque
from pathlib import Path

# Total number of user+assistant messages to retain per user.
_MAX_TURNS = 16

# Resolve the data dir the same way core.config does, so files line up.
_DATA_DIR = Path(os.getenv("DATA_DIR", "data")).resolve()

# In-memory cache of deques, lazily loaded from disk per user.
_cache: dict[int, deque[dict]] = {}


def _history_file(user_id: int) -> Path:
    d = _DATA_DIR / str(user_id)
    d.mkdir(parents=True, exist_ok=True)
    return d / "history.json"


def _load(user_id: int) -> deque[dict]:
    if user_id in _cache:
        return _cache[user_id]
    dq: deque[dict] = deque(maxlen=_MAX_TURNS)
    path = _history_file(user_id)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        for turn in data[-_MAX_TURNS:]:
            if isinstance(turn, dict) and turn.get("role") and turn.get("content"):
                dq.append({"role": turn["role"], "content": turn["content"]})
    except (OSError, json.JSONDecodeError):
        pass
    _cache[user_id] = dq
    return dq


def _save(user_id: int) -> None:
    try:
        _history_file(user_id).write_text(
            json.dumps(list(_cache[user_id]), ensure_ascii=False), encoding="utf-8"
        )
    except OSError:
        pass


def get_history(user_id: int) -> list[dict]:
    return list(_load(user_id))


def add_turn(user_id: int, role: str, content: str) -> None:
    if not content:
        return
    dq = _load(user_id)
    dq.append({"role": role, "content": content})
    _save(user_id)


def clear(user_id: int) -> None:
    _load(user_id).clear()
    _save(user_id)
