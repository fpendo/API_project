---
title: Cattle & Fields
type: data
project: Agrios
source: assets/js/data.js (cows, fieldSeries, cuts)
updated: 2026-07-02
---

# Cattle & Fields

Part of [[Home]]. The personalization layer — drill into any animal or any patch of land.

## Per-cow dashboard

Click a cow by ID → expanded profile with:

- **Identity:** EID tag + UK passport number (linked to BCMS/APHA), breed, sex, age
- **Location:** live LoRa GPS (quadrant · cell · lat/long)
- **Performance:** live-weight series, ADG vs. breed target, body condition score
- **Body-map ("butcher's chart"):** hover a primal cut (neck, chuck, rib, loin, rump, round, brisket, plate, flank, fore/hind shank, head) to see injuries/ailments recorded for that body part, with severity + date
- **Medications:** drug, dose, schedule, withdrawal/clearance
- **Vaccinations:** product, given/due dates, up-to-date flag (BVD, Lepto, Clostridial, Lungworm, IBR…)
- **DNA & genomics:** profile tier (30× WGS or 50K SNP), breed composition, sire/dam, parentage %, EBVs (Growth, Milk, Calving ease, Marbling, Feed efficiency, Docility), recessive conditions, markers (coat colour, polled/horned, κ-casein, heat tolerance)
- **Calving + calves:** birth weight, birth ease, gestation, weaning/current weight, ADG, growth chart per calf

Example animals in the demo: Cow 123 (South Devon), Cow 178 (SD × Angus), Cow 204 (elite SD), Bull 41 (AI sire, 1,030 kg).

## Fields — 4 quadrants, 16 cells

- Quadrants **A (NW), B (NE), C (SW), D (SE)**, each a 2×2 of cells (A1–A4 … D1–D4)
- Overlaid on the Exmoor satellite image
- Each cell tracks 6 test rounds (T1–T6): pH, P, K, Mg, organic matter, plus a fuller latest panel (S, CEC, texture, moisture)
- Click a cell (e.g. B3) → tabular soil panel + event history (tests, treatments) and **nutrient drift over time** charts
- Drives **bespoke per-cell nutrient/lime prescriptions** (e.g. B3 flagged pH 5.5 → lime + K boost)
