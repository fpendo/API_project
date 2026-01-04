# Fix Developer Holdings Issue

## Problem Identified

Your developer dashboard shows no holdings even though you've spent £4.9M on purchases. Here's what I found:

### Root Cause
1. **9 trades recorded in database** - Total: 4,919 credits purchased
2. **All trades have transaction hashes** - But transactions are NOT found on-chain
3. **Hardhat node was restarted** - This clears all on-chain state (transactions, balances, etc.)
4. **Database still has trade records** - So balance calculation works (£56K remaining)
5. **On-chain credits are missing** - Because Hardhat node reset wiped the blockchain state

### Why Holdings Don't Show
The `get_account_credits_summary()` function queries on-chain balances. Since the Hardhat node was restarted:
- Old transactions are gone
- Credits that were transferred are gone
- Developer's address has 0 balance on-chain
- But database still shows the trades happened

## Solution

You need to **retry the on-chain transfers** for all trades. Use the existing `retroactive_transfer.py` script:

```powershell
cd backend
python retroactive_transfer.py
```

This script will:
1. Find all trades where developer was buyer
2. Retry the on-chain transfers
3. Update trade records with new transaction hashes
4. Restore your on-chain credit balances

## Alternative: Use a Real Hardhat Account

The developer's current EVM address (`0x5555555555555555555555555555555555555555`) is a placeholder. 

**Option 1: Keep using placeholder** - The retroactive_transfer script should work

**Option 2: Use a real Hardhat account** - Update developer's EVM address to one of Hardhat's pre-funded accounts:
- Account #1: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Account #2: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- etc.

To update:
```python
# Run this in Python or create a script
from app.db import SessionLocal
from app.models import Account

db = SessionLocal()
dev = db.query(Account).filter(Account.id == 5).first()
dev.evm_address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"  # Hardhat account #1
db.commit()
db.close()
```

## Verification

After running retroactive_transfer.py, verify holdings show up:

```powershell
cd backend
python diagnose_developer_holdings.py
```

You should see credits on-chain matching your purchases.



