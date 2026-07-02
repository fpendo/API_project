---
title: Roadmap & Assessment
type: feature
project: Agrios
updated: 2026-07-02
---

# Roadmap & Assessment

Part of [[Home]].

## Where it is now

- A polished, **modular interactive landing page** exists at `/opt/app/Agrios/` (live at `nemx.co.uk/agrios/`), presenting the full vision with charts, satellite overlays, per-cow and per-cell dashboards, and a research-swarm flow.
- All data on the page is **illustrative/mock** (in `assets/js/data.js`) — it's a plan/pitch, not yet a running system.

## Build order (implied by the plan)

1. **Knowledge vault + research swarm** — run the 4–8 week research build to populate the base layer (see [[Knowledge Vault & Research Swarm]]).
2. **Voice interface** — Telegram + Whisper + LLM over the vault (shares the [[Jarvis]] stack; see [[Voice Interface]]).
3. **Sensor mesh** — deploy the 5 solar LoRa gateways + Starlink + EID tags + weather station (see [[Connectivity & Sensors]]).
4. **Testing ingestion** — auto-parse emailed lab results into the vault (see [[Testing Programme]]).
5. **Analytics overlay** — profitability and cost analytics across the whole vault.

## Honest caveats

- The page is a vision/pitch; the sensor hardware, research swarm, and live ingestion are not yet built.
- Costs were revised down to be realistic (50-head herd; genetics one-off; DIY software not counted as a cost).
- Success depends on the research swarm producing genuinely useful, well-cited knowledge and on reliable field connectivity across 500 acres of Exmoor.
