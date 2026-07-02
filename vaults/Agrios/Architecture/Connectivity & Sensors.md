---
title: Connectivity & Sensors
type: architecture
project: Agrios
updated: 2026-07-02
---

# Connectivity & Sensors

Part of [[Home]]. See [[Overview]].

The physical layer that streams this farm's live data into the vault.

## Topology (top → bottom)

```
                 Obsidian Vault
                      │
                 Local hub  ── Starlink (farmhouse uplink)
                      │
   ┌──────┬──────┬────┴───┬──────┐
  GW-D   GW-1   GW-2   GW-3   GW-4/5     (5 LoRa gateways, solar + mesh)
   └──────┴──────┴───────┴──────┘  ← all connected along one line
                      │
  weather · EID/GPS · soil moisture · genetics · soil tests · food tests · cattle health
```

The bottom (sensor/input) layer feeds up into any gateway — it doesn't matter which — and the gateways relay via the smart mesh to the local hub, which uplinks over Starlink.

## Components

- **LoRa gateways ×5** — four at the corners of the farm, one central; **solar-powered**, upgraded with a **smart mesh** so signal reaches every corner. Coverage visualised as overlapping ~200 m radius circles (Venn-style) over an Exmoor satellite image so the whole farm is covered.
- **Starlink** — farmhouse uplink; gateways/mesh wire back to it via the central hub.
- **EID devices** — one per animal (50 for the baseline herd) for location tracking; LoRa GPS tags log position every ~15 min with geo-fenced escape/fall alerts.
- **Weather station** — wind, rainfall, pressure, air temp, humidity, UV, soil temperature, frost events.
- **Soil moisture probes** — real-time capacitance at multiple depths per quadrant (feeds poaching/grazing models).
- **(Considered)** an animal-weighing + medicine-dosing machine whose data also flows to the vault.

## AR concept

An augmented-reality section imagines a first-person view through AR glasses: an arrow points to a specific animal with an overlay ("check cow X1Z"), i.e. the vault's per-animal data surfaced hands-free in the field. See [[Voice Interface]].
