---
title: Backend
type: architecture
project: NEMX
updated: 2026-07-02
---

# Backend

Part of [[Home]]. See [[Business Flows]], [[Smart Contracts]].

- **Framework:** FastAPI 0.104.1, SQLAlchemy 2.0, SQLite, Web3.py 7.14
- **Location:** `/opt/app/nemx/backend/` (the root `/opt/app/backend/` is a **legacy stub**)
- **Database:** SQLite file `offsetx.db`
- **Port:** 8000

## Services (`app/services/`)

| Service | Responsibility |
|---------|----------------|
| `submissions.py` | Scheme submission CRUD, file storage |
| `nft_integration.py` | Web3 calls to mint SchemeNFT |
| `credits_integration.py` | Mint ERC-1155 credits (tonnes × 100,000) |
| `credits_summary.py` | On-chain `balanceOfBatch`, locked balances, assigned/sold, remaining_credits |
| `exchange.py` | Listings, `transfer_credits_on_chain`, seller private-key selection |
| `order_matching.py` | Price-time priority matching, trade creation, on-chain settlement |
| `market_making_bot.py` | Bid/ask bot logic, FIFO queues, reference price |
| `sell_ladder_bot.py` | Tiered sell orders at N price levels |
| `bot_worker.py` | Background thread, 60s interval, runs all active bots |
| `planning_application.py` | Greedy scheme selection, PlanningLock submit/approve/reject |
| `broker.py` | Mandate management helpers |
| `price_history.py` | OHLCV candlestick aggregation |
| `balance_check.py` | Pre-trade buyer balance validation |

## Database models (`app/models.py`) — 22 tables

- **Core:** `Account`, `SchemeSubmission`, `AgreementArchive`, `Scheme`, `Notification`
- **Trading:** `ExchangeListing`, `Trade`, `Order`, `PriceHistory`
- **Broker:** `BrokerMandate`
- **Planning:** `PlanningApplication`, `PlanningApplicationScheme`
- **Bots:** `MarketMakingBot`, `BotAssignment`, `FIFOCreditQueue`, `BotOrder`, `SellLadderBot`, `SellLadderBotAssignment`, `SellLadderFIFOCreditQueue`, `SellLadderBotOrder`

## API route map

All routes prefixed by nginx `/api` in production (FastAPI mounts at root).

| Prefix | Key endpoints |
|--------|--------------|
| `/auth` | `POST /mock-login` |
| `/submissions` | `POST /` |
| `/regulator` | submissions list/approve/decline, archive, schemes detail/download |
| `/landowner` | notifications, redeem, assign-to-broker, transfer-to-trading-account, recall, mandates |
| `/accounts` | `{id}/credits-summary`, by-catchment, by-address, balance |
| `/exchange` | listings, orders (limit/market), orderbook, price-history, open/completed orders, trades |
| `/broker/{id}` | client/house holdings, mandates, bots (CRUD/activate), sell-ladder-bots, assignments, place-orders, queue, trades |
| `/developer` | planning-applications, credit-balances-by-catchment |
| `/planning` | validate-qr, applications archive/detail, burn, unlock, decision, schemes/capacity |
| `/operator` | holdings-summary, simulate-block-trade, execute-otc-deal |
| `/health` | health check |

## Key implementation details

1. **Seller private key selection** (`order_matching.py`/`exchange.py`): based on actual seller EVM address — trading account → `TRADING_ACCOUNT_PRIVATE_KEY`, broker client → `BROKER_PRIVATE_KEY`, broker house → `BROKER_HOUSE_PRIVATE_KEY`.
2. **Credits summary is on-chain authoritative:** `get_account_credits_summary()` calls `balanceOfBatch()` + `lockedBalance()`. Placeholder addresses return 0 holdings.
3. **Bot worker starts automatically** on backend startup (60s interval); disable by commenting out the startup event in `main.py`.
4. **Hardhat dependency:** `nemx-backend.service` has `Wants=hardhat.service`; contracts must be deployed first.
