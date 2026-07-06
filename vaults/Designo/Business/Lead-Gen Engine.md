---
title: Lead-Gen Engine
type: business
project: Designo
updated: 2026-07-06
---

# Lead-Gen Engine

Part of [[Home]]. See [[Client Journey]], [[Backend]].

Automated speculative-pitch engine at `/designo/leads`.

## Sourcing (`sources.py`)

- **Apify Google Maps** (`compass~crawler-google-places`, pinned `countryCode: "gb"`), with contact enrichment. Two targets:
  - **No website** (`website: withoutWebsite`) — real trading businesses that demonstrably lack a site.
  - **Dated website** (`mode: "old_website"`, `website: withWebsite`) — each candidate site goes through the two-stage audit in [[Website Audit Methodology]]; only sites judged dated (or dead) are imported, with the audit stored in `raw.site_audit` as pitch ammunition.
- **South West sweep** (`start_region_sweep`, `POST /api/leads/sweep`): category × 27 SW towns fan-out (Cornwall→Gloucestershire), dated-website mode, **services only** — product/retail businesses excluded by Google Maps category blocklist and e-commerce markers in the HTML (cart/Shopify/WooCommerce). Capped at 60 searches per sweep.
- **Companies House**: advanced search by SIC code + incorporation date (new companies unlikely to have a site yet).
- **CSV import**: loose header matching, no API keys needed.
- Dedupe by name+postcode; discovery runs as trackable background jobs.

## Prioritisation

Every audited lead gets a composite **opportunity score** (0-100, see [[Website Audit Methodology]]); the Leads board sorts worst-site-first — biggest opportunities at the top, with a colour-coded score chip (red ≥60, amber ≥40). Unaudited (no-website) leads follow, newest first.

## Pipeline (`lead_agent.py`)

Statuses: `new → researching → generating → drafting → review → sent → engaged → won/lost`.

1. **Brief** — Fable turns scraped data into a full questionnaire brief (`LEAD_BRIEF_SKILL`). If the lead has an existing website, `site_scraper.py` first scrapes the homepage + up to 5 key internal pages (about/services/contact/testimonials…, Playwright-stealth fallback for bot-checked sites) into `raw.site_content`; the brief prompt injects it as **ground truth** so the rebuild keeps their real services, story, team and testimonials instead of inferring industry-typical ones. The scraped content is visible in the lead detail view.
2. **Mockup** — standard two-stage build, zero photos → AI artwork commissioned, hero tagged automatically.
3. **Preview media** — Playwright: `preview/hero.png` + `preview/scroll.gif` (560px, ~22 frames).
4. **Email draft** — Fable writes the personalised pitch (`PITCH_EMAIL_SKILL`, aware of no-website vs dated-website prospects); wrapped in a table-based HTML shell with the GIF inline (not a bare link, not an attachment — spam-filter-friendly). Dated-website emails include a **"What we found on your current site"** box: creative-director observations first, then technical findings translated to plain English.
5. **Review queue** — human edits/approves in LeadDetail before anything sends.

Pipeline is resumable: retry reuses the existing brief/mockup rather than regenerating.

## Outreach & hosting

- **Resend** send with List-Unsubscribe and HMAC-signed unsubscribe links; webhook ingests delivered/opened/bounced/complained; suppression list honoured.
- **Prospect hosting** (`prospect.py`): branded login page per lead (credentials in the email), signed 30-day session cookie, site served with an injected analytics beacon (page views, scroll depth, time on page, pricing-panel events) and a dismissible pricing overlay linking to the proposal.
- Every touch is logged to `lead_events` and surfaces on the lead timeline; inbound replies arrive via the Mailbox IMAP poller and are matched to leads by sender address.
