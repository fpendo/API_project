# Personal Assistant

A voice-driven personal assistant you talk to via **Telegram voice notes**. It
transcribes your request locally, figures out intent with a low-cost LLM, and
acts on your connected services. Built to run locally first, then move to the
cloud (Linode) as a multi-tenant, strictly-isolated service.

## Status

**Phase 1 (current):** Telegram voice bot + Gmail (read) + Google Calendar
(read/create). No money involved.

Planned next:
- **Phase 2:** read-only WhatsApp via a Node/Baileys sidecar.
- **Phase 3:** Revolut Business API payments (sandbox first, with guardrails).
- **Phase 4:** Linode deploy with per-user encrypted vaults and strict isolation.

## Architecture

```
Telegram voice ─▶ faster-whisper (local STT) ─▶ LLM agent (+tools) ─▶ Gmail / Calendar
```

- `assistant/bot/` – Telegram handlers + local transcription
- `assistant/agent/` – LLM client, tool schemas, reasoning loop
- `assistant/connectors/` – Gmail, Calendar (Revolut/WhatsApp later)
- `assistant/core/` – config + per-user storage
- `assistant/scripts/` – one-off CLIs (Google login)
- `assistant/web/` – ChatGPT-style browser voice app (FastAPI + uvicorn)
- `assistant/browsing/` – self-learning agentic web browsing (browser-use + Sonnet)

## Self-learning web browsing

Jarvis can browse real websites (log in, navigate, extract) via the
`browse_web` tool and **teaches itself reusable skills**:

1. First request for a task → an exploratory agent (browser-use + Sonnet,
   `LLM_BROWSE_MODEL`) drives headless Chromium until the goal is reached.
2. On success, Sonnet converts the action log into a standalone Playwright
   script stored under `data/skills/<domain>/<slug>/` (`script.py` + `meta.json`).
3. Next time the same task is a deterministic **replay** — seconds, no LLM.
   If the site changed and replay breaks, it self-heals: re-explores and
   re-generates the script.

Other pieces:
- **Credentials** live in `data/credentials.json` (chmod 600), injected via
  browser-use `sensitive_data` so they never reach the LLM prompt.
- **Human-in-the-loop**: when the agent hits a captcha / one-time code it
  messages you on Telegram (with screenshot) and waits up to 5 min for a reply.
- Browses run in the **background**: Jarvis acknowledges immediately, then
  sends the result as a follow-up Telegram message.
- Config: `LLM_BROWSE_MODEL` (default `claude-sonnet-4-5`), `BROWSE_HEADLESS`,
  `BROWSE_MAX_STEPS`. One browse at a time (server RAM constraint).

## Browser voice app (ChatGPT-style)

A web front-end that reuses the same agent, Whisper STT, edge-TTS and on-disk
conversation memory as the Telegram bot, but auto-plays spoken replies and
supports a continuous **hands-free** conversation loop (browser-side silence
detection re-arms the mic after each reply).

```
browser mic (webm/opus) ─▶ ffmpeg→wav ─▶ faster-whisper ─▶ run_agent ─▶ edge-TTS(mp3) ─▶ auto-play
```

- Run locally: `python -m assistant.web` (serves on `127.0.0.1:$JARVIS_WEB_PORT`).
- On Linode it runs as the **`jarvis-web`** systemd service, reverse-proxied by
  nginx at `https://nemx.co.uk/jarvis-voice/`.
- Protected by a single shared password (`JARVIS_WEB_PASSWORD`); login sets an
  HMAC-signed HttpOnly cookie. Requires HTTPS (microphone access).
- Config: `JARVIS_WEB_PASSWORD`, `JARVIS_WEB_PORT` (default `8810`).

## Setup (Windows / PowerShell)

Requires **Python 3.12** (the local speech-to-text engine has the best wheel
support there).

```powershell
# 1. Create and activate a virtual environment
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure
Copy-Item .env.example .env
# Edit .env and fill in TELEGRAM_BOT_TOKEN and LLM_API_KEY (see below).
```

### Get a Telegram bot token
Message [@BotFather](https://t.me/BotFather), run `/newbot`, and paste the token
into `TELEGRAM_BOT_TOKEN` in `.env`.

### Choose a low-cost LLM
- **OpenAI:** set `LLM_API_KEY`, leave `LLM_BASE_URL` empty, `LLM_MODEL=gpt-5-nano`.
- **Google Gemini (often cheapest):** set `LLM_API_KEY` to a Gemini key,
  `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`,
  `LLM_MODEL=gemini-2.5-flash-lite`.

### Set up Google (Gmail, Calendar, Drive, Tasks)
1. In the [Google Cloud Console](https://console.cloud.google.com/), create a
   project and enable **Gmail API**, **Google Calendar API**, **Google Drive API**,
   and **Google Tasks API**.
2. Configure the OAuth consent screen (External; add yourself as a test user).
3. Create **OAuth client credentials → Desktop app**, download the JSON, and save
   it as `client_secret.json` in the project root (or point
   `GOOGLE_CLIENT_SECRETS_FILE` at it).

## Run

```powershell
# Start the bot
python -m assistant
```

Then in Telegram:
1. Send `/start` to your bot — it replies with your **Telegram user ID**.
2. Put that ID in `ALLOWED_TELEGRAM_USER_IDS` in `.env` (restart the bot).
3. Link your Google account (opens a browser once):
   ```powershell
   python -m assistant.scripts.google_login --user <your_telegram_user_id>
   ```
4. Send a voice note, e.g. *"Send me my latest email about guitar lessons."*

## Notes
- Speech-to-text runs locally (`faster-whisper`); your audio never leaves the machine.
- Google tokens are stored per user under `data/<user_id>/` and are git-ignored.
- Only user IDs in `ALLOWED_TELEGRAM_USER_IDS` can use the bot.
