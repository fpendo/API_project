# Nitrate & Phosphate Offset Exchange – Project Plan

> **⚠️ IMPORTANT: Before starting any work, read `non-negotiables.md` first!**  
> This file contains the development rules that must be followed for all implementation work.

---

## 1. Objective

Build a **local, end-to-end demo** of a UK nitrate/phosphate offset exchange suitable to pitch to **Natural England**, running entirely on the user's machine with:

- Backend API (FastAPI)
- Frontend web app (React + TypeScript)
- Smart contracts deployed via **Hardhat** to a local EVM chain (Polygon-compatible)
- A local **IPFS** node for document storage

The design must be:

- **Directly compatible** with deploying contracts to a **Polygon Supernet** (with 3 validator nodes) later.
- **Directly compatible** with using a real IPFS node (archival of agreements).
- Enforce **catchment-specific use of credits**:
  - Developers building in *Solent* **cannot** use credits from *other* catchments.
- Enforce on-chain that **fractions of credits used in a planning application are locked** and cannot be traded until the application is approved (burn) or rejected (unlock).

---

## 2. Roles (Actors)

- **Landowner / Consultant**
  - Registers with Natural England portal.
  - Submits offset schemes (including agreements).
  - Redeems NFT into credits.
  - Can sell credits directly or via brokers.

- **Regulator (Natural England)**
  - Reviews new scheme submissions (inbox).
  - Approves or declines schemes.
  - Mints scheme ERC-721 NFTs linked to IPFS agreement.
  - Uses a dashboard to view capacity by catchment and scheme (original vs remaining tonnage).

- **Broker**
  - Acts on behalf of landowners with a mandate.
  - Creates listings and participates in OTC deals.

- **Developer (Property Developer)**
  - Registers on the exchange.
  - Buys credits from schemes in the **correct catchment**.
  - Once holding sufficient tonnage, presses a **single button** to generate a planning **QR code** for the required offset amount.

- **Planning Officer**
  - Uses a web portal to scan QR codes submitted with planning applications.
  - First scan confirms and **locks** the relevant credits (already locked when QR created).
  - Approves or rejects applications:
    - Reject → unlocks credits.
    - Approve → burns credits and decrements scheme capacity.

- **Exchange Operator / OTC Desk**
  - Views global holdings across accounts.
  - Assembles block trades across multiple accounts where secondary market liquidity is insufficient.

---

## 3. Architecture Overview

### 3.1 Smart Contracts (Hardhat / Polygon-compatible)

- **SchemeNFT (ERC-721)**  
  One token per approved scheme, owned by the regulator (Natural England):

  ```solidity
  struct SchemeInfo {
      string name; // "Solent Wetland Scheme A"
      string catchment; // e.g. "SOLENT"
      string location; // free text / coordinates
      uint256 originalTonnes; // e.g. 50
      uint256 remainingTonnes; // decremented as credits are burned
      string ipfsCid; // IPFS CID of agreement/docs
  }
  mapping(uint256 => SchemeInfo) public schemes;
  
  function mintScheme(
      string memory name,
      string memory catchment,
      string memory location,
      uint256 originalTonnes,
      string memory ipfsCid
  ) external onlyOwner returns (uint256);
  
  function reduceRemainingTonnes(uint256 schemeId, uint256 tonnes) external;
  ```

- **SchemeCredits (ERC-1155)**  
  Fungible credits linked to schemes. Each scheme's NFT tokenId becomes the ERC-1155 token ID:

  ```solidity
  IERC721 public schemeNft; // Reference to SchemeNFT contract
  address public planningContract; // PlanningLock contract address
  
  // Locked balances: schemeId => user => locked amount
  mapping(uint256 => mapping(address => uint256)) public lockedBalance;
  
  function mintCredits(
      uint256 schemeId,
      address to,
      uint256 amount
  ) external onlyOwner;
  
  function lockCredits(
      uint256 schemeId,
      address user,
      uint256 amount
  ) external onlyPlanning;
  
  function unlockCredits(
      uint256 schemeId,
      address user,
      uint256 amount
  ) external onlyPlanning;
  
  function burnLockedCredits(
      uint256 schemeId,
      address user,
      uint256 amount
  ) external onlyPlanning;
  ```

