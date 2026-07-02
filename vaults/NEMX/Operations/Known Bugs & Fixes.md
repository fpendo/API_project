---
title: Known Bugs & Fixes
type: operations
project: NEMX
source: KNOWLEDGE_BASE.md, progress.md
updated: 2026-07-02
---

# Known Bugs & Fixes

Part of [[Home]]. Sources: `/opt/app/KNOWLEDGE_BASE.md`, `/opt/app/progress.md`. See [[Dev Workflow]].

## Bug 1: Broker-developer trades — no transaction hash (FIXED)

- **Symptoms:** trades in DB but `transaction_hash = NULL`; credits don't appear in accounts summary.
- **Root cause:** `seed.py` uses placeholder EVM addresses (`0x4444…` broker, `0x5555…` developer) that don't exist on Hardhat; `.env` keys don't match.
- **Fix:** run `fix_broker_developer_addresses.py`, update `.env` keys, restart backend, run `retroactive_transfer.py`.
- **Prevention:** always run `post_reset_fix.py --yes` after `reset_db.py --seed`.

## Bug 2: Landowner transfer button disabled (FIXED)

- **Root cause:** `credits_summary.py` subtracted `assigned_credits` twice (already deducted on-chain).
- **Fix:** `remaining_credits = unlocked_credits` (don't subtract assigned again). File: `app/services/credits_summary.py` ~line 220.

## Bug 3: Database reset address/key mismatch (FIXED)

- **Fix script:** `post_reset_fix.py` — updates DB addresses to real Hardhat accounts + syncs `.env`.
- **Workflow:** `reset_db.py --seed --yes` → `post_reset_fix.py --yes` → restart backend.

## Bug 4: Portal login 502 Bad Gateway (FIXED, 2026-06-29)

- **Root cause:** `portal-backend.service` pointed to `/opt/app/portal/backend` (wrong path); venv had stale paths.
- **Fix:** repoint to `/opt/app/nemx/portal/backend`, recreate venv, restart. Verify `/api/auth/login` returns 401/200 not 502.

## Bug 5: Production blank page (FIXED, 2026-01-07)

- **Root cause:** hardcoded `http://localhost:8000` in page files; missing React Router basename.
- **Fix:** centralised `API_BASE_URL` from `api/config.ts`; `basename='/nemx'` in production.

## Seed data caveat

`seed.py` still has placeholder addresses for broker/developer/regulator/consultant/planning/operator — only landowner (#0) has a real Hardhat address. Must run post-reset fix for trading demos.
