# NEMX Unpacking Instructions

> This file contains instructions for setting up the project after extracting from the portable archive.

## Quick Start

1. Extract this ZIP to your desired location (e.g., `C:\Users\YourName\projects\nemx`)

2. Open terminal in the extracted folder and follow the steps below.

---

## Step 1: Install Dependencies

```powershell
# Install root (Hardhat) dependencies
npm install

# Install frontend dependencies
cd backend/frontend
npm install
cd ../..

# Compile smart contracts
npx hardhat compile
```

---

## Step 2: Setup Backend

```powershell
cd backend

# Create .env file with the following variables:
# (You can copy from .env.example if it exists, or create new)
```

### Required Environment Variables

Create a file called `.env` in the `backend/` folder with these variables:

```env
# Blockchain RPC
RPC_URL=http://127.0.0.1:8545

# Contract Addresses (filled after deployment)
SCHEME_NFT_CONTRACT_ADDRESS=
SCHEME_CREDITS_CONTRACT_ADDRESS=
PLANNING_LOCK_CONTRACT_ADDRESS=

# Account Private Keys (Hardhat default accounts)
REGULATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
BROKER_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
DEVELOPER_PRIVATE_KEY=0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
TRADING_ACCOUNT_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
BROKER_HOUSE_PRIVATE_KEY=0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356

# Account Addresses
TRADING_ACCOUNT_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
BROKER_HOUSE_ADDRESS=0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
```

### Reset Database

```powershell
# Still in backend/ folder
python reset_db.py --seed --yes
python post_reset_fix.py --yes
```

---

## Step 3: Start Services (3 Terminals)

### Terminal 1 - Hardhat Node

```powershell
# From project root
npx hardhat node
```

Keep this running.

### Terminal 2 - Deploy Contracts & Start Backend

```powershell
# From project root - Deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# The deploy script will output contract addresses
# Copy these to your backend/.env file

# Start backend
cd backend
uvicorn app.main:app --reload
```

Keep this running.

### Terminal 3 - Start Frontend

```powershell
# From project root
cd backend/frontend
npm run dev
```

Keep this running.

---

## Step 4: Verify Everything Works

- **Frontend:** http://localhost:5173
- **Backend Health:** http://localhost:8000/health

You should see the role selection page on the frontend.

---

## Rename Project (Optional)

To rename from "offsetX" to "nemx" or your preferred name:

1. Edit `package.json` in root:
   - Change `"name": "offsetx"` to `"name": "nemx"`

2. Edit `backend/frontend/package.json`:
   - Change `"name": "frontend"` to `"name": "nemx-frontend"`

3. Update branding in frontend components:
   - `backend/frontend/src/pages/Landing.tsx` - Update title text
   - `backend/frontend/index.html` - Update page title

---

## Troubleshooting

### "Module not found" errors
Run `npm install` in both root and `backend/frontend/` folders.

### Contract deployment fails
Make sure Hardhat node is running in Terminal 1 before deploying.

### Backend can't connect to blockchain
Ensure:
1. Hardhat node is running
2. Contract addresses are correctly copied to `.env`
3. Restart backend after updating `.env`

### Database errors
Run `python reset_db.py --seed --yes` in the backend folder.

### Address/Key mismatch
Run `python post_reset_fix.py --yes` in the backend folder.

---

## Project Structure

```
nemx/
├── contracts/           # Solidity smart contracts
├── scripts/            # Deployment scripts
├── test/               # Contract tests
├── backend/
│   ├── app/            # FastAPI application
│   │   ├── routes/     # API endpoints
│   │   ├── services/   # Business logic
│   │   └── models.py   # Database models
│   ├── frontend/       # React + TypeScript frontend
│   │   └── src/
│   │       ├── pages/  # Page components
│   │       └── components/
│   ├── .env            # Environment variables (create this)
│   └── *.py            # Utility scripts
├── package.json        # Root dependencies (Hardhat)
├── hardhat.config.ts   # Hardhat configuration
└── UNPACK_INSTRUCTIONS.md  # This file
```

---

## Hardhat Account Reference

| Account # | Address | Use Case |
|-----------|---------|----------|
| 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Landowner/Regulator |
| 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Trading Account |
| 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Broker |
| 5 | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | Developer |
| 9 | `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720` | Broker House Account |

---

**Happy coding!**

