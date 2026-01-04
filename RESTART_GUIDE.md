# Project Restart Guide - NEMX

> **Last Updated:** 2026-01-02
> **Project Folder:** `C:\Users\fpend\OneDrive\Desktop\projects\nemx`

This guide explains how to restart the NEMX project after shutdown.

## Project Components

This project consists of three main components:
1. **Hardhat Node** (Blockchain) - Port 8545
2. **Backend API** (FastAPI) - Port 8000
3. **Frontend** (React/Vite) - Port 5173+ (may vary)

## 🚀 Quick Restart (Copy-Paste Ready)

Open **3 terminal windows** and run these commands:

**Terminal 1 - Hardhat:**
```powershell
cd C:\Users\fpend\OneDrive\Desktop\projects\nemx
npx hardhat node
```

**Terminal 2 - Backend:**
```powershell
cd C:\Users\fpend\OneDrive\Desktop\projects\nemx\backend
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 3 - Frontend:**
```powershell
cd C:\Users\fpend\OneDrive\Desktop\projects\nemx\backend\frontend
npm run dev
```

**Access:** http://localhost:5173 (or check terminal for actual port)

---

## Alternative: Use the restart script

```powershell
cd C:\Users\fpend\OneDrive\Desktop\projects\nemx
.\restart-project.ps1
```

---

## Manual Restart Steps (Detailed)

#### 1. Stop All Running Services

Press `Ctrl+C` in each terminal window running:
- Hardhat node
- Backend server
- Frontend dev server

Or kill processes on ports:
```powershell
# Kill process on port 8545 (Hardhat)
Get-NetTCPConnection -LocalPort 8545 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Kill process on port 8000 (Backend)
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Kill process on port 5173 (Frontend)
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

#### 2. Start Hardhat Node (Optional - if using blockchain features)

```powershell
# From project root
npx hardhat node
```

This starts a local blockchain on `http://127.0.0.1:8545` with 20 pre-funded accounts.

**Note:** Keep this terminal open. 

#### 2a. Deploy Contracts and Update .env (REQUIRED after restarting Hardhat)

After starting Hardhat node, you **must** deploy contracts and update the `.env` file:

**Option 1: Automated (Recommended)**
```powershell
# From project root
cd backend
.\deploy-and-update-env.ps1
```

This script will:
- Deploy all three contracts (SchemeNFT, SchemeCredits, PlanningLock)
- Automatically update `backend/.env` with the new contract addresses
- **Set up trading account approvals** (required for credit transfers to work)
- Show you the deployed addresses

**Important:** The trading account approval step is critical - without it, credit transfers from the trading account will fail with permission errors.

**Option 2: Manual**
```powershell
# From project root
npx hardhat run scripts/deploy-and-update-env.ts --network localhost
```

Then manually copy the addresses to `backend/.env`:
```env
SCHEME_NFT_CONTRACT_ADDRESS=0x...
SCHEME_CREDITS_CONTRACT_ADDRESS=0x...
PLANNING_LOCK_CONTRACT_ADDRESS=0x...
```

**Important:** After deploying contracts, you must restart the backend server for it to pick up the new addresses.

#### 3. Deploy Contracts and Update .env (REQUIRED)

**This step is REQUIRED after restarting Hardhat node!**

```powershell
# From project root
cd backend
.\deploy-and-update-env.ps1
```

This will:
- Deploy all contracts to the Hardhat node
- Automatically update `backend/.env` with new contract addresses
- Configure contract relationships

**Note:** If you don't deploy contracts, the backend will fail with "contract not deployed" errors.

#### 4. Initialize/Reset Database (if needed)

```powershell
cd backend

# Activate virtual environment
.\venv\Scripts\activate

# Recreate database (optional - deletes existing data)
# Remove the database file if you want a fresh start
Remove-Item offsetx.db -ErrorAction SilentlyContinue

# Seed database
python seed.py
```

This creates:
- Database file (`offsetx.db`)
- All required tables
- Initial accounts for all roles

#### 5. Start Backend Server

```powershell
# From backend directory (with venv activated)
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

The backend will be available at:
- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

**Keep this terminal open.**

#### 6. Start Frontend

```powershell
# From project root, navigate to frontend
cd backend\frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

**Keep this terminal open.**

## Verification

After starting all services, verify they're running:

```powershell
# Check Hardhat node
curl http://localhost:8545

# Check backend health
curl http://localhost:8000/health
# Should return: {"status":"ok"}

# Check frontend
curl http://localhost:5173
```

## Common Issues

### Port Already in Use

If a port is already in use, either:
1. Stop the process using that port (see "Stop All Running Services" above)
2. Or change the port in the respective configuration

### Database Errors

If you see database errors:
```powershell
cd backend
.\venv\Scripts\activate
python seed.py
```

### Module Not Found Errors

**Backend:**
```powershell
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```powershell
cd backend\frontend
npm install
```

**Root (Hardhat):**
```powershell
npm install
```

## Development Workflow

1. **First Time Setup:**
   - Install dependencies (see above)
   - Start Hardhat node
   - Deploy contracts (if needed)
   - Seed database
   - Start backend
   - Start frontend

2. **Daily Development:**
   - Start Hardhat node (if using blockchain)
   - Start backend
   - Start frontend

3. **After Code Changes:**
   - Backend: Auto-reloads with `--reload` flag
   - Frontend: Auto-reloads with Vite HMR
   - Hardhat: Restart node if contract changes

## Environment Variables

If you need to configure contract addresses, create a `.env` file in the `backend/` directory:

```env
SCHEME_NFT_CONTRACT_ADDRESS=0x...
SCHEME_CREDITS_CONTRACT_ADDRESS=0x...
PLANNING_LOCK_CONTRACT_ADDRESS=0x...
RPC_URL=http://127.0.0.1:8545
```

## Troubleshooting

For more detailed troubleshooting, see `TROUBLESHOOTING.md`.




