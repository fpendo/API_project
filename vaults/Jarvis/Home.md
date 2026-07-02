---
title: Jarvis — Project Home
type: index
project: Jarvis
updated: 2026-07-02
---

# Jarvis (Personal AI Assistant)

A voice-driven personal assistant you talk to via **Telegram voice notes** and a **ChatGPT-style web PWA**. It transcribes locally, reasons with a low-cost LLM, and acts on connected services (Gmail, Calendar, Drive, Tasks, an Obsidian vault). It can also **browse the web agentically** and teach itself reusable "skills".

- **Location:** `/opt/app/Jarvis/`
- **Live:** Telegram bot + `https://nemx.co.uk/jarvis-voice/`
- **Note:** this is the **project/dev** vault. The user's **personal** documents live in a separate vault at `/opt/app/Jarvis/vault/`.

## Map of this vault

### Architecture
- [[Overview]] — what it is, module layout
- [[Agent & Tools]] — LLM agent, tool schemas, connectors
- [[Voice & Web App]] — STT, TTS, PWA
- [[Self-Learning Web Browsing]] — the browser-use agent + skill system
- [[Deployment]] — systemd services, nginx, config

### Features
- [[Vault Filing]] — how documents get filed
- [[Multi-Vault Support]] — searching multiple Obsidian vaults (personal + project)

### Operations
- [[Changelog & History]] — build history and known issues

## One-line summary

Speak or type → Whisper STT (local) → Claude agent with tools (Gmail/Calendar/Drive/Tasks/vault/web) → reply as text + lifelike TTS voice. For login-gated sites, an agentic browser (Sonnet + browser-use) logs in, extracts, and saves a replayable skill.

## Tech stack

- **Bot:** python-telegram-bot (async)
- **STT:** faster-whisper (local, `base.en`)
- **TTS:** OpenAI `gpt-4o-mini-tts` (British male voice) with edge-tts fallback
- **LLM:** Claude Haiku (chat) + Claude Sonnet (browsing brain) via litellm
- **Web app:** FastAPI + uvicorn, PWA (manifest + service worker)
- **Browsing:** browser-use + Playwright headless Chromium
