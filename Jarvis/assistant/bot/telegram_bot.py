"""Telegram bot: voice + text in, assistant replies out (text or voice)."""

from __future__ import annotations

import asyncio
import base64
import logging
import tempfile
import time as _time
from datetime import time as dtime
from pathlib import Path
from zoneinfo import ZoneInfo

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from assistant.agent.agent import run_agent
from assistant.agent.memory import clear as clear_history
from assistant.bot import briefing as briefing_mod
from assistant.bot import tts
from assistant.bot.transcribe import transcribe_file
from assistant.browsing import credentials as browse_creds
from assistant.browsing import hitl
from assistant.browsing import runtime as browse_runtime
from assistant.core.config import Config
from assistant.core.store import UserStore

logger = logging.getLogger(__name__)

_VALID_VOICE_MODES = {"auto", "always", "off"}
_TZ = ZoneInfo("Europe/London")
_DEFAULT_BRIEFING_TIME = "07:00"


def _authorized(config: Config, user_id: int | None) -> bool:
    if config.allow_all_users:
        return True
    return user_id is not None and user_id in config.allowed_user_ids


def _voice_mode(config: Config, user_id: int) -> str:
    store = UserStore(config, user_id)
    return store.get_setting("voice_replies", config.voice_replies)


async def _post_init(app: Application) -> None:
    """Runs inside the bot's event loop once it's up: wire the browsing runtime."""
    config: Config = app.bot_data["config"]
    default_chat = next(iter(config.allowed_user_ids), None)
    browse_runtime.register(app, asyncio.get_running_loop(), default_chat)
    try:
        browse_creds.migrate_school_portal(config)
    except Exception:  # noqa: BLE001
        logger.exception("school portal credential migration failed")


def build_application(config: Config) -> Application:
    app = (
        Application.builder()
        .token(config.telegram_bot_token)
        .post_init(_post_init)
        .build()
    )
    app.bot_data["config"] = config

    app.add_handler(CommandHandler("start", _start))
    app.add_handler(CommandHandler("id", _whoami))
    app.add_handler(CommandHandler("reset", _reset))
    app.add_handler(CommandHandler("voice", _voice))
    app.add_handler(CommandHandler("briefing", _briefing))
    app.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, _on_voice))
    app.add_handler(MessageHandler(filters.PHOTO, _on_photo))
    # Image files sent as documents (e.g. uncompressed) also count.
    app.add_handler(MessageHandler(filters.Document.IMAGE, _on_photo))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, _on_text))

    # Schedule daily briefings for known users.
    if app.job_queue is not None:
        for uid in config.allowed_user_ids:
            _schedule_briefing(app, config, uid)
    else:
        logger.warning("JobQueue unavailable; daily briefings disabled.")

    return app


def _schedule_briefing(app: Application, config: Config, user_id: int) -> None:
    """(Re)schedule a user's daily briefing from their saved setting."""
    if app.job_queue is None:
        return
    name = f"briefing_{user_id}"
    for job in app.job_queue.get_jobs_by_name(name):
        job.schedule_removal()

    setting = UserStore(config, user_id).get_setting("briefing_time", _DEFAULT_BRIEFING_TIME)
    if not setting or setting == "off":
        return
    try:
        hh, mm = (int(x) for x in setting.split(":"))
    except (ValueError, AttributeError):
        hh, mm = 7, 0
    app.job_queue.run_daily(
        _briefing_job,
        time=dtime(hour=hh, minute=mm, tzinfo=_TZ),
        name=name,
        data=user_id,
    )
    logger.info("Scheduled daily briefing for %s at %02d:%02d", user_id, hh, mm)


