---
title: Client Journey
type: business
project: Designo
updated: 2026-07-06
---

# Client Journey

Part of [[Home]]. See [[Lead-Gen Engine]], [[Pricing & Payments]], [[SEO + ASO Report]].

The full funnel, end to end:

## 1. Discover
A UK business with **no website** is found via Apify Google Maps scrape, Companies House search, or CSV import ([[Lead-Gen Engine]]).

## 2. Build on spec
Fable writes their questionnaire brief from the scraped data, then the normal two-stage pipeline builds a cinematic mockup — all AI artwork, no client photos. Playwright captures a hero screenshot and a ~7-second scrolling GIF.

## 3. Pitch (human-approved)
Fable drafts a personalised email with the GIF inline and bespoke login credentials for their private hosted preview at `/designo/p/{slug}/`. It sits in an **approval queue** — nothing sends without a human click. Sent via Resend; delivery/open/bounce tracked; sent copy mirrored into the Mailbox.

## 4. Engage
The prospect logs in and browses their own site (analytics beacon tracks views, scroll depth, pricing-panel interaction). A dismissible overlay links to the **full proposal**.

## 5. Propose
Reply handling happens in the Mailbox (IMAP inbound, Resend outbound with threading, one-click canned follow-up). The proposal page (`/p/{slug}/proposal/`) explains the [[Pricing & Payments|£695 / £59]] numbers, shows the "Why now" AI-search stats, the shadow-site USP, a sample [[SEO + ASO Report]], FAQ, and two Stripe buttons.

## 6. Pay
£695 one-off by card, £59/month by BACS Direct Debit or card. `lead_id` in Stripe metadata links the payment to the right lead/website. Webhook flips the lead to `won`.

## 7. Welcome
The welcome pack email fires automatically on payment (idempotent): payment confirmed, numbered next steps, **"the one thing we need from you"** — reply with 1st/2nd choice domain name (first year included in the £695). Also a gated `/p/{slug}/welcome/` page and manual send/preview buttons on the lead.

## 8. Live + weekly reporting
Domain registered, site goes live within 24h of domain choice, Search Console connected. Every Monday: the [[SEO + ASO Report]].

Generic previews of the proposal, welcome pack, and follow-up email are always visible in the portal **Documents** tab (sample client: Harper & Sons Roofing).
