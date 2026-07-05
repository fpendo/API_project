"""Stripe payment integration — one-off build fee + BACS monthly subscription.

Feature is disabled (silently skipped) unless STRIPE_SECRET_KEY is set.

Two payment flows:
  1. One-off £695 (card, immediate) → Checkout in payment mode
  2. Monthly £59 (BACS direct debit or card) → Checkout in subscription mode

The monthly Stripe Price object is created automatically on first use and its
ID is cached in the settings table to avoid duplication across restarts.

Webhook: POST /api/payments/webhook verifies the Stripe-Signature header and
updates lead status on payment/subscription events.
"""
import logging

import stripe

from . import config, leads_db

log = logging.getLogger("designo.payments")


def enabled() -> bool:
    return bool(config.STRIPE_SECRET_KEY)


def _init():
    stripe.api_key = config.STRIPE_SECRET_KEY


# ---------------------------------------------------------------------------
# Checkout session creation
# ---------------------------------------------------------------------------

def create_one_off_session(lead_id: str, slug: str, base_url: str) -> str:
    """Return a Stripe Checkout URL for the one-off build fee.

    Payment method: card (immediate settlement).
    On success the browser is redirected to /p/{slug}/thank-you?payment=success.
    """
    _init()
    lead = leads_db.get_lead(lead_id) or {}
    name = lead.get("business_name", "client")
    fee_formatted = f"£{config.PRICE_BUILD_PENCE // 100}"

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "gbp",
                "product_data": {
                    "name": f"Website build — {name}",
                    "description": (
                        "Bespoke cinematic motion website, AI creative direction, "
                        "shadow site for AI agents, schema.org setup, SSL & domain connection"
                    ),
                },
                "unit_amount": config.PRICE_BUILD_PENCE,
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{base_url}/p/{slug}/thank-you?payment=success",
        cancel_url=f"{base_url}/p/{slug}/proposal/",
        customer_email=lead.get("email") or None,
        metadata={"lead_id": lead_id, "slug": slug, "type": "one_off"},
        payment_intent_data={"metadata": {"lead_id": lead_id, "slug": slug}},
        custom_text={
            "submit": {"message": "Your website goes live within 24 hours of payment clearing."},
        },
    )
    leads_db.add_event(lead_id, "checkout_initiated", {"type": "one_off", "amount": fee_formatted})
    log.info("lead %s: one-off checkout session created → %s", lead_id, session.url)
    return session.url


def create_subscription_session(lead_id: str, slug: str, base_url: str) -> str:
    """Return a Stripe Checkout URL for the £59/month subscription.

    Payment methods: BACS direct debit (preferred, lower fees) + card fallback.
    BACS has a 3-business-day settlement delay on the first payment — Stripe
    shows the prospect a clear mandate confirmation screen.
    """
    _init()
    lead = leads_db.get_lead(lead_id) or {}
    price = _get_or_create_monthly_price()

    session = stripe.checkout.Session.create(
        payment_method_types=["bacs_debit", "card"],
        line_items=[{"price": price.id, "quantity": 1}],
        mode="subscription",
        success_url=f"{base_url}/p/{slug}/thank-you?setup=success",
        cancel_url=f"{base_url}/p/{slug}/proposal/",
        customer_email=lead.get("email") or None,
        metadata={"lead_id": lead_id, "slug": slug, "type": "subscription"},
        subscription_data={
            "metadata": {"lead_id": lead_id, "slug": slug},
            "description": f"Hosting, SEO & updates — {lead.get('business_name', slug)}",
        },
        custom_text={
            "submit": {
                "message": (
                    "Your weekly SEO + ASO report arrives every Monday morning. "
                    "BACS direct debits settle within 3 business days."
                ),
            },
        },
    )
    leads_db.add_event(lead_id, "checkout_initiated", {"type": "subscription"})
    log.info("lead %s: subscription checkout session created → %s", lead_id, session.url)
    return session.url


# ---------------------------------------------------------------------------
# Monthly price — created once, cached in settings
# ---------------------------------------------------------------------------