- **PlanningLock**  
  Manages planning applications and coordinates locking/unlocking/burning of credits:

  ```solidity
  struct Application {
      address developer;
      bytes32 catchmentHash; // keccak256("SOLENT")
      uint256[] schemeIds;
      uint256[] amounts; // ERC-1155 units per scheme
      ApplicationStatus status;
  }
  
  enum ApplicationStatus {
      PENDING,
      APPROVED,
      REJECTED
  }
  
  mapping(uint256 => Application) public applications;
  uint256 public nextApplicationId;
  
  IERC721 public schemeNft;
  SchemeCredits public schemeCredits;
  
  function submitApplication(
      address developer,
      uint256[] memory schemeIds,
      uint256[] memory amounts,
      bytes32 requiredCatchment
  ) external returns (uint256);
  
  function approveApplication(uint256 appId) external;
  
  function rejectApplication(uint256 appId) external;
  ```

---

### 3.2 Credit Conversion & Units

**Conversion Formula:**
- 1 tonne = 1,000,000 grams (1,000 kg × 1,000 g/kg)
- 1 credit = 10 grams
- Therefore: **1 tonne = 100,000 credits**

**Example:**
- Scheme with 50 tonnes → 50 × 100,000 = 5,000,000 credits

**Implementation:**
- Backend stores conversion constants:
  - `GRAMS_PER_TONNE = 1_000_000`
  - `GRAMS_PER_CREDIT = 10`
  - `CREDITS_PER_TONNE = GRAMS_PER_TONNE / GRAMS_PER_CREDIT = 100_000`

**On-chain:**
- All tonnage values stored as `uint256` in tonnes (e.g., `50` = 50 tonnes)
- All credit amounts stored as `uint256` in credits (e.g., `5_000_000` = 5,000,000 credits = 50 tonnes)

---

### 3.3 Valid Catchments

**UK Water Catchment Areas (for demo purposes):**

The system enforces catchment-specific credit usage. Valid catchments include:

- **SOLENT** - Solent catchment area
- **THAMES** - Thames catchment area
- **SEVERN** - Severn catchment area
- **HUMBER** - Humber catchment area
- **MERSEY** - Mersey catchment area
- **TEES** - Tees catchment area
- **TYNE** - Tyne catchment area
- **WESSEX** - Wessex catchment area

**Implementation:**
- Backend maintains a controlled list of valid catchments
- Frontend dropdowns use this list
- Smart contracts validate catchment via hash comparison: `keccak256(bytes(catchment))`
- Case-sensitive: "SOLENT" ≠ "Solent" ≠ "solent"

**For demo:**
- Focus on **SOLENT** as primary example
- Other catchments available for testing cross-catchment restrictions

---

## 4. Core Flows

### 4.1 Landowner/Consultant Registration & Scheme Submission

1. **Registration**
   - Landowner/consultant signs up in the portal.
   - `Account` created with role `LANDOWNER` or `CONSULTANT`.

2. **Submit Scheme**
   - UI form captures:
     - Scheme name
     - Catchment (e.g. `SOLENT`) – from a controlled list.
     - Location (free text).
     - Unit type (nitrate/phosphate).
     - Total tonnage.
     - Agreement file upload (PDF / stub).
   - Backend creates a `SchemeSubmission` with `status = PENDING_REVIEW` and stores the file locally (and/or IPFS in a later step).

3. **Regulator Inbox**
   - Regulator logs in to `RegulatorDashboard`.
   - Sees an inbox/list of pending scheme submissions.
   - Can click into a submission to see all details + agreement file.

4. **Approve / Decline**
   - **Decline**:
     - `SchemeSubmission.status = REJECTED`.
     - Notification is created for the submitter.
   - **Approve**:
     - `SchemeSubmission.status = APPROVED`.
     - The approval triggers scheme creation and NFT minting (next flow).

---

### 4.2 NFT Creation (ERC-721) & IPFS Archival

On approval:

1. **Upload to IPFS**
   - Backend pins the agreement to local IPFS.
   - Gets a `cid`.

2. **Create SchemeNFT**
   - Backend calls the SchemeNFT contract via Hardhat RPC:
     - `mintScheme(name, catchment, location, originalTonnes, ipfsCid)`  
       → returns `tokenId` (schemeId).
   - SchemeNFT stores:
     - `SchemeInfo` including `originalTonnes` and `remainingTonnes = originalTonnes`.

