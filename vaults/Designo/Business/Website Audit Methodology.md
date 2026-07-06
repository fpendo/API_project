---
title: Website Audit Methodology
type: business
project: Designo
updated: 2026-07-06
---

# Website Audit Methodology

Part of [[Home]]. Feeds [[Lead-Gen Engine]]; findings become pitch ammunition (see [[Client Journey]]).

The dated-website funnel finds businesses whose site is actively costing them work. Two audits run in sequence: a cheap **technical pre-filter**, then a **creative-director visual review** that makes the final call. Their combination becomes the **opportunity score** that ranks the leads board.

## Stage 1 — Technical audit (`sources._audit_website`)

One HTTP fetch of the homepage (12s timeout, redirects followed, HTTPS errors tolerated). Signals and weights:

| Signal | Points | Why it matters |
|---|---|---|
| No mobile viewport | +4 | Pre-responsive era; unusable on phones |
| Copyright stuck 8+ years ago | +4 | Looks abandoned (5-7 yrs: +3, 3-4 yrs: +2) |
| No HTTPS | +3 | Browsers flag "Not secure" |
| Framesets / marquee / font / center tags | +3 | 1990s-2000s markup |
| Flash content | +3 | Undisplayable since 2021 |
| Legacy generator (FrontPage, Dreamweaver, GoDaddy builder…) | +3 | Discontinued tooling |
| jQuery 1.x | +2 | 2006-2016 stack |
| Table-era markup (bgcolor/cellpadding) | +2 | Pre-2010 layout |
| No structured data | +1 | Invisible to AI assistants |

- **Threshold:** score ≥ 4 proceeds to Stage 2. Below that the business is not imported.
- **Unreachable site** → imported immediately as "website unreachable — likely abandoned" (the best lead of all; no Stage 2 possible).
- **E-commerce detection** (cart/Shopify/WooCommerce markers) — excluded in services-only sweeps; product sites need e-commerce we don't want to take on.
- Product/retail businesses are also excluded upstream by Google Maps category blocklist (shop, store, dealer, showroom…).

## Stage 2 — Creative-director visual review (`visual_audit.py`)

Technical signals can't tell SBR Electrical (screams 2005) from TWR Lighting (technically old, visually fine). Both fail the same checks; only one loses customers on sight. So the qualifying judgement is visual:

1. **Screenshot** the homepage with stealth-patched headless Chromium (playwright-stealth, realistic UA, en-GB locale, 4s settle so Cloudflare-style checks clear), downscaled to 1024px JPEG.
2. **Fable vision** judges it as Designo's creative director: how dated does the design look *to a customer* in 2026?

Output: `design_score` 1-10, `era` (e.g. "2004-2009"), 3-5 specific visual `reasons`, a respectful `pitch_line`, and a verdict:

| Verdict | Design score | Action |
|---|---|---|
| **rebuild** | 1-3 | Bread-and-butter lead — pitch it |
| **borderline** | 4-5 | Presentable but dated — judgement call |
| **modern** | 6-10 | Skipped; never pitch a redesign at a decent site |
| **unknown** | — | Bot-check/error/parking page in the screenshot; treated as failed, no guessing |

Cost per site: one screenshot (~5-10s) + one small vision call (~$0.01-0.03).

## Composite opportunity score (0-100)

Computed in `main._opportunity_score`, returned on every lead payload, and used to sort the Leads board worst-first:

- **Unreachable site → 100** (a dead site is the biggest opportunity).
- Otherwise **visual component** `(10 − design_score) × 8` (0-72) + **technical score** capped at 20.
- No visual verdict yet → flat 20 visual component (mid-table until reviewed).
- No audited website → no score (no-website leads sort by recency below scored ones).

Bands in the UI: **≥60 red** (rebuild territory), **40-59 amber**, below **slate**.

## What is stored on the lead

`raw.site_audit`: `reachable`, `score`, `signals[]`, `final_url`, `ecommerce`, `bread_and_butter`, and `visual{design_score, era, verdict, reasons, pitch_line}`. Status detail carries the headline (e.g. "REBUILD — design 2/10, reads as 2004-2009. …").

`raw.site_content` (added when the pipeline runs — see [[Lead-Gen Engine]]): homepage + up to 5 key internal pages scraped as ground truth for the brief, shown in the lead detail view.

## How the audit reaches the prospect

- The pitch email includes a **"What we found on your current site"** box: visual observations first, technical findings translated to plain English ("It doesn't adapt to phones…", "Browsers mark it Not secure…"). Never mocking — "your work deserves better than your website".
- Fable's email prompt receives the findings and mentions the one or two most damaging ones conversationally.