def _get_or_create_monthly_price():
    """Return the Stripe Price for the monthly subscription, creating it if needed."""
    _init()
    price_id = config.STRIPE_MONTHLY_PRICE_ID or leads_db.get_setting("stripe_monthly_price_id", "")
    if price_id:
        try:
            return stripe.Price.retrieve(price_id)
        except stripe.InvalidRequestError:
            log.warning("cached stripe_monthly_price_id %s is invalid — recreating", price_id)

    product = stripe.Product.create(
        name="Designo — Monthly Hosting, Updates & SEO",
        description=(
            "UK server hosting, weekly Google Search Console report every Monday, "
            "one content update per month, schema.org maintenance, 24-hour support"
        ),
        metadata={"created_by": "designo"},
    )
    price = stripe.Price.create(
        product=product.id,
        unit_amount=config.PRICE_MONTHLY_PENCE,
        currency="gbp",
        recurring={"interval": "month"},
        nickname="Designo monthly",
    )
    leads_db.set_setting("stripe_monthly_price_id", price.id)
    log.info("created Stripe monthly price %s (product %s)", price.id, product.id)
    return price


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------

def handle_webhook(payload: bytes, sig_header: str) -> None:
    """Verify and process a Stripe webhook event.

    Raises ValueError if the signature is invalid (caller should return 400).

    Handles:
      checkout.session.completed → mark lead as won
      invoice.payment_failed     → log event
      customer.subscription.deleted → log event
    """
    _init()
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, config.STRIPE_WEBHOOK_SECRET
        )
    except (stripe.SignatureVerificationError, ValueError) as exc:
        raise ValueError(f"invalid Stripe webhook signature: {exc}") from exc

    kind = event["type"]
    obj = event["data"]["object"]
    meta = (obj.get("metadata") or {})
    lead_id = meta.get("lead_id") or ""

    log.info("stripe webhook: %s lead=%s", kind, lead_id or "(no lead_id)")

    if not lead_id:
        return  # payment not linked to a lead — ignore

    if kind == "checkout.session.completed":
        payment_type = meta.get("type", "")
        paid = obj.get("payment_status") == "paid"
        if payment_type == "one_off" and paid:
            leads_db.update_lead(lead_id, status="won",
                                 status_detail="Launch payment received (£695)")
            leads_db.add_event(lead_id, "payment_received",
                               {"amount_pence": obj.get("amount_total"), "type": "one_off"})
            log.info("lead %s: one-off payment received — marked won", lead_id)
            _send_welcome_pack(lead_id)
        elif payment_type == "subscription":
            leads_db.add_event(lead_id, "subscription_created", {"type": "bacs_or_card"})
            # Only promote to won if not already there
            lead = leads_db.get_lead(lead_id) or {}
            if lead.get("status") != "won":
                leads_db.update_lead(lead_id, status="won",
                                     status_detail="Monthly subscription active (£59/month)")
            log.info("lead %s: subscription created — marked won", lead_id)

    elif kind == "invoice.payment_failed":
        err = (obj.get("last_payment_error") or {}).get("message", "")
        leads_db.add_event(lead_id, "invoice_payment_failed", {"reason": err})

    elif kind == "customer.subscription.deleted":
        reason = obj.get("cancellation_details", {}).get("reason") or "cancelled"
        leads_db.add_event(lead_id, "subscription_cancelled", {"reason": reason})
        leads_db.update_lead(lead_id, status_detail=f"Subscription cancelled — {reason}")


def _send_welcome_pack(lead_id: str) -> None:
    """Fire the welcome email after the launch payment. Non-fatal: a webhook
    must never 500 because the welcome email failed — it can be re-sent from
    the lead page."""
    from . import welcome  # local import: avoids a circular import at module load
    try:
        if welcome.already_sent(lead_id):
            return
        welcome.send(lead_id)
    except Exception as exc:
        log.warning("lead %s: welcome pack send failed (send manually from the lead page): %s",
                    lead_id, exc)
        leads_db.add_event(lead_id, "welcome_send_failed", {"reason": str(exc)[:200]})
