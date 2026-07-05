---
title: Pricing & Payments
type: business
project: Designo
updated: 2026-07-06
---

# Pricing & Payments

Part of [[Home]]. See [[Client Journey]], [[SEO + ASO Report]].

## The numbers

- **£695 one-off** — design & build: the cinematic site, AI artwork, copywriting, the machine-readable shadow site, **and the first year of the domain name**.
- **£59/month** — UK hosting, SSL, the weekly SEO + ASO report, one content update per month, support, **and domain renewals**. Cancel anytime with 30 days' notice.

Same price for every client — this is what makes the canned Mailbox follow-up possible. Configurable via `DESIGNO_PRICE_BUILD_PENCE` / `DESIGNO_PRICE_MONTHLY_PENCE` and DB settings.

## Domain strategy (decided 2026-07-05)

Domain cost is **absorbed, never itemised** — the prospect never sees a third bill. We register on their behalf after payment (welcome pack asks them to reply with 1st/2nd choice names); if they already own one, we connect it. Rationale: a separate domain line-item creates alarm ("upfront cost + hosting + website + domain?!") for a ~£10/yr cost.

## Stripe (`payments.py`)

- **One-off:** Checkout `mode=payment`, card, £695.
- **Monthly:** Checkout `mode=subscription`, **bacs_debit + card**, £59/month. Product/Price auto-created once and cached in settings (`stripe_monthly_price_id`, env override `STRIPE_MONTHLY_PRICE_ID`).
- **The payment→website link:** `lead_id` embedded in session metadata. This answers "how do we know which site an email payment belongs to" — the proposal page is per-lead, so its buttons carry the lead.
- Sessions are created **only on button click** (POST `/p/{slug}/pay|subscribe`), never on page view.
- **Webhook** `POST /designo/api/payments/webhook` (needs `STRIPE_WEBHOOK_SECRET`): `checkout.session.completed` → lead `won` + auto-send welcome pack (idempotent); also handles `invoice.payment_failed`, `customer.subscription.deleted`.
- Payments features hide across the UI until `STRIPE_SECRET_KEY` is set.
- Gotcha: stripe-python 15.x — use top-level `stripe.InvalidRequestError` / `stripe.SignatureVerificationError` (`stripe.error.*` is deprecated).