3. **DB Records**
   - `Scheme` DB entry linking internal schemeId to NFT `tokenId`.
   - `AgreementArchive` entry with:
     - `scheme_id`
     - local `file_path`
     - `sha256_hash`
     - `ipfs_cid`

4. **Notifications**
   - Notification 1 to landowner/consultant: scheme approved, high-level details.
   - Notification 2: QR claim token for the NFT (to redeem into credits in the exchange app).

---

### 4.3 Regulator Archive & Catchment Capacity View

Regulator's archive view shows:

- Schemes grouped by **catchment**.
- For each scheme:
  - `name`
  - `location`
  - `originalTonnes` (from NFT)
  - `remainingTonnes` (from NFT)
  - Status:
    - **Green** if `remainingTonnes > 0`.
    - **Red** if `remainingTonnes == 0`.

At the bottom of each catchment group:

- **Totals** row:
  - Sum of originalTonnes.
  - Sum of remainingTonnes (available capacity).

This uses on-chain data (SchemeNFT) combined with DB for indexing.

---

### 4.4 Landowner Redeems NFT → ERC-1155 Credits

1. **Notifications View**
   - Landowner sees:
     - "Scheme approved" notification.
     - "Redeem scheme into credits" notification with QR claim token.

2. **Redeem Flow**
   - In the exchange app, landowner clicks "Redeem" (simulate scanning QR).
   - Backend:
     - Validates the claim token.
     - Fetches scheme from SchemeNFT (via Hardhat RPC) to get `originalTonnes`.
     - Converts tonnage to grams and credits (e.g. 1 credit = 10 g).
   - Backend calls SchemeCredits contract:
     - `mintCredits(schemeId, landownerAddress, amountUnits)` where:
       - `schemeId` == NFT tokenId.
       - `amountUnits` = `(originalTonnesInGrams / 10)`.

3. **Post-Redeem**
   - Landowner's wallet address (or demo address) now holds ERC-1155 credits of ID `schemeId`.
   - In the DB:
     - Off-chain `CreditHoldings` table mirrors on-chain balances for easier querying.

4. **Landowner Credits Dashboard**
   - Shows holdings per scheme and per catchment (derived from SchemeNFT + credits).

---

### 4.5 Exchange & Brokerage

- **BrokerMandate** (off-chain DB):
  - Landowner grants broker permission with a fee %.
  - Broker can list landowner's credits via the backend.

- **Listings** (off-chain DB model for demo; later can move on-chain):
  - For each listing:
    - `owner_account_id`
    - `schemeId`
    - `catchment`
    - `unitType`
    - `pricePerUnit`
    - `quantityUnits`
  - Listings only supported for credits from the correct catchment.

- **Developer Buy Flow**
  - Developer selects catchment and nutrient type.
  - Frontend only shows listings for that catchment.
  - When they buy:
    - Backend:
      - Transfers ERC-1155 credits from seller to buyer using SchemeCredits contract.
      - Updates off-chain `CreditHoldings` and listing state.

---

### 4.6 OTC Desk

- **Holdings Summary**
  - Backend aggregates holdings across accounts by:
    - catchment
    - scheme
    - unit type
  - Operator sees a table of who holds what.

- **Block Trade Simulation**
  - Operator inputs:
    - Catchment
    - Unit type
    - Required tonnage
  - Backend proposes an allocation of amounts from multiple accounts.

- **Execute OTC Deal**
  - Backend calls SchemeCredits to transfer appropriate amounts from each source account to the buyer (developer).
  - Records an `OTCDeal` in DB.

---

### 4.7 Developer's Simple Planning QR Flow (Multi-Scheme)

1. Developer already knows (from environmental review) that they must offset **X tonnes** of nitrate/phosphate in a specific catchment (e.g. `SOLENT`).

2. Developer buys credits from the exchange until they hold at least `X tonnes` for:
   - The correct catchment.
   - The correct nutrient type.

3. On the `DeveloperDashboard`, once they hold enough credits, they see:

   - "You need: 1.00 tonnes nitrate in SOLENT"
   - "You hold: 1.20 tonnes nitrate in SOLENT (from 3 schemes)"
   - A button: **"Generate Planning QR for 1.00 tonnes"**

