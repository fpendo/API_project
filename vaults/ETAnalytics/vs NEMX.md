---
title: vs NEMX
type: reference
project: ETAnalytics
updated: 2026-07-02
---

# ETAnalytics vs. NEMX

Part of [[Home]]. These are **completely separate products** that only share the workspace/monorepo and deployment tooling.

| Aspect | ETAnalytics | NEMX / offsetX |
|--------|-------------|----------------|
| Domain | ETF beneficial ownership analytics | UK nutrient/phosphate credit offset exchange |
| Location | `/opt/app/etanalytics/` | `/opt/app/` root (portal at `/nemx/`) |
| Users | ETF issuers, capital markets teams | Landowners, developers, brokers, regulators |
| Core asset | Share register CSV data | Nutrient credits / digital certificates |
| Blockchain | None | Hardhat + Solidity smart contracts |
| Backend | FastAPI (dual: server.py + app/) | FastAPI + SQLite + EVM integration |
| Regulatory context | Irish Companies Act, SRD II, UCITS | UK nutrient neutrality, planning law |
| KB file | `/opt/app/etanalytics/KNOWLEDGE_BASE.md` | `/opt/app/KNOWLEDGE_BASE.md` |
| Production URL | `www.etanalytics.co.uk` | `www.nemx.co.uk` |

No code, data models, or business logic overlap. NEMX has its own vault at `/opt/app/vaults/NEMX/`.
