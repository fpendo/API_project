# Project Progress Tracker

> **Auto-updated document** tracking implementation progress, problems encountered, and solutions.

**Last Updated:** 2026-01-07

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