async def _briefing_job(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Job callback: build and send the daily briefing."""
    config: Config = context.bot_data["config"]
    user_id = context.job.data
    try:
        text = await asyncio.to_thread(briefing_mod.build_briefing, config, user_id)
    except Exception:  # noqa: BLE001
        logger.exception("scheduled briefing failed")
        return
    await context.bot.send_message(chat_id=user_id, text=text)


async def _start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    await update.message.reply_text(
        "Hi! I'm your personal assistant.\n"
        f"Your Telegram user ID is: {user.id}\n\n"
        "I can read your Gmail, manage your Calendar and Tasks, search the web, "
        "and file documents into your personal Obsidian vault — just send a photo "
        "of a bill or certificate and say 'file this' (or ask me to pull one from "
        "your email).\n\n"
        "I'll reply by voice when you speak to me — /voice always, /voice off or "
        "/voice auto to change that.\n"
        "I'll send a morning briefing daily — /briefing for it now, /briefing 07:30 "
        "to set the time, or /briefing off."
    )


async def _whoami(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(f"Your Telegram user ID is: {update.effective_user.id}")


async def _reset(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    clear_history(update.effective_user.id)
    await update.message.reply_text("Conversation context cleared. Starting fresh.")


async def _voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/voice [auto|always|off] - control spoken replies."""
    config: Config = context.bot_data["config"]
    user_id = update.effective_user.id
    arg = (context.args[0].lower() if context.args else "").strip()
    store = UserStore(config, user_id)

    if arg in _VALID_VOICE_MODES:
        store.set_setting("voice_replies", arg)
        explain = {
            "auto": "I'll reply with voice when you send voice notes, and text when you type.",
            "always": "I'll always reply with a voice note (plus the text).",
            "off": "I'll only reply with text.",
        }[arg]
        await update.message.reply_text(f"Voice replies: *{arg}*. {explain}", parse_mode="Markdown")
    else:
        current = _voice_mode(config, user_id)
        await update.message.reply_text(
            f"Voice replies are currently *{current}*.\n"
            "Use:\n"
            "• `/voice auto` — speak back when I'm spoken to\n"
            "• `/voice always` — always send a voice note\n"
            "• `/voice off` — text only",
            parse_mode="Markdown",
        )


async def _briefing(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/briefing — run now. /briefing HH:MM — set daily time. /briefing off — disable."""
    config: Config = context.bot_data["config"]
    user_id = update.effective_user.id
    if not _authorized(config, user_id):
        await update.message.reply_text("Sorry, you're not authorised to use this bot.")
        return

    arg = (context.args[0].lower() if context.args else "").strip()
    store = UserStore(config, user_id)

    if arg == "off":
        store.set_setting("briefing_time", "off")
        _schedule_briefing(context.application, config, user_id)
        await update.message.reply_text("Daily briefing turned off. Use /briefing HH:MM to re-enable.")
        return

    if arg and ":" in arg:
        try:
            hh, mm = (int(x) for x in arg.split(":"))
            assert 0 <= hh < 24 and 0 <= mm < 60
        except (ValueError, AssertionError):
            await update.message.reply_text("Please give a time like /briefing 07:00")
            return
        store.set_setting("briefing_time", f"{hh:02d}:{mm:02d}")
        _schedule_briefing(context.application, config, user_id)
        await update.message.reply_text(
            f"Daily briefing scheduled for {hh:02d}:{mm:02d} (UK time). Send /briefing any time to get it now."
        )
        return

    # No arg: send the briefing now.
    await update.effective_chat.send_action("typing")
    try:
        text = await asyncio.to_thread(briefing_mod.build_briefing, config, user_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("manual briefing failed")
        text = f"Couldn't build your briefing: {exc}"
    await _send_reply(update, config, text, spoke=False)


async def _send_reply(update: Update, config: Config, reply: str, *, spoke: bool) -> None:
    """Send the assistant reply as text, voice, or both per the user's setting."""
    mode = _voice_mode(config, update.effective_user.id)
    want_voice = mode == "always" or (mode == "auto" and spoke)

    if not want_voice:
        await update.message.reply_text(reply)
        return

    # Generate speech off the event loop (edge-tts + ffmpeg are blocking).
    ogg = await asyncio.to_thread(tts.synthesize_ogg, reply, config)
    if ogg:
        await update.effective_chat.send_action("record_voice")
        await update.message.reply_voice(voice=bytes(ogg))
        # Also send the text so links (e.g. calendar) stay tappable.
        await update.message.reply_text(reply)
    else:
        await update.message.reply_text(reply)


async def _handle_request(
    update: Update, config: Config, content: object, *, spoke: bool = False
) -> None:
    """``content`` is a plain string or a multimodal content list (for photos)."""
    user_id = update.effective_user.id
    await update.effective_chat.send_action("typing")
    try:
        reply = run_agent(config, user_id, content)
    except Exception as exc:  # noqa: BLE001 - report any failure back to the user
        logger.exception("agent failed")
        reply = f"Something went wrong: {exc}"
    await _send_reply(update, config, reply, spoke=spoke)


async def _on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    config: Config = context.bot_data["config"]
    user_id = update.effective_user.id
    if not _authorized(config, user_id):
        await update.message.reply_text("Sorry, you're not authorised to use this bot.")
        return
    # If a browse is waiting on the user (captcha/code/approval), this message
    # is the answer — route it to the paused browse instead of the agent.
    if hitl.has_pending(user_id) and hitl.answer(user_id, update.message.text):
        await update.message.reply_text("Got it — carrying on with the browse…")
        return
    await _handle_request(update, config, update.message.text, spoke=False)


async def _on_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    config: Config = context.bot_data["config"]
    if not _authorized(config, update.effective_user.id):
        await update.message.reply_text("Sorry, you're not authorised to use this bot.")
        return

    voice = update.message.voice or update.message.audio
    tg_file = await context.bot.get_file(voice.file_id)

    with tempfile.TemporaryDirectory() as tmp:
        audio_path = Path(tmp) / "voice.ogg"
        await tg_file.download_to_drive(str(audio_path))
        text = transcribe_file(config, str(audio_path))

    if not text:
        await update.message.reply_text("I couldn't make out any speech in that message.")
        return

    await update.message.reply_text(f'I heard: "{text}"')
    await _handle_request(update, config, text, spoke=True)


async def _on_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    config: Config = context.bot_data["config"]
    user_id = update.effective_user.id
    if not _authorized(config, user_id):
        await update.message.reply_text("Sorry, you're not authorised to use this bot.")
        return

    msg = update.message
    # Photos arrive in several sizes; the last is the highest resolution.
    if msg.photo:
        tg_file = await context.bot.get_file(msg.photo[-1].file_id)
        mime, ext = "image/jpeg", ".jpg"
    else:  # image sent as a document
        tg_file = await context.bot.get_file(msg.document.file_id)
        mime = msg.document.mime_type or "image/jpeg"
        ext = Path(msg.document.file_name or "doc.jpg").suffix or ".jpg"

    file_bytes = bytes(await tg_file.download_as_bytearray())

    # Save the original to the user's inbox so it can be filed into the vault.
    store = UserStore(config, user_id)
    fname = f"{_time.strftime('%Y%m%d_%H%M%S')}{ext}"
    inbox_file = store.inbox_dir / fname
    inbox_file.write_bytes(file_bytes)
    # Path the vault tool understands (relative to data_dir).
    inbox_rel = f"{user_id}/inbox/{fname}"

    b64 = base64.b64encode(file_bytes).decode("ascii")
    data_url = f"data:{mime};base64,{b64}"

    caption = (msg.caption or "").strip()
    instruction = (
        (caption + "\n\n") if caption else ""
    ) + (
        "Here is a photo of a document. The original image has been saved to my "
        f"inbox at path: {inbox_rel}\n"
        "Read it and tell me what it is. If it's something worth keeping (bill, "
        "certificate, statement, letter, receipt, ID, etc.), file it into my "
        "Obsidian vault with vault_file_document using that exact inbox_path, "
        "choosing the right category and a clear title, and extract key details. "
        "Also, if it contains any appointment or event, add it to my calendar. "
        "Then give me a short summary of what you filed."
    )

    content = [
        {"type": "text", "text": instruction},
        {"type": "image_url", "image_url": {"url": data_url}},
    ]
    await _handle_request(update, config, content, spoke=False)
