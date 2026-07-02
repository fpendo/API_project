---
title: Conversation Log
type: log
project: Jarvis
updated: 2026-07-02
---

# Conversation Log

Part of [[Home]]. Cleaned-up summary of the chat requests that built this project. Source chat: [Jarvis and vaults build](9b5826ef-01cc-4760-8316-841c4dfc1a4d).

> Spelling/grammar tidied from the original voice-dictated messages; intent preserved.

## Project setup & hosting

- Bring a local project ("Jarvis", the personal assistant, from a Windows desktop folder) onto the server: create a `Jarvis/` folder, transfer the files to Linode, and expose it on the NEMX portal via a thumbnail after the admin page.
- Move Telegram from the local machine to the **Linode-hosted** version; verify it works via Linode.

## Obsidian personal vault

- Create an Obsidian vault **for personal artifacts** (utility bills, birth certificates, etc.) — separate from NEMX and the farming project.
- Set up vault sync (Syncthing) between devices — including finding the device ID and troubleshooting download links/versions.
- Add **audio responses** in Telegram (a spoken answer, not just text).

## The birth-certificate bug

- Loaded a son's birth certificate; it filed successfully, but asking "what's my son's date of birth?" failed to retrieve it. Root cause: vault search did literal substring matching, so multi-word queries missed. Fixed with keyword matching + better stop-word/possessive handling, cleared stale history, and added honesty guardrails. See [[Changelog & History]].

## Conversational voice & the web app

- Wanted a **ChatGPT-like conversational voice** instead of tap-to-play Telegram voice notes → built the web voice **PWA** (installable, home-screen icon). Debugged the Android install menu and phone cache/refresh.
- **Latency:** investigate and reduce lag; optimise vault search (shouldn't take ~20s for 1–2 items). → Whisper `small`→`base.en`, `beam_size` 5→1, vault returns full content, model pre-warm (~50% faster).
- **Voice quality:** "too robotic" → moved to OpenAI lifelike TTS; make it **punchier, British and male**; discussed Sonnet vs Haiku and costs. Set up OpenAI billing/API key (fixed a duplicate `.env` key).

## Photo filing, guardrails, Google auth

- Add PWA **photo capture** → parse/store documents in the vault. Confirmed **no pre-built filing framework needed** — Jarvis picks the category at filing time.
- Add **guardrails**: never lie, fake information, or hallucinate. Added to the system prompt.
- **Gmail/Calendar access broke** (`invalid_grant`); re-authenticated via manual console flow, moved the Google Cloud project to **Production** for permanent tokens.

## Self-learning web browsing

- Big feature request: Jarvis should browse the web, log into portals (e.g. the kids' school portal), parse info, and bring it back — learning and **writing its own code** per site, storing the route for reuse, prompting the user only for credentials/captcha/2FA, and (later) handling payments via Revolut behind an authorisation gate. Crucially, the user should **not** have to code how Jarvis navigates each site. → Built the `assistant/browsing/` package (see [[Self-Learning Web Browsing]]) and pushed to git.

## Vault organisation (this session)

- Discussed one mega-vault vs separate vaults → decided **separate**: personal stays personal; each software project gets its own vault. Created project vaults for NEMX, ETAnalytics, Jarvis, and Agrios/Gupworthy Farm. See [[Multi-Vault Support]].
