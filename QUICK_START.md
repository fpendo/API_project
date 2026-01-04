# Quick Start Guide - NEMX (offsetX)

> **Last Updated:** 2026-01-03
> **Project Folder:** `C:\Users\fpend\OneDrive\Desktop\projects\nemx`

## Prerequisites

Make sure you have installed:
- **Node.js** (for Hardhat and frontend)
- **Python 3.8+** (for backend)
- **npm** (comes with Node.js)

---

## 🚀 Quick Restart (After Shutdown)

If you've shut down everything and need to restart, open **3 terminal windows** and run:

### Terminal 1: Hardhat Node (Blockchain)
```powershell
cd C:\Users\fpend\OneDrive\Desktop\projects\nemx
npx hardhat node
```

### Terminal 2: Backend API
```powershell
cd C:\Users\fpend\OneDrive\Desktop\projects\nemx\backend
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 3: Frontend
```powershell
cd C:\Users\fpend\OneDrive\Desktop\projects\nemx\backend\frontend
npm run dev
```

**Access the app at:** http://localhost:5173 (or whatever port Vite assigns)

---

## Fresh Start / Database Reset

If you're resetting the database or starting fresh:

### Reset Database
```powershell
cd backend
python reset_db.py --seed --yes
python post_reset_fix.py --yes
```

This will:
- Delete the existing database (`offsetx.db`)
- Create a fresh database with seeded accounts
- Fix addresses to match Hardhat accounts

**Note:** After resetting, restart the backend server.

---

## First-Time Setup

### 1. Install Dependencies

#### Root (Hardhat/Contracts)
```powershell
cd C:\Users\fpend\OneDrive\Desktop\projects\nemx
npm install
```

#### Backend
```powershell
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install Python packages
pip install -r requirements.txt
```

#### Frontend
```powershell
cd backend\frontend
npm install
```

### 2. Start the Project

You need **3 separate terminal windows** for the 3 services:

#### Terminal 1: Hardhat Node (Blockchain)
```powershell
# From project root
npx hardhat node
```
**Keep this running** - it provides the local blockchain on port 8545.

**CRITICAL: After starting Hardhat, you MUST deploy contracts:**
```powershell
# In a new terminal, from project root
cd backend
.\deploy-and-update-env.ps1
```

This script will:
- Deploy all three contracts (SchemeNFT, SchemeCredits, PlanningLock)
- Automatically update `backend/.env` with the correct contract addresses
- Set up trading account approvals (required for credit transfers)

**⚠️ IMPORTANT - Trading Account Private Key Fix:**
- The system now **automatically uses the correct private key** for trading account transfers
- When transferring FROM the trading account, it uses the trading account's private key (hardcoded fallback)
- When transferring FROM landowner/regulator, it uses their private key from environment
- **No manual configuration needed** - the fix is built into the code
- This prevents `ERC1155MissingApprovalForAll` errors

**You must run `.\deploy-and-update-env.ps1` every time you restart Hardhat node!**

#### Terminal 2: Backend API
```powershell
# From project root
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
**Keep this running** - Backend API on port 8000.

#### Terminal 3: Frontend
```powershell
# From project root
cd backend\frontend
npm run dev
```
**Keep this running** - Frontend (may use port 5173, 5174, 5175, etc. - check terminal output).

### 3. Initialize Database (First Time Only or After Reset)

In a **new terminal** (or after stopping backend):
```powershell
cd backend
.\venv\Scripts\activate
python seed.py
```

This creates the database with initial accounts:
- Regulator account
- Landowner account (John Landowner)
- Developer account (DevCo Properties)
- Initial schemes and credits

### 4. Access the Application

Once all services are running:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Hardhat Node**: http://localhost:8545

## Quick Restart Script

You can also use the PowerShell script:

```powershell
# From project root
.\restart-project.ps1
```

This will guide you through starting services.

## Verify Everything Works

