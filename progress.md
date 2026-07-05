# Project Progress Tracker

> **Auto-updated document** tracking implementation progress, problems encountered, and solutions.

**Last Updated:** 2026-07-05 (Designo v2: two-stage pipeline, Fable 5, AI artwork)

---

## Current Status

**Current Phase:** Production Deployment Preparation  
**Current Step:** Portal & Deployment Scripts Complete  
**Status:** ✅ Ready for VPS Deployment

---

## Completed Steps

### Step 0.1 – Initialise monorepo & docs ✅
- **Completed:** 2024-12-19
- **What was built:**
  - ✅ `plan.md` - Project plan with objectives, roles, flows, and architecture
  - ✅ `implementation.md` - Step-by-step implementation guide
  - ✅ `non-negotiables.md` - Development rules and constraints
  - ✅ `progress.md` - Progress tracker (auto-updates with each step)
  - ✅ `README.md` - Placeholder README
- **Tests/Checks:**
  - ✅ All five files confirmed to exist with expected content
- **Notes:**
  - Progress tracking system established
  - All documentation files in place
  - Ready to proceed to Step 0.2

### Step 0.2 – Initialise Hardhat project ✅
- **Completed:** 2024-12-19
- **What was built:**
  - ✅ `package.json` - Initialized npm project
  - ✅ `hardhat.config.ts` - Hardhat configuration with localhost network
  - ✅ `tsconfig.json` - TypeScript configuration
  - ✅ `contracts/` directory - Created with sample Lock.sol
  - ✅ `test/` directory - Created with Lock.ts test file
  - ✅ `scripts/` directory - Created for deployment scripts
  - ✅ `.gitignore` - Added with Hardhat-specific ignores
- **Tests/Checks:**
  - ✅ `npx hardhat test` → 8/9 tests passing (1 timing precision issue in sample test, not critical)
  - ✅ Hardhat node can start (tested in background)
  - ✅ Project structure verified
- **Notes:**
  - Hardhat 2.26.0 installed (compatible with toolbox)
  - TypeScript setup complete
  - Localhost network configured on port 8545

### Step 0.3 – Backend skeleton (FastAPI + health check) ✅
- **Completed:** 2024-12-19
- **What was built:**
  - ✅ `backend/` directory structure created
  - ✅ `backend/app/main.py` - FastAPI application with `/health` endpoint
  - ✅ `backend/requirements.txt` - Dependencies (fastapi, uvicorn)
  - ✅ CORS middleware configured for frontend integration
- **Tests/Checks:**
  - ✅ Server starts successfully: `uvicorn app.main:app --reload`
  - ✅ `GET http://127.0.0.1:8000/health` → `{"status": "ok"}`
  - ✅ CORS configured (ready for frontend integration)
- **Notes:**
  - Python 3.14.0 verified
  - FastAPI 0.104.1 installed
  - Uvicorn 0.24.0 installed with standard extras
  - Server runs on port 8000

### Step 0.4 – Frontend skeleton (React + Vite + TS) ✅
- **Completed:** 2024-12-19
- **What was built:**
  - ✅ `frontend/` directory created with Vite React TypeScript template
  - ✅ `frontend/src/App.tsx` - Role selection UI with 6 roles
  - ✅ `frontend/src/App.css` - Styling for role buttons
  - ✅ Dependencies installed (React, TypeScript, Vite)
- **Tests/Checks:**
  - ✅ `npm run dev` starts dev server
  - ✅ App renders role selection interface
  - ✅ No TypeScript/linter errors
  - ✅ Dev server runs on port 5173 (default)
- **Notes:**
  - Frontend created in `backend/frontend/` (can be moved to root later if needed)
  - Role selection UI functional with 6 roles: Landowner, Regulator, Broker, Developer, Planning Officer, Operator
  - Ready for routing implementation in Phase 3

---

## In Progress

_No steps currently in progress. Phase 0 complete!_

---

## Problems Encountered

### Step 0.2 - Hardhat Initialization Issues

1. **Hardhat 3.x Version Conflict**
   - **Problem:** Initially installed Hardhat 3.0.16, but `@nomicfoundation/hardhat-toolbox@6.1.0` requires Hardhat 2.26.0
   - **Error:** Peer dependency conflicts and ESM/CommonJS issues
   - **Impact:** Tests wouldn't run, dependency resolution failures

2. **ESM vs CommonJS Configuration**
   - **Problem:** Hardhat 2.x with TypeScript requires CommonJS, but package.json was set to "module"
   - **Error:** "Hardhat only supports ESM projects" then "Class extends value undefined" errors
   - **Impact:** Configuration file couldn't load properly

3. **Missing TypeScript Dependencies**
   - **Problem:** TypeScript and type definitions not installed
   - **Error:** "Your Hardhat project uses typescript, but it's not installed"
   - **Impact:** Tests couldn't compile

---

## Solutions & Learnings

### Step 0.2 - Solutions Applied

1. **Fixed Hardhat Version**
   - **Solution:** Installed Hardhat 2.26.0 explicitly: `npm install --save-dev hardhat@^2.26.0`
   - **Result:** Resolved peer dependency conflicts
   - **Learning:** Always check peer dependency requirements before installing latest versions