4. When they click the button:

   - Backend picks a combination of schemes (e.g. 0.4 t from Scheme A, 0.6 t from Scheme B, both in SOLENT).
   - Converts tonnes to ERC-1155 units per scheme.
   - Calls `PlanningLock.submitApplication(developer, schemeIds[], amounts[], requiredCatchment)` on-chain, where:
     - `schemeIds = [A, B, ...]`
     - `amounts = [unitsFromA, unitsFromB, ...]`
     - `requiredCatchment = keccak256("SOLENT")`
   - The `PlanningLock` contract:
     - Validates each scheme's catchment via SchemeNFT:
       - `require(keccak256(bytes(info.catchment)) == requiredCatchment, "Scheme in wrong catchment")`
     - Calls `SchemeCredits.lockCredits(schemeId, developer, amountUnits)` for each scheme.
   - Backend creates a `PlanningApplication` record and one `PlanningApplicationScheme` per scheme.

5. Backend generates a random `applicationToken`, stores it against the `PlanningApplication`, and generates a QR code encoding that token.

6. Developer downloads/prints/attaches the QR code to their planning submission.  
   **They do not need to manually pick schemes** – the system handles it.

---

### 4.8 Planning Officer Portal: Multi-Scheme Breakdown, Lock & Decision

1. **Scan QR**
   - Planning officer opens `PlanningPortal`.
   - Scans/enters the QR token (`applicationToken`).
   - Frontend calls backend with `applicationToken`.

2. **Lookup**
   - Backend fetches:
     - `PlanningApplication` (status, total tonnage, catchment, developer info).
     - `PlanningApplicationScheme` entries (which schemes & how much).
     - On-chain data from SchemeNFT (names, locations, remainingTonnes).

3. **Officer UI**
   - Officer sees:

     - Developer name and reference
     - Catchment (e.g. SOLENT)
     - Nutrient type
     - Total offset: e.g. **1.00 tonnes**
     - Table of schemes:

       | Scheme NFT | Scheme Name | Location | Tonnes from Scheme | Scheme Remaining (t) | Catchment |
       |-----------:|-------------------|-----------------------------|--------------------:|---------------------:|-----------|
       | #101 | Solent Wetland A | Solent marshes – parcel 7 | 0.40 | 29.6 | SOLENT |
       | #115 | Solent Wetland B | Solent floodplain | 0.60 | 10.0 | SOLENT |

     - A clear confirmation that **all schemes in the application are in SOLENT**.

4. **Lock Enforcement**
   - When QR is generated, credits were already locked on-chain via `lockCredits`.
   - Attempting to transfer locked credits would fail because the ERC-1155 contract enforces:

     ```solidity
     mapping(uint256 => mapping(address => uint256)) public lockedBalance;

     function _beforeTokenTransfer(
         address operator,
         address from,
         address to,
         uint256[] memory ids,
         uint256[] memory amounts,
         bytes memory data
     ) internal override {
         super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

         if (from != address(0) && from != to) {
             for (uint256 i = 0; i < ids.length; i++) {
                 uint256 id = ids[i];
                 uint256 amount = amounts[i];
                 uint256 balance = balanceOf(from, id);
                 uint256 locked = lockedBalance[id][from];
                 require(
                     balance - locked >= amount,
                     "Cannot transfer locked credits"
                 );
             }
         }
     }
     ```

5. **Decision: Approve or Reject**

   - If **Rejected**:
     - Backend calls `PlanningLock.rejectApplication(appId)` on-chain.
     - PlanningLock:
       - Calls `SchemeCredits.unlockCredits(schemeId, developer, amountUnits)` per scheme.
     - Off-chain:
       - `PlanningApplication.status = REJECTED`.

   - If **Approved** (building can commence):
     - Backend calls `PlanningLock.approveApplication(appId)` on-chain.
     - PlanningLock:
       - Calls `SchemeCredits.burnLockedCredits(schemeId, developer, amountUnits)` per scheme.
       - Calls a function on SchemeNFT to decrease `remainingTonnes` per scheme.
     - Off-chain:
       - `PlanningApplication.status = APPROVED`.
     - Regulator's archive view now shows updated `remainingTonnes`. Any scheme that reaches 0 is visually marked **red** (no capacity left).

---

## 5. Technical Specifications

