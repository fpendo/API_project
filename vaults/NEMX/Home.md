---
title: NEMX / offsetX — Project Home
type: index
project: NEMX
updated: 2026-07-02
---

# NEMX / offsetX

**UK nitrate/phosphate offset exchange** — a blockchain-backed registry and marketplace for **nutrient neutrality credits**. Built as a local, end-to-end demo suitable for pitching to **Natural England**, with a path to production on a Polygon-compatible chain.

- **Live domain:** `www.nemx.co.uk`
- **Primary codebase:** `/opt/app` (root monorepo) + `/opt/app/nemx/` (application) + `/opt/app/contracts/` (Solidity)
- **Also called:** offsetX (in docs/code)

## Map of this vault

### Architecture
- [[Overview]] — what it is, roles, credit units, catchments
- [[Business Flows]] — the 7 core end-to-end workflows
- [[Smart Contracts]] — SchemeNFT, SchemeCredits, PlanningLock
- [[Backend]] — FastAPI services, models, API routes
- [[Frontend & Portal]] — React pages, multi-project portal
- [[Deployment]] — systemd, nginx, env vars, Hardhat accounts

### Strategy
- [[Strategic Action Plan]] — 24-month go-to-market
- [[Market Analysis]] — UK nutrient neutrality TAM
- [[SWOT]] — strengths, weaknesses, risks
- [[Competitive Intelligence]] — 10 competitor profiles
- [[Financial Model]] — unit economics, revenue, funding
- [[Satellite Monitoring]] — compliance monitoring strategy
- [[Demo Script]] — Natural England demo narrative

### Operations
- [[Known Bugs & Fixes]] — resolved issues + prevention
- [[Dev Workflow]] — how to run/reset the stack

## One-line summary

Landowners submit nutrient mitigation schemes → regulator (Natural England) approves and mints a **Digital Certificate (ERC-721)** → landowner redeems it into fungible **credits (ERC-1155)** → credits trade on an order-book exchange → developers buy credits and generate a **planning QR** that locks credits on-chain → planning officer approves (burns) or rejects (unlocks).

## Key numbers

- **1 tonne = 100,000 credits** (1 credit = 10 grams)
- **8 demo catchments:** SOLENT, THAMES, SEVERN, HUMBER, MERSEY, TEES, TYNE, WESSEX
- **Business model:** 4% transaction fee
- **TAM:** £400M–£1.1B/year