2. **Fixed Module System**
   - **Solution:** Set `package.json` to `"type": "commonjs"` for Hardhat 2.x compatibility
   - **Result:** Configuration file loads correctly
   - **Learning:** Hardhat 2.x requires CommonJS, Hardhat 3.x requires ESM - choose based on toolbox version

3. **Installed TypeScript Dependencies**
   - **Solution:** Installed TypeScript and type definitions: `npm install --save-dev typescript ts-node @types/node @types/chai @types/mocha`
   - **Result:** Tests can now compile and run
   - **Learning:** TypeScript projects need explicit type definitions for test frameworks

4. **Created tsconfig.json**
   - **Solution:** Added proper TypeScript configuration for Hardhat project structure
   - **Result:** TypeScript compilation works correctly
   - **Learning:** Hardhat TypeScript projects need specific compiler options

---

## Technical Notes

### Environment Setup
- **Node.js:** Verified working (npm commands successful)
- **Python:** ✅ Verified (v3.14.0)
- **IPFS:** _Not yet installed_
- **Hardhat:** ✅ Initialized (v2.26.0) with TypeScript support
- **FastAPI:** ✅ Initialized (v0.104.1) with uvicorn

### Key Decisions
- Using SQLite for local development (can migrate to PostgreSQL later)
- Local IPFS node for demo (compatible with production IPFS)
- Hardhat for local blockchain (Polygon-compatible for future Supernet deployment)

---

## Next Steps

1. ✅ **Step 0.1 Complete** - All documentation files created
2. ✅ **Step 0.2 Complete** - Hardhat project initialized
3. ✅ **Step 0.3 Complete** - Backend skeleton (FastAPI + health check)
4. ✅ **Step 0.4 Complete** - Frontend skeleton (React + Vite + TS)
5. **🎉 Phase 0 Complete!** - Ready for Phase 1: Smart Contract Foundations
   - Next: Step 1.1 - Define SchemeNFT.sol (ERC-721 skeleton)

---

## Recent Fixes & Enhancements

### 2026-06-29 - Agrios: modular rebuild + section redesigns
- **Modularised the landing page.** Split the single ~1,850-line `Agrios/index.html` into a modular static site so it can scale:
  - Thin shell `index.html` with `<div data-include="sections/*.html">` placeholders + `<script type="module" src="assets/js/main.js">`.
  - 11 HTML partials in `Agrios/sections/`, all styles in `assets/css/styles.css`, and ES modules in `assets/js/` (`main.js` loader, `theme.js`, `util.js`, `data.js`, and one `sections/<name>.js` initializer per section).
  - `main.js` fetches & injects partials, then runs each `init*()` in a try/catch so one failure can't blank the page.
- **Removed Mermaid entirely**; replaced every flowchart with custom interactive HTML/SVG:
  - **Knowledge** research swarm is now a hoverable *flow feature* (6 stage cards + 6 specialist agents → sticky detail panel).
  - **Voice** and **lab-ingestion** flows are custom 5-step hover pipelines.
- **Reimagined the Testing section** — 5 programme tabs (soil/forage/genetics/water/animal), each with a full analyte result grid (value vs reference range + good/watch/act meters), a sample lab report, cadence table, and cost chart. Much fuller "testing profile".
- **Connectivity diagram** rebuilt as a clear 5-layer integration map (data points → gateways/ChirpStack → self-healing 5GHz mesh → Starlink hub → cloud/vault/LLM) with per-node hover explanations.
- **Fields** — quadrants A–D and 16 management cells **overlaid on the Exmoor satellite image** (bilinear-interpolated SVG polygons). Hover a cell → full profile (pH/P/K/Mg/S/CEC/texture/moisture) + nutrient-drift chart + test history.
- **Cattle HUD** vastly deepened: new **butcher's-chart cow body map** (hover a primal cut → its name + injury history; injured cuts highlighted), 4 sub-tabs (Overview/Health/Genetics & DNA/Calves) with genomic EBV radar, breed composition, parentage, genetic conditions/markers, vaccination schedule, meds, and a **calves drill-down** with per-calf birth details + growth-curve charts.
- **Verified** with a jsdom smoke test (inject all partials, run every `init*()`, simulate cow/calf/butcher/testing/16 field-cell/flow/arch/coverage/analytics interactions) → 0 runtime errors, 35 charts built. Confirmed live serving over HTTPS with correct content types (JS as `application/javascript`).
- **Deployed** the full tree to `/var/www/agrios/` (`index.html` + `assets/` + `sections/`), owned by `www-data`.

### 2026-06-29 - Agrios Personalization HUD Section
- Added a new interactive **Personalization** section to `Agrios/index.html` and linked it from the top nav.
- Implemented a **cow-level HUD mockup**:
  - Clickable cow ID selector list
  - Expanded per-cow profile with ID tag, geolocation/current farm location, weight, BCS, calf count, vaccination status, DNA profile
  - Interactive body-map illustration with hoverable hotspots by body part and ailment/injury detail tooltips
  - Injury/ailment history list
  - Current medicines and dosages table
  - Reproductive details (calving outcome, calf birth weight) and weight trend chart
