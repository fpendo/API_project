# Knowledge Base - NEMX (offsetX) Project

> **CRITICAL:** This file contains essential project information, known bugs, fixes, and implementation details.
> **Always read this file first** before starting work on the project.

**Last Updated:** 2026-06-29

---

## Project Location

**Main Project Folder:** `C:\Users\fpend\OneDrive\Desktop\projects\nemx`
**Fallback (Old Backend):** `C:\Users\fpend\OneDrive\Desktop\projects\offsetX`

## Frontend Technology Stack

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (custom dark theme)
- **Animations:** Framer Motion
- **Components:** Custom UI library in `src/components/`
  - `ui/` - Primitive components (Button, Card, Badge, Input, Select, Modal, Table, Tabs)
  - `layout/` - Layout components (AppShell, TopBar, Sidebar)
  - `domain/` - Domain-specific components (StatCard, NotificationBanner)
- **Pages:** All in `src/pages/` (Landing, Landowner, Regulator, Broker, Developer, Planning, Exchange, Operator, etc.)

### Terminology Update (2026-01-03)
- "NFT" has been renamed to "Digital Certificate" throughout the UI and backend
- "Token ID" has been renamed to "Certificate ID"
- Frontend uses `formatNotificationMessage()` helper to replace terms in existing notifications

---

## Critical Issues & Fixes

### 1. Broker-Developer Trade Issue: Credits Not Appearing in Accounts Summary (FIXED)

**Problem:** 
- Broker client account places sell limit orders via ladder bot for Solent
- Developer buys them via market orders
- Orders don't appear in accounts summary table
- Trades are recorded in database but have no transaction hash

