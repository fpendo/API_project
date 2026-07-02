---
title: Legal & Contracts
type: business
project: ETAnalytics
source: CONTRACT_DRAFTING_PROMPT.md, contracts/
updated: 2026-07-02
---

# Legal & Contracts

Part of [[Home]]. Location: `/opt/app/etanalytics/contracts/` (legal docs, **not** smart contracts).

## CONTRACT_DRAFTING_PROMPT.md

Brief for a UK SaaS service agreement:

- **Agency authority** — ETAnalytics acts as authorized agent for disclosure requests
- **GDPR** — Client = controller, ETAnalytics = processor
- **IP** — Client owns share register data; ETAnalytics owns platform/algorithms
- **Liability caps** — 100–200% of annual fees depending on tier
- **Schedules** — ETF ISIN list, SLA, authorization letter, DPA, security standards

## Produced documents

- `contracts/ETANALYTICS_SERVICE_AGREEMENT_TEMPLATE.md`
- `contracts/CONTRACT_EXECUTIVE_SUMMARY.md`

## Templates

- `templates/emails/welcome_email.html` — onboarding email
- `/api/templates/permission-letter` — disclosure/permission letter (see [[Business Logic]])
