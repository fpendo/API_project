"""Human-in-the-loop bridge for the browsing agent.

When the browsing agent hits something it can't do alone (a captcha, a
one-time code, missing credentials, an approval), it calls ``ask_human``.
The question — plus an optional screenshot — is pushed to the user's
Telegram, and the browse pauses until the user replies or the wait times out.

Design: a module-level registry of pending questions keyed by an id.  The
Telegram bot answers by calling :func:`answer` with the user's next message
when a question is pending for that chat.  Everything is asyncio-native; the
browse runs inside the bot's event loop, so no cross-thread plumbing needed.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_S = 300  # 5 minutes


@dataclass
class _Pending:
    question: str
    event: asyncio.Event = field(default_factory=asyncio.Event)
    answer: str = ""


# chat_id -> pending question (one at a time per chat)
_pending: dict[int, _Pending] = {}

# Callable set by the Telegram bot at startup:
#   async def notify(chat_id: int, text: str, screenshot: bytes | None) -> None
_notifier = None


def set_notifier(fn) -> None:
    """Register the coroutine used to push questions to the user."""
    global _notifier
    _notifier = fn


def has_pending(chat_id: int) -> bool:
    return chat_id in _pending


def answer(chat_id: int, text: str) -> bool:
    """Deliver the user's reply to a waiting browse. Returns True if consumed."""
    p = _pending.get(chat_id)
    if not p:
        return False
    p.answer = text
    p.event.set()
    return True


async def ask_human(
    chat_id: int,
    question: str,
    screenshot: bytes | None = None,
    timeout_s: float = DEFAULT_TIMEOUT_S,
) -> str:
    """Push ``question`` to the user and wait for their reply.

    Returns the reply text, or raises TimeoutError.
    """
    if _notifier is None:
        raise RuntimeError("HITL notifier not registered (bot not running?)")

    qid = uuid.uuid4().hex[:8]
    logger.info("HITL[%s] asking user %s: %s", qid, chat_id, question[:100])

    p = _Pending(question=question)
    _pending[chat_id] = p
    try:
        await _notifier(chat_id, question, screenshot)
        await asyncio.wait_for(p.event.wait(), timeout=timeout_s)
        logger.info("HITL[%s] user replied (%d chars)", qid, len(p.answer))
        return p.answer
    except asyncio.TimeoutError:
        logger.warning("HITL[%s] timed out after %ss", qid, timeout_s)
        raise TimeoutError(f"User did not reply within {int(timeout_s)}s")
    finally:
        _pending.pop(chat_id, None)
