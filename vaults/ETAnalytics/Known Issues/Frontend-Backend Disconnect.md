---
title: Frontend-Backend Disconnect
type: known-issue
project: ETAnalytics
source: ETANALYTICS_FRONTEND_ISSUE.md
updated: 2026-07-02
---

# Frontend-Backend Disconnect

Part of [[Home]]. Source: `/opt/app/ETANALYTICS_FRONTEND_ISSUE.md`. Related: [[Percentage Bug]], [[Tech Stack & Dual Backend]].

## Root cause

The analyst workflow UI (`AnalysisDashboard.tsx`) runs **client-side mock calculations** from localStorage/historical data. It only actively calls the backend for **NAV endpoints** (`navApi.ts`). Register analysis endpoints exist but are bypassed in the demo workflow.

`RegisterContext.tsx` has `runBackendAnalysis()` and live mode, but `AnalysisDashboard.tsx`'s `startMatching()` computes percentages locally:

```typescript
// counts ALL matched nominees, not decision-makers only
const matchedNominees = updatedNominees.filter(n => n.status === 'matched')
const identifiedPct = (etfMatchedShares / etf.totalShares) * 100  // misnamed
```

The variable was renamed `discoveredPct` → `identifiedPct`, but the **calculation still counts all matched entities** (including CSDs/custodians with `confidence=0`).

## Other related issues

- **Dual backend confusion** — `server.py` (session cookies, in-memory, full register API) vs. `app/main.py` (JWT, PostgreSQL, applications only). Register analysis not yet migrated to the modular backend. See [[Tech Stack & Dual Backend]].
- **Vite proxy port mismatch** — `vite.config.ts` proxies to 8000, backend uses 8001.
- **Mobile navigation (FIXED)** — custom hamburger menu injected in production `index.html` (not in source), giving a slide-out sidebar for Issuer/Analyst tabs on mobile.

## Fix direction

Connect the analyst workflow to the backend `POST /api/registers/{id}/analyze` (live mode), use the backend's `identified_percentage`/`discovered_percentage` fields directly, and stop computing percentages client-side.
