---
title: Satellite Monitoring
type: strategy
project: NEMX
source: SATELLITE_MONITORING_STRATEGY.md
updated: 2026-07-02
---

# Satellite Monitoring Strategy

Part of [[Home]]. Source: `/opt/app/SATELLITE_MONITORING_STRATEGY.md`.

## Problem

80–120 year scheme commitments with no scalable compliance monitoring.

## Solution

Planet Labs satellite imagery (3–5m resolution, ~£0.50–£2/km²), annual summer captures (May–Aug), NDVI + land cover ML + change detection, blockchain-anchored audit records.

**Annual cost:** ~£5,000–£11,000/year for 1,000 schemes (£5–11/scheme/year).

## Implementation phases

1. Manual MVP (2–4 weeks) — upload & compare
2. Automated capture via Planet API (4–6 weeks)
3. ML-powered analysis (8–12 weeks)

## Data model

- **Proposed DB tables:** `satellite_captures`, `scheme_audits`, `audit_alerts`
- **On-chain:** `AuditRecord` struct with IPFS hashes, compliance score, auto-pause credits on VIOLATION
- **Frontend:** `SatelliteMonitoringSection.tsx` in marketing pages
