---
title: Overview
type: architecture
project: NEMX
updated: 2026-07-02
---

# Overview

Part of [[Home]]. See also [[Business Flows]].

## Product

**NEMX / offsetX** is a UK nitrate/phosphate offset exchange — a blockchain-backed registry and marketplace for nutrient neutrality credits. It runs as a local end-to-end demo (Hardhat) with a path to production on a Polygon-compatible chain and real IPFS.

### Value proposition

- **Catchment-specific credits** — developers in e.g. SOLENT cannot use credits from another catchment.
- **On-chain enforcement** of credit locking during planning applications (locked credits cannot be traded).
- **End-to-end workflow** from scheme submission → regulator approval → Digital Certificate mint → credit redemption → exchange trading → planning QR → officer approve/reject.
- **Regulatory transparency** — immutable audit trail, IPFS document archival, scheme capacity tracking.

## Objectives (from `plan.md`)

1. Build a local, end-to-end demo running on the user's machine.
2. Be directly compatible with Polygon Supernet deployment and real IPFS.
3. Enforce catchment-specific credit usage.
4. Enforce on-chain that fractions of credits used in planning are locked until approved (burn) or rejected (unlock).

## User roles (7 actors)

| Role | Enum | Capabilities |
|------|------|--------------|
| **Landowner / Consultant** | `LANDOWNER`, `CONSULTANT` | Submit schemes, redeem Digital Certificates into credits, assign credits to brokers, transfer to trading account |
| **Regulator (Natural England)** | `REGULATOR` | Review submissions, approve/decline, mint scheme NFTs, view catchment capacity archive & analytics |
| **Broker** | `BROKER` | Act on landowner mandates (95% client / 5% house fee split), run market-making & sell-ladder bots, place sell orders |
| **Developer** | `DEVELOPER` | Buy credits on exchange, generate planning QR codes that lock credits on-chain |
| **Planning Officer** | `PLANNING_OFFICER` | Validate QR tokens, view multi-scheme breakdown, approve (burn) or reject (unlock) |
| **Exchange Operator / OTC Desk** | `OPERATOR` | View global holdings, simulate & execute block trades across accounts |

Demo auth: `POST /auth/mock-login` (not production JWT).

## Credit units & catchments

**Conversion (hard-coded in backend + contracts):**
- 1 tonne = 1,000,000 grams
- 1 credit = 10 grams
- **1 tonne = 100,000 credits**
- Example: 50-tonne scheme → 5,000,000 ERC-1155 units

**Valid catchments (demo):** `SOLENT`, `THAMES`, `SEVERN`, `HUMBER`, `MERSEY`, `TEES`, `TYNE`, `WESSEX` — validated via `keccak256(bytes(catchment))` on-chain; **case-sensitive**.

**Unit types:** `nitrate` or `phosphate`.

## Terminology (2026-01-03)

UI/backend notifications renamed:
- **"NFT" → "Digital Certificate"**
- **"Token ID" → "Certificate ID"**
