---
title: Changelog & History
type: operations
project: Jarvis
source: Jarvis/CHANGELOG.md, Jarvis/README.md
updated: 2026-07-02
---

# Changelog & History

Part of [[Home]]. Source: `/opt/app/Jarvis/CHANGELOG.md`.

## 2026-07-01 — Self-Learning Web Browsing

Added the `assistant/browsing/` package (browser-use + Sonnet), `browse_web` / `list_web_skills` tools, HITL bridge, credential store, and background execution. Proven end-to-end on the school portal. See [[Self-Learning Web Browsing]]. Committed to git (`5dde387`).

## 2026-06-28 (approx) — Voice PWA + polish

- Web voice app turned into an installable **PWA** (manifest, service worker, icons, in-app install button)
- **Photo capture** button → documents filed into the vault (see [[Vault Filing]])
- Latency work: Whisper `small`→`base.en`, `beam_size` 5→1, vault_search returns full content (fewer LLM round-trips), model pre-warm — ~50% faster voice turns
- TTS switched to **OpenAI** lifelike voice (British, male); edge-tts kept as fallback
- Honesty guardrails added to the system prompt

## Known issues resolved

- **Gmail/Calendar `invalid_grant`** — refresh token revoked because the Google Cloud project was in "Testing". Re-authenticated via a manual console flow; project moved to **Production** for permanent tokens.
- **PWA install menu hidden on Android** — page's `100dvh` + `overflow:hidden` stopped Chrome's toolbar reappearing; fixed with an in-app install button.
- **Stale PWA content on phone** — bumped service worker cache version (`jarvis-v2`→`v3`) to force client update.
- **`OPENAI_API_KEY` not picked up** — a duplicate key at the end of `.env` overrode the intended one.
- **Vault search missing DOB** — search did literal substring matching; changed to keyword matching (all keywords present), improved stop-word/possessive handling; cleared stale history.

## Roadmap

- **Phase 2 browsing:** payments via Revolut with hard authorisation gate + spend caps
- **Multi-vault search:** let Jarvis query project vaults, not just personal — see [[Multi-Vault Support]]