### Check Backend
```powershell
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

### Check Frontend
Open browser to: http://localhost:5173

### Check Hardhat
The Hardhat node terminal should show:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

## Complete Restart Workflow

If you've shut down everything and need to restart:

1. **Start Hardhat Node** (Terminal 1)
   ```powershell
   npx hardhat node
   ```

2. **Deploy Contracts** (New Terminal)
   ```powershell
   cd backend
   .\deploy-and-update-env.ps1
   ```
   This updates `.env` with new contract addresses and sets up approvals.

3. **Start Backend** (Terminal 2)
   ```powershell
   cd backend
   .\venv\Scripts\activate
   uvicorn app.main:app --reload --port 8000
   ```

4. **Start Frontend** (Terminal 3)
   ```powershell
   cd backend\frontend
   npm run dev
   ```

5. **Reset Database (if needed)**
   ```powershell
   cd backend
   .\venv\Scripts\activate
   python reset_db.py
   python seed.py
   ```

**Key Points:**
- ✅ Trading account private key is handled automatically (no manual setup needed)
- ✅ Contract deployment script updates `.env` automatically
- ✅ All approvals are set up during deployment
- ✅ Database can be reset anytime with `reset_db.py`

## Troubleshooting

### Trading Account Transfer Errors

If you see `ERC1155MissingApprovalForAll` or "Private key mismatch" errors:

1. **Verify contracts are deployed:**
   ```powershell
   cd backend
   python check_contract_deployment.py
   ```

2. **Re-run deployment script:**
   ```powershell
   cd backend
   .\deploy-and-update-env.ps1
   ```

3. **Check environment variables:**
   - `SCHEME_CREDITS_CONTRACT_ADDRESS` should be set
   - `TRADING_ACCOUNT_ADDRESS` should be `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
   - `TRADING_ACCOUNT_PRIVATE_KEY` is optional (hardcoded fallback exists)

The system automatically uses the correct private key, but if issues persist, restart the backend server after deploying contracts.

### Port Already in Use
```powershell
# Kill process on port 8000 (Backend)
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Kill process on port 5173 (Frontend)
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Kill process on port 8545 (Hardhat)
Get-NetTCPConnection -LocalPort 8545 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Database Errors

**Reset and re-seed:**
```powershell
cd backend
.\venv\Scripts\activate
python reset_db.py
python seed.py
```

**Or just re-seed (if database exists):**
```powershell
cd backend
.\venv\Scripts\activate
python seed.py
```

### Import Errors
Make sure all dependencies are installed:
```powershell
# Backend
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd backend\frontend
npm install

# Root
npm install
```

## Development Workflow

1. **Start Hardhat node** (Terminal 1) - Keep running
2. **Start Backend** (Terminal 2) - Auto-reloads on code changes
3. **Start Frontend** (Terminal 3) - Auto-reloads with Vite HMR

All services will auto-reload when you make code changes!

## Important Notes

### Trading Account Private Key Resolution

The trading account private key issue has been **fully resolved**:

✅ **Automatic Key Selection**: The system automatically uses the correct private key:
   - Trading account transfers → Uses trading account's private key (hardcoded fallback)
   - Landowner/regulator transfers → Uses their private key from environment

✅ **Hardcoded Fallback**: If `TRADING_ACCOUNT_PRIVATE_KEY` is not set in `.env`, the system uses the Hardhat account #1 private key automatically

✅ **Validation**: The code validates that the private key matches the seller address before attempting transfers

✅ **No Manual Setup Required**: Everything works out of the box after deploying contracts

### After Hardhat Restart

**Every time you restart Hardhat node, you MUST:**
1. Deploy contracts: `cd backend && .\deploy-and-update-env.ps1`
2. Restart backend server (to load new contract addresses)
3. Reset database if needed: `python reset_db.py && python seed.py`

The deployment script handles everything automatically, including trading account setup.

## Next Steps

- Read `RESTART_GUIDE.md` for detailed restart instructions
- Read `TROUBLESHOOTING.md` for common issues
- Read `TRADING_ACCOUNT_SETUP.md` for technical details on the trading account fix
- Check `plan.md` for project architecture




