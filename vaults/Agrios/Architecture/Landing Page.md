---
title: Landing Page
type: architecture
project: Agrios
source: /opt/app/Agrios/
updated: 2026-07-02
---

# Landing Page

Part of [[Home]]. Location: `/opt/app/Agrios/`. Served at `https://nemx.co.uk/agrios/`.

## Structure

A **modular** static site (refactored from a single `index.html` so it can grow). `index.html` is a shell that fetches and injects section partials via `assets/js/main.js`.

```
Agrios/
├── index.html               # shell + nav; injects sections
├── sections/                # one HTML partial per section
│   ├── hero.html            overview.html    knowledge.html
│   ├── architecture.html    coverage.html    ar.html
│   ├── market.html          testing.html     fields.html
│   ├── cattle.html          interaction.html analytics.html
│   ├── roadmap.html         data.html
├── assets/
│   ├── css/styles.css
│   ├── js/
│   │   ├── main.js          # section loader
│   │   ├── data.js          # ★ all mock/illustrative data
│   │   ├── theme.js, util.js
│   │   └── sections/*.js    # per-section behaviour (charts, interactions)
│   ├── exmoor-satellite.jpg # base map for coverage + field overlays
│   ├── ar-cattle-view.png   # AR mockup
│   └── ar-soil-sample.png
```

- **Charts:** Chart.js (CDN)
- **Fonts:** Space Grotesk + Outfit
- All illustrative data (research swarm, cattle, fields, testing) lives in `assets/js/data.js` so sections stay presentation-only.

## Section nav

Overview · Knowledge · Connectivity · Coverage · AR · Market · Testing · Fields · Cattle · Voice · Analytics · Roadmap.

## Design notes / iterations

- Flowcharts were reworked repeatedly for clarity; the research flow is a hover-to-expand feature.
- The knowledge section uses an **Obsidian "brain"/neuron graph** as its central image, with expandable dropdowns for each stored signal type.
- Dropdown labels forced to **white/bold** for legibility on the dark theme.
- Cattle "butcher's chart" body-map: hover a primal cut to see that animal's injuries/ailments for that body part.
- Field/quadrant view overlays the 16 cells onto the Exmoor satellite image with nutrient-drift-over-time charts.
