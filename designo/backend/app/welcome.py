"""Welcome pack — sent automatically when the launch payment clears.

Two forms of the same content:
  * a table-based HTML email (Outlook-safe, consistent with the pitch email)
  * a session-gated web page at /p/{slug}/welcome/ they can revisit any time

Contents: payment confirmation, the domain step (we register it — first year
is included in the launch fee, so no extra cost appears), the go-live
timeline, what arrives every Monday, their monthly update allowance, the
direct-debit nudge if they haven't set it up yet, and how to reach us.

The domain journey: we deliberately do NOT ask for money for the domain.
A .co.uk costs under £10/year; it's absorbed into the £695 (year one) and
the £59/month (renewals). The welcome email just asks them to reply with
their first and second choice of name — we register, connect and go live.
"""
import html as html_mod
import logging
import time

import httpx

from . import config, leads_db, outreach

log = logging.getLogger("designo.welcome")

RESEND_BASE = "https://api.resend.com"


def _pricing() -> tuple[str, str]:
    build = (leads_db.get_setting("pricing_build_fee") or "£695").split(" ")[0]
    monthly = (leads_db.get_setting("pricing_monthly_fee") or "£59/month").split("/")[0].strip()
    return build, monthly


def _steps(lead: dict, subscribed: bool, monthly: str) -> list[dict]:
    """The next-steps timeline, shared by email and web page."""
    reply_to = config.OUTREACH_REPLY_TO or "us"
    steps = [
        {
            "n": "1",
            "title": "Choose your domain name",
            "body": (
                f"Reply to this email with your first and second choice — for example "
                f"{_domain_suggestion(lead)}. Registration for the first year is already "
                f"included in your launch fee, so there's nothing extra to pay. If you "
                f"already own a domain, just tell us where it's registered and we'll "
                f"connect it instead."
            ),
        },
        {
            "n": "2",
            "title": "We register it and take your site live",
            "body": (
                "Within 24 hours of your domain confirmation your website is live on it — "
                "SSL certificate, UK hosting, and the machine-readable shadow site for AI "
                "assistants all switched on from day one."
            ),
        },
        {
            "n": "3",
            "title": "Google gets introduced to you",
            "body": (
                "We connect Google Search Console, submit your site for indexing, and set up "
                "your structured data so Google (and the AI assistants replacing it) know "
                "exactly who you are, where you are, and what you do."
            ),
        },
        {
            "n": "4",
            "title": "Your first SEO + ASO report arrives Monday",
            "body": (
                "Every Monday morning: how many people saw you on Google, what they searched "
                "for, where you rank — plus your agent visibility (ASO): which AI assistants "
                "read your site that week and any customers they sent you. One plain-English "
                "recommendation each week. The first week or two will be quiet — that's normal "
                "for a new site; you'll watch it climb from there."
            ),
        },
    ]
    if not subscribed:
        steps.insert(1, {
            "n": "•",
            "title": f"Set up your {monthly}/month direct debit",
            "body": (
                f"Hosting, the weekly SEO + ASO report and your monthly update allowance run on the "
                f"{monthly}/month plan — it takes two minutes to set up from your proposal "
                f"page and is collected by BACS direct debit (cancel anytime from your bank)."
            ),
        })
    return steps


def _domain_suggestion(lead: dict) -> str:
    name = "".join(c for c in (lead.get("business_name") or "yourbusiness").lower()
                   if c.isalnum())[:24]
    return f"{name}.co.uk or {name}.com"


def _has_subscription(lead_id: str) -> bool:
    return any(e["kind"] == "subscription_created" for e in leads_db.list_events(lead_id, limit=200))


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------

