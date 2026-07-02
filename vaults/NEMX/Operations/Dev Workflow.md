---
title: Dev Workflow
type: operations
project: NEMX
updated: 2026-07-02
---

# Dev Workflow

Part of [[Home]]. See [[Deployment]], [[Known Bugs & Fixes]].

## Run the full stack locally

```bash
# 1. Start Hardhat node
npx hardhat node                                   # from /opt/app

# 2. Deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# 3. Start NEMX backend
cd /opt/app/nemx/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 4. Start NEMX frontend (dev)
cd /opt/app/nemx/backend/frontend
npm run dev                                        # :5173, proxies /api → :8000
```

## After a DB reset

```bash
python reset_db.py --seed --yes
python post_reset_fix.py --yes                     # fixes addresses/keys (see Known Bugs & Fixes)
# then restart backend
```

## Documentation rules (`non-negotiables.md`)

- Always update `progress.md` after work.
- Update `KNOWLEDGE_BASE.md` for bugs/flows.
- One implementation step at a time with explicit approval.
- Test before requesting approval.

## Doc file index (in repo)

- `KNOWLEDGE_BASE.md` — ★ operational runbook (read first)
- `plan.md` — architecture, roles, flows, data model
- `progress.md` — live status tracker
- `implementation.md` — step-by-step build guide
- `QUICK_START.md`, `RESTART_GUIDE.md`, `TROUBLESHOOTING.md`
- `CODEBASE_DUMP.md`, `codebase_export.md` — historical snapshots (don't maintain)
