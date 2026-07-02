---
title: Frontend
type: architecture
project: ETAnalytics
updated: 2026-07-02
---

# Frontend

Part of [[Home]]. Location: `/opt/app/etanalytics/src/`.

## Structure

```
src/
├── main.tsx / App.tsx          # entry + routes
├── index.css                   # Tailwind + custom dark theme
├── pages/
│   ├── LandingPage.tsx
│   ├── Login.tsx / DemoLogin.tsx / Signup.tsx
│   ├── ApplicationStatus.tsx
│   ├── IssuerDashboard.tsx     # ~3,900 lines (monolith)
│   ├── AnalysisDashboard.tsx   # ~5,500 lines (monolith)
│   ├── ClientServices.tsx      # admin pipeline
│   ├── investor/InvestorDashboard.tsx
│   └── legal/                  # Privacy, Terms, GDPR, Security
├── components/
│   ├── shared/                 # DataTable, StatCard, Modal
│   ├── OwnershipTree/          # ReactFlow custody chain viz
│   ├── MobileNav.tsx, NAVChart.tsx, DemoDisclaimerModal.tsx
├── store/                      # React Context (mostly mock/demo)
│   ├── RegisterContext.tsx     # registers + backend API + live mode
│   ├── WorkflowContext.tsx
│   ├── ETFDatabaseContext.tsx
│   ├── ActivityContext.tsx
│   ├── historicalData.ts       # generated demo data
│   └── data.ts                 # sample issuers/ETFs/entities
├── services/
│   ├── registerApi.ts          # register upload/analyze client
│   └── navApi.ts               # NAV client (actively used)
├── constants/entityTypes.ts    # synced with backend KNOWN_ENTITIES
└── types/
```

## Routes

**Public:** `/`, `/login`, `/demo-login`, `/signup`, `/application-status`, `/about`, `/contact`, `/careers`, `/legal/{privacy,terms,gdpr,security}`

**Issuer portal** (`/issuer/*`): overview, `/registers`, `/analytics`, `/upload`, `/reports`, `/reports/:id`, `/settings`

**Analyst portal** (`/analysis/*`): overview, `/clients`, `/clients/:id`, `/entities`, `/etfs`, `/workflows`, `/workflows/:id`, `/settings`

**Admin:** `/client-services/*` — application pipeline
**Investor:** `/investors` — financial projections dashboard

## Note on data source

The frontend **primarily runs on mock data** (localStorage) for demos. `registerApi.ts` and `RegisterContext` support **live mode** (`etanalytics_live_mode` in localStorage), but most analyst flows still compute percentages client-side. Only NAV endpoints (`navApi.ts`) are actively called against the backend. This is the root of the [[Frontend-Backend Disconnect]] and [[Percentage Bug]].
