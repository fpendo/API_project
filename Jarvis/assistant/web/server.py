"""FastAPI app powering the browser voice interface.

Flow per turn:
  browser mic (webm/opus)  ->  /api/voice
    -> ffmpeg to 16k mono wav
    -> faster-whisper transcribe
    -> run_agent (same agent/tools/memory as Telegram)
    -> edge-TTS to mp3
    -> JSON { transcript, reply, audio (base64 mp3) }
  browser auto-plays the audio and (in hands-free mode) re-arms the mic.

Auth: a single shared password (JARVIS_WEB_PASSWORD). On login we set an
HttpOnly cookie holding an HMAC token derived from the password, so the
check is stateless and survives restarts. If no password is configured the
app refuses to start the protected endpoints (fails closed) unless running
on localhost for testing.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import subprocess
import tempfile
from pathlib import Path

import time

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from assistant.agent.agent import run_agent
from assistant.agent.llm import _set_api_keys
from assistant.bot.transcribe import transcribe_file
from assistant.bot.tts import synthesize_mp3
from assistant.core.config import load_config

logger = logging.getLogger("jarvis.web")

config = load_config()
_set_api_keys(config)

STATIC_DIR = Path(__file__).parent / "static"
COOKIE_NAME = "jarvis_session"


def _user_id() -> int:
    """Reuse the single allowed Telegram user id so web + bot share memory."""
    return next(iter(config.allowed_user_ids), 0)


def _auth_token() -> str:
    secret = (config.web_password or "jarvis-dev").encode("utf-8")
    return hmac.new(secret, b"jarvis-voice-auth", hashlib.sha256).hexdigest()


def _is_authed(request: Request) -> bool:
    if not config.web_password:
        # No password set: open (intended only for localhost/testing).
        return True
    return hmac.compare_digest(request.cookies.get(COOKIE_NAME, ""), _auth_token())


def _require_auth(request: Request) -> None:
    if not _is_authed(request):
        raise HTTPException(status_code=401, detail="Not authenticated")


app = FastAPI(title="Jarvis Voice")

# Serve icons directory as static files.
app.mount("/icons", StaticFiles(directory=str(STATIC_DIR / "icons")), name="icons")


@app.on_event("startup")
async def _warm_models() -> None:
    """Pre-load the Whisper model so the first voice request isn't slow."""
    def _warm() -> None:
        try:
            from assistant.bot.transcribe import _get_model
            _get_model(
                config.whisper_model,
                config.whisper_device,
                config.whisper_compute_type,
            )
            logger.info("Whisper model '%s' pre-loaded.", config.whisper_model)
        except Exception:  # noqa: BLE001
            logger.exception("Whisper warmup failed")

    await run_in_threadpool(_warm)


@app.get("/", response_class=HTMLResponse)
async def index() -> HTMLResponse:
    return HTMLResponse((STATIC_DIR / "index.html").read_text(encoding="utf-8"))


@app.get("/manifest.json")
async def manifest() -> FileResponse:
    return FileResponse(str(STATIC_DIR / "manifest.json"), media_type="application/manifest+json")


@app.get("/sw.js")
async def service_worker() -> FileResponse:
    # Must be served from the app's scope root (/jarvis-voice/) so it can
    # control that scope.  Cache-Control: no-cache lets the browser check for
    # updates on every navigation.
    return FileResponse(
        str(STATIC_DIR / "sw.js"),
        media_type="application/javascript",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/apple-touch-icon.png")
async def apple_touch_icon() -> FileResponse:
    return FileResponse(str(STATIC_DIR / "apple-touch-icon.png"), media_type="image/png")


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "auth_required": bool(config.web_password)}


@app.get("/api/session")
async def session(request: Request) -> dict:
    return {"authed": _is_authed(request)}


@app.post("/api/login")
async def login(request: Request, response: Response) -> JSONResponse:
    body = await request.json()
    password = str(body.get("password", ""))
    if not config.web_password:
        return JSONResponse({"ok": True})
    if not hmac.compare_digest(password, config.web_password):
        return JSONResponse({"ok": False, "error": "Wrong password"}, status_code=401)
    resp = JSONResponse({"ok": True})
    resp.set_cookie(
        COOKIE_NAME,
        _auth_token(),
        max_age=60 * 60 * 24 * 30,
        httponly=True,
        samesite="lax",
        secure=True,
    )
    return resp


