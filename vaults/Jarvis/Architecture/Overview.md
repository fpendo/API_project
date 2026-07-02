---
title: Overview
type: architecture
project: Jarvis
updated: 2026-07-02
---

# Overview

Part of [[Home]].

## What it is

Jarvis is a personal AI assistant with two front ends — a **Telegram bot** (voice + text) and a **ChatGPT-style web PWA** — sharing the same agent, tools, STT, TTS and on-disk memory.

## Module layout (`/opt/app/Jarvis/assistant/`)

| Package | Responsibility |
|---------|----------------|
| `bot/` | Telegram handlers, local transcription, TTS, daily briefing |
| `agent/` | LLM client (litellm), tool schemas, reasoning loop, memory |
| `connectors/` | Gmail, Calendar, Drive, Tasks, Obsidian vault, web search, school portal |
| `core/` | Config + per-user storage |
| `web/` | FastAPI browser voice app (PWA) |
| `browsing/` | Self-learning agentic web browsing (browser-use + Sonnet) |
| `scripts/` | One-off CLIs (Google login) |

## Data & memory

- Per-user Google tokens under `data/<user_id>/` (git-ignored)
- Conversation history stored on disk per user
- Personal Obsidian vault at `/opt/app/Jarvis/vault/` (bills, certificates, family) — **separate from this project vault**

## Access control

Only Telegram user IDs in `ALLOWED_TELEGRAM_USER_IDS` can use the bot. The web app is protected by a shared password (`JARVIS_WEB_PASSWORD`) with an HMAC-signed HttpOnly cookie; requires HTTPS for microphone access.
