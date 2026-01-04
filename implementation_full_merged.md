
**⚠️ CRITICAL: Read `non-negotiables.md` FIRST before starting any implementation!**  
> The non-negotiables file contains mandatory rules that govern all development work.

> **Golden Rule:**  
> - Implement **only one step at a time**.  
> - Do not start the next step until:
>   - Code for the current step is written,
>   - All tests/checks for that step pass locally,
>   - You (the user) have reviewed and approved the step.

**Stacks:**
- **Smart contracts**: Hardhat, Solidity, Polygon-compatible
- **Backend**: FastAPI, SQLAlchemy, web3/ethers integration
- **Frontend**: React + TypeScript (Vite)
- **DB**: SQLite
- **IPFS**: local daemon (integration comes later in the steps)

---

## Environment Setup

### Required Software Versions

- **Node.js**: v18.x or v20.x (LTS recommended)
- **npm**: v9.x or later
- **Python**: 3.10 or 3.11
- **pip**: Latest version
- **IPFS**: v0.20.0 or later (for local node)

### System Requirements

- **OS**: Windows 10/11, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk**: 2GB free space
- **Network**: Internet connection for initial package installation

### Initial Setup Commands

```bash
# Verify Node.js
node --version  # Should be v18.x or v20.x

# Verify Python
python --version  # Should be 3.10 or 3.11

# Verify npm
npm --version  # Should be v9.x or later
```

---

## Error Handling Guidelines

### General Principles

1. **Fail Fast**: Validate inputs early and return clear error messages
2. **User-Friendly**: Never expose internal stack traces to frontend
3. **Logging**: Log all errors with context (user, action, timestamp)
4. **Consistent Format**: Use standard error response format across all APIs

### Backend Error Handling

**FastAPI Error Responses:**
```python
# Standard error response format
{
    "error": "Error type",
    "message": "Human-readable message",
    "details": {}  # Optional additional context
}
```

