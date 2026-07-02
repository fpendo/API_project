---
title: ETAnalytics — Project Home
type: index
project: ETAnalytics
updated: 2026-07-02
---

# ETAnalytics (Exchange Traded Analytics)

**B2B SaaS for ETF issuers** answering the question: *"Who actually owns our ETFs?"* Issuers receive quarterly share registers showing nominee names (Euroclear, State Street, CREST) rather than end investors. ETAnalytics ingests those registers, matches entities, classifies intermediaries vs. terminal investors, orchestrates statutory disclosure workflows, and reports on ownership structure.

- **Production domain:** `www.etanalytics.co.uk`
- **Location:** `/opt/app/etanalytics/` + reference docs at `/opt/app` root
- **Separate product from NEMX** — see [[vs NEMX]]

## Map of this vault

### Architecture
- [[Overview]] — product, users, features, pricing
- [[Tech Stack & Dual Backend]] — the critical architecture note
- [[Frontend]] — routes, portals, pages, state
- [[API Reference]] — server.py + modular app endpoints
- [[Business Logic]] — share registers, entity matching, percentages

### Business
- [[Marketing & Copy]] — landing page copy, improvement briefs
- [[Legal & Contracts]] — service agreement, contract drafting
- [[Financial Projections]] — ARR projections, TAM

### Known Issues
- [[Percentage Bug]] — the identified vs. discovered % problem
- [[Frontend-Backend Disconnect]] — mock data vs. live API

### Reference
- [[vs NEMX]] — clear distinction between the two projects

## One-line summary

Upload matrix-format CSV share register → match account names against a known-entity DB → classify as terminal investor (decision maker) vs. nominee/intermediary → run Irish Companies Act disclosure to unwrap custody chains → report identified % and distribution intelligence.

## Key facts

| Item | Value |
|------|-------|
| Package | `exchange-traded-analytics` v1.0.0 |
| Frontend dev port | 3000 |
| Backend port (prod) | 8001 |
| Data version key | `v8-report-timing-fix` |
| Demo issuer | `issuer@etanalytics.co.uk` / `Issuer123!` |
| Demo analyst | `analyst@etanalytics.co.uk` / `Analyst123!` |
| Admin | `admin@etanalytics.co.uk` / `Admin2024!` |
