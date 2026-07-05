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

- **Apify Google Maps** (`compass~crawler-google-places`): filtered to `website: withoutWebsite`, with contact enrichment — the core source: real trading businesses that demonstrably lack a site.
- **Companies House**: advanced search by SIC code + incorporation date (new companies unlikely to have a site yet).
- **CSV import**: loose header matching, no API keys needed.
- Dedupe by name+postcode; discovery runs as trackable background jobs.

## Pipeline (`lead_agent.py`)

Statuses: `new → researching → generating → drafting → review → sent → engaged → won/lost`.

1. **Brief** — Fable turns scraped data into a full questionnaire brief (`LEAD_BRIEF_SKILL`).
2. **Mockup** — standard two-stage build, zero photos → AI artwork commissioned, hero tagged automatically.
3. **Preview media** — Playwright: `preview/hero.png` + `preview/scroll.gif` (560px, ~22 frames).
4. **Email draft** — Fable writes the personalised pitch (`PITCH_EMAIL_SKILL`); wrapped in a table-based HTML shell with the GIF inline (not a bare link, not an attachment — spam-filter-friendly).
5. **Review queue** — human edits/approves in LeadDetail before anything sends.

Pipeline is resumable: retry reuses the existing brief/mockup rather than regenerating.

## Outreach & hosting

- **Resend** send with List-Unsubscribe and HMAC-signed unsubscribe links; webhook ingests delivered/opened/bounced/complained; suppression list honoured.
- **Prospect hosting** (`prospect.py`): branded login page per lead (credentials in the email), signed 30-day session cookie, site served with an injected analytics beacon (page views, scroll depth, time on page, pricing-panel events) and a dismissible pricing overlay linking to the proposal.
- Every touch is logged to `lead_events` and surfaces on the lead timeline; inbound replies arrive via the Mailbox IMAP poller and are matched to leads by sender address.
