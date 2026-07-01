# Jarvis Changelog

## 2026-07-01 — Self-Learning Web Browsing

### New: `assistant/browsing/` package

Jarvis can now browse real websites with a headless Chrome browser, learn how
to do it, and replay the learned flow deterministically next time.

#### What was built

| File | Purpose |
|---|---|
| `assistant/browsing/__init__.py` | Package docstring / entry point |
| `assistant/browsing/credentials.py` | Per-site credential store (`data/credentials.json`, chmod 600). School portal creds migrated in automatically. Credentials are injected via browser-use `sensitive_data` — they never enter the LLM prompt or logs. |
| `assistant/browsing/hitl.py` | Human-in-the-loop bridge. When the browse agent hits a captcha / one-time code it calls `ask_human(question, screenshot)` which pushes a Telegram message and waits (up to 5 min) for the user's reply. |
| `assistant/browsing/engine.py` | browser-use Agent wrapper powered by Sonnet (`LLM_BROWSE_MODEL`). Headless Chrome, configurable step/time budget, captures action log + screenshots. One browse at a time (server RAM lock). |
| `assistant/browsing/codegen.py` | After a successful exploratory run, Sonnet converts the action log into a standalone Playwright `async def run(page, creds)` script. Script is syntax-checked before saving. |
| `assistant/browsing/skills.py` | Skill library at `data/skills/<domain>/<slug>/`. `browse_or_replay` is the main entry point: tries replay first, falls back to explore + learn, self-heals on replay failure. |
| `assistant/browsing/runtime.py` | Coordinates background execution. In the Telegram bot process: schedules on the bot's event loop (full HITL). In the web-app process: runs on a daemon thread and posts the result via a standalone Bot client. |

#### Tool integration

Two new LLM tools added to `assistant/agent/tools.py`:

- **`browse_web(task, site)`** — schedules a background browse and returns
  `"started"` immediately. Result arrives as a follow-up Telegram message.
- **`list_web_skills()`** — lists all saved skills (site, task, last success).

System prompt in `agent.py` updated with clear guidance: when to use
`browse_web` vs `fetch_web_page`, that browse_web runs in the background, and
never to invent a result before it arrives.

#### Telegram bot changes (`assistant/bot/telegram_bot.py`)

- `_post_init` hook registered at startup: wires the browsing runtime and
  migrates school portal credentials.
- Incoming text messages check `hitl.has_pending(user_id)` first; if a browse
  is paused waiting for user input, the reply is routed to the HITL bridge
  instead of the agent.

#### Config additions (`assistant/core/config.py` + `.env`)

| Variable | Default | Purpose |
|---|---|---|
| `LLM_BROWSE_MODEL` | `claude-sonnet-4-5` | Sonnet for the browsing brain (chat stays on Haiku) |
| `BROWSE_HEADLESS` | `true` | Headless Chrome |
| `BROWSE_MAX_STEPS` | `40` | Max agent steps per exploratory run |
| `ANONYMIZED_TELEMETRY` | `false` | Disable browser-use telemetry |

#### Dependencies

- `browser-use>=0.13` (MIT, Playwright-based agentic browsing)
- `playwright` (already present) — Chromium downloaded to `~/.cache/ms-playwright`

#### Acceptance test results

**Run 1 (explore + learn):** The agent logged into
`kingshalltaunton.myschoolportal.co.uk`, navigated to Newsletters, opened the
latest pre-prep newsletter in Microsoft Sway, extracted the full text, and
generated + saved a Playwright replay script. ~9 min, 20 steps, Sonnet.

**Run 2 (replay):** Replay attempted; the generated script had a strict-mode
selector issue (multiple matching elements). The self-heal path triggered a
second exploratory run that generated an improved script. The self-heal loop
is working as designed — future replays use the better script.

#### Known limitations / next steps

- The replay script selector quality depends on the first exploratory run.
  Harder-to-scrape sites (Sway, SPAs) may need a few learn → fail → re-learn
  cycles before selectors stabilise.
- Exploratory runs cost ~10–40p in Sonnet tokens; replays are essentially free.
- Only one browse at a time (server has 3.8 GB RAM).
- Phase 2 (payments via Revolut with hard authorisation gate) not yet built.

---

## 2026-06-28 — Voice PWA + OpenAI TTS + Photo filing + Web browsing setup

See previous session notes (summarised in `README.md`).
