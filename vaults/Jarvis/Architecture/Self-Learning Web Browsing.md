---
title: Self-Learning Web Browsing
type: architecture
project: Jarvis
updated: 2026-07-02
---

# Self-Learning Web Browsing

Part of [[Home]]. Location: `assistant/browsing/`. Built 2026-07-01.

Jarvis can browse real websites (log in, navigate, extract), **teach itself reusable skills**, and replay them deterministically next time.

## How it works

1. **Skill check** — has Jarvis done this task on this site before? If yes → replay the stored script (fast, ~free, no AI).
2. **Explore** — if no skill (or replay broke), a Sonnet-powered `browser-use` agent drives headless Chrome: sees the page, decides actions, iterates until the goal is met.
3. **Learn** — on success, Sonnet converts the action log into a standalone Playwright script, saved as a named skill.
4. **Self-heal** — if a replay fails because the site changed, it re-explores and regenerates the script.
5. **Human-in-the-loop** — when stuck (captcha, one-time code, missing creds), it messages the user on Telegram with a screenshot and waits for a reply.

## Files

| File | Purpose |
|------|---------|
| `engine.py` | browser-use Agent wrapper (Sonnet, headless Chrome, step/time budgets, action-log + screenshot capture); single-browse lock |
| `skills.py` | Skill library under `data/skills/<domain>/<slug>/` (`script.py` + `meta.json`). `browse_or_replay` orchestrates replay → explore → learn → self-heal |
| `codegen.py` | Sonnet turns a successful action log into a parameterised `async def run(page, creds)` Playwright script; syntax-checked before saving |
| `credentials.py` | Per-site store `data/credentials.json` (chmod 600), injected via browser-use `sensitive_data` so secrets never reach the LLM |
| `hitl.py` | Telegram ask-human bridge: push question + screenshot, wait up to 5 min for reply |
| `runtime.py` | Background execution — bot process (event loop, full HITL) or web-app process (daemon thread, result via standalone Bot) |

## Tools

- `browse_web(task, site)` — schedules a background browse, returns "started" immediately; the result arrives as a follow-up Telegram message
- `list_web_skills()` — lists learned skills (site, task, last success)

## Config

| Var | Default | Purpose |
|-----|---------|---------|
| `LLM_BROWSE_MODEL` | `claude-sonnet-4-5` | Browsing brain (chat stays on Haiku) |
| `BROWSE_HEADLESS` | `true` | Headless Chrome |
| `BROWSE_MAX_STEPS` | `40` | Max agent steps per exploratory run |
| `ANONYMIZED_TELEMETRY` | `false` | Disable browser-use telemetry |

## Proven end-to-end

School portal newsletter: run 1 logged in, navigated to the pre-prep newsletter (Microsoft Sway), extracted the full text (~9 min, 20 steps) and saved a skill. The self-heal loop triggers re-exploration + improved script generation when a replay's selectors are too brittle.

## Caveats

- Big retailers (Deliveroo, Sainsbury's) run bot detection; some sites need retries or may block headless browsers.
- Exploratory runs cost ~10–40p in Sonnet tokens; replays are essentially free.
- One browse at a time (server has ~3.8 GB RAM).
- **Phase 2 (not built):** payments via Revolut with a hard authorisation gate and spend caps.
