# Contract Deployment and .env Update Workflow

## Quick Reference

After restarting Hardhat node, run:
```powershell
cd backend
.\deploy-and-update-env.ps1
```

This automatically:
1. ✅ Deploys all three contracts
2. ✅ Updates `backend/.env` with new addresses
3. ✅ Configures contract relationships

## What Happens When You Restart Hardhat

**Important:** When you restart Hardhat node:
- All on-chain state is cleared (transactions, balances, contract state)
- Contract addresses change (new deployment = new addresses)
- Your `.env` file has old addresses → backend will fail

**Solution:** Always deploy contracts and update `.env` after restarting Hardhat.

## Automated Deployment Script

### PowerShell Script (Recommended)

```powershell
# From project root
cd backend
.\deploy-and-update-env.ps1
```

**What it does:**
1. Checks if Hardhat node is running
2. Runs `npx hardhat run scripts/deploy-and-update-env.ts --network localhost`
3. The TypeScript script:
   - Deploys SchemeNFT, SchemeCredits, and PlanningLock
   - Configures contract relationships
   - Automatically updates `backend/.env` with new addresses
   - Preserves other .env variables (RPC_URL, private keys, etc.)
4. **Sets up trading account approvals** (critical for credit transfers):
   - Runs `python setup_trading_account_approvals.py`
   - Trading account approves landowner/regulator to transfer on its behalf
   - Required for developers to buy credits successfully

### Manual Deployment

If you prefer to do it manually:

```powershell
# Deploy contracts
npx hardhat run scripts/deploy-and-update-env.ts --network localhost

# The script will automatically update .env
# No manual copying needed!
```

## Restart Workflow

### Complete Restart Process

1. **Start Hardhat Node:**
   ```powershell
   npx hardhat node
   ```

2. **Deploy Contracts & Update .env (REQUIRED):**
   ```powershell
   cd backend
   .\deploy-and-update-env.ps1
   ```

3. **Start Backend:**
   ```powershell
   cd backend
   .\venv\Scripts\activate
   uvicorn app.main:app --reload --port 8000
   ```

4. **Start Frontend:**
   ```powershell
   cd backend\frontend
   npm run dev
   ```

## Files Created

- `scripts/deploy-and-update-env.ts` - TypeScript deployment script that updates .env
- `backend/deploy-and-update-env.ps1` - PowerShell wrapper for easy execution
- `backend/deployment-addresses.json` - JSON file with addresses (created during deployment)

## Troubleshooting

### "Hardhat node is not running"
- Start Hardhat node first: `npx hardhat node`
- Keep it running in a separate terminal

### ".env file not updated"
- Check that the script completed successfully
- Verify `backend/.env` exists
- Check file permissions

### "Contract not deployed" errors
- Make sure you ran the deployment script after starting Hardhat
- Verify addresses in `.env` match the deployment output
- Restart backend server after updating .env

## Notes

- **Account addresses don't change** - Hardhat uses deterministic accounts
- **Contract addresses DO change** - Every deployment gets new addresses
- **Private keys don't change** - Hardhat accounts are deterministic
- **Trading account approvals reset** - Must be set up after each Hardhat restart
- **Always deploy after Hardhat restart** - This is required, not optional

## Why Trading Account Approvals Are Needed

When a developer buys credits:
1. Credits are stored in the trading account (Hardhat account #1)
2. Backend transfers credits FROM trading account TO developer
3. Backend uses landowner/regulator private key to sign the transaction
4. ERC-1155 requires: either the owner (trading account) signs, OR an approved operator signs
5. **Solution:** Trading account must approve landowner/regulator to transfer on its behalf

Without this approval, transfers fail with `ERC1155MissingApprovalForAll` errors and developer balances won't appear.

