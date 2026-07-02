---
title: Overview
type: architecture
project: ETAnalytics
updated: 2026-07-02
---

# Overview

Part of [[Home]]. See [[Business Logic]], [[vs NEMX]].

## Product

**ETAnalytics** is a B2B SaaS platform for **ETF issuers** (primarily UK/European UCITS issuers). It answers: *"Who actually owns our ETFs?"*

When issuers receive quarterly share registers, they see nominee names (e.g. `EUROCLEAR BANK`, `STATE STREET NOMINEES`, `CREST DEPOSITORY NOMINEES`) rather than end investors. ETAnalytics:

1. **Ingests** matrix-format CSV share registers (rows = nominee accounts, columns = ETF ISINs)
2. **Matches** account names against a known-entity database (docs claim 500–5,000+ patterns; ~30+ in current `KNOWN_ENTITIES`)
3. **Classifies** entities as intermediaries (need disclosure) vs. terminal investment decision makers
4. **Orchestrates disclosure workflows** under Irish Companies Act statutory rights (78% of European ETFs are Irish-domiciled)
5. **Delivers reports/dashboards** — ownership structure, percentages identified, custody chains, distribution intelligence

## Target users

| Persona | Portal | Role |
|---------|--------|------|
| Head of Capital Markets / Distribution | Issuer | Upload registers, view analytics/reports |
| Ownership analyst | Analyst | Entity matching, disclosure workflows, custody chains |
| Onboarding / sales ops | Client Services | Application pipeline management |
| Prospective ETAnalytics investors | Investor (`/investors`) | Financial projections demo |
| Public visitors | Landing page | Signup, demo, marketing |

## Core features

| Feature | Description |
|---------|-------------|
| Share register analysis | CSV upload, parse matrix format, per-ETF breakdown |
| Entity matching | Pattern match against `KNOWN_ENTITIES` with confidence scores |
| Disclosure workflows | Multi-layer custody chain unwrapping; disclosure request tracking |
| Ownership tree visualization | ReactFlow-based custody chain UI (`OwnershipTree/`) |
| Reporting | Issuer reports with identified %, client breakdown, AUM estimates |
| NAV integration | Yahoo Finance via `yfinance` for UCITS ETF pricing |
| Onboarding pipeline | Application → contract → docs → payment → active |
| Demo mode | Rich mock data in localStorage for sales demos without backend |
| Legal/marketing pages | About, Contact, Careers, Privacy, Terms, GDPR, Security |

## Pricing

| Tier | Annual fee | ETF limit | Frequency |
|------|-----------|-----------|-----------|
| Starter | £80,000 | Up to 10 | Quarterly |
| Professional | £150,000 | Up to 50 | Monthly |
| Enterprise | Custom | Unlimited | On-demand |
