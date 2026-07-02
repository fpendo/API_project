---
title: Tech Stack & Dual Backend
type: architecture
project: ETAnalytics
updated: 2026-07-02
---

# Tech Stack & Dual Backend

Part of [[Home]]. See [[API Reference]], [[Frontend]].

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.2 + TypeScript 5.3 + Vite 5.0.8 |
| Styling | Tailwind CSS 3.3.6, PostCSS, Autoprefixer |
| Animation | Framer Motion 10.16 |
| Charts | Recharts 2.10 |
| Graphs | ReactFlow + Dagre (ownership trees) |
| Routing | React Router DOM 6.20 |
| Testing | Vitest + Testing Library |
| Backend (legacy/demo) | FastAPI monolith — `backend/server.py` |
| Backend (new modular) | FastAPI + SQLAlchemy + Alembic — `backend/app/` |
| Database (new) | PostgreSQL + asyncpg (port 5432, db `etanalytics`) |
| NAV data | yfinance (`backend/services/nav_service.py`) |
| Deployment | Nginx + Let's Encrypt |

> **No Solidity smart contracts.** The `contracts/` folder holds **legal SaaS service agreements**, not blockchain code. See [[Legal & Contracts]].

## Critical note: dual backend

ETAnalytics has **two parallel backend implementations**:

```
backend/
├── server.py     ← LEGACY: in-memory demo/production API.
│                   Register upload, analysis, NAV, session-cookie auth.
│                   Port 8001 in production. Full register API lives HERE.
│
└── app/          ← NEW: PostgreSQL production overhaul (Jan 2026).
    ├── main.py    JWT auth, applications only (no register routes yet).
    ├── models/    User, Register, Entity, Application
    ├── routers/   auth.py, applications.py
    └── alembic/   DB migrations
```

The Jan 2026 "Production Overhaul" added PostgreSQL + JWT but **register analysis has not been migrated** to the modular backend. This dual setup is a source of deployment ambiguity — see [[Frontend-Backend Disconnect]].

## Build & deploy

**package.json scripts:**
```json
"dev": "vite"                  // port 3000
"build": "vite build"          // → dist/
"build:check": "tsc && vite build"
"server": "python backend/server.py"
"test": "vitest"
```

**vite.config.ts:** dev port 3000, proxies `/api` → `http://localhost:8000`.
> ⚠ Proxy targets **8000** but the backend defaults to/uses **8001** — dev setups may need alignment.

**Production topology:**
```
www.etanalytics.co.uk (443) → Nginx
    ├── /gate  → login.html (pre-auth gate)
    ├── /      → index.html (React SPA, auth-protected)
    └── /api/* → 127.0.0.1:8001 (FastAPI server.py)
```
Compiled frontend deployed to `/var/www/etanalytics/` with custom injected JS for the login overlay and mobile hamburger menu.