**Root Cause:**
1. **Broker EVM address is a placeholder** (`0x4444444444444444444444444444444444444444`) - not a real Hardhat account
2. **Developer EVM address is a placeholder** (`0x5555555555555555555555555555555555555555`) - not a real Hardhat account
3. **BROKER_PRIVATE_KEY doesn't match** broker's EVM address (key is for Account #0, address is placeholder)
4. **DEVELOPER_PRIVATE_KEY not set** - cannot transfer credits to developer
5. **On-chain transfers fail** because addresses don't exist on-chain

**Fix:**
1. Run `python backend/fix_broker_developer_addresses.py` to update addresses to real Hardhat accounts:
   - Broker → Hardhat Account #2 (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`)
   - Developer → Hardhat Account #5 (`0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc`)

2. Update `backend/.env` with correct private keys:
   ```
   BROKER_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
   DEVELOPER_PRIVATE_KEY=0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
   TRADING_ACCOUNT_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   TRADING_ACCOUNT_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   ```

3. Restart backend server

4. Run `python backend/retroactive_transfer.py` to retry failed transfers

**Prevention:**
- Always use real Hardhat account addresses (not placeholders) for accounts that need to trade
- Ensure private keys in `.env` match the EVM addresses in the database
- After resetting Hardhat node, always update addresses and retry failed transfers

**Key Files:**
- `backend/seed.py` - Contains placeholder addresses (needs update)
- `backend/fix_broker_developer_addresses.py` - Fix script
- `backend/post_reset_fix.py` - Automated post-reset fix (recommended)
- `backend/diagnose_broker_developer_trades.py` - Diagnostic script
- `backend/app/services/order_matching.py` - Trade execution logic

---

### 2. Landowner Transfer Button Disabled (FIXED)

**Problem:**
- Transfer button shows as disabled even when credits are available
- User can assign credits but cannot transfer them

**Root Cause:**
- `remaining_credits` calculation in `credits_summary.py` was subtracting `assigned_credits` twice:
  1. Assigned credits are already transferred on-chain (balance already reduced)
  2. Calculation then subtracted them again: `remaining_credits = unlocked_credits - assigned_credits`
- This resulted in `remaining_credits = 0` even when credits were available

**Fix:**
- Updated `backend/app/services/credits_summary.py` line 220:
  - **Before:** `remaining_credits = unlocked_credits - assigned_credits`
  - **After:** `remaining_credits = unlocked_credits` (assigned credits already deducted from balance)
- Added comment explaining that assigned credits are already transferred on-chain

**Result:**
- Transfer button now correctly enabled when credits are available
- `remaining_credits` accurately reflects what can be transferred

**Key Files:**
- `backend/app/services/credits_summary.py` - Fixed remaining_credits calculation

---

### 3. Database Reset Address/Key Mismatch (FIXED)

**Problem:**
- After running `python reset_db.py --seed`, accounts have placeholder addresses
- `.env` file has private keys for real Hardhat accounts
- Mismatch causes all trades to fail

**Root Cause:**
- `reset_db.py` seeds accounts with placeholder addresses:
  - Broker: `0x4444444444444444444444444444444444444444`
  - Developer: `0x5555555555555555555555555555555555555555`
- `.env` file has keys for real accounts (Account #2, #5)
- Addresses don't match keys → transfers fail

**Fix:**
- Created `backend/post_reset_fix.py` script that:
  1. Updates database addresses to real Hardhat accounts
  2. Updates `.env` file with matching private keys
  3. Provides clear next steps

**Workflow:**
```powershell
# 1. Reset database
cd backend
python reset_db.py --seed --yes

# 2. Fix addresses and keys
python post_reset_fix.py --yes

# 3. Restart backend server
```

**Prevention:**
- Always run `post_reset_fix.py` after database reset
- Or manually run `fix_broker_developer_addresses.py` + `update_env_keys.py`

**Key Files:**
- `backend/post_reset_fix.py` - Automated fix script (NEW)
- `backend/reset_db.py` - Database reset script
- `backend/fix_broker_developer_addresses.py` - Manual address fix
- `backend/update_env_keys.py` - Manual key update

---

### 4. Portal Login Connection Error / 502 Bad Gateway (FIXED)

**Problem:**
- `www.nemx.co.uk/login` displayed a connection error.
- Public `POST /api/auth/login` returned `502 Bad Gateway`.

**Root Cause:**
- Nginx proxies `/api/auth/` to the portal backend on `127.0.0.1:8080`.
- `portal-backend.service` was configured for `/opt/app/portal/backend`, but the deployed portal backend is under `/opt/app/nemx/portal/backend`.
- The portal backend virtualenv had stale executable paths from the old location.

**Fix:**
1. Update the live systemd unit and deploy-copy unit to use `/opt/app/nemx/portal/backend`.
2. Recreate the portal backend virtualenv:
   ```bash
   python3 -m venv --clear /opt/app/nemx/portal/backend/venv
   /opt/app/nemx/portal/backend/venv/bin/python -m pip install -r /opt/app/nemx/portal/backend/requirements.txt
   ```
3. Restart the service:
   ```bash
   systemctl daemon-reload
   systemctl restart portal-backend
   ```

**Prevention:**
- Keep deployment service paths aligned with the actual VPS app layout.
- After moving app directories, recreate virtualenvs instead of reusing relocated script shims.
- Verify with `curl` that `/api/auth/login` returns `401` for bad credentials or `200` for configured credentials, not `502`.

**Key Files:**
- `/etc/systemd/system/portal-backend.service` - Live systemd unit
- `deploy/systemd/portal-backend.service` - Deployment copy
- `nemx/portal/backend/app/main.py` - Portal auth API

---

## Portal & Multi-Project Layout

The root domain (`www.nemx.co.uk`) serves a **Project Portal** (login + project selector). Projects are added as cards in the portal dashboard and served as separate paths behind nginx.

**Key locations:**
- Portal frontend source: `nemx/portal/frontend/` (React + Vite + Tailwind). Project cards are defined in `src/pages/Dashboard.tsx` (the `projects` array).
- Portal backend (auth): `nemx/portal/backend/` on `127.0.0.1:8080` (systemd `portal-backend`).
- Built portal is deployed to `/var/www/portal/` (nginx `location /`).
- Live nginx config: `/etc/nginx/sites-available/portal`; repo copy: `deploy/nginx/portal.conf`.

**To add a new project to the portal:**
1. Add a card to the `projects` array in `nemx/portal/frontend/src/pages/Dashboard.tsx` (`status: 'active'`, `href: '/<slug>/'`).
2. Add an nginx `location /<slug>/` block (alias to its `/var/www/<slug>/`) in BOTH the live config and `deploy/nginx/portal.conf`.
3. Deploy the project's static files to `/var/www/<slug>/`.
4. Rebuild the portal: `cd nemx/portal/frontend && npm run build`, then `cp -r dist/* /var/www/portal/` (remove stale hashed assets), `chown -R www-data:www-data`.
5. `nginx -t && systemctl reload nginx`.

**Existing projects:**
- **NEMX** — `/nemx/` (served from `/var/www/nemx/`). The offset exchange app.
- **Agrios** — `/agrios/` (served from `/var/www/agrios/`). "An Operating System for Farming Intelligence" — an interactive landing page/plan. **As of 2026-06-29 it is a MODULAR static site** (no longer one big `index.html`). Chart.js loads via CDN; Mermaid was **removed** (all flowcharts are now custom interactive HTML/SVG). Source of truth lives under `Agrios/`:
  - `Agrios/index.html` — thin shell: `<head>`, nav, a `<main>` of `<div data-include="sections/xxx.html">` placeholders, footer, and `<script type="module" src="assets/js/main.js">`.
  - `Agrios/sections/*.html` — one HTML partial per section (hero, overview, knowledge, architecture, coverage, data, testing, fields, cattle, interaction, analytics, roadmap).
  - `Agrios/assets/css/styles.css` — all styles.
  - `Agrios/assets/js/` — ES modules: `main.js` (fetches & injects partials via `data-include`, then boots sections), `theme.js` (Chart.js theme + `grad()`), `util.js` (`onVisible`, `$`), `data.js` (ALL mock data — cows/calves/genetics/cuts, fields, testing, research swarm, domains, chat), and `sections/<name>.js` (one initializer each, exported as `init<Name>()`).
  - **How modularity works:** `main.js#includePartials()` fetches each `data-include` URL and injects it, then runs each `init*()` wrapped in try/catch. Served under `/agrios/` so relative paths (`sections/…`, `assets/…`) resolve; nginx `try_files` serves the partials/modules. JS is served as `application/javascript` (required for ESM).
  - **Section highlights (redesigned 2026-06-29):**
    - **Knowledge** — research swarm is an interactive *flow feature*: 6 hoverable stage cards + 6 specialist agents drive a sticky detail panel (replaces the old Mermaid swarm chart). Plus growth/radar charts and domain deep-dive tabs.
    - **Connectivity (architecture)** — 5-layer integration diagram (data points → LoRa gateways/ChirpStack → self-healing 5GHz mesh → Starlink hub → cloud/vault/LLM), each node hover-explained in `#netDetail`.
    - **Coverage** — Exmoor satellite LoRa coverage simulator (`assets/exmoor-satellite.jpg`) + full bill-of-materials (unchanged, ported).
    - **Testing** — reimagined: 5 programme tabs (soil/forage/genetics/water/animal), each with a full analyte result grid (value vs range + good/watch/act meters), a sample lab report, cadence table, custom ingestion pipeline (replaces Mermaid), and cost chart. Data in `data.js#testing`.
    - **Fields** — quadrants A–D + 16 management cells **overlaid on the satellite image** via bilinear-interpolated SVG polygons (`fields.js`). Hover a cell → full testing profile (pH/P/K/Mg/S/CEC/texture/moisture), nutrient-drift chart over 6 rounds, and a test-history table. Data in `data.js#fieldSeries`.
    - **Cattle HUD** — cow selector → rich record with a **butcher's-chart SVG body map** (hover a primal cut for its name + any injury on that cut; injured cuts highlighted + markers), 4 sub-tabs (Overview/Health/Genetics & DNA/Calves): genomic EBV radar, breed composition, parentage, genetic conditions & markers, vaccination schedule, meds, and a **calves drill-down** with per-calf birth details + growth-curve charts. Data in `data.js#cows` (+ `cuts`).
    - **Voice** — custom 5-step pipeline (replaces Mermaid) + animated Telegram chat.
  - **To update & deploy:** edit files under `Agrios/`, then copy the whole tree: `cp Agrios/index.html /var/www/agrios/ && cp -r Agrios/assets Agrios/sections /var/www/agrios/ && chown -R www-data:www-data /var/www/agrios`. (Copy `sections/` too — easy to forget.) A jsdom smoke test (inject partials + run every `init*()`) is the quickest way to catch runtime errors without a browser.

---

## Hardhat Account Reference

**Standard Hardhat Test Accounts (pre-funded):**

| Account # | Address | Private Key | Use Case |
|-----------|---------|-------------|----------|
| 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | Landowner/Regulator |
| 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | Trading Account |
| 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | Broker |
| 5 | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` | Developer |
| 9 | `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720` | `0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356` | Broker House Account |

---

## Key Flows & How They Work

### Broker Client Account Sell Orders via Ladder Bot

**Path:**
1. **Landowner assigns credits to broker** (`/landowner/assign-to-broker`)
   - Credits transferred from landowner to broker client account (95%) and house account (5%)
   - Creates `BrokerMandate` record

2. **Broker creates sell ladder bot** (`/broker/{id}/sell-ladder-bots`)
   - Bot configured for catchment/unit_type
   - Bot assigned to client mandate or house account

3. **Bot places sell orders** (`place_sell_ladder_orders()`)
   - Orders created with broker's account_id
   - Orders reference FIFO queue entries
   - Orders placed on exchange

4. **Developer buys via market order** (`/exchange/orders`)
   - Order matching service matches buy order with sell order
   - Trade record created
   - **On-chain transfer executed:**
     - From: Broker's EVM address (for client) or house address (for house)
     - To: Developer's EVM address
     - Uses: `BROKER_PRIVATE_KEY` or `BROKER_HOUSE_PRIVATE_KEY` for seller
     - Uses: `DEVELOPER_PRIVATE_KEY` not needed (buyer receives, doesn't sign)

5. **Credits appear in developer's account summary** (`/accounts/{id}/credits-summary`)
   - Queries on-chain balances at developer's EVM address
   - Returns holdings per scheme

**Key Files:**
- `backend/app/services/sell_ladder_bot.py` - Bot logic
- `backend/app/services/order_matching.py` - Trade execution
- `backend/app/services/credits_summary.py` - Balance queries
- `backend/app/routes/accounts.py` - Accounts summary endpoint

---

## Common Issues & Solutions

### Issue: Trades recorded but no transaction hash

**Symptoms:**
- Trades appear in database
- `transaction_hash` is NULL
- Credits don't appear in accounts summary

**Causes:**
1. EVM addresses are placeholders (not real Hardhat accounts)
2. Private keys don't match addresses
3. Hardhat node not running
4. Contract addresses not set in `.env`

**Solution:**
1. Run `python backend/diagnose_broker_developer_trades.py` to identify issues
2. Fix addresses: `python backend/fix_broker_developer_addresses.py`
3. Update `.env` with correct private keys
4. Retry transfers: `python backend/retroactive_transfer.py`

---

## Configuration & Environment

### Required Environment Variables

**Blockchain:**
- `RPC_URL` - Hardhat node URL (default: `http://127.0.0.1:8545`)
- `SCHEME_NFT_CONTRACT_ADDRESS` - SchemeNFT contract address
- `SCHEME_CREDITS_CONTRACT_ADDRESS` - SchemeCredits contract address
- `PLANNING_LOCK_CONTRACT_ADDRESS` - PlanningLock contract address

**Account Private Keys:**
- `REGULATOR_PRIVATE_KEY` - For regulator operations (Account #0)
- `LANDOWNER_PRIVATE_KEY` - For landowner operations (Account #0)
- `BROKER_PRIVATE_KEY` - For broker client account operations (Account #2)
- `BROKER_HOUSE_PRIVATE_KEY` - For broker house account operations (Account #9)
- `DEVELOPER_PRIVATE_KEY` - For developer operations (Account #5)
- `TRADING_ACCOUNT_PRIVATE_KEY` - For trading account operations (Account #1)

**Account Addresses:**
- `TRADING_ACCOUNT_ADDRESS` - Trading account address (Account #1)
- `BROKER_HOUSE_ADDRESS` - Broker house account address (Account #9)

**Critical:** Private keys MUST match the EVM addresses stored in the database!

---

## Architecture & Structure

### Credit Transfer Flow

1. **Seller Address Determination:**
   - Landowner → Trading account address
   - Broker (client) → Broker EVM address
   - Broker (house) → House address

2. **Buyer Address:**
   - Always uses buyer's EVM address from database

3. **Private Key Selection:**
   - Based on actual seller address (not account role)
   - Trading account → `TRADING_ACCOUNT_PRIVATE_KEY`
   - Broker client → `BROKER_PRIVATE_KEY`
   - Broker house → `BROKER_HOUSE_PRIVATE_KEY`

4. **Transfer Execution:**
   - `transfer_credits_on_chain()` in `order_matching.py`
   - Uses `safeTransferFrom()` on SchemeCredits contract
   - Transaction hash stored in Trade record

---

## Important Implementation Details

### Accounts Summary Query

The `get_account_credits_summary()` function:
1. Queries on-chain balances using `balanceOfBatch()`
2. Queries locked balances per scheme
3. Calculates assigned credits from broker mandates
4. Calculates sold credits from trades
5. Queries trading account balances (for landowners)
6. Returns holdings per scheme

**Critical:** If EVM address is a placeholder, on-chain query returns 0, so no holdings appear!

---

## Planning Officer Portal Features

### Available Actions by Status

**PENDING Applications:**
- Approve → Locks credits on-chain
- Reject → Rejects application (no credit lock)

**LOCKED Applications:**
- Burn Credits → Permanently removes credits (approves application)
- Unlock Credits → Releases credits back to developer (rejects application)

**APPROVED/REJECTED Applications:**
- View only (already processed)

### Archive Features
- View all applications with filtering by status
- Search by token, developer, ID, planning reference, catchment
- Navigate to detailed application view
- See complete application history

**Key Files:**
- `backend/frontend/src/pages/Planning.tsx` - Planning Officer portal
- `backend/frontend/src/pages/PlanningApplicationDetail.tsx` - Detailed view
- `backend/app/routes/planning.py` - Backend endpoints

---

## Testing Checklist

Before testing broker-developer trades:
- [ ] Hardhat node is running
- [ ] Contracts are deployed
- [ ] Broker EVM address is real Hardhat account
- [ ] Developer EVM address is real Hardhat account
- [ ] `BROKER_PRIVATE_KEY` matches broker's EVM address
- [ ] `DEVELOPER_PRIVATE_KEY` is set (for future operations)
- [ ] `TRADING_ACCOUNT_PRIVATE_KEY` is set
- [ ] All contract addresses in `.env`
- [ ] Run diagnostic: `python backend/diagnose_broker_developer_trades.py`

After database reset:
- [ ] Run `python backend/post_reset_fix.py --yes`
- [ ] Restart backend server
- [ ] Verify addresses match keys: `python backend/verify_env_keys.py`
