---
title: Frontend & Portal
type: architecture
project: Designo
updated: 2026-07-06
---

# Frontend & Portal

Part of [[Home]]. See [[Overview]], [[Deployment]].

React + TypeScript + Vite + Tailwind + Framer Motion at `/opt/app/designo/frontend/`, router base `/designo/`, built into `/var/www/designo/`.

## Routes

| Route | Page | Access |
|---|---|---|
| `/` | Public landing — **served as the generated static site**, SPA `Home.tsx` is the fallback | public |
| `/login` | Admin login | public |
| `/start` | Internal landing (was `/` before auth) | RequireAuth |
| `/create` | 5-step questionnaire wizard | RequireAuth |
| `/project/:id/photos` | PhotoStudio: drag-drop, tags/captions, retouch/splice | RequireAuth |
| `/project/:id` | Studio: iframe preview, iterate chat, hero-video panel, shadow-site card | RequireAuth |
| `/sites` | My Sites | RequireAuth |
| `/leads`, `/leads/:id` | Lead engine list + detail (pipeline stages, email editor, welcome pack buttons) | RequireAuth |
| `/mailbox` | Two-pane mailbox: threads + composer, IMAP settings | RequireAuth |
| `/documents` | Previews of client-facing docs (proposal, welcome pack, follow-up email) | RequireAuth |

`RequireAuth.tsx` checks `/api/auth/me` and redirects to `/login`. `Shell.tsx` carries the nav (Sites / Leads / Mailbox / Documents) and logout.

## Public landing (dogfooded)

The `/designo/` landing is a site Designo built for itself (project `5087a7de463a4c13b3bfa4b31a44c8a6`): agent-economy manifesto, "title sequence" concept with REEL-A timecode motif, JSON-LD snippets as design elements, "THE SHIFT" stats section (see [[Agent Economy Positioning]]), Angie founder section, "by invitation" close. Deployed with `deploy_landing.sh`, which injects a fixed top-right **Log in** button. Nginx serves the static file at exactly `/designo/`; every other `/designo/*` path falls through to the SPA.

## Nemx portal

Two cards on the Nemx portal dashboard link in: "Designo" (rose→orange) → `/designo/` and "Designo Lead Engine" (amber-rose) → `/designo/leads`.