@app.post("/api/logout")
async def logout() -> JSONResponse:
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE_NAME)
    return resp


def _transcribe_bytes(raw: bytes, suffix: str) -> str:
    """Convert arbitrary browser audio to 16k mono wav, then transcribe."""
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / f"in{suffix}"
        wav = Path(tmp) / "in.wav"
        src.write_bytes(raw)
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-loglevel", "error",
                    "-i", str(src),
                    "-ar", "16000", "-ac", "1",
                    str(wav),
                ],
                check=True,
            )
            target = str(wav)
        except Exception:  # noqa: BLE001 - fall back to letting whisper decode directly
            logger.exception("ffmpeg decode failed; transcribing source directly")
            target = str(src)
        return transcribe_file(config, target)


def _process_turn(text: str) -> dict:
    """Run the agent on text and synthesize speech. Heavy/blocking; off-thread."""
    reply = run_agent(config, _user_id(), text)
    audio_b64 = ""
    mp3 = synthesize_mp3(reply, config)
    if mp3:
        audio_b64 = base64.b64encode(mp3).decode("ascii")
    return {"reply": reply, "audio": audio_b64}


@app.post("/api/voice")
async def voice(request: Request, audio: UploadFile = File(...)) -> JSONResponse:
    _require_auth(request)
    raw = await audio.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty audio")
    suffix = ".webm"
    if audio.filename and "." in audio.filename:
        suffix = "." + audio.filename.rsplit(".", 1)[-1]
    transcript = await run_in_threadpool(_transcribe_bytes, raw, suffix)
    if not transcript.strip():
        return JSONResponse(
            {"transcript": "", "reply": "I didn't catch that — try again?", "audio": ""}
        )
    result = await run_in_threadpool(_process_turn, transcript)
    return JSONResponse({"transcript": transcript, **result})


@app.post("/api/text")
async def text(request: Request, message: str = Form(...)) -> JSONResponse:
    _require_auth(request)
    msg = message.strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Empty message")
    result = await run_in_threadpool(_process_turn, msg)
    return JSONResponse({"transcript": msg, **result})


def _process_photo(image_bytes: bytes, mime: str, suffix: str, caption: str) -> dict:
    """Save image to inbox, build multimodal content, run agent, synthesize."""
    uid = _user_id()
    # Save to inbox using the same layout as the Telegram bot.
    inbox = config.data_dir / str(uid) / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    fname = f"{time.strftime('%Y%m%d_%H%M%S')}{suffix}"
    # Avoid clobbering.
    dest = inbox / fname
    i = 2
    while dest.exists():
        dest = inbox / f"{Path(fname).stem} ({i}){suffix}"
        i += 1
    dest.write_bytes(image_bytes)
    inbox_rel = f"{uid}/inbox/{dest.name}"

    b64 = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:{mime};base64,{b64}"

    instruction = (
        ((caption.strip() + "\n\n") if caption.strip() else "")
        + "Here is a photo of a document. The original image has been saved to my "
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

    reply = run_agent(config, uid, content)
    audio_b64 = ""
    mp3 = synthesize_mp3(reply, config)
    if mp3:
        audio_b64 = base64.b64encode(mp3).decode("ascii")
    return {"reply": reply, "audio": audio_b64}


@app.post("/api/photo")
async def photo(
    request: Request,
    image: UploadFile = File(...),
    caption: str = Form(default=""),
) -> JSONResponse:
    _require_auth(request)
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image")

    mime = image.content_type or "image/jpeg"
    suffix_map = {
        "image/jpeg": ".jpg", "image/png": ".png",
        "image/gif": ".gif", "image/webp": ".webp", "image/heic": ".heic",
    }
    suffix = suffix_map.get(mime, ".jpg")
    if image.filename:
        sfx = Path(image.filename).suffix.lower()
        if sfx:
            suffix = sfx

    result = await run_in_threadpool(_process_photo, raw, mime, suffix, caption)
    return JSONResponse(result)
