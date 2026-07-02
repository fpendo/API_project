---
title: Business Flows
type: architecture
project: NEMX
updated: 2026-07-02
---

# Business Flows

Part of [[Home]]. See [[Overview]], [[Backend]], [[Smart Contracts]].

The 7 core end-to-end workflows.

## Flow A: Scheme submission → approval → Digital Certificate

1. Landowner submits via `/submission-portal` → `POST /submissions/`
2. Creates `SchemeSubmission` (`status = PENDING_REVIEW`), stores PDF locally
3. Regulator reviews at `/regulator` → `GET /regulator/submissions`
4. **Approve:** `POST /regulator/submissions/{id}/approve`
   - Pins agreement to IPFS (`ipfshttpclient`)
   - Calls `SchemeNFT.mintScheme(...)` on-chain (regulator signs, mints to landowner)
   - Creates `Scheme`, `AgreementArchive`, notifications with claim token
5. **Decline:** `POST /regulator/submissions/{id}/decline`

## Flow B: Redeem Digital Certificate → ERC-1155 credits

1. Landowner sees notification at `/landowner`
2. `POST /landowner/redeem-scheme` with claim token
3. Backend calls `SchemeCredits.mintCredits(schemeId, landowner, amount)` where `amount = tonnes × 100,000`

## Flow C: Broker mandate & credit assignment

1. Landowner assigns credits: `POST /landowner/assign-to-broker`
2. On-chain transfer: **95%** to broker client EVM address, **5% fee** to broker house account
3. Creates `BrokerMandate` with fee/client transaction hashes
4. Landowner can recall: `POST /landowner/recall-from-broker`

## Flow D: Exchange trading

1. **Legacy listings:** `POST /exchange/listings`, `POST /exchange/listings/{id}/buy`
2. **Order book (primary):**
   - Limit orders: `POST /exchange/orders/limit`
   - Market orders: `POST /exchange/orders/market`
   - Order book: `GET /exchange/orderbook`
   - Price history (candlesticks): `GET /exchange/price-history`
3. Matching engine `order_matching.py` — price-time priority within same catchment + unit_type
4. On match: `transfer_credits_on_chain()` via `safeTransferFrom`; stores `transaction_hash` on `Trade`

## Flow E: Broker bots

1. **Market-making bot** — creates bid/ask spread around a reference price
2. **Sell ladder bot** — places tiered sell orders at multiple price levels
3. Both use FIFO credit queues tied to client mandates or house account
4. `bot_worker.py` runs every **60 seconds** on backend startup, calling `place_bot_orders()` and `place_sell_ladder_orders()` for all active bots

## Flow F: Planning application (developer → officer)

1. Developer: `POST /developer/planning-applications` with catchment, unit_type, required tonnage, planning reference
2. Backend greedily selects schemes from developer holdings (`planning_application.py`)
3. Calls `PlanningLock.submitApplication(developer, schemeIds[], amounts[], catchmentHash)` — locks credits on-chain
4. Generates unique `application_token` (QR payload)
5. Planning officer: `POST /planning/validate-qr` → sees multi-scheme breakdown
6. **Approve/burn:** `POST /planning/applications/{id}/burn` or `.../decision` with `APPROVED`
7. **Reject/unlock:** `POST /planning/applications/{id}/unlock`

**Officer actions by status:**
- PENDING → Approve (lock) / Reject
- LOCKED → Burn Credits / Unlock Credits
- APPROVED/REJECTED → View only

## Flow G: OTC desk

1. `GET /operator/holdings-summary` — aggregate holdings by catchment/scheme
2. `POST /operator/simulate-block-trade` — propose multi-account allocation
3. `POST /operator/execute-otc-deal` — on-chain transfers + DB record