def render_email(lead: dict) -> str:
    esc = html_mod.escape
    build, monthly = _pricing()
    access = leads_db.get_prospect_access(lead["id"])
    slug = access["slug"] if access else ""
    welcome_url = f"{config.PUBLIC_URL}/p/{slug}/welcome/"
    proposal_url = f"{config.PUBLIC_URL}/p/{slug}/proposal/"
    sender = leads_db.get_setting("sender_name", "Designo Studio")
    signoff = leads_db.get_setting("sender_signoff", sender)
    subscribed = _has_subscription(lead["id"])
    name = esc(lead["business_name"])

    steps_html = ""
    for s in _steps(lead, subscribed, monthly):
        steps_html += f"""
        <tr><td style="padding:0 0 18px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="44" valign="top">
                <div style="width:32px;height:32px;border-radius:50%;background:#f0e9d8;border:1px solid #dfd3b8;
                     text-align:center;line-height:32px;font-family:Georgia,serif;font-size:15px;color:#8a6f35;">{esc(s['n'])}</div>
              </td>
              <td valign="top">
                <p style="margin:0 0 4px 0;font-size:15px;font-weight:bold;color:#1d1c1a;font-family:Georgia,serif;">{esc(s['title'])}</p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#55534d;font-family:Georgia,serif;">{esc(s['body'])}</p>
              </td>
            </tr>
          </table>
        </td></tr>"""

    dd_button = ""
    if not subscribed:
        dd_button = f"""
        <tr><td align="center" style="padding:2px 34px 8px 34px;">
          <a href="{proposal_url}" style="display:inline-block;border:1.5px solid #1d1c1a;color:#1d1c1a;font-family:Georgia,serif;
             font-size:14px;padding:11px 28px;border-radius:999px;text-decoration:none;">
            Set up the {esc(monthly)}/month direct debit
          </a>
        </td></tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#efeeea;">
  <div style="display:none;max-height:0;overflow:hidden;">Payment received — here's exactly what happens next for {name}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efeeea;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#1d1c1a;padding:34px 34px 30px 34px;" align="center">
          <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b9a15e;font-family:Georgia,serif;">{esc(sender)}</p>
          <p style="margin:0 0 6px 0;font-size:28px;color:#ffffff;font-family:Georgia,serif;">Welcome aboard.</p>
          <p style="margin:0;font-size:15px;color:#b9b6ad;font-family:Georgia,serif;">Your payment is confirmed — {name} is going online.</p>
        </td></tr>
        <tr><td style="padding:30px 34px 6px 34px;font-family:Georgia,'Times New Roman',serif;">
          <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8a887f;">What happens next</p>
        </td></tr>
        <tr><td style="padding:6px 34px 0 34px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">{steps_html}</table>
        </td></tr>
        <tr><td style="padding:0 34px 6px 34px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f6f5f2;border:1px solid #e8e6e1;border-radius:10px;">
            <tr><td style="padding:16px 18px;font-family:Georgia,serif;">
              <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a887f;">The one thing we need from you</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#2a2a2e;">
                Reply with your <strong>first and second choice of domain name</strong> —
                e.g. {esc(_domain_suggestion(lead))}. Everything else is on us.
              </p>
            </td></tr>
          </table>
        </td></tr>
        {dd_button}
        <tr><td align="center" style="padding:10px 34px 8px 34px;">
          <a href="{welcome_url}"
             style="display:inline-block;background:#1d1c1a;color:#ffffff;font-family:Georgia,serif;font-size:15px;
                    padding:13px 34px;border-radius:999px;text-decoration:none;">
            Open your welcome page
          </a>
        </td></tr>
        <tr><td style="padding:14px 34px 30px 34px;font-family:Georgia,'Times New Roman',serif;">
          <p style="margin:0;font-size:15px;line-height:1.65;color:#2a2a2e;">
            Delighted to have you with us,<br/>{esc(signoff)}
          </p>
        </td></tr>
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:16px 20px;font-family:Georgia,serif;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#9a988f;">
            You're receiving this because you purchased a website from {esc(sender)}.
            Questions? Just reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def render_email_text(lead: dict) -> str:
    build, monthly = _pricing()
    subscribed = _has_subscription(lead["id"])
    lines = [
        f"Welcome aboard — your payment is confirmed and {lead['business_name']} is going online.",
        "",
        "WHAT HAPPENS NEXT",
    ]
    for s in _steps(lead, subscribed, monthly):
        lines += [f"{s['n']}. {s['title']}", f"   {s['body']}", ""]
    lines += [
        "THE ONE THING WE NEED FROM YOU:",
        f"Reply with your first and second choice of domain name — e.g. {_domain_suggestion(lead)}.",
        "",
        "Delighted to have you with us,",
        leads_db.get_setting("sender_signoff", "Designo Studio"),
    ]
    return "\n".join(lines)


def send(lead_id: str) -> None:
    """Send the welcome pack email. Raises on failure; idempotence is the
    caller's concern (payments webhook checks the event log first)."""
    if not outreach.enabled():
        raise RuntimeError("cannot send welcome pack — Resend is not configured")
    lead = leads_db.get_lead(lead_id)
    if not lead:
        raise FileNotFoundError("lead not found")
    to_addr = (lead.get("email") or "").strip().lower()
    if not to_addr:
        raise RuntimeError("lead has no email address")

    subject = f"Welcome aboard — next steps for {lead['business_name']}"
    html = render_email(lead)
    text = render_email_text(lead)
    payload = {
        "from": config.OUTREACH_FROM,
        "to": [to_addr],
        "subject": subject,
        "html": html,
        "text": text,
    }
    if config.OUTREACH_REPLY_TO:
        payload["reply_to"] = [config.OUTREACH_REPLY_TO]

    with httpx.Client(timeout=30) as client:
        resp = client.post(
            f"{RESEND_BASE}/emails",
            headers={"Authorization": f"Bearer {config.RESEND_API_KEY}"},
            json=payload,
        )
    if resp.status_code >= 400:
        raise RuntimeError(f"Resend {resp.status_code}: {resp.text[:300]}")

    leads_db.add_event(lead_id, "welcome_sent", {"to": to_addr})
    leads_db.add_mail_message(direction="out", counterpart=to_addr, subject=subject,
                              body_text=text, body_html=html, lead_id=lead_id, read=True)
    log.info("lead %s: welcome pack sent to %s", lead_id, to_addr)


