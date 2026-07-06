---
title: Known Bugs & Fixes
type: operations
project: Designo
updated: 2026-07-06
---

# Known Bugs & Fixes

Part of [[Home]]. See [[Dev Workflow]].

## Malformed JSON from Fable (root-caused 2026-07-05)

**Symptom:** concept stage repeatedly failed with `Expecting ',' delimiter` at char ~19–22k, always in the same region.
**Root cause:** `_develop_concept` capped at `max_tokens=8000`; artwork-heavy photo-less briefs (6–10 detailed artwork commissions) **truncate mid-JSON** at that limit. It was cut-off output, not model noise.
**Fix:** raised to **16000**; `call_claude_json` retries 3×, repairs unescaped newlines/tabs and trailing commas, and dumps failed raw output to `/tmp/designo_bad_json_*.txt`.
**Lesson:** if JSON errors cluster at similar char positions, suspect truncation before blaming the model.

## systemd respawns the backend

Manual `kill`/`nohup` on the backend gets silently respawned — `designo-backend.service` has `Restart=always`. Always `systemctl restart designo-backend`.

## Orphaned transient statuses after restart

Background threads (generation, photo edits) die with the process, leaving rows stuck in `generating`/`editing`. Both DBs now run **startup recovery** flipping those to `error` with a clear message. Lead pipeline is resumable — retry reuses the existing brief/mockup.

## fal.ai flakiness

- 403s on retouch were transient rate limiting → semaphore-limited concurrency + retries on 403/429/5xx, and error detail extraction (`_raise_with_detail`).
- "no video url in response" was actually an aspect-ratio validation failure → source images centre-cropped/downscaled to 2048px before submission.

## Claude vision `ThinkingBlock`

Fable 5 responses can contain `ThinkingBlock` objects; naive `content[0].text` access breaks. Extract text blocks explicitly.

## API was wide open

All `/api/*` endpoints were unauthenticated until 2026-07-05. Now protected by `auth.py` middleware (HMAC cookie), with a short exempt list (auth, config, signature-verified webhooks, localhost preview capture).

## Stripe

- Sessions were being created on every proposal **page view** → moved to button-click POSTs only.
- stripe-python 15.x deprecated `stripe.error.*` → use top-level `stripe.InvalidRequestError` / `stripe.SignatureVerificationError`.

## Stale pricing defaults

Confirmed pricing is **£695/£59**; old £495/£39 defaults lingered in the settings table after the code change → one-time DB update. Settings persist in SQLite; changing `DEFAULT_SETTINGS` doesn't touch existing rows.

## Anthropic credit exhaustion

Generation fails hard when the API key runs out of credits — not a code issue; top up and re-run.

## Bot walls blocked visual audits (2026-07-06)

The creative-director screenshots ([[Website Audit Methodology]]) initially failed on ~1/3 of sites: SiteGround's `sgcaptcha` and Cloudflare "checking your browser" interstitials were what got screenshotted, so Fable either guessed from the challenge page or returned `unknown`. Fixes in `visual_audit.py`: playwright-stealth 2.x patches on the context, poll up to 40s until challenge URL/body markers clear (they resolve themselves via JS), auto-click cookie-consent "Accept" so modals don't cover the design, `networkidle` wait, and one retry with a 12s settle when the model still says `unknown`. Same challenge-polling added to `site_scraper._fetch_rendered`. Also added a `dead` verdict — "site not found"/parking pages used to be judged as designs; now they import as top-priority abandoned-site leads.

## Environment reset lost all uncommitted work (2026-07-06)

The VM reverted mid-session: every uncommitted file under `/opt/app` vanished (all designo backend/frontend sources, the nginx `portal` site config, `.env`, vault notes, progress entries). Restored from git + `deploy/nginx/portal.conf` + the chat transcript; `.env` recreated by hand; SQLite DBs in `designo/storage/` survived. **Commit and push at the end of every session.**

## `pkill -f` self-match

`pkill -f retry_visual.py` killed the invoking shell because the pattern matched its own command line. Use `pgrep -f "patter[n]" | xargs -r kill`.
