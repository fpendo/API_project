---
title: Business Logic
type: architecture
project: ETAnalytics
updated: 2026-07-02
---

# Business Logic

Part of [[Home]]. See [[Percentage Bug]].

## Metrics / terminology

| Metric | Meaning |
|--------|---------|
| **Identified %** | Shares where the end investment decision maker is known (`confidence == 100`) |
| **Discovered / Matched %** | Shares where the entity *type* is recognized (includes CSDs/custodians) |
| **Terminal entity** | Investment decision maker — wealth manager, platform, private bank, asset manager |
| **Nominee / intermediary** | CSD, custodian, pooled nominee — requires disclosure to drill deeper |

## Why identified % and discovered % differ

Large institutional registers are **mostly CSDs/custodians**, so they show a **high discovered %** (types recognized) but a **low identified %** (few end decision makers known). These are **different business metrics**, not a rollup bug — this distinction is the heart of the [[Percentage Bug]].

## Disclosure workflow

Under Irish Companies Act statutory rights (78% of European ETFs are Irish-domiciled), the issuer can compel a nominee to disclose who it holds for. ETAnalytics operationalizes this:

1. Identify intermediary layers in a register
2. Generate a disclosure/permission letter (`/api/templates/permission-letter`)
3. Track disclosure requests and responses
4. Unwrap the custody chain layer by layer (visualized in `OwnershipTree/`)

## Entity matching

Account names are pattern-matched against `KNOWN_ENTITIES` (backend) / `constants/entityTypes.ts` (frontend, kept in sync). Each match yields an entity type and a confidence score; `confidence == 100` means a terminal decision maker.
