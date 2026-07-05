---
title: Dev Workflow
type: operations
project: Designo
updated: 2026-07-06
---

# Dev Workflow

Part of [[Home]]. See [[Deployment]], [[Known Bugs & Fixes]].

## Backend

```bash
systemctl restart designo-backend      # never kill/nohup manually
journalctl -u designo-backend -f       # logs (admin password printed on first boot)
```

Code: `/opt/app/designo/backend/app/`, venv at `backend/venv/`. After editing, restart the service — startup recovery cleans any orphaned transient statuses.

## Frontend

```bash
cd /opt/app/designo/frontend
npm run build
cp -r dist/* /var/www/designo/
chown -R www-data:www-data /var/www/designo
# prune hashed assets not referenced by index.html
```

## Landing page redeploy

```bash
bash /opt/app/designo/deploy_landing.sh <project_id>
```

Copies the generated site to `/var/www/designo/landing/` + shadow files to the web root, injects the fixed Log in button. Current landing project: `5087a7de463a4c13b3bfa4b31a44c8a6`.

## Nginx

Live config `/etc/nginx/sites-available/portal`; keep `/opt/app/deploy/nginx/portal.conf` in sync. `nginx -t && systemctl reload nginx`.

## Testing the API when authed

```bash
curl -s -c /tmp/dc -X POST http://127.0.0.1:8620/api/auth/login \
  -H 'Content-Type: application/json' -d '{"password":"<admin password>"}'
curl -s -b /tmp/dc http://127.0.0.1:8620/api/documents/proposal
```

## Where things are configured

- **Env** (`backend/.env`): API keys, model, prices, public URL — restart to apply.
- **DB settings** (editable in UI): IMAP creds, sender identity, pricing copy, cached Stripe price ID — live, no restart.
- **Debug artefacts:** failed Fable JSON at `/tmp/designo_bad_json_*.txt`.

## Documentation duties

After any work session update `/opt/app/progress.md` (always), `/opt/app/KNOWLEDGE_BASE.md` (if bugs/flows discovered), and this vault (`/opt/app/vaults/Designo/`).