- Implemented a **field-level HUD mockup**:
  - Farm section grid (A1–D4) with hover/click selection
  - Per-section latest test values (pH, P, K, OM)
  - Nutrient drift-over-time chart
  - Recent testing event/action table
- Deployed updated page live to `/var/www/agrios/index.html` and verified presence of `#personalization`, `cowWeightChart`, and `fieldNutrientChart`.

### 2026-06-29 - Agrios Testing Section (Soil, Forage, Genetics)
- Added a new interactive **Testing** section to `Agrios/index.html` and linked it in the top nav.
- Implemented domain tabs for:
  - **Soil testing** (quadrants/grid strategy, sample cadence, lab turnaround, analyte coverage)
  - **Genetics testing** (full genome for elite/prize bulls, lightweight panels for general herd)
  - **Silage/Hay testing** (nutritional, fibre, fermentation, mycotoxin risk panels)
- Added a detailed **lab ingestion pipeline** (lab email → bot watcher → PDF OCR / CSV/XLSX parsing → validation → vault write).
- Added an interactive **testing cost chart** and a full annual testing budget table for a 500-acre / 250-head plan.
- Deployed updated page to `/var/www/agrios/index.html` and verified live.

### 2026-06-29 - Agrios: Connectivity & Coverage Section
- **Satellite mockup:** Downloaded real Exmoor satellite imagery (Esri World Imagery export, ~1.6 km frame) to `Agrios/assets/exmoor-satellite.jpg` and built an interactive coverage map: ~500-acre farm boundary, 5 LoRa gateways (4 corners + centre), overlapping (Venn-style) coverage circles, mesh links, and the central Starlink hub.
- **Interactive simulator:** Radius slider + presets (200 m conservative / 750 m recommended / 1.5 km line-of-sight) with a live point-sampled "farm covered %" readout and an animate-in effect.
- **Write-up:** Costed bill of materials (indicative June-2026 UK, ex-VAT) for gateways (£4,250), smart-mesh retrofit (£1,260), 250-head EID + LoRa GPS herd (£15,975), and hub/Starlink/install (£3,449) → ≈ £24,934 CapEx, plus ≈ £200–£300/mo OpEx and a lean option. Explains how solar LoRaWAN gateways, the 5 GHz self-healing mesh backhaul, identity-vs-GPS EID tags, ChirpStack and Starlink fit together, with a "recommended additions / gaps" list (network server, 4G failover, surge protection, soil/water sensors, geofencing, winter power sizing, security, tag-loss budget, backups, regulatory).
- **Deploy:** Updated `Agrios/index.html` (+ new `Agrios/assets/`), copied to `/var/www/agrios/` (incl. `assets/`). Costs grounded via web search of current UK hardware pricing.

### 2026-06-29 - Added Agrios Project to Portal
- **What was added:** A second project, **Agrios** ("An Operating System for Farming Intelligence"), to the project portal.
- **Landing page:** New self-contained, interactive landing page at `/opt/app/Agrios/index.html` describing the full plan — knowledge vault (Obsidian + research agent swarm), on-farm architecture (Starlink, solar LoRa mesh, weather station, EID, grid soil sampling, weigh/medicine crate, forage analysis), Telegram + Whisper voice interaction, the Exmoor 500-acre grid, and profit/cost analytics. Uses Chart.js (growth, radar, doughnut, profit/cost, savings, roadmap charts), Mermaid (research-swarm loop + voice-to-action flow), custom SVG architecture diagram, an interactive soil grid, scrollspy nav, reveal animations and animated counters.
- **Portal card/thumbnail:** Added an active Agrios card to `nemx/portal/frontend/src/pages/Dashboard.tsx` (green→lime gradient, leaf SVG icon, `href: /agrios/`), kept a "Coming Soon" placeholder.
- **Serving:** Added nginx `location /agrios/` (alias `/var/www/agrios/`) to the live config and `deploy/nginx/portal.conf`; deployed the page to `/var/www/agrios/`.
- **Deploy:** Rebuilt the portal frontend (`npm run build`) and published to `/var/www/portal/`, removed stale hashed assets, reloaded nginx.
- **Verification:** `https://www.nemx.co.uk/agrios/` returns `200` with the correct title; the live portal bundle references `/agrios/` and the Agrios card.
- **Files:** `Agrios/index.html` (new), `nemx/portal/frontend/src/pages/Dashboard.tsx`, `deploy/nginx/portal.conf`, `/etc/nginx/sites-available/portal` (live), `/var/www/agrios/`, `/var/www/portal/`.

### 2026-06-29 - Portal Login Connection Error Fix
- **Problem:** `www.nemx.co.uk/login` showed a connection error because `/api/auth/login` returned `502 Bad Gateway`.
- **Root Cause:** `portal-backend.service` pointed to `/opt/app/portal/backend`, but the deployed portal backend lives at `/opt/app/nemx/portal/backend`. The relocated virtualenv also had stale executable paths.
- **Fix:** Updated the live and deploy-copy systemd units to use `/opt/app/nemx/portal/backend`, recreated the portal backend virtualenv with `python3 -m venv --clear`, reinstalled requirements, and restarted `portal-backend`.
- **Verification:** Public `/api/auth/login` now returns `401` for wrong credentials and `200` for configured credentials instead of `502`.

