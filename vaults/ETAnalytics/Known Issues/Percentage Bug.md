---
title: Percentage Bug
type: known-issue
project: ETAnalytics
source: PERCENTAGE_CALCULATION_EXPLAINED.md, PERCENTAGE_ROLLUP_FIX.md, PERCENTAGE_FIX_WORKAROUND.js
updated: 2026-07-02
---

# Percentage Bug (identified vs. discovered)

Part of [[Home]]. See [[Business Logic]], [[Frontend-Backend Disconnect]].

## The symptom

A register shows ~93% "discovered" but an ETF drill-down shows 0% "identified".

## Why (not actually a math bug)

| Level | Was showing | Counts |
|-------|-------------|--------|
| Register | "93.3% discovered" | All recognized entities (CSDs + custodians + WMs) |
| ETF | "0% identified" | Only decision makers (`confidence=100`) |

These are **different business metrics**. Large institutional registers are mostly CSDs/custodians → high discovered %, low identified %. See [[Business Logic]].

## Backend fix applied (`server.py` analyze endpoint)

```python
result_dict['discovered_percentage'] = matched_pct    # all recognized
result_dict['matched_percentage']    = matched_pct    # backwards compat
result_dict['identified_percentage'] = identified_pct # decision makers only
result_dict['percentage_definitions'] = { ... }       # field explanations
```

## Frontend migration (partial)

- localStorage field `discoveredPct` → `identifiedPct`
- data version key: `v8-report-timing-fix`
- `historicalData.ts` scales ETF percentages to match register-level `identifiedPct` for demo consistency

Fixes **demo data consistency** but not the underlying semantic mismatch (matched vs. identified).

## PERCENTAGE_FIX_WORKAROUND.js (production hack)

`/opt/app/PERCENTAGE_FIX_WORKAROUND.js` — a fetch interceptor that rewrites `/api/registers/*/analyze` responses, replacing `discovered_percentage`/`matched_percentage` with `identified_percentage` (also on `etf_breakdown`). Used when the compiled React bundle can't be rebuilt.

## Proper fix

Display `identified_percentage` consistently at both levels, labelled *"Investment Decision Maker Identified"*; connect the frontend to the backend API with consistent field usage and rebuild.