### 5.1 Credit Conversion & Units

**Conversion Formula:**
- 1 tonne = 1,000,000 grams (1,000 kg × 1,000 g/kg)
- 1 credit = 10 grams
- Therefore: **1 tonne = 100,000 credits**

**Example:**
- Scheme with 50 tonnes → 50 × 100,000 = 5,000,000 credits

**Implementation:**
- Backend stores conversion constants:
  - `GRAMS_PER_TONNE = 1_000_000`
  - `GRAMS_PER_CREDIT = 10`
  - `CREDITS_PER_TONNE = GRAMS_PER_TONNE / GRAMS_PER_CREDIT = 100_000`

**On-chain:**
- All tonnage values stored as `uint256` in tonnes (e.g., `50` = 50 tonnes)
- All credit amounts stored as `uint256` in credits (e.g., `5_000_000` = 5,000,000 credits = 50 tonnes)

### 5.2 Valid Catchments

**UK Water Catchment Areas (for demo purposes):**

The system enforces catchment-specific credit usage. Valid catchments include:

- **SOLENT** - Solent catchment area
- **THAMES** - Thames catchment area
- **SEVERN** - Severn catchment area
- **HUMBER** - Humber catchment area
- **MERSEY** - Mersey catchment area
- **TEES** - Tees catchment area
- **TYNE** - Tyne catchment area
- **WESSEX** - Wessex catchment area

**Implementation:**
- Backend maintains a controlled list of valid catchments
- Frontend dropdowns use this list
- Smart contracts validate catchment via hash comparison: `keccak256(bytes(catchment))`
- Case-sensitive: "SOLENT" ≠ "Solent" ≠ "solent"

**For demo:**
- Focus on **SOLENT** as primary example
- Other catchments available for testing cross-catchment restrictions

---

## 6. Data Model (Backend)

Key DB entities (conceptual):

- `Account`  
  `id`, `name`, `role`, `evm_address`, …

- `SchemeSubmission`  
  `id`, `submitter_account_id`, `scheme_name`, `catchment`, `location`, `unit_type`, `total_tonnage`, `file_path`, `status`, `created_at`

- `Scheme`  
  `id`, `nft_token_id`, `name`, `catchment`, `location`, `unit_type`, `original_tonnage`, `created_by_account_id`

- `AgreementArchive`  
  `id`, `scheme_id`, `file_path`, `sha256_hash`, `ipfs_cid`, `created_at`

- `Notification`  
  `id`, `recipient_account_id`, `type`, `payload_json`, `created_at`, `read`

- `BrokerMandate`, `ExchangeListing`, `Trade`, `OTCDeal` (for marketplace functionality)

- `PlanningApplication`  
  `id`, `developer_account_id`, `catchment`, `unit_type`, `total_tonnage`, `status`, `application_token`, `created_at`

- `PlanningApplicationScheme`  
  `id`, `planning_application_id`, `scheme_id`, `tonnes_locked`, `units_locked`

Backend also mirrors credit balances per account in a helper table for fast queries (derived from on-chain events).

---

## 7. Project Structure (High-Level)

```text
root/
  plan.md
  implementation.md
  non-negotiables.md
  progress.md
  README.md

  contracts/
    SchemeNFT.sol
    SchemeCredits.sol
    PlanningLock.sol
    (optional) Exchange.sol
    utils/ (shared libraries if needed)

  hardhat.config.ts
  scripts/
    deploy.ts
    seed-dev.ts

  backend/
    app/
      main.py
      config.py
      db.py
      models.py
      schemas.py
      routes/
        auth.py
        submission_portal.py
        regulator.py
        landowner.py
        broker.py
        developer.py
        planning_officer.py
        operator.py
      services/
        submissions.py
        schemes.py
        nft_integration.py
        credits_integration.py
        planning.py
        exchange.py
        otc.py
        notifications.py
      utils/
        ipfs.py
        qr.py
    tests/

  frontend/
    src/
      main.tsx
      App.tsx
      api/
      pages/
        Landing/
        RegistrationPortal/
        SubmissionPortal/
        RegulatorDashboard/
        LandownerDashboard/
        BrokerDashboard/
        DeveloperDashboard/
        PlanningPortal/
        OperatorOTC/
      components/
        Layout/
        Tables/
        QR/
    tests/
```

