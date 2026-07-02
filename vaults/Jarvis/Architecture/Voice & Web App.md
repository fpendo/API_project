---
title: Voice & Web App
type: architecture
project: Jarvis
updated: 2026-07-02
---

# Voice & Web App

Part of [[Home]]. Location: `assistant/bot/`, `assistant/web/`.

## Speech-to-text (STT)

- **Engine:** faster-whisper (local, private — audio never leaves the machine)
- **Model:** `base.en` (2× faster than `small`, similar English accuracy)
- **Settings:** `beam_size=1`, `condition_on_previous_text=False` for speed
- Pre-warmed on `jarvis-web` startup

## Text-to-speech (TTS)

- **Provider:** OpenAI `gpt-4o-mini-tts` (lifelike), configured British + male voice via `TTS_INSTRUCTIONS`
- **Fallback:** edge-tts (free, robotic) + ffmpeg for OGG
- Refactored `bot/tts.py` supports multiple providers via `TTS_PROVIDER`

## Telegram bot (`bot/telegram_bot.py`)

- Voice, text, and photo handlers
- Voice-reply modes: `auto` / `always` / `off`
- Daily briefing scheduler (per-user time)
- `post_init` hook wires the browsing runtime + migrates school portal creds
- Intercepts replies when a browse is awaiting human input (see [[Self-Learning Web Browsing]])

## Web PWA (`assistant/web/`)

ChatGPT-style browser interface reusing the same agent/STT/TTS/memory:

- **Auto-plays** spoken replies; continuous **hands-free** loop via browser-side voice-activity detection
- **PWA:** `manifest.json` + service worker (`sw.js`), installable with home-screen icon, in-app "Install" button (triggered by `beforeinstallprompt`)
- **Camera button** — photograph a document; it's uploaded to `/api/photo`, filed into the vault (see [[Vault Filing]])
- Endpoints: `/api/voice`, `/api/text`, `/api/photo`, plus login/logout
- Flow: browser mic (webm/opus) → ffmpeg→wav → faster-whisper → run_agent → OpenAI TTS(mp3) → auto-play
