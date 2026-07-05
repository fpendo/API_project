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