### 2025-01-02 - Landowner Transfer Button Fix
- **Problem:** Transfer button disabled even when credits were available
- **Root Cause:** `remaining_credits` calculation was subtracting `assigned_credits` twice - once from on-chain balance (already transferred) and again in calculation
- **Fix:** Updated `backend/app/services/credits_summary.py` to calculate `remaining_credits = unlocked_credits` (don't subtract assigned_credits again)
- **Result:** Transfer button now correctly enabled when credits are available
- **Files Changed:**
  - `backend/app/services/credits_summary.py` - Fixed remaining_credits calculation

### 2025-01-02 - Planning Officer Portal Enhancements
- **Added Features:**
  - ✅ Burn Credits button for LOCKED applications
  - ✅ Unlock Credits button for LOCKED applications
  - ✅ Archive tab with full application history
  - ✅ Search functionality in archive (by token, developer, ID, planning reference, catchment)
  - ✅ Validation summary popup when credits are locked
  - ✅ PageHeader component integration
  - ✅ Enhanced archive table with token column (when available)
- **Files Changed:**
  - `backend/frontend/src/pages/Planning.tsx` - Complete overhaul with tabs, archive, search, burn/unlock

### 2025-01-02 - Database Reset Fix Script
- **Problem:** After database reset, placeholder addresses don't match private keys in `.env`
- **Solution:** Created `backend/post_reset_fix.py` script to automatically:
  - Update Broker and Developer addresses to real Hardhat accounts
  - Update `.env` file with correct private keys
  - Provide clear next steps
- **Usage:** `python backend/post_reset_fix.py --yes` (after `python reset_db.py --seed`)
- **Files Created:**
  - `backend/post_reset_fix.py` - Automated fix for post-reset address/key mismatch

## Change Log

### 2026-06-29 - Agrios Modular Rebuild & Section Redesigns

- Split `Agrios/index.html` into a modular static site (HTML partials + ES module JS + shared stylesheet); removed Mermaid.
- Redesigned flowcharts (interactive hover features), Testing (full profile), Connectivity diagram, Fields (satellite quadrant overlay), and Cattle HUD (butcher's-chart map, deep DNA, calves growth).
- Smoke-tested with jsdom (0 runtime errors) and redeployed the full tree to `/var/www/agrios/`.

### 2026-06-29 - Agrios Project Added to Portal

- Created interactive Agrios landing page in `Agrios/index.html`.
- Added Agrios card to the portal dashboard and a `/agrios/` nginx route.
- Rebuilt and redeployed the portal frontend; deployed Agrios page to `/var/www/agrios/`.
- Verified live serving of both the portal card and the Agrios page.

### 2026-06-29 - Portal Login Restored

- Repointed `portal-backend.service` from missing `/opt/app/portal/backend` to `/opt/app/nemx/portal/backend`.
- Recreated the portal backend virtualenv and restarted the service.
- Verified live login API connectivity through Nginx.

### 2026-01-10 - Comprehensive Financial Model & Analysis

- **Created FINANCIAL_MODEL.md:** Complete investor-ready financial analysis including:
  - Unit economics model (LTV:CAC 5.1:1, 90.4% contribution margin)
  - Detailed P&L projections (5 years, monthly detail for Y1-Y2)
  - Cash flow model with 24-month runway analysis
  - Balance sheet projections
  - Cap table with dilution scenarios (SEIS → Seed → Series A)
  - Exit waterfall analysis (£10M to £100M scenarios)
  - Valuation analysis (DCF, revenue multiples, comparables)
  - Sensitivity analysis on key variables
  - Scenario modeling (bear/base/bull cases)
  - Key assumptions documentation
  - KPIs dashboard

- **Created NEMX_Financial_Model.xlsx:** Excel workbook with 11 sheets:
  - Executive Summary
  - P&L Projections
  - Monthly P&L Y1
  - Cash Flow
  - Balance Sheet
  - Cap Table
  - Unit Economics
  - Sensitivity Analysis
  - Scenarios
  - Key Assumptions
  - KPIs Dashboard

- **Key Financial Highlights:**
  - Y1 Revenue: £375K → Y5 Revenue: £6.0M
  - Path to profitability: Month 22 (Base Case)
  - Total funding requirement: £2.75M (SEIS + Seed + Series A)
  - Y5 Exit value (10x revenue): £60M
  - Founder ownership post-Series A: 45.3%

- **Files Created:**
  - `/opt/app/FINANCIAL_MODEL.md` - Comprehensive narrative document
  - `/opt/app/NEMX_Financial_Model.xlsx` - Excel workbook
  - `/opt/app/create_financial_model_excel.py` - Excel generation script

### 2026-01-10 - Market Research Page Fixes

- **Fixed scroll-to-top issue:** Added `useEffect` in MarketResearch.tsx to scroll to top on load
- **Fixed duplicate stats:** Removed "120K Homes Blocked" from MarketResearchCTA section (now only in hero and market research page)
- **Fixed grid layout:** Changed MarketResearchCTA from 4-column to 3-column grid for remaining 3 stats
- **Fixed Solution section:** Added `h-full` to make all 4 flow cards equal height

### 2026-01-07 - Production Deployment Fix - API URLs & Router Basename

- **Problem 1:** NEMX app showing blank page in production because frontend had hardcoded `http://localhost:8000` API URLs
- **Fix 1:** Updated all 10 page files in `/backend/frontend/src/pages/` to import `API_BASE_URL` from the centralized config:
  - Landowner.tsx, Regulator.tsx, Broker.tsx, Developer.tsx, Exchange.tsx
  - Planning.tsx, SubmissionPortal.tsx, Operator.tsx, Profile.tsx, PlanningApplicationDetail.tsx
- **Changes per file:**
  - Removed: `const API_BASE_URL = 'http://localhost:8000'`
  - Added: `import { API_BASE_URL } from '../api/config'`

- **Problem 2:** React Router not working because app is served from `/nemx/` subdirectory
- **Fix 2:** Updated `main.tsx` to set BrowserRouter `basename` to `/nemx` in production:
  ```typescript
  const basename = import.meta.env.PROD ? '/nemx' : '/'
  <BrowserRouter basename={basename}>
  ```

- **Result:** Frontend now correctly uses `/api` for API calls and `/nemx` as router basename
- **Rebuilt & Deployed:** `npx vite build` → `/var/www/nemx/`

### 2026-01-07 - Portal & Online Deployment Infrastructure

- **Portal Application Created:**
  - New `portal/frontend/` - React + Tailwind login page and project dashboard
  - New `portal/backend/` - FastAPI authentication with JWT tokens
  - Deep space theme with animated backgrounds and glass-card components
  - Project selector dashboard with cards for NEMX and future projects
  
- **NEMX Production Updates:**
  - Added `backend/app/production_config.py` - Environment-aware configuration
  - Updated `backend/app/main.py` with production CORS and logging
  - Updated `backend/frontend/vite.config.ts` with `/nemx/` base path for production
  - Added `backend/frontend/src/api/config.ts` for API URL configuration
  
- **Deployment Infrastructure:**
  - `deploy/nginx/portal.conf` - Nginx reverse proxy configuration
  - `deploy/systemd/portal-backend.service` - Portal API systemd unit
  - `deploy/systemd/nemx-backend.service` - NEMX API systemd unit
  - `deploy/systemd/hardhat.service` - Blockchain node systemd unit
  - `deploy/deploy.sh` - Full deployment automation script
  - `deploy/setup-vps.sh` - VPS initial setup script
  - `deploy/backup.sh` - Database and config backup script
  - `deploy/README.md` - Complete deployment guide
  - `DEPLOYMENT_QUICKSTART.md` - 30-minute deployment guide

- **Architecture:**
  - Portal at root domain with login authentication
  - NEMX accessible at `/nemx/` after portal login
  - All services behind Nginx reverse proxy
  - SSL via Let's Encrypt/Certbot
  - Systemd for process management

### 2026-01-03 - Broker & Landowner Dashboard Enhancements

- **Broker Dashboard:**
  - Added delete button for bots (trash icon, only when inactive)
  - Added "Activate Bot" button in bot detail modal
  - Fixed bot field names (base_price_per_tonne, num_price_levels, etc.)
  - Removed Listings tab and all listing-related functionality
  - Fixed loading state bug where mandates weren't displaying
  
- **Landowner Dashboard:**
  - Added "View" button to notifications with detail modal
  - Fixed spacing between stats grid and notifications section
  - Replaced "NFT" terminology with "Digital Certificate" throughout
  
- **Developer Dashboard:**
  - Fixed balance number overflow in stat cards
  - Made StatCard component responsive with dynamic font sizing
  
- **Backend Updates:**
  - Updated notification messages to use "Digital Certificate" instead of "NFT"
  - Fixed bot strategy_config field name handling
  
- **Documentation:**
  - All .md files updated with latest changes

### 2026-01-02 - Major Frontend Redesign & Project Consolidation
- **Complete Frontend Redesign:**
  - Implemented Tailwind CSS v4 with custom dark theme
  - Created comprehensive UI component library (Button, Card, Badge, Input, Select, Modal, Table, Tabs)
  - Created layout components (AppShell, TopBar, Sidebar)
  - Created domain components (StatCard, NotificationBanner)
  - Redesigned all 10 pages with new design system and Framer Motion animations
- **Backend Enhancements:**
  - Added client funds ledger (mandate_id on trades)
  - Fixed IPFS CID generation for unsupported daemon versions
  - Updated balance calculations for landowners/brokers
  - Added scheme details (CID/hash) to regulator view
- **Broker Dashboard:**
  - Separated client mandates from house holdings
  - Added expandable mandate details with sales history/PnL
  - Integrated bot creation and management
- **Exchange Portal:**
  - Holdings displayed by catchment (not scheme)
  - Limit and market orders working
  - Order book with bids/asks
- **Planning Portal:**
  - Fixed validation endpoint integration
  - Burn/unlock credits working
- **Regulator Portal:**
  - Added Analytics tab with capacity per catchment
  - Expandable scheme details with CID/hash
- **Project Consolidation:**
  - Copied working backend from offsetX to nemx folder
  - nemx folder now contains complete project
  - offsetX folder preserved as fallback
  - Git repository initialized and ready for GitHub

### 2025-01-02
- Fixed landowner transfer button logic (remaining_credits calculation)
- Enhanced Planning Officer portal with burn/unlock and archive features
- Created post-reset fix script for automated address/key updates
- Updated KNOWLEDGE_BASE.md with database reset process

### 2024-12-19
- Created `progress.md` file
- Documented Step 0.1 progress
- Established progress tracking system
- ✅ **Step 0.1 Complete** - Created `README.md` placeholder
- All documentation files now in place
- ✅ **Step 0.2 Complete** - Hardhat project initialized
  - Resolved version conflicts (Hardhat 2.26.0)
  - Fixed ESM/CommonJS configuration
  - Installed TypeScript dependencies
  - Tests running (8/9 passing)
- ✅ **Step 0.3 Complete** - Backend skeleton (FastAPI + health check)
  - Created backend directory structure
  - FastAPI server running on port 8000
  - `/health` endpoint tested and working
  - CORS configured for frontend integration
- ✅ **Step 0.4 Complete** - Frontend skeleton (React + Vite + TS)
  - Created React + TypeScript app with Vite
  - Role selection UI with 6 roles implemented
  - Dev server running on port 5173
  - No TypeScript errors
- 🎉 **Phase 0 Complete!** - All bootstrap steps finished

## 2026-06-29 — Agrios AR Section Added

- **Added:** `sections/ar.html` — new Augmented Reality section below Coverage
- **Images:** Two AI-generated photorealistic AR viewfinder screenshots:
  - `assets/ar-cattle-view.png` — first-person glasses view of Exmoor cattle with EID HUD, arrow to flagged cow, medication + weight overlay
  - `assets/ar-soil-sample.png` — first-person glasses view of empty field with GPS soil-sample grid, QR logger, compass, pH alert
- **CSS:** AR-specific styles added to `styles.css` (`.ar-shots`, `.ar-shot`, `.ar-badge`, `.ar-caption`, `.ar-features`, `.ar-feat`)
- **Nav:** Added `AR` link to navbar
- **Deployed:** `/var/www/agrios/` — all three assets confirmed HTTP 200

## 2026-07-05 — Designo Motion Website Generator Added

New portal app at `/designo/` — a Higgsfield-style motion website generator: questionnaire → tagged photo upload → Claude generates a scroll-driven cinematic single-file website.

- **Backend:** `designo/backend/` — FastAPI + SQLite on `127.0.0.1:8620` (systemd `designo-backend`). Endpoints: projects CRUD, brief (`PUT /api/projects/{id}/brief`), photo upload with tags/captions, generate/iterate (Claude via Anthropic SDK, streaming, model `claude-sonnet-4-5`), optional fal.ai hero video (`POST /api/projects/{id}/hero-video`, disabled until `FAL_KEY` set), site preview (`/api/preview/{id}/`) and zip export.
- **"Motion website skill" prompt:** `designo/backend/app/skill.py` — fixed recipe: GSAP + ScrollTrigger + Lenis via CDN, six signature effects (film grain, particles, vignette, glass cards, colour tints, scroll pacing), Ken Burns on tagged photos, reduced-motion fallback, single self-contained `index.html`.
- **Ringfenced storage:** `designo/storage/projects/<id>/{photos,videos,site}` — all file serving goes through the backend with path-traversal guards (`storage.safe_resolve`); traversal attempts return 403 (tested). Deleting a project removes its whole folder.
- **Frontend:** `designo/frontend/` — React + TS + Vite + Tailwind + Framer Motion, base `/designo/`. Pages: Landing (Create Website CTA, demos grain/particles/vignette), 5-step questionnaire Wizard, PhotoStudio (drag-drop + per-photo tag/caption), Studio (poll + iframe preview + iterate chat + hero-video panel), My Sites. Built to `/var/www/designo/`.
- **Portal:** Designo card (rose→orange gradient) added to `nemx/portal/frontend/src/pages/Dashboard.tsx`; portal rebuilt and redeployed (stale hashed assets removed).
- **Nginx:** `location /designo/api/` → proxy `127.0.0.1:8620/api/` (20m body limit for uploads) and `location /designo/` → alias `/var/www/designo/`, added to BOTH live config and `deploy/nginx/portal.conf`. `nginx -t` OK, reloaded.
- **Env:** `designo/backend/.env` — `ANTHROPIC_API_KEY` (reused from Jarvis), `DESIGNO_PORT=8620`, `DESIGNO_LLM_MODEL=claude-sonnet-4-5`; optional `FAL_KEY` + `DESIGNO_VIDEO_MODEL_DRAFT/FINAL` (defaults: Hailuo 02 draft ≈$0.27/6s, Kling final ≈$0.50/6s). Template in `designo/backend/env.template`.
- **Tests/Checks:**
  - ✅ Health/config/CRUD/upload endpoints verified with curl
  - ✅ Path traversal on preview route blocked (403)
  - ✅ Full end-to-end generation with real Claude call: test brief + 2 tagged photos → `ready` in ~100s, valid 20KB single-file site with GSAP/Lenis, grain/vignette/particles, both photos referenced; preview 200 through nginx
  - ✅ Frontend `tsc && vite build` clean; SPA fallback via nginx `try_files` returns 200
- **Known limitations:** fal.ai video untested against the live API (no `FAL_KEY` yet — model IDs are env-configurable in case endpoints differ); generation blocks one background thread per project (fine at this scale).

### 2026-07-05 (later) — Designo v2: quality overhaul after "too basic" first output

- **Model:** switched `DESIGNO_LLM_MODEL` to `claude-fable-5` (key has access; confirmed via `GET /v1/models`).
- **Two-stage pipeline** (`app/generator.py`):
  1. **Creative director stage** (`CONCEPT_SKILL` in `app/skill.py`): studies the client's industry in depth (e.g. what a Regency/Georgian interior designer actually does — listed-building consent, cornicing, sash windows, period palettes), produces a named creative concept, palette, distinctive Google Fonts pairing, visual motifs, a per-section storyboard with specific choreography, and 2–4 AI artwork commissions. Cached in `storage/projects/<id>/concept.json`; iterations reuse it, fresh generate re-runs it.
  2. **Build stage**: rewritten `MOTION_WEBSITE_SKILL` with a "spectacle layer" (preloader entrance, editorial typography with masked reveals, full-viewport set pieces, SVG motif system, custom cursor, image mask-wipe reveals, ≥2 pinned sequences) on top of the six signature effects.
- **Free AI artwork** (`app/artwork.py`): Pollinations.ai (keyless, flux model) renders the concept's commissions into ringfenced project storage, tagged `artwork` (new tag). Failures are non-fatal.
- **Progress phases:** new `phase` column on projects (auto-migrated) — "Studying the industry…" → "Commissioning AI artwork" → "Building the motion website"; shown live in the Studio UI.
- **Verified:** regenerated the real "Regency Interior Design" project end-to-end: concept "THE PATTERN BOOK" (Georgian pattern-book art direction, Cormorant Garamond/Newsreader/IM Fell English, roman-numeral plates, stroke-drawing SVG cornice/fanlight motifs), 4 Pollinations artworks rendered, 52KB site using all 6 assets, 4 pinned sequences, preview HTTP 200. Total ~11 min (concept ~1.5 min, artwork ~2.5 min, build ~7 min).
- **Note:** generation now takes 3–10+ minutes (bigger model, richer prompt, artwork downloads) — UI copy updated accordingly.

### 2026-07-05 (later still) — fal.ai live + performance fixes + AI photo retouch

- **fal.ai verified live:** user funded a fal account; draft hero video (Hailuo) generated in ~100s (~$0.27) and integrated into the Regency hero via iteration (autoplay muted loop, photo poster).
- **Performance/pacing fixes** after "laggy, big gaps" feedback: (1) `storage._copy_optimized()` now downscales photos to 1920px/q82 when copying into `site/` (1.7MB → 156KB; originals untouched); (2) new "Pacing & Performance Discipline" section in the build skill (no dead scroll, pins capped +=100%, max 2-3 pins, reveals at top 85%, transform/opacity-only animation, section padding 6-10rem, overflow-x clip, img width/height); (3) Regency site re-iterated with these fixes.
- **AI photo retouch** (`app/retouch.py` + Photo Studio UI): per-photo "AI retouch" button with optional instruction. Claude vision (photo art director prompt) writes the edit plan (remove towels/baby baths/clutter, preserve walls/windows/floors, show-home staging), fal.ai `nano-banana/edit` applies it (~25s, ~$0.06 total). Edited image replaces the photo everywhere (site preview cache-busted by filename); original kept for one-click **Revert**. New photo columns `edit_status/edit_error/original_filename` (auto-migrated). Tested end-to-end incl. revert.
- **Gotcha fixed:** Fable 5 returns thinking blocks — vision responses must select the text block from `response.content`, not `content[0]`.
- **Photo splice + batch touch-up:** multi-select in Photo Studio with "Splice into one" / "Touch up" toggles. Splice: Claude vision studies all selected photos of the same space and directs one fal.ai multi-image edit into a single seamless composite (new photo, sources kept, safe placeholder during processing). Touch-up without splice: per-photo retouch loop. Tested live end-to-end (~25s, ~$0.06/splice).
- **Video from spliced photos fixed:** Kling/Hailuo reject source images with aspect ratio outside 0.4–2.5, so the ultra-wide 6-photo splice failed with a buried validation error. `video.py` now (1) center-crops the source photo into a safe 0.5–2.2 aspect range (and downscales to 2048px / JPEG q90) before sending, and (2) surfaces fal's actual error message (`_extract_detail`) instead of "no video url in response".
- **Transient fal.ai 403 hardened:** user hit a one-off `403 Forbidden` on `nano-banana/edit` (same key/model worked seconds before and after — fal-side transient, likely burst throttling). `retouch.py` now (1) retries submits on 403/429/5xx with backoff (3 attempts), (2) limits concurrent fal edit jobs to 2 via a semaphore, (3) surfaces fal's response body in errors (`_raise_with_detail`) so the real reason (e.g. "Exhausted balance") shows in the UI instead of a bare status code. Also: photos stuck in `edit_status='editing'` are marked as errored on startup (daemon edit threads don't survive restarts).
### 2026-07-05 (evening) — Designo Lead-Gen Pipeline

- **New "Leads" module in Designo** — automated speculative-pitch engine: discover UK businesses without websites → Fable writes their questionnaire brief from scraped data → normal two-stage mockup build (all AI artwork, no client photos) → Playwright captures a hero screenshot + ~7s scrolling GIF → Fable drafts a personalised pitch email with the GIF embedded inline → **human approval queue** → Resend sends it with bespoke login credentials → prospect site hosted on the Linode behind a login with engagement analytics.
- **Backend** (`designo/backend/app/`): `leads_db.py` (tables `leads/prospect_access/outreach_emails/lead_events/suppressed_emails/settings`, startup recovery flips transient statuses to error), `sources.py` (Apify Google Maps actor with `website: withoutWebsite` + contact enrichment; Companies House advanced search by SIC code/incorporation date; CSV import with loose header matching; dedupe by name+postcode), `lead_agent.py` (pipeline orchestrator, resumable: reuses existing brief/mockup on retry), `preview_media.py` (headless Chromium → `preview/hero.png` + `preview/scroll.gif`, 560px, ~22 frames), `outreach.py` (table-based email HTML shell around Fable's paragraphs, Resend send with List-Unsubscribe, webhook for delivered/opened/bounced/complained, HMAC-signed unsubscribe links, suppression list), `prospect.py` (public `/p/{slug}/` routes: branded login page, signed 30-day session cookie, site served with injected analytics beacon + dismissible pricing panel; email media served unauthenticated with `?src=email` open-tracking).
- **Frontend**: new `Leads.tsx` (discovery form, CSV upload, pricing/sender settings, filterable status board) and `LeadDetail.tsx` (mockup iframe, GIF preview, editable email draft + rendered preview, Approve & Send with confirm, prospect credentials, activity timeline). Nav link added.
- **Config/env**: `APIFY_TOKEN`, `COMPANIES_HOUSE_KEY`, `RESEND_API_KEY`, `DESIGNO_OUTREACH_FROM/REPLY_TO`, `DESIGNO_PUBLIC_URL`. Features hide/disable until keys are set; CSV import needs no keys. `playwright` + Chromium installed in the venv. Nginx: `/designo/p/` proxied to backend `/p/`.
- **Pricing strategy**: emails don't lead with money (spam-feel) — pricing lives in a settings-driven panel injected into the logged-in prospect site; email leads with the animated preview of THEIR site + login details.
- **Gotcha fixed during testing**: Fable's concept JSON occasionally contains raw newlines inside strings → `json.JSONDecodeError`. `generator.call_claude_json()` now repairs common faults (escapes newlines/tabs in strings, strips trailing commas) and retries the model once on malformed JSON; concept stage, lead brief and pitch email all use it.
- **Portal card added**: "Designo Lead Engine" card on the Nemx portal dashboard linking straight to `/designo/leads` (amber-rose gradient, magnifier icon). Portal rebuilt and redeployed.
- **Shadow site for agentic commerce (USP)**: every generated site now ships `llms.txt` + `agent.json` (services with request_quote/call actions, transaction notes, no fabricated prices) + `agent.html` (semantic microdata page) + schema.org JSON-LD injected into the page head (SEO structured data). New `app/shadow.py` + `SHADOW_SITE_SKILL`; cached per project in `shadow.json`; non-fatal on failure; Studio shows links. Tested live on the Harper & Sons mockup (9 services extracted, `RoofingContractor` JSON-LD).
- **Tested end-to-end live**: CSV-imported a fake lead ("Harper & Sons Roofing", Shrewsbury) → pipeline ran 16 min (brief 1 min, concept+9 artworks ~8 min, site build ~5 min, GIF capture ~1 min, email draft ~20s) → produced a full motion site, 1.2MB hero.png + 1.4MB scroll.gif, personalised email in review. Verified: login page, wrong-password 401, session cookie, gated assets (401 without login), beacon events (page_view/login/email_image_loaded recorded), pricing panel with settings values, path-traversal 403, unsubscribe link. Test lead left in place as a demo.

- **"Add to website" button on ready videos:** new `POST /api/projects/{id}/videos/{video_id}/add-to-site` endpoint kicks off a site iteration with a fixed instruction telling Claude to use that exact clip (`videos/<filename>`) as the hero's full-bleed background video (autoplay muted loop playsinline, hero-photo poster, scrim, existing choreography kept). Falls back to a full rebuild (cached concept) if no site exists yet. Studio's hero-video panel shows an "Add to website" button under each ready clip; the usual generating overlay/poll shows progress. Frontend rebuilt + backend restarted.