**HTTP Status Codes:**
- `400` - Bad Request (validation errors, invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (e.g., duplicate submission)
- `500` - Internal Server Error (unexpected errors)

**Smart Contract Errors:**
- Catch and translate Solidity revert messages to user-friendly errors
- Log transaction hashes for debugging
- Return meaningful error messages when contract calls fail

### Frontend Error Handling

**Error Display:**
- Show user-friendly error messages in UI
- Use toast notifications or inline error messages
- Never display raw error objects to users

**Network Errors:**
- Handle timeout errors gracefully
- Retry failed requests where appropriate (with exponential backoff)
- Show loading states during async operations

### Database Error Handling

- Use transactions for multi-step operations
- Rollback on any error
- Handle constraint violations (unique, foreign key) with clear messages
- Never expose SQL errors directly to users

### IPFS Error Handling

- Handle connection failures gracefully
- Retry IPFS operations with exponential backoff
- Fallback to local file storage if IPFS unavailable
- Log CID retrieval failures for debugging

### Smart Contract Integration Errors

- Validate contract addresses before calling
- Handle gas estimation failures
- Check transaction status before considering operation complete
- Provide clear error messages for common failures (insufficient balance, wrong network, etc.)

---

## Common Troubleshooting

### Hardhat Issues

**Problem**: `npx hardhat test` fails with "Cannot find module"
- **Solution**: Run `npm install` in project root

**Problem**: Hardhat node won't start
- **Solution**: Check if port 8545 is already in use, or change port in `hardhat.config.ts`

**Problem**: Contract deployment fails
- **Solution**: Ensure Hardhat node is running, check contract addresses in config

### Backend Issues

**Problem**: FastAPI server won't start
- **Solution**: Check if port 8000 is in use, verify Python dependencies installed

**Problem**: Database connection errors
- **Solution**: Ensure SQLite file path is correct, check file permissions

**Problem**: Import errors (module not found)
- **Solution**: Verify virtual environment is activated, run `pip install -r requirements.txt`

### Frontend Issues

**Problem**: `npm run dev` fails
- **Solution**: Delete `node_modules` and `package-lock.json`, run `npm install` again

**Problem**: React Router errors
- **Solution**: Ensure `react-router-dom` is installed, check route definitions

**Problem**: API calls fail with CORS errors
- **Solution**: Verify backend CORS middleware is configured correctly

### IPFS Issues

**Problem**: IPFS daemon not responding
- **Solution**: Start IPFS daemon: `ipfs daemon`, verify it's running on port 5001

**Problem**: File upload to IPFS fails
- **Solution**: Check IPFS daemon is running, verify file size limits

### Smart Contract Integration Issues

**Problem**: Contract calls fail with "insufficient funds"
- **Solution**: Ensure test accounts have ETH (in Hardhat, accounts are pre-funded)

**Problem**: Transaction reverts
- **Solution**: Check contract state, verify all conditions are met, review revert reason

**Problem**: Cannot connect to Hardhat node
- **Solution**: Verify Hardhat node is running, check RPC URL in backend config

### General Debugging Tips

1. **Check Logs**: Always check console/terminal logs first
2. **Verify Services**: Ensure all services (Hardhat, IPFS, Backend) are running
3. **Clear Caches**: Clear browser cache, delete `node_modules` and reinstall
4. **Check Versions**: Verify all software versions match requirements
5. **Test Incrementally**: Test each component in isolation before integration
6. **Use Test Accounts**: Use known test accounts with known balances for debugging

---

## Phase 0 – Project Bootstrap

### Step 0.1 – Initialise monorepo & docs

**What to build**

- Create root repo with:
  - `plan.md`
  - `implementation.md` (this file)
  - `non-negotiables.md`
  - `progress.md` (progress tracker - auto-updates with each step)
  - `README.md` (placeholder)

**Checks**

- Visually confirm all five files exist with expected content.

---

### Step 0.2 – Initialise Hardhat project

**What to build**

- Basic **Hardhat** project for contracts in `contracts/`.

**How**

- In `root/`:
  - `npm init -y`
  - `npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox`
  - `npx hardhat` (choose a TypeScript project if you prefer)
- Ensure:
  - `hardhat.config.ts` or `.js`
  - `contracts/`
  - `test/`
- Configure `hardhat.config.ts` for localhost network:
  ```typescript
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
  ```

**Checks**

- `npx hardhat test` → default sample test passes.
- `npx hardhat node` → local JSON-RPC node starts cleanly on port 8545.
- Verify node is accessible: `curl http://127.0.0.1:8545` (should return JSON-RPC response).

---

### Step 0.3 – Backend skeleton (FastAPI + health check)

**What to build**

- Minimal FastAPI backend under `backend/`:
  - `backend/app/main.py` with `/health` endpoint.
  - Create `backend/requirements.txt` for dependencies.

**How**

- Create virtual environment (recommended):
  ```bash
  python -m venv venv
  # Windows: venv\Scripts\activate
  # macOS/Linux: source venv/bin/activate
  ```
- Install: `pip install fastapi uvicorn[standard]`
- Create `backend/requirements.txt`:
  ```
  fastapi==0.104.1
  uvicorn[standard]==0.24.0
  ```
- `main.py`:

  ```python
  from fastapi import FastAPI

  app = FastAPI()

  @app.get("/health")
  def health():
      return {"status": "ok"}
  ```

**Checks**

- Run: `uvicorn app.main:app --reload` from `backend/`.
- `GET http://127.0.0.1:8000/health` → `{"status": "ok"}`.
- Verify CORS is configured (add if needed for frontend integration later).

---

### Step 0.4 – Frontend skeleton (React + Vite + TS)

**What to build**

- Basic React + TS app in `frontend/` with a simple role list.

**How**

- In `root/`:
  - `npm create vite@latest frontend -- --template react-ts`
  - `cd frontend && npm install`
- Verify Node.js version compatibility (v18.x or v20.x recommended)

- `App.tsx`:
  - Render something like: "Choose role: Landowner, Regulator, Broker, Developer, Planning Officer, Operator".

**Checks**

- `npm run dev` in `frontend/`.
- App renders correctly in browser (no console errors).
- Verify dev server starts on default port (usually 5173).
- Check browser console for any warnings or errors.

---

## Phase 1 – Smart Contract Foundations

### Step 1.1 – Define SchemeNFT.sol (ERC-721 skeleton)

**What to build**

- `contracts/SchemeNFT.sol`:
  - Import OpenZeppelin ERC721 + Ownable.
  - Implement `SchemeInfo` struct and `mapping(uint256 => SchemeInfo) public schemes;`.
  - `mintScheme(...)` that:
    - Creates new `tokenId`.
    - Mints to `owner()` (regulator).
    - Stores full scheme metadata: `name`, `catchment`, `location`, `originalTonnes`, `remainingTonnes`, `ipfsCid`.

**How**

- `npm install @openzeppelin/contracts`
- Implement minimal contract with a `mintScheme` function callable only by owner.

**Checks (Hardhat tests)**

- `test/SchemeNFT.test.ts`:
  - Deploy SchemeNFT.
  - Call `mintScheme` with sample data.
  - Assert:
    - `ownerOf(tokenId)` is deployer (or designated owner).
    - `schemes[tokenId].name`, `catchment`, `originalTonnes`, etc. match inputs.

- `npx hardhat test` → all tests pass.

---

### Step 1.2 – Define SchemeCredits.sol (ERC-1155 skeleton, linked to SchemeNFT)

**What to build**

- `contracts/SchemeCredits.sol`:
  - OpenZeppelin ERC1155 + Ownable.
  - Store `IERC721 public schemeNft;`.
  - Use `schemeId` (ERC721 tokenId) as ERC1155 id.
  - Implement `mintCredits(uint256 schemeId, address to, uint256 amount)`.

**How**

- In constructor, receive the SchemeNFT address and store it.
- For now, no locking or catchment logic here (comes later).
- Access control: only owner (or a MINTER_ROLE) can mint.

**Checks (Hardhat tests)**

- `test/SchemeCredits.test.ts`:
  - Deploy SchemeNFT and SchemeCredits.
  - Mint a scheme in SchemeNFT.
  - Call `mintCredits` for that `schemeId`.
  - Assert `balanceOf(to, schemeId)` equals the minted amount.

- `npx hardhat test` → all tests pass.

---

### Step 1.3 – PlanningLock.sol skeleton (wire contracts, no locking logic yet)

**What to build**

- `contracts/PlanningLock.sol`:
  - Holds addresses of SchemeNFT and SchemeCredits.
  - Defines an `Application` struct (`developer`, `catchmentHash`, `schemeIds`, `amounts`, `status`).
  - Exposes:
    - `submitApplication(...)` – currently just stores data + emits event.
    - `approveApplication(uint256 appId)` – placeholder.
    - `rejectApplication(uint256 appId)` – placeholder.

**How**

- For now, no interaction with SchemeCredits / SchemeNFT inside these functions.
- Focus on:
  - Storage of application data.
  - Emission of events.

**Checks (Hardhat tests)**

- `test/PlanningLock.skeleton.test.ts`:
  - Deploy SchemeNFT, SchemeCredits, PlanningLock.
  - Call `submitApplication` with dummy data:
    - developer address
    - a catchment hash
    - schemeIds + amounts arrays.
  - Assert:
    - Application stored in mapping.
    - Fields match input.
    - Event emitted.

- `npx hardhat test` → must pass.

---

## Phase 2 – Backend Core & Database

### Step 2.1 – Configure SQLite + SQLAlchemy models

**What to build**

- `backend/app/db.py`:
  - SQLAlchemy `engine`, `SessionLocal`, `Base`.
- `backend/app/models.py`:
  - `Account` and `SchemeSubmission` models.

**How**

- Install: `pip install sqlalchemy pydantic[dotenv]`
- `Account` fields:
  - `id`, `name`, `role`, `evm_address`
- `SchemeSubmission` fields:
  - `id`, `submitter_account_id`, `scheme_name`, `catchment`, `location`,
    `unit_type`, `total_tonnage`, `file_path`, `status`, `created_at`.

**Checks**

- `backend/tests/test_db.py`:
  - Create in-memory DB or test DB.
  - Create tables.
  - Insert and read back an `Account` and `SchemeSubmission`.

- Run: `pytest backend/tests` → must pass.

---

### Step 2.2 – Basic mock auth & seed accounts

**What to build**

- Simple mock auth:
  - `POST /auth/mock-login` with `{ "account_id": 1 }`, returns a token or just echoes the account.
- Seed script for accounts:
  - Landowner, Regulator, Developer, Broker, PlanningOfficer, Operator.

**How**

- `backend/app/routes/auth.py`:
  - Fetch account by ID, return a simple response like `{ "account_id": 1, "role": "REGULATOR" }`.
- `backend/seed.py`:
  - Insert a few `Account` rows with roles.

**Checks**

- `backend/tests/test_auth.py`:
  - Seed an account.
  - Call `/auth/mock-login` with that account's ID.
  - Assert 200 and response includes correct `account_id` and `role`.

---

## Phase 3 – Frontend Routing & Role Layout

### Step 3.1 – Setup routing + basic role pages

**What to build**

- React Router with routes:
  - `/` – Landing / role selection.
  - `/landowner`, `/regulator`, `/developer`, `/broker`, `/planning`, `/operator`.

**How**

- In `frontend/`:
  - `npm install react-router-dom`
  - Wrap `<App />` with `<BrowserRouter>`.
  - Create placeholder components for each role page.

**Checks**

- Manual:
  - `npm run dev`.
  - Navigate to each route; see the correct placeholder text.
  - No router or console errors.

---

## Phase 4 – Landowner/Consultant Submission Portal

### Step 4.1 – Backend: Create SchemeSubmission via API

**What to build**

- Route: `POST /submissions`:
  - Accepts:
    - `scheme_name`
    - `catchment`
    - `location`
    - `unit_type`
    - `total_tonnage`
    - file upload (agreement)
    - `submitter_account_id`
  - Stores the file to disk (e.g. `archive/raw_submissions/`).
  - Creates `SchemeSubmission` with `status = "PENDING_REVIEW"`.

**How**

- Use FastAPI `UploadFile` for file uploads.
- Build a small service in `services/submissions.py` for DB logic.

**Checks**

- `backend/tests/test_submissions.py`:
  - Use `TestClient` to POST a request with a small file.
  - Assert:
    - Status 200.
    - File written to disk.
    - `SchemeSubmission` row exists with `PENDING_REVIEW`.

---

### Step 4.2 – Frontend: Landowner/Consultant submission form

**What to build**

- `SubmissionPortal` page:
  - A form with scheme details + file upload.
  - Uses currently "logged in" landowner/consultant (from mock auth).

**How**

- `POST` the form to `/submissions`.
- Show success or error messages.

**Checks**

- Manual:
  - Log in as landowner (mock).
  - Fill in form + upload test file.
  - Submit.
  - Confirm success message.
  - Optionally check DB or backend logs confirm the submission.

---

## Phase 5 – Regulator Inbox & Basic Approval/Decline

### Step 5.1 – Backend: List pending submissions for regulator

**What to build**

- Route: `GET /regulator/submissions?status=PENDING_REVIEW`:
  - Returns key info for each pending submission.

**How**

- Filter `SchemeSubmission` by `status`.
- Return via Pydantic response models.

**Checks**

- `backend/tests/test_regulator_submissions.py`:
  - Seed: 2 pending, 1 rejected submission.
  - Call endpoint.
  - Assert only the 2 pending are returned.

---

### Step 5.2 – Backend: Approve/decline submission (DB-only, no chain yet)

**What to build**

- Routes:
  - `POST /regulator/submissions/{id}/approve`
  - `POST /regulator/submissions/{id}/decline`
- Logic:
  - `approve`: `status = "APPROVED"`.
  - `decline`: `status = "REJECTED"`.

**How**

- Implement in `services/submissions.py`.

**Checks**

- Extend `test_regulator_submissions.py`:
  - Approve a pending submission → status becomes `APPROVED`.
  - Decline a pending submission → status becomes `REJECTED`.

---

### Step 5.3 – Frontend: Regulator inbox UI

**What to build**

- `RegulatorDashboard`:
  - Table of pending submissions.
  - Buttons to "Approve" or "Decline".

**How**

- Fetch with `GET /regulator/submissions`.
- On click, call appropriate endpoint, then refresh the list.

**Checks**

- Manual:
  - Submit scheme as landowner.
  - Log in as regulator.
  - See it in the list.
  - Approve or decline; confirm UI and backend update correctly.

---

## Phase 6 – On-Chain SchemeNFT + IPFS + Regulator Archive

### Step 6.1 – Backend: IPFS integration for approved schemes

**What to build**

- `backend/app/utils/ipfs.py`:
  - `pin_file_to_ipfs(file_path) -> cid`.

- Update approve logic:
  - When a submission is approved:
    - Pin the agreement file to IPFS.
    - Store returned `cid` in `AgreementArchive`.

**How**

- Talk to local IPFS daemon via HTTP API (`/api/v0/add`).
- Handle errors gracefully.

**Checks**

- `backend/tests/test_ipfs_integration.py`:
  - Mock IPFS HTTP call (or use a test IPFS).
  - Ensure function returns a non-empty CID string.
- Approve a submission in a test and assert an `AgreementArchive` row is created.

---

### Step 6.2 – Backend: call SchemeNFT.mintScheme on approval

**What to build**

- `backend/app/services/nft_integration.py`:
  - `mint_scheme_nft(submission, ipfs_cid) -> token_id`:
    - Uses web3/ethers to call `mintScheme` on SchemeNFT (on local Hardhat node).
- Update `POST /regulator/submissions/{id}/approve`:
  - After status set to APPROVED & IPFS pinned:
    - Call `mint_scheme_nft`.
    - Create `Scheme` DB record with the `nft_token_id`.

**How**

- Configure web3 (Python) or a Node script invoked from backend.
- Use a known private key for the regulator EVM account.

**Checks**

- `backend/tests/test_nft_integration.py`:
  - Mock the web3 call to return a fixed tokenId.
  - Assert:
    - Function returns tokenId.
    - `Scheme` is created with matching `nft_token_id`.

- Hardhat tests (extension of SchemeNFT tests):
  - Check `mintScheme` sets `remainingTonnes = originalTonnes`.

---

### Step 6.3 – Backend + Frontend: Regulator archive & capacity view

**What to build**

- Backend route `GET /regulator/archive`:
  - Returns schemes grouped by catchment with:
    - `name`, `location`, `originalTonnes`, `remainingTonnes`, `status`.
    - Totals per catchment.

- Frontend `RegulatorDashboard` archive tab:
  - Render table per catchment.
  - Totals row at bottom.
  - Visual status (green if remaining > 0, red if 0).

**Checks**

- Backend test `test_regulator_archive.py`:
  - Seed DB with sample schemes & remainingTonnes.
  - Call `/regulator/archive`.
  - Assert grouping & totals.

- Manual:
  - Approve some schemes.
  - Visit archive tab; verify data and colouring.

---

## Phase 7 – Credits Minting, Locking & Landowner Flow

### Step 7.1 – SchemeCredits: add lockedBalance and transfer guard

**What to build**

- In `SchemeCredits.sol`:
  - Add:

    ```solidity
    mapping(uint256 => mapping(address => uint256)) public lockedBalance;
    ```

  - Override `_beforeTokenTransfer` to enforce:

    ```solidity
    require(
      balanceOf(from, id) - lockedBalance[id][from] >= amount,
      "Cannot transfer locked credits"
    );
    ```

**How**

- Only apply this check when `from != address(0)` and `from != to`.

**Checks (Hardhat)**

- `test/SchemeCredits.locking.test.ts`:
  - Mint `N` units to a user.
  - Set `lockedBalance[schemeId][user] = L`.
  - Transfer:
    - `N - L` units → OK.
    - `N - L + 1` units → revert with `"Cannot transfer locked credits"`.

---

### Step 7.2 – PlanningLock: real submit/approve/reject logic with on-chain locking

**What to build**

- Finalise `PlanningLock.sol`:

  - `submitApplication(developer, schemeIds[], amounts[], requiredCatchment)`:
    - For each `schemeId`:
      - Read `SchemeInfo` from SchemeNFT.
      - Check catchment hash equals `requiredCatchment`.
      - Call `SchemeCredits.lockCredits(schemeId, developer, amountUnits)`.
    - Store `Application` struct.

  - `approveApplication(appId)`:
    - For each `schemeId` / `amount` in the application:
      - Call `SchemeCredits.burnLockedCredits`.
      - Call e.g. `SchemeNFT.reduceRemainingTonnes(schemeId, tonnes)`.

  - `rejectApplication(appId)`:
    - For each scheme:
      - Call `SchemeCredits.unlockCredits`.

- In `SchemeCredits.sol`:
  - Implement `lockCredits`, `unlockCredits`, `burnLockedCredits` restricted to `onlyPlanning`.

**How**

- Add `planningContract` address stored in `SchemeCredits`, settable in constructor or via setter.
- Use `onlyPlanning` modifier.

**Checks (Hardhat)**

- `test/PlanningLock.integration.test.ts`:
  - Deploy SchemeNFT, SchemeCredits, PlanningLock.
  - Mint schemes and credits to developer.
  - Call `submitApplication` with 2 schemes in same catchment:
    - Check `lockedBalance` updated for both.
  - Approve:
    - Check balances reduced and burned.
    - Check `remainingTonnes` reduced correctly per scheme.
  - Reject (in separate test):
    - Verify locked balances go back to 0 (credits unlocked).
  - Negative test:
    - Try `submitApplication` with a scheme from wrong catchment → revert.

---

### Step 7.3 – Backend: landowner redeem NFT → credits on-chain

**What to build**

- Notifications:
  - On scheme approval, create:
    - "Scheme approved" notification.
    - "Redeem to credits" notification with a `claim_token`.

- Route: `POST /landowner/redeem-scheme`:
  - Body: `{ claim_token, landowner_account_id }`.
  - Logic:
    - Validate token.
    - Load `Scheme` & NFT tonnage.
    - Compute units: `(originalTonnesInGrams / gramsPerUnit)`.
    - Call `SchemeCredits.mintCredits(schemeId, landowner_evm_address, units)` via web3.
    - Mark claim token as used.

**Checks**

- `backend/tests/test_landowner_redeem.py`:
  - Seed a scheme + claim token.
  - POST to endpoint.
  - Assert claim token is marked used.
  - Assert web3 integration was called with the right args (mocked).

- Hardhat (already testing `mintCredits` itself).

---

### Step 7.4 – Frontend: Landowner dashboard & redeem flow

**What to build**

- Landowner dashboard:
  - List notifications from backend.
  - Show "Redeem scheme" button for relevant notifications.
  - Simple "Holdings" table showing credits per scheme & catchment (via backend summary).

**Checks**

- Manual:
  - Approve a scheme as regulator.
  - As landowner, open dashboard:
    - See redeem notification.
    - Click redeem.
    - See holdings update.

---

## Phase 8 – Exchange & OTC

### Step 8.1 – Backend: credit holdings summary

**What to build**

- Service to query on-chain `balanceOf` for each `schemeId` and save to a helper table (or compute on demand).
- Route: `GET /accounts/{id}/credits-summary`:
  - Returns holdings per scheme, catchment, and unit type.

**Checks**

- `backend/tests/test_credits_summary.py`:
  - Seed chain balances.
  - Call endpoint, assert totals match seeded values.

---

### Step 8.2 – Listings & trade endpoints (off-chain exchange)

**What to build**

- DB models:
  - `BrokerMandate`
  - `ExchangeListing`
  - `Trade`
- Endpoints:
  - `POST /exchange/listings` – create listing for some credits.
  - `GET /exchange/listings` – browse by catchment + unit type.
  - `POST /exchange/listings/{id}/buy` – execute purchase.

**How**

- Listing creation:
  - Confirm seller has sufficient **free** credits (on-chain balance minus locked).
  - Record listing; actual units remain with seller but we track "reserved" quantity off-chain.
- Buying:
  - Call `SchemeCredits.safeTransferFrom(seller, buyer, schemeId, units)` via web3.
  - Reduce listing quantity, record `Trade`.

**Checks**

- `backend/tests/test_exchange.py`:
  - Seed seller balance.
  - Create listing.
  - Buy part of it.
  - Assert:
    - On-chain balances changed.
    - Listing updated.
    - Trade saved.

---

### Step 8.3 – Frontend: Exchange & OTC dashboards

**What to build**

- Developer dashboard:
  - View listings filtered by catchment + unit type.
  - "Buy" action that calls exchange endpoints.

- Operator OTC dashboard:
  - `GET /operator/holdings-summary` → table of holdings.
  - "Simulate block trade" form:
    - Backend returns suggested allocations.
  - "Execute OTC deal" button:
    - Backend performs on-chain transfers from multiple accounts to buyer.

**Checks**

- Manual:
  - Create listing, buy as developer, confirm balances.
  - Simulate and execute OTC block trade; confirm balances change as expected.

---

## Phase 9 – Planning QR End-to-End

### Step 9.1 – Backend: generate planning application & QR

**What to build**

- Route: `POST /developer/planning-applications`:
  - Input:
    - `developer_account_id`
    - `catchment`
    - `unit_type`
    - `required_tonnage`
    - `planning_reference`
  - Logic:
    - Get developer's holdings (summary endpoint).
    - Choose combination of schemes in that catchment to meet `required_tonnage`.
    - Convert tonnes → ERC1155 units per scheme.
    - Call `PlanningLock.submitApplication(developer, schemeIds, amounts, keccak256(catchment))`.
    - Create `PlanningApplication` + `PlanningApplicationScheme` rows.
    - Generate `application_token` and store.
    - Generate QR image (PNG or data URL) encoding `application_token`.

**Checks**

- `backend/tests/test_planning_application.py`:
  - Seed developer with known holdings across two schemes in same catchment.
  - Call endpoint for some `required_tonnage`.
  - Assert:
    - Correct schemes & amounts chosen.
    - PlanningLock application created (mock web3).
    - DB records consistent.
    - QR token is non-empty.

---

### Step 9.2 – Frontend: Developer "Generate Planning QR" UI

**What to build**

- On `DeveloperDashboard`:
  - Show:
    - Required tonnage (for demo: user input or known value).
    - Current holdings by catchment & nutrient.
  - Button: **"Generate Planning QR"**.
  - On click:
    - Call backend.
    - Display QR image + summary table (what will be locked).

**Checks**

- Manual:
  - Confirm that generating QR locks credits on-chain (by trying a transfer and expecting it to fail).
  - UI shows correct breakdown across schemes.

---

### Step 9.3 – Backend: Planning officer validate & decision

**What to build**

- `POST /planning/validate-qr`:
  - Input: `{ application_token }`.
  - Returns:
    - developer info
    - catchment
    - unit_type
    - total_tonnage
    - scheme breakdown (name, location, tonnes_from_scheme, remainingTonnes, catchment).

- `POST /planning/applications/{id}/decision`:
  - Body: `{ decision: "APPROVE" | "REJECT" }`.
  - APPROVE:
    - Call `PlanningLock.approveApplication(appId)` on-chain.
  - REJECT:
    - Call `PlanningLock.rejectApplication(appId)` on-chain.

**Checks**

- `backend/tests/test_planning_decision.py`:
  - Seed a planning application.
  - Validate QR: expect correct JSON.
  - Approve:
    - Check chain state: locked credits burned, NFT remainingTonnes reduced.
  - Reject:
    - Check locked credits unlocked.

---

### Step 9.4 – Frontend: Planning portal UI

**What to build**

- `PlanningPortal` page:
  - Input for application token (simulating QR scan).
  - Shows:
    - Developer, catchment, nutrient, total offset.
    - Scheme breakdown table with per-scheme tonnage and remaining capacity.
  - Buttons: "Approve" and "Reject".

**Checks**

- Manual:
  - Run full flow:
    - Developer generate QR.
    - Planning officer validate + approve.
    - Check credits burned and regulator archive updated.

------------------------------------------------------------
NEW PHASE 10 — EXCHANGE IMPLEMENTATION
------------------------------------------------------------

## Phase 10 – Exchange: Trading Accounts & Orderbook

### Step 10.1 – Add TradingAccount & Balance Models

**What to build**

- Introduce DB models to represent:
  - Generic **TradingAccount** linked to an existing `Account`.
  - **CreditBalance** per (trading_account_id, catchment).
  - **CashBalance** per trading account (or a cash field on TradingAccount).
- Add explicit support for **broker house vs broker client accounts**:
  - Flag on TradingAccount (`type = HOUSE | CLIENT | DIRECT`), or separate tables if clearer.
  - For client accounts, link back to the **underlying landowner**.

**How**

- In `backend/app/models.py`:
  - Add `TradingAccount` model with:
    - `id`, `account_id`, `account_type` (enum: LANDOWNER, BROKER_HOUSE, BROKER_CLIENT, DEVELOPER).
    - Optional `landowner_account_id` for broker client accounts.
  - Add `CreditBalance` model:
    - `id`, `trading_account_id`, `catchment`, `quantity_credits`.
  - Add `CashBalance`:
    - `id`, `trading_account_id`, `amount`.
- Add SQLAlchemy relationships and migrations (if using Alembic; otherwise, ensure schema is created in tests).
- Create a simple service helper:
  - `get_or_create_trading_account(account_id, account_type, landowner_account_id=None)`.

**Tests/Checks**

- Unit tests in `backend/tests/test_trading_accounts.py`:
  - Creating trading accounts for:
    - Landowner
    - Broker house
    - Broker client (linked to landowner)
    - Developer
  - Updating credit balances per catchment.
  - Updating cash balances.
- All existing tests still pass.

**Notes**

- Keep this step focused on **schema + models only**.
- No deposit/withdraw or trading logic yet.

---

### Step 10.2 – Credits Deposit/Withdraw (Landowner → Exchange)

**What to build**

- Backend endpoints and services that allow a **landowner** to:
  - Deposit **unassigned** credits into their TradingAccount.
  - Withdraw credits back to their on-chain wallet.
- Ensure you integrate with existing `assign_to_broker` logic:
  - Landowners can only deposit credits that are **not** already assigned to a broker.

**How**

- Add routes in `backend/app/routes/exchange.py` (create if needed):
  - `POST /exchange/deposit/credits`
  - `POST /exchange/withdraw/credits`
- Implement a service layer:
  - `deposit_credits(account_id, catchment, amount)`:
    - Verify on-chain / off-chain balance (for now assume we trust a simple internal model or stub the on-chain transfer).
    - Increment `CreditBalance` for the landowner’s TradingAccount in that catchment.
  - `withdraw_credits(...)` does the reverse and (later) calls SchemeCredits to send tokens back to user.
- Enforce rule:
  - Credits which are flagged as `assigned_to_broker` cannot be deposited directly by a landowner.
- For now, simulate on-chain transfer with a placeholder service (actual Web3 integration can come in a later step if needed).

**Tests/Checks**

- Tests in `backend/tests/test_exchange_deposit_withdraw.py`:
  - Landowner with unassigned credits can deposit.
  - Assigned credits cause a validation error.
  - Withdraw correctly decrements TradingAccount balance and fails if insufficient balance.

**Notes**

- This step can use a simplified view of on-chain state; full Web3 integration can be a follow-up sub-step if needed.

---

### Step 10.3 – Developer Cash Deposit/Withdraw

**What to build**

- Simple endpoints to allow developers to:
  - Deposit mock **cash** into their TradingAccount.
  - Withdraw unused cash.
- For now, treat this as **internal ledger only** (no payment gateway).

**How**

- Extend `exchange.py` with:
  - `POST /exchange/deposit/cash`
  - `POST /exchange/withdraw/cash`
- In service layer:
  - `deposit_cash(developer_account_id, amount)`
  - `withdraw_cash(...)` with balance checks.

**Tests/Checks**

- `backend/tests/test_exchange_cash.py`:
  - Happy-path deposits and withdrawals.
  - Prevent overdrafts.
  - Ensure only developer/broker-house accounts can hold positive cash.

**Notes**

- Keep cash in a dedicated `CashBalance` table or a numeric field on `TradingAccount`.

---

### Step 10.4 – Order & Trade Models + Basic Matching Engine

**What to build**

- Data models and core matching logic for an orderbook **per catchment**.
- Support **limit orders** first (market orders can follow).

**How**

- In `models.py`, add:
  - `Order`:
    - `id`, `trading_account_id`, `side` (BUY/SELL), `catchment`,
      `price`, `quantity`, `quantity_filled`, `status` (OPEN, PARTIAL, FILLED, CANCELLED),
      timestamps.
  - `Trade`:
    - `id`, `buy_order_id`, `sell_order_id`, `catchment`,
      `price`, `quantity`, `buyer_trading_account_id`, `seller_trading_account_id`,
      timestamps.
- In a new module `backend/app/exchange/matching_engine.py`:
  - Implement an in-memory or DB-backed matching engine:
    - For a given catchment:
      - Maintain lists of open BUY and SELL orders.
      - When a new order comes in:
        - Match against best-priced orders on the opposite side.
        - Create `Trade` records and update `Order` statuses.
- Settlement:
  - On match:
    - Decrement buyer’s **cash** and increment their **credits**.
    - Decrement seller’s **credits** and increment their **cash**.

**Tests/Checks**

- `backend/tests/test_matching_engine.py`:
  - Matching simple buy/sell pairs in one catchment.
  - Partial fills (one large order matched by several small ones).
  - No cross-catchment matching.
  - Balances updated correctly for buyer/seller.

**Notes**

- Keep the engine simple and deterministic.
- No market orders or advanced TIF policies yet.

---

### Step 10.5 – Exchange REST API (Place/Cancel Orders, View Orderbook)

**What to build**

- HTTP endpoints for:
  - Placing buy/sell orders.
  - Cancelling orders.
  - Viewing orderbooks and recent trades **per catchment**.

**How**

- In `exchange.py`:
  - `POST /exchange/orders` – place order:
    - Request: `{ side, catchment, price, quantity }`.
    - Automatically uses the caller’s TradingAccount.
  - `POST /exchange/orders/{id}/cancel`.
  - `GET /exchange/orderbook?catchment=SOLENT`.
  - `GET /exchange/trades?catchment=SOLENT`.
- Wire endpoints into the matching engine and DB.

**Tests/Checks**

- `backend/tests/test_exchange_api.py`:
  - Place orders and verify persistence.
  - Retrieve orderbook and trades.
  - Cancelling works only for order owner.
  - Cannot place SELL order without sufficient credits, or BUY order without enough cash.

**Notes**

- This is where other roles (landowner, developer, broker) start interacting with the exchange via HTTP.

---

### Step 10.6 – Broker House & Client Accounts Integration

**What to build**

- Wire the existing **assign-to-broker** functionality into the new TradingAccount model.
- Ensure:
  - Broker **house** account receives the fixed fee (e.g. 5% of assigned credits).
  - Broker **client** account receives the remaining credits, tagged to the specific landowner.

**How**

- Extend the existing broker assignment service:
  - On assignment:
    - Move credits from landowner TradingAccount → broker client TradingAccount (for that landowner).
    - Credit broker house TradingAccount with fee percentage.
- Add helper queries:
  - Broker can see total client credits per catchment.
  - Landowner can see which credits are held by broker on their behalf.

**Tests/Checks**

- `backend/tests/test_broker_accounts.py`:
  - Assigning credits adjusts all three balances correctly:
    - Landowner ↓
    - Broker client ↑ (per landowner)
    - Broker house ↑ (fee)
  - Landowner cannot trade credits that have been assigned to broker.
  - Broker cannot “steal” client credits into house account.

**Notes**

- This step is about **segregation and invariants**.

---

### Step 10.7 – Market Maker Bot (MVP)

**What to build**

- A background process that uses the **broker house account** to place and maintain quotes in selected catchments.

**How**

- New module: `backend/app/exchange/market_maker.py`:
  - Configuration per catchment:
    - target spread (e.g. 5–10%),
    - quote size,
    - min/max inventory.
  - Periodically:
    - Reads current orderbook.
    - Cancels stale quotes.
    - Places new BUY and SELL orders around a reference price (last trade or mid).
- For now, run as a simple script or async task in the backend process.

**Tests/Checks**

- Unit tests with a fake orderbook:
  - Bot places non-crossing quotes on both sides.
  - Respects inventory limits.
  - Does not place orders when broker house account has no credits or cash.

**Notes**

- Keep logic simple; this is just to populate thin orderbooks.

---

### Step 10.8 – Frontend: Landowner, Broker, Developer Trading UIs

**What to build**

- Extend the React frontend with:
  - **Landowner Trading Dashboard**:
    - View credit balances by catchment.
    - Deposit/withdraw credits.
    - Place sell orders.
  - **Broker Dashboard**:
    - View house and client balances.
    - Place orders on behalf of broker accounts.
    - View market maker status.
  - **Developer Trading UI**:
    - Deposit cash.
    - View markets by catchment.
    - Place buy orders.
    - See holdings by catchment.

**How**

- Add or extend pages under `frontend/src/pages`:
  - `LandownerExchangePage.tsx`
  - `BrokerExchangePage.tsx`
  - `DeveloperExchangePage.tsx`
- Use existing API client or create a simple one for:
  - `/exchange/deposit/*`, `/exchange/orders`, `/exchange/orderbook`, `/exchange/trades`.

**Tests/Checks**

- Manual:
  - Spin up backend + frontend.
  - End-to-end flow:
    - Landowner deposits credits.
    - Developer deposits cash.
    - Developer places BUY, landowner places SELL → trade executes.
    - Balances update.
- Automated:
  - At least basic React component tests (if you already have a testing setup).

**Notes**

- Focus on clarity over visual polish in the first iteration.

---

### Step 10.9 – Redeem From Exchange → Planning QR Integration

**What to build**

- Allow a developer to **redeem** credits directly from their TradingAccount into the existing **planning QR** flow.

**How**

- New backend endpoint:
  - `POST /exchange/redeem-for-planning`:
    - Input: `{ catchment, unit_type, tonnes_required, planning_reference, ... }`.
    - Logic:
      - Check developer TradingAccount has enough credits in that catchment.
      - Debit credits from TradingAccount.
      - Call the existing PlanningLock / Web3 layer to lock/burn credits on-chain.
      - Create a `PlanningApplication` record as today.
      - Generate `application_token` and QR payload.
- Return QR metadata (and/or QR image) to the frontend.

**Tests/Checks**

- `backend/tests/test_exchange_redeem_planning.py`:
  - Successful redeem when sufficient credits.
  - Failure when insufficient credits.
  - Credits are removed from TradingAccount and cannot be reused.

**Notes**

- This step ties the **exchange world** and the **planning world** together.

---

### Step 10.10 – Safeguards, Invariants & Docs

**What to build**

- Add checks and tests to enforce key invariants:
  - No overselling credits.
  - No cross-catchment matching.
  - Proper segregation of broker house vs client balances.
  - No double use of credits (trade + planning).
- Update `README.md`, `plan.md`, and `progress.md` to reflect the new Exchange phase.

**How**

- Add assertions, constraints, or extra validation in:
  - Order placement,
  - Deposit/withdraw,
  - Broker assignment,
  - Redeem-for-planning.
- Update docs:
  - High-level architecture diagrams for the exchange.
  - Brief explanation of the broker model.

**Tests/Checks**

- New tests in `backend/tests/test_exchange_invariants.py`.
- Full test suite passes.
- Manual sanity check of core flows.

**Notes**

- This is the “hardening” step before demoing the exchange to external stakeholders.


------------------------------------------------------------
PHASE 11 — POLISH & DEMO READINESS (previously Phase 10)
------------------------------------------------------------

### Step 11.1 – Deploy & seed scripts
(Identical to old Step 10.1)

### Step 11.2 – README & demo script
(Identical to old Step 10.2)

