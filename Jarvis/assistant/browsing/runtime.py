"""Runtime coordinator that lets a synchronous agent tool launch an async
browse on the Telegram bot's event loop and report the result back.

Why: ``run_agent`` (and therefore ``execute_tool``) runs synchronously, but a
browse is async, long-running, and may need to prompt the user mid-flight
(HITL). So the ``browse_web`` tool does NOT block — it schedules the browse on
the bot's event loop and returns immediately. When the browse finishes, the
result is pushed to the user on Telegram.

The Telegram bot registers itself here at startup (``register``). Browse
results and HITL prompts are always delivered via Telegram — that's where the
user is, and HITL fundamentally needs a push channel.

The web app runs in a separate process where the bot isn't registered; there
we fall back to running the browse on a dedicated background thread and
delivering the result via a direct Telegram HTTP API call. HITL is disabled
in that mode (replies would land in the bot process), so the browsing agent
simply fails gracefully if it needs human input.
"""

from __future__ import annotations

import asyncio
import logging
import threading

from assistant.browsing import hitl, skills
from assistant.core.config import Config

logger = logging.getLogger(__name__)

_app = None            # telegram Application
_loop = None           # its event loop
_default_chat_id = None


def register(app, loop, default_chat_id: int | None) -> None:
    """Called by the Telegram bot at startup."""
    global _app, _loop, _default_chat_id
    _app, _loop, _default_chat_id = app, loop, default_chat_id
    hitl.set_notifier(_notify_user)
    logger.info("browsing runtime registered (default chat %s)", default_chat_id)


def is_ready() -> bool:
    return _app is not None and _loop is not None


async def _notify_user(chat_id: int, text: str, screenshot: bytes | None) -> None:
    """HITL notifier: push a question (and optional screenshot) to Telegram."""
    target = chat_id or _default_chat_id
    if _app is None or target is None:
        return
    prompt = f"\U0001f9e9 Jarvis needs you:\n\n{text}\n\n(Reply here to continue.)"
    if screenshot:
        try:
            await _app.bot.send_photo(chat_id=target, photo=bytes(screenshot), caption=prompt[:1024])
            return
        except Exception:  # noqa: BLE001 - fall back to text
            logger.debug("HITL screenshot send failed", exc_info=True)
    await _app.bot.send_message(chat_id=target, text=prompt)


def schedule_browse(config: Config, task: str, site: str, chat_id: int | None) -> bool:
    """Schedule a background browse; result is pushed to the user on Telegram.

    In the bot process the browse runs on the bot's event loop (full HITL
    support). In other processes (web app) it runs on a daemon thread with
    its own loop and the result is sent via a standalone Bot client.
    """
    target = chat_id or _default_chat_id
    if is_ready():
        coro = _run_and_report(config, task, site, target)
        asyncio.run_coroutine_threadsafe(coro, _loop)
        return True

    if not config.telegram_bot_token or target is None:
        return False
    threading.Thread(
        target=lambda: asyncio.run(_run_standalone(config, task, site, target)),
        daemon=True,
        name="browse-standalone",
    ).start()
    return True


async def _run_standalone(config: Config, task: str, site: str, chat_id: int) -> None:
    """Web-app process path: browse without HITL, report via a fresh Bot."""
    from telegram import Bot

    try:
        # chat_id=None disables the ask_human action (no notifier here).
        outcome = await skills.browse_or_replay(config, task, site, None)
    except Exception as exc:  # noqa: BLE001
        logger.exception("standalone browse failed")
        outcome = {"ok": False, "result": "", "note": f"Browse crashed: {exc}"}

    try:
        bot = Bot(token=config.telegram_bot_token)
        async with bot:
            await bot.send_message(chat_id=chat_id, text=_format_outcome(outcome))
    except Exception:  # noqa: BLE001
        logger.exception("failed to send standalone browse result")


def _format_outcome(outcome: dict) -> str:
    if outcome.get("ok"):
        body = outcome.get("result") or "(done, but nothing to report)"
        mode = outcome.get("mode", "")
        note = outcome.get("note", "")
        tag = "\u26a1 replayed a saved skill" if mode == "replay" else "\U0001f50d explored the site"
        msg = f"{body}\n\n\u2014 {tag}."
        if note and mode != "replay":
            msg += f" {note}"
    else:
        errs = "; ".join(outcome.get("errors", [])) if outcome.get("errors") else ""
        msg = "I couldn't finish that browse. " + (outcome.get("note") or "")
        if errs:
            msg += f"\n\nDetails: {errs}"
    return msg[:4000]


async def _run_and_report(
    config: Config, task: str, site: str, chat_id: int | None
) -> None:
    """Bot-process path: run the browse and send the result to the user."""
    try:
        outcome = await skills.browse_or_replay(config, task, site, chat_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("background browse failed")
        outcome = {"ok": False, "result": "", "note": f"Browse crashed: {exc}"}

    if _app is None or chat_id is None:
        return
    try:
        await _app.bot.send_message(chat_id=chat_id, text=_format_outcome(outcome))
    except Exception:  # noqa: BLE001
        logger.exception("failed to send browse result")
