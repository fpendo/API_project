---
title: Deployment
type: architecture
project: NEMX
updated: 2026-07-02
---

# Deployment

Part of [[Home]]. See [[Dev Workflow]], [[Backend]].

## Production topology

```
Browser → https://www.nemx.co.uk/
    ├── /                → Portal frontend (/var/www/portal/)
    ├── /api/auth/*      → Portal backend :8080 (JWT login)
    ├── /api/*           → NEMX backend :8000 (nginx strips /api)
    ├── /nemx/*          → NEMX static frontend (/var/www/nemx/, SPA fallback)
    ├── /agrios/*        → Agrios static site (/var/www/agrios/)
    ├── /jarvis/*        → Jarvis static site (/var/www/jarvis/)
    └── /jarvis-voice/*  → Jarvis voice app :8810

NEMX Backend :8000 → SQLite (offsetx.db) + Hardhat node :8545 + contracts
```

## systemd units (`/opt/app/deploy/systemd/`)

| Service | Port | WorkingDirectory | User |
|---------|------|------------------|------|
| `hardhat.service` | 8545 | `/opt/app/nemx` | www-data |
| `nemx-backend.service` | 8000 | `/opt/app/nemx/backend` | www-data |
| `portal-backend.service` | 8080 | `/opt/app/nemx/portal/backend` | www-data |

`nemx-backend.service` has `Wants=hardhat.service`.

## Static deploy targets

- `/var/www/portal/` — portal frontend
- `/var/www/nemx/` — NEMX frontend build
- `/var/www/agrios/` — Agrios modular static site

**Deploy scripts:** `deploy/deploy.sh`, `deploy/setup-vps.sh`, `deploy/backup.sh`
**Nginx:** `/opt/app/deploy/nginx/portal.conf` → `/etc/nginx/sites-available/portal`
**Recommended VPS:** 2GB RAM (~$12/mo), Ubuntu 22.04/24.04, SSL via Certbot.

## Environment variables (NEMX backend `.env`)

```
RPC_URL=http://127.0.0.1:8545
SCHEME_NFT_CONTRACT_ADDRESS=...
SCHEME_CREDITS_CONTRACT_ADDRESS=...
PLANNING_LOCK_CONTRACT_ADDRESS=...
REGULATOR_PRIVATE_KEY=...        # Hardhat #0
LANDOWNER_PRIVATE_KEY=...        # Hardhat #0
BROKER_PRIVATE_KEY=...           # Hardhat #2
BROKER_HOUSE_PRIVATE_KEY=...     # Hardhat #9
DEVELOPER_PRIVATE_KEY=...        # Hardhat #5
TRADING_ACCOUNT_ADDRESS=...      # Hardhat #1
TRADING_ACCOUNT_PRIVATE_KEY=...  # Hardhat #1
```

## Hardhat test account reference

| # | Address | Use |
|---|---------|-----|
| 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Landowner/Regulator |
| 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Trading Account |
| 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Broker |
| 5 | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | Developer |
| 9 | `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720` | Broker House Account |
