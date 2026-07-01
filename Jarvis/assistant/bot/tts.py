"""Text-to-speech for voice replies.

Two providers, selectable via ``TTS_PROVIDER`` in the config:

* ``edge``   - Microsoft Edge neural voices (free, no key, decent but a bit
               robotic). Voice name like ``en-GB-ThomasNeural``.
* ``openai`` - OpenAI's ``gpt-4o-mini-tts`` (the smooth, lifelike ChatGPT-style
               voice; needs an OpenAI API key). Voice name like ``ash``/``onyx``
               and an optional free-text tone instruction.

Public helpers return raw audio bytes; callers pass the ``Config`` so provider
selection and credentials come from one place. ``synthesize_mp3`` is for the
browser (<audio> plays MP3 natively); ``synthesize_ogg`` is for Telegram voice
notes (OGG/Opus).
"""

from __future__ import annotations

import asyncio
import logging
import re
import subprocess
import tempfile
from pathlib import Path

import edge_tts

from assistant.core.config import Config

logger = logging.getLogger(__name__)

# Telegram voice notes cap out around a few minutes; keep replies sane.
_MAX_CHARS = 3000


def _clean_for_speech(text: str) -> str:
    """Strip Markdown/URLs so they aren't read aloud character by character."""
    text = re.sub(r"!?\[\[([^\]]+)\]\]", r"\1", text)          # wiki links
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r"\1", text)  # md links
    text = re.sub(r"https?://\S+", "", text)                    # bare urls
    text = re.sub(r"[*_`#>]", "", text)                          # md emphasis
    text = re.sub(r"\n{2,}", ". ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:_MAX_CHARS]


# ---------------------------------------------------------------------------
# OpenAI provider
# ---------------------------------------------------------------------------

def _openai_speech(config: Config, text: str, fmt: str) -> bytes | None:
    """Synthesize with OpenAI TTS. ``fmt`` is 'mp3' or 'opus'."""
    if not config.openai_api_key:
        logger.warning("TTS_PROVIDER=openai but OPENAI_API_KEY is empty; falling back to edge.")
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=config.openai_api_key)
        kwargs: dict = {
            "model": config.openai_tts_model,
            "voice": config.openai_tts_voice,
            "input": text,
            "response_format": fmt,
        }
        # Tone steering is only supported on the gpt-4o(-mini)-tts models.
        if config.tts_instructions and "tts" in config.openai_tts_model:
            kwargs["instructions"] = config.tts_instructions
        resp = client.audio.speech.create(**kwargs)
        return resp.content
    except Exception:  # noqa: BLE001 - fall back to edge/text
        logger.exception("OpenAI TTS synthesis failed")
        return None


# ---------------------------------------------------------------------------
# Edge provider
# ---------------------------------------------------------------------------

async def _edge_save(text: str, voice: str, out_mp3: Path) -> None:
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(out_mp3))


def _edge_mp3(config: Config, text: str) -> bytes | None:
    with tempfile.TemporaryDirectory() as tmp:
        mp3 = Path(tmp) / "reply.mp3"
        asyncio.run(_edge_save(text, config.tts_voice, mp3))
        if not mp3.exists() or mp3.stat().st_size == 0:
            return None
        return mp3.read_bytes()


def _mp3_to_ogg(mp3_bytes: bytes) -> bytes | None:
    """Convert MP3 bytes to OGG/Opus (Telegram voice-note format) via ffmpeg."""
    with tempfile.TemporaryDirectory() as tmp:
        mp3 = Path(tmp) / "in.mp3"
        ogg = Path(tmp) / "out.ogg"
        mp3.write_bytes(mp3_bytes)
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(mp3),
                "-c:a", "libopus", "-b:a", "48k", "-ar", "48000", "-ac", "1",
                str(ogg),
            ],
            check=True,
        )
        return ogg.read_bytes()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def synthesize_mp3(text: str, config: Config) -> bytes | None:
    """Return MP3 audio bytes for ``text`` (browser playback), or None."""
    spoken = _clean_for_speech(text)
    if not spoken:
        return None
    try:
        if config.tts_provider == "openai":
            data = _openai_speech(config, spoken, "mp3")
            if data:
                return data
            # fall through to edge if OpenAI failed/unconfigured
        return _edge_mp3(config, spoken)
    except Exception:  # noqa: BLE001
        logger.exception("TTS mp3 synthesis failed")
        return None


def synthesize_ogg(text: str, config: Config) -> bytes | None:
    """Return OGG/Opus audio bytes for ``text`` (Telegram voice note), or None."""
    spoken = _clean_for_speech(text)
    if not spoken:
        return None
    try:
        if config.tts_provider == "openai":
            data = _openai_speech(config, spoken, "opus")
            if data:
                return data
            # fall through to edge if OpenAI failed/unconfigured
        mp3 = _edge_mp3(config, spoken)
        if not mp3:
            return None
        return _mp3_to_ogg(mp3)
    except Exception:  # noqa: BLE001
        logger.exception("TTS ogg synthesis failed")
        return None
