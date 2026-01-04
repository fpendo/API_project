# Test: Documentation Reading Verification

Use these questions to verify that the AI has read the documentation files first.

## Test Questions (Answer these to verify doc reading)

### Test 1: Knowledge Base Specific
**Question:** "What are the 5 key flows documented in KNOWLEDGE_BASE.md?"

**Expected Answer:** Should mention:
1. Scheme Submission & Approval Flow
2. NFT Redemption to Credits Flow
3. Credit Trading Flow
4. Planning Application QR Flow
5. Credit Balance Calculation

### Test 2: Known Bugs
**Question:** "What was the issue with empty route files and how was it fixed?"

**Expected Answer:** Should mention:
- Route files were accidentally deleted/overwritten
- Caused `AttributeError: module has no attribute 'router'`
- Fixed by restoring from CODEBASE_DUMP.md
- Files affected: submissions.py, exchange.py, accounts.py, regulator.py, landowner.py, developer.py, planning.py

### Test 3: Credit Conversion
**Question:** "What's the credit conversion formula and how many credits equal 1 tonne?"

**Expected Answer:** 
- 1 tonne = 100,000 credits
- 1 credit = 10 grams
- 1 tonne = 1,000,000 grams

### Test 4: Project Structure
**Question:** "Where is the trading account address configured and what's the default?"

**Expected Answer:**
- Configured in `backend/.env` as `TRADING_ACCOUNT_ADDRESS`
- Default: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Hardhat account #1)

### Test 5: Flow Understanding
**Question:** "How does the planning application QR flow work? What happens when a developer generates a QR code?"

**Expected Answer:** Should explain:
- Developer checks holdings
- Backend selects schemes using `select_schemes_for_application()`
- Converts tonnes to credits per scheme
- Calls `PlanningLock.submitApplication()` which validates catchment and locks credits
- Creates PlanningApplication and PlanningApplicationScheme records
- Generates random application_token
- Returns QR code data

### Test 6: Common Issues
**Question:** "What's the solution if developer holdings don't show up after purchases?"

**Expected Answer:**
- Root cause: Hardhat node restart clears on-chain state
- Solution: Use `retroactive_transfer.py` to retry on-chain transfers
- Prevention: Don't restart Hardhat node during active development

### Test 7: Implementation Details
**Question:** "How does credit locking work and which contract functions are involved?"

**Expected Answer:**
- Credits locked when planning application QR is generated
- Locking happens in `PlanningLock.submitApplication()` via `SchemeCredits.lockCredits()`
- Locked credits cannot be transferred (enforced in `SchemeCredits._update()`)
- Functions: `lockCredits()`, `unlockCredits()`, `burnLockedCredits()`
- Only callable by PlanningLock contract

## What to Look For

When the AI responds, check if it:
1. ✅ References specific file paths from KNOWLEDGE_BASE.md
2. ✅ Mentions known bugs and their fixes
3. ✅ Explains flows with correct step-by-step details
4. ✅ References specific functions, endpoints, or contract methods
5. ✅ Mentions configuration details (ports, addresses, etc.)
6. ✅ Provides solutions from "Common Issues & Solutions" section

## Quick Test

**Ask this simple question in a NEW chat session:**

"What are the valid catchments in the offsetX project?"

**Expected Answer:** Should list all 8 catchments:
- SOLENT, THAMES, SEVERN, HUMBER, MERSEY, TEES, TYNE, WESSEX

If the AI can answer this correctly without you providing context, it means it read KNOWLEDGE_BASE.md first!


