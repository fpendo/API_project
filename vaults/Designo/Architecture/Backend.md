---
title: Backend
type: architecture
project: Designo
updated: 2026-07-06
---

# Backend

Part of [[Home]]. See [[Overview]], [[Generation Pipeline]], [[Deployment]].

FastAPI app at `/opt/app/designo/backend/app/`, uvicorn on `127.0.0.1:8620`, systemd unit `designo-backend` (auto-restarts — always use `systemctl restart designo-backend`).

## Modules

| Module | Responsibility |
|---|---|
| `main.py` | All API routes, request models, startup (init DBs, ensure admin password, start IMAP poller) |
| `config.py` | Env-driven config: keys, model names, prices, public URL, secret |
| `db.py` / `leads_db.py` | SQLite: projects vs the whole lead/agency domain |
| `generator.py` / `skill.py` | Fable orchestration + prompts ([[Generation Pipeline]]) |
| `storage.py` | Ringfenced project dirs, safe path resolution, image optimisation |
| `artwork.py` / `video.py` / `retouch.py` | AI artwork, fal.ai hero video, photo retouching |
| `shadow.py` | Machine-readable shadow site (ASO layer) |
| `sources.py` | Lead discovery: Apify Google Maps, Companies House, CSV ([[Lead-Gen Engine]]) |
| `lead_agent.py` | Lead pipeline orchestrator (brief → mockup → preview media → email draft) |
| `preview_media.py` | Playwright: hero screenshot + ~7s scrolling GIF for emails |
| `outreach.py` | Pitch email HTML, Resend sending, delivery webhooks, unsubscribe |
| `prospect.py` | Public `/p/{slug}/` routes: login, gated site, proposal, welcome, pay/subscribe, analytics beacon |
| `proposal.py` | Follow-up pack HTML incl. sample [[SEO + ASO Report]] |
| `payments.py` | Stripe Checkout sessions + webhook ([[Pricing & Payments]]) |
| `welcome.py` | Welcome pack email + gated page, auto-sent on payment |
| `mailbox.py` | IMAP poller + Resend replies, canned follow-up template |
| `auth.py` | Admin password login, HMAC cookie, API middleware |

## Auth middleware

All `/api/*` requires the `designo_admin` cookie **except**: `/api/auth/*`, `/api/config`, both webhooks (`/api/payments/webhook`, `/api/outreach/webhook` — signature-verified anyway), and `/api/preview/*` (Playwright hits localhost cookieless; project IDs unguessable). Password from `DESIGNO_ADMIN_PASSWORD` env or `admin_password` setting; auto-generated and logged on first boot.

## Route groups (all under `/designo` via nginx)

- **Studio:** projects CRUD, brief, photos (upload/tag/retouch/splice), generate/iterate, hero video, preview, zip export.
- **Leads:** discover (Apify/CH/CSV), lead CRUD, pipeline run/retry per stage, email edit/approve/send, settings.
- **Mailbox:** status/settings/test/poll, threads, reply, follow-up template.
- **Documents:** `GET /api/documents/proposal|welcome` (sample-data HTML), `/api/documents/followup-email`.
- **Payments:** Stripe webhook; checkout sessions created from prospect-facing POSTs only.
- **Welcome:** `POST /api/leads/{id}/send-welcome`, preview URL.
- **Public prospect routes:** `/p/{slug}/` login + site, `/proposal/`, `/welcome/`, `/pay`, `/subscribe`, `/thank-you`, `/unsubscribe`, event beacon.
