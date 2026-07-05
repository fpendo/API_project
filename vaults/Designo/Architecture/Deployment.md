---
title: Deployment
type: architecture
project: Designo
updated: 2026-07-06
---

# Deployment

Part of [[Home]]. See [[Dev Workflow]] for day-to-day commands.

## Services

- **`designo-backend.service`** (systemd): `/opt/app/designo/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8620`, `Restart=always`. Manual kills get respawned — use `systemctl restart designo-backend`.
- **nginx** (`/etc/nginx/sites-available/portal`, mirrored in `/opt/app/deploy/nginx/portal.conf`):
  - `location = /designo/` → `/var/www/designo/landing/index.html` (generated landing; falls back to SPA index if missing)
  - `location /designo/` → alias `/var/www/designo/` (SPA + assets + shadow files)
  - `location /designo/api/` → proxy `127.0.0.1:8620/api/` (20m body limit for uploads)
  - `location /designo/p/` → proxy backend `/p/` (prospect sites)

## Environment (`/opt/app/designo/backend/.env`, template `env.template`)

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY`, `DESIGNO_LLM_MODEL=claude-fable-5` | generation |
| `FAL_KEY`, `DESIGNO_VIDEO_MODEL_DRAFT/FINAL`, `DESIGNO_PHOTO_EDIT_MODEL` | video + retouch (optional) |
| `APIFY_TOKEN`, `COMPANIES_HOUSE_KEY` | lead discovery (features hide until set) |
| `RESEND_API_KEY`, `DESIGNO_OUTREACH_FROM/REPLY_TO` | outbound email |
| `DESIGNO_PUBLIC_URL`, `DESIGNO_SECRET` | links + HMAC signing |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID` | payments (hidden until secret key set) |
| `DESIGNO_PRICE_BUILD_PENCE=69500`, `DESIGNO_PRICE_MONTHLY_PENCE=5900` | pricing |
| `DESIGNO_ADMIN_PASSWORD` | portal login (else auto-generated, printed to log) |

## Deploy procedures

- **Frontend:** `npm run build` in `frontend/`, copy `dist/*` to `/var/www/designo/`, `chown www-data`, prune stale hashed assets not referenced by `index.html`.
- **Landing page:** `bash /opt/app/designo/deploy_landing.sh <project_id>` — copies the generated `index.html` to `landing/`, photos/videos/shadow files to the web root, strips model-generated login links and injects the fixed styled **Log in** button.
- **Backend:** edit code → `systemctl restart designo-backend` (startup recovery flips orphaned transient statuses to error).
- IMAP creds, pricing copy and sender identity live in DB **settings**, editable from the UI — no redeploy needed.
