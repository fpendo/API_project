---
title: Frontend & Portal
type: architecture
project: NEMX
updated: 2026-07-02
---

# Frontend & Portal

Part of [[Home]]. See [[Deployment]].

## NEMX frontend

- **Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Recharts
- **Location:** `/opt/app/nemx/backend/frontend/`
- **Prod config:** Vite `base: '/nemx/'`, React Router `basename: '/nemx'`, API calls use `/api` (same origin)
- **API base:** centralised in `src/api/config.ts` (`API_BASE_URL`)

### Pages (`src/pages/`)

| Path (prod `/nemx` basename) | Page | Role |
|------|------|------|
| `/` | Marketing landing (Hero, Problem, Solution, HowItWorks…) | Public |
| `/portal` | Role selector (app entry) | Demo |
| `/submission-portal` | Scheme submission form | Landowner |
| `/landowner` | Holdings, notifications, redeem, assign | Landowner |
| `/regulator` | Inbox, archive, analytics | Regulator |
| `/broker` | Mandates, bots, sell-ladder bots | Broker |
| `/developer` | Holdings, exchange tab, planning QR | Developer |
| `/exchange` | Order book, limit/market orders, charts | Traders |
| `/planning` | QR validation, archive, burn/unlock | Planning Officer |
| `/planning/application/:id` | Application detail | Planning Officer |
| `/operator` | OTC desk | Operator |
| `/market-research` | Market analysis page | Investor |
| `/financial-projections` | Financial model charts | Investor |

### Component library

- `components/ui/` — Button, Card, Badge, Input, Select, Modal, Table, Tabs
- `components/layout/` — AppShell, TopBar, Sidebar
- `components/domain/` — StatCard, NotificationBanner
- `components/marketing/` — landing sections (incl. SatelliteMonitoringSection)

## Multi-project portal (`/opt/app/nemx/portal/`)

- **Auth:** JWT via `POST /api/auth/login`, verify via `/api/auth/verify`
- **Backend:** FastAPI + JWT, port **8080**
- **Dashboard** (`Dashboard.tsx`) project cards:
  - **NEMX** → `/nemx/` (active)
  - **Agrios** → `/agrios/` (active)
  - **Jarvis** → `/jarvis/` (active)
  - **Talk to Jarvis** → `/jarvis-voice/` (active)
  - Coming Soon placeholder
