---
title: Deployment
type: architecture
project: Jarvis
updated: 2026-07-02
---

# Deployment

Part of [[Home]].

## Services

| Service | What | Notes |
|---------|------|-------|
| `jarvis` | Telegram bot (`python -m assistant`) | polling; registers browsing runtime |
| `jarvis-web` | FastAPI web PWA (`python -m assistant.web`) | port `JARVIS_WEB_PORT` (default 8810) |

Both run as **systemd** services. The web app is reverse-proxied by nginx at `https://nemx.co.uk/jarvis-voice/` (with `client_max_body_size` raised for image uploads).

## Key config (`.env`)

```
TELEGRAM_BOT_TOKEN=...
ALLOWED_TELEGRAM_USER_IDS=...
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-haiku-...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...             # for TTS
TTS_PROVIDER=openai
OPENAI_TTS_MODEL=gpt-4o-mini-tts
WHISPER_MODEL=base.en
JARVIS_WEB_PASSWORD=...
JARVIS_WEB_PORT=8810
VAULT_DIR=/opt/app/Jarvis/vault
LLM_BROWSE_MODEL=claude-sonnet-4-5
BROWSE_HEADLESS=true
BROWSE_MAX_STEPS=40
```

## Dependencies

`requirements.txt` — python-telegram-bot, faster-whisper, litellm, google-api-python-client, playwright, browser-use, fastapi, uvicorn. After install: `playwright install chromium --with-deps`.

## Secrets NOT in git

`.env`, `client_secret.json`, `data/` (tokens, history, credentials), and `vault/` (personal documents) are all git-ignored.