def already_sent(lead_id: str) -> bool:
    return any(e["kind"] == "welcome_sent" for e in leads_db.list_events(lead_id, limit=200))


# ---------------------------------------------------------------------------
# Web page (session-gated, served from prospect.py)
# ---------------------------------------------------------------------------

def render_page(lead: dict, access: dict) -> str:
    esc = html_mod.escape
    build, monthly = _pricing()
    subscribed = _has_subscription(lead["id"])
    name = esc(lead["business_name"])
    slug = access.get("slug", "")
    proposal_url = f"{config.PUBLIC_URL}/p/{slug}/proposal/"
    reply_to = config.OUTREACH_REPLY_TO or ""

    steps_html = ""
    for s in _steps(lead, subscribed, monthly):
        steps_html += f"""
    <div class="step">
      <div class="step-num">{esc(s['n'])}</div>
      <div>
        <p class="step-title">{esc(s['title'])}</p>
        <p class="step-body">{esc(s['body'])}</p>
      </div>
    </div>"""

    dd_cta = ""
    if not subscribed:
        dd_cta = (f'<a class="btn-outline" href="{proposal_url}">'
                  f'Set up the {esc(monthly)}/month direct debit &rarr;</a>')

    contact = (f'<a href="mailto:{esc(reply_to)}" style="color:#c4a560;">{esc(reply_to)}</a>'
               if reply_to else "reply to any of our emails")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Welcome — {name} · Designo Studio</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#07060504;color:#ddd9d0;font-family:Georgia,serif;line-height:1.6}}
.hero{{text-align:center;padding:90px 24px 60px;
  background:radial-gradient(ellipse 800px 420px at 50% -60%, rgba(196,165,96,.22) 0%, transparent 70%)}}
.kicker{{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#706c64;margin-bottom:16px}}
.check{{width:64px;height:64px;border-radius:50%;background:rgba(62,207,120,.1);border:2px solid #3ecf78;
  display:flex;align-items:center;justify-content:center;margin:0 auto 26px;font-size:28px;color:#3ecf78}}
h1{{font-size:clamp(30px,5vw,48px);font-weight:normal;letter-spacing:-.5px;margin-bottom:12px}}
.sub{{color:#a09c94;font-size:17px;max-width:520px;margin:0 auto}}
.wrap{{max-width:720px;margin:0 auto;padding:40px 24px 80px}}
.label{{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#706c64;margin:40px 0 22px}}
.step{{display:flex;gap:18px;margin-bottom:26px;align-items:flex-start}}
.step-num{{width:38px;height:38px;border-radius:50%;background:rgba(196,165,96,.12);
  border:1px solid rgba(196,165,96,.35);display:flex;align-items:center;justify-content:center;
  font-size:17px;color:#c4a560;flex-shrink:0}}
.step-title{{font-size:17px;color:#ddd9d0;margin-bottom:6px}}
.step-body{{font-size:14.5px;color:#a09c94}}
.ask{{background:rgba(196,165,96,.1);border:1px solid rgba(196,165,96,.3);border-radius:16px;
  padding:24px 26px;margin:36px 0}}
.ask p:first-child{{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c4a560;margin-bottom:10px}}
.ask p:last-child{{font-size:15px;color:#ddd9d0}}
.ctas{{display:flex;gap:14px;flex-wrap:wrap;margin-top:32px}}
.btn-outline{{display:inline-block;border:1.5px solid #c4a560;color:#c4a560;border-radius:999px;
  padding:12px 26px;font-size:15px;text-decoration:none}}
.foot{{border-top:1px solid rgba(255,255,255,.07);padding:36px 24px;text-align:center;
  font-size:13px;color:#706c64}}
</style>
</head>
<body>
<header class="hero">
  <p class="kicker">Designo Studio</p>
  <div class="check">&#10003;</div>
  <h1>Welcome aboard, {name}.</h1>
  <p class="sub">Your payment is confirmed. Here's your launch plan — and the one small thing we need from you.</p>
</header>
<main class="wrap">
  <p class="label">What happens next</p>
  {steps_html}
  <div class="ask">
    <p>The one thing we need from you</p>
    <p>Email us your <strong>first and second choice of domain name</strong> —
    e.g. {esc(_domain_suggestion(lead))}. First-year registration is already included,
    so there's nothing extra to pay. Already own one? Tell us where it's registered
    and we'll connect it instead.</p>
  </div>
  <div class="ctas">{dd_cta}</div>
  <p class="label">Questions, any time</p>
  <p style="font-size:15px;color:#a09c94;">Write to {contact} — we answer within 24 hours,
  usually much faster. Your weekly SEO + ASO report starts the first Monday after your site is live.</p>
</main>
<footer class="foot">Designo Studio &middot; Part of the Nemx Group</footer>
</body>
</html>"""
