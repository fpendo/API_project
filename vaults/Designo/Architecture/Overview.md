---
title: Overview
type: architecture
project: Designo
updated: 2026-07-06
---

# Overview

Part of [[Home]]. See [[Generation Pipeline]], [[Backend]], [[Frontend & Portal]], [[Deployment]].

## What Designo is

Two products in one codebase:

1. **The Studio** — a Higgsfield-style motion website generator. A 5-step questionnaire plus tagged photo uploads go to Claude (Fable 5), which produces a single self-contained `index.html`: scroll-driven cinema with GSAP + ScrollTrigger + Lenis, film grain, particles, Ken Burns photo treatment, reduced-motion fallbacks.
2. **The Agency** — a lead-generation and client-management layer that uses the Studio to build speculative mockups for real UK businesses that have no website, pitches them, takes payment, and manages the client relationship (mailbox, documents, welcome pack, reporting).

## Moving parts

| Piece | Where | What |
|---|---|---|
| Backend | `/opt/app/designo/backend/` | FastAPI + SQLite, port 8620, systemd `designo-backend` |
| Frontend | `/opt/app/designo/frontend/` | React + TS + Vite + Tailwind, base `/designo/`, built to `/var/www/designo/` |
| Storage | `/opt/app/designo/storage/projects/<uuid>/` | ringfenced per project: `photos/`, `videos/`, `site/`, `preview/` |
| Public landing | `/var/www/designo/landing/` | Designo-generated cinematic site served at exactly `/designo/` |
| Prospect sites | served by backend | `/designo/p/{slug}/` behind branded login |

## Databases (SQLite, in backend dir)

- **Projects DB** (`db.py`): projects, photos (tags/captions/edit status), videos, generation status.
- **Leads DB** (`leads_db.py`): `leads`, `prospect_access`, `outreach_emails`, `lead_events`, `suppressed_emails`, `mail_messages`, `settings` (pricing, sender identity, IMAP creds, Stripe price cache, admin password).

Both run startup recovery: anything left in a transient status (`generating`, `editing`, etc.) after a restart is flipped to `error` with a clear message — background threads die with the process.

## Security model

- All `/api/*` routes protected by HMAC-signed 30-day cookie middleware ([[Backend]]).
- Prospect sites gated by per-lead credentials + signed session cookies.
- All file serving passes `storage.safe_resolve` path-traversal guards.
- Stripe webhooks signature-verified; unsubscribe links HMAC-signed.
