---
title: Agrios / Gupworthy Farm — Project Home
type: index
project: Agrios
updated: 2026-07-02
---

# Agrios — an Operating System for Farming Intelligence

**Agrios** (the platform) applied to **Gupworthy Farm** (a ~500-acre beef farm on **Exmoor, UK**). The idea: pull as much farm data as possible into an **Obsidian knowledge vault** — fed by a research agent swarm *and* live on-farm sensors — then reason over it with a voice-first LLM interface to **improve profitability and cut operating costs**.

> Naming note: the project began as **Agrios**; the branding on the landing page was later changed to **Gupworthy Farm**. The code folder is still `Agrios/`.

- **Location:** `/opt/app/Agrios/` (modular static landing page)
- **Live:** `https://nemx.co.uk/agrios/` (a project card in the portal)
- **Herd baseline:** 50 head, South Devon (+ some Aberdeen Angus crosses)

## Map of this vault

### Architecture
- [[Overview]] — vision, farm, the intelligence overlay
- [[Knowledge Vault & Research Swarm]] — the 6-stage self-directed research loop
- [[Connectivity & Sensors]] — LoRa mesh, Starlink, EID, weather station
- [[Landing Page]] — the modular site (sections, assets)

### Data
- [[Testing Programme]] — soil, forage, genetics, water, animal health
- [[Cattle & Fields]] — per-cow dashboard, 4 quadrants / 16 cells

### Features
- [[Voice Interface]] — Telegram voice reporting, AR glasses concept
- [[Roadmap & Assessment]] — phases and honest critique

## One-line summary

Research swarm + farm sensors → Obsidian vault (the base intelligence layer) → voice-first LLM you talk to via Telegram/Whisper ("what's the optimum soil pH for a South Devon herd on our wetter fields?") → better decisions, higher profit, lower cost.

## How it works (the loop)

1. A **research agent swarm** deep-dives beef farming (genetics, soil, weather, health, nutrition, economics) over 4–8 weeks, writing structured notes to the vault.
2. **On-farm sensors** (LoRa mesh + Starlink) stream live telemetry — weather, cattle GPS/EID, soil moisture — into the same vault.
3. **Lab tests** (soil, forage, genetics, water, blood) land by email and are auto-ingested.
4. The farmer **reports by voice** on Telegram; notes, tasks, and vet emails are generated automatically.
5. An **LLM overlay** answers questions and runs analytics against the whole vault.
