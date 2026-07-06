"""Outreach email rendering + sending (Resend) + engagement webhook.

The pitch email embeds a picture of the prospect's actual mockup site (hero
screenshot as the Outlook-safe first frame of an animated scroll-through GIF),
their private login credentials, and a "See your website live" button. Words
come from Fable (lead_agent drafts, human edits/approves in the UI); this
module owns the HTML shell so every send is consistent and compliant
(unsubscribe link + suppression list).
"""
import hashlib
import hmac
import html as html_mod
import logging

import httpx

from . import config, leads_db

log = logging.getLogger("designo.outreach")

RESEND_BASE = "https://api.resend.com"


def enabled() -> bool:
    return bool(config.RESEND_API_KEY and config.OUTREACH_FROM)


def _secret() -> bytes:
    return (config.SECRET or leads_db.get_setting("secret")).encode()


def unsubscribe_sig(email: str) -> str:
    return hmac.new(_secret(), f"unsub:{email.strip().lower()}".encode(),
                    hashlib.sha256).hexdigest()[:32]


def unsubscribe_url(email: str) -> str:
    from urllib.parse import quote
    return (f"{config.PUBLIC_URL}/p/unsubscribe"
            f"?email={quote(email.strip().lower())}&sig={unsubscribe_sig(email)}")


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

# Plain-English translations of the technical audit signals, for the
# "what we found" box in dated-website pitch emails.
_FINDING_TRANSLATIONS = [
    ("no mobile viewport", "It doesn't adapt to phones — over half of local "
     "searches happen on a mobile, and visitors have to pinch and zoom"),
    ("no HTTPS", "Browsers mark it \u201cNot secure\u201d in the address bar "
     "— the padlock every modern site has is missing"),
    ("copyright stuck at", None),  # handled specially to keep the year
    ("Flash content", "It uses Flash, which no modern browser can display "
     "any more"),
    ("jQuery 1.x", "It runs on technology from around 2010 that browsers "
     "are steadily dropping support for"),
    ("framesets", "It's built with 1990s-era page framing that search "
     "engines struggle to read"),
    ("<marquee>", "It uses scrolling-text effects from the dial-up era"),
    ("<font> tags", "The styling is done with code retired over a decade ago"),
    ("<center> tags", "The styling is done with code retired over a decade ago"),
    ("table-era markup", "The page layout uses pre-2010 techniques that "
     "break on modern screens"),
    ("built with", "It was made with a website builder that was "
     "discontinued years ago"),
    ("no structured data", "It's invisible to the AI assistants (ChatGPT, "
     "Google's AI) that more and more customers use to find local businesses"),
]


def _friendly_finding(signal: str) -> str:
    low = signal.lower()
    if "copyright stuck at" in low:
        year = signal.rsplit(" ", 1)[-1]
        return (f"The site says \u00a9{year} — to anyone checking whether "
                "you're still trading, it looks abandoned")
    for needle, friendly in _FINDING_TRANSLATIONS:
        if friendly and needle.lower() in low:
            return friendly
    return signal


def render_email(lead_id: str, paragraphs: list[str]) -> str:
    """Full table-based HTML email around Fable's paragraphs."""
    lead = leads_db.get_lead(lead_id)
    access = leads_db.get_prospect_access(lead_id)
    slug = access["slug"] if access else ""
    site_url = f"{config.PUBLIC_URL}/p/{slug}/"
    gif_url = f"{config.PUBLIC_URL}/p/{slug}/media/scroll.gif?src=email"
    sender = leads_db.get_setting("sender_name", "Designo Studio")
    signoff = leads_db.get_setting("sender_signoff", sender)
    esc = html_mod.escape

    paras_html = "".join(
        f'<p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#2a2a2e;">{esc(p)}</p>'
        for p in paragraphs
    )
    audit = (lead.get("raw") or {}).get("site_audit")
    audit_html = ""
    if audit:
        visual = audit.get("visual") or {}
        if not audit.get("reachable", True) or visual.get("verdict") == "dead":
            findings = ["Your website isn't loading at all right now — anyone "
                        "who looks for you online finds a dead end."]
        else:
            # Visual (creative director) observations lead; technical
            # findings translated to plain English fill the rest.
            findings = list(visual.get("reasons") or [])[:3]
            findings += [_friendly_finding(s)
                         for s in list(audit.get("signals") or [])]
            findings = findings[:5]
        if findings:
            items = "".join(
                f'<li style="margin:0 0 7px 0;font-size:14px;line-height:1.55;color:#2a2a2e;">{esc(f)}</li>'
                for f in findings)
            audit_html = f"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:#fbf7ee;border:1px solid #ecdfc3;border-radius:10px;margin:18px 0;">
          <tr><td style="padding:16px 20px;">
            <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#a08a5a;">
              What we found on your current site</p>
            <ul style="margin:0;padding:0 0 0 18px;">{items}</ul>
            <p style="margin:10px 0 0 0;font-size:13px;line-height:1.55;color:#8a887f;">
              None of this is unusual — websites age quickly. The new design below fixes all of it.</p>
          </td></tr>
        </table>"""

    creds_html = ""
    if access:
        creds_html = f"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="background:#f6f5f2;border:1px solid #e8e6e1;border-radius:10px;margin:18px 0;">
          <tr><td style="padding:14px 18px;">
            <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a887f;">Your private login</p>
            <p style="margin:0;font-size:14px;color:#2a2a2e;">
              Username: <strong>{esc(access['username'])}</strong>
              &nbsp;&middot;&nbsp; Password: <strong>{esc(access['password'])}</strong>
            </p>
          </td></tr>
        </table>"""

    first_name = esc(lead["business_name"])
    footer_reason = (
        f"{first_name}'s website appears on public business listings and showed "
        "signs of needing an update" if audit else
        f"{first_name} appears on public business listings without a website")
    return f"""<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#efeeea;">
  <div style="display:none;max-height:0;overflow:hidden;">We designed a website for {first_name} — take a look at it below.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efeeea;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:30px 34px 8px 34px;font-family:Georgia,'Times New Roman',serif;">
          <p style="margin:0 0 20px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8a887f;">{esc(sender)}</p>
          {paras_html}
          {audit_html}
        </td></tr>
        <tr><td style="padding:8px 34px 0 34px;">
          <a href="{site_url}" style="text-decoration:none;">
            <img src="{gif_url}" width="532" alt="A preview of the new {first_name} website"
                 style="width:100%;max-width:532px;border-radius:10px;border:1px solid #e8e6e1;display:block;" />
          </a>
        </td></tr>
        <tr><td style="padding:6px 34px 0 34px;font-family:Georgia,'Times New Roman',serif;">
          {creds_html}
        </td></tr>
        <tr><td align="center" style="padding:6px 34px 26px 34px;">
          <a href="{site_url}"
             style="display:inline-block;background:#1d1c1a;color:#ffffff;font-family:Georgia,serif;font-size:15px;
                    padding:13px 34px;border-radius:999px;text-decoration:none;">
            See your website live
          </a>
        </td></tr>
        <tr><td style="padding:0 34px 28px 34px;font-family:Georgia,'Times New Roman',serif;">
          <p style="margin:0;font-size:15px;line-height:1.65;color:#2a2a2e;">Warm regards,<br/>{esc(signoff)}</p>
        </td></tr>
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding:16px 20px;font-family:Georgia,serif;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#9a988f;">
            You're receiving this one-off note because {footer_reason}.
            No interest? <a href="{unsubscribe_url(lead['email'])}" style="color:#9a988f;">Unsubscribe</a> and we won't write again.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Sending
# ---------------------------------------------------------------------------

def send_email(email_id: str) -> dict:
    if not enabled():
        raise RuntimeError(
            "outreach is disabled — set RESEND_API_KEY and DESIGNO_OUTREACH_FROM in the backend .env"
        )
    record = leads_db.get_email(email_id)
    if not record:
        raise FileNotFoundError("email not found")
    if record["status"] == "sent":
        raise RuntimeError("this email has already been sent")
    lead = leads_db.get_lead(record["lead_id"])
    to_addr = (lead.get("email") or "").strip().lower()
    if not to_addr:
        raise RuntimeError("this lead has no email address — add one on the lead page first")
    if leads_db.is_suppressed(to_addr):
        raise RuntimeError("this address is on the suppression list (unsubscribed/complained)")

    # Re-render from the (possibly human-edited) plain paragraphs so edits land.
    paragraphs = [p.strip() for p in record["body_text"].split("\n\n") if p.strip()]
    html = render_email(lead["id"], paragraphs)

    payload = {
        "from": config.OUTREACH_FROM,
        "to": [to_addr],
        "subject": record["subject"],
        "html": html,
        "text": record["body_text"] + f"\n\nUnsubscribe: {unsubscribe_url(to_addr)}",
        "headers": {
            "List-Unsubscribe": f"<{unsubscribe_url(to_addr)}>",
        },
    }
    if config.OUTREACH_REPLY_TO:
        payload["reply_to"] = [config.OUTREACH_REPLY_TO]

    leads_db.update_email(email_id, status="sending", body_html=html)
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                f"{RESEND_BASE}/emails",
                headers={"Authorization": f"Bearer {config.RESEND_API_KEY}"},
                json=payload,
            )
        if resp.status_code >= 400:
            detail = resp.text[:300]
            raise RuntimeError(f"Resend {resp.status_code}: {detail}")
        resend_id = resp.json().get("id")
    except Exception as exc:
        leads_db.update_email(email_id, status="error", error=str(exc))
        leads_db.update_lead(lead["id"], status="error", status_detail=f"send failed: {exc}")
        raise

    import time as _time
    leads_db.update_email(email_id, status="sent", resend_id=resend_id,
                          error=None, sent_at=_time.time())
    leads_db.update_lead(lead["id"], status="sent", status_detail=None)
    leads_db.add_event(lead["id"], "email_sent", {"to": to_addr, "resend_id": resend_id})
    # Mirror into the Mailbox sent items so the whole conversation lives in one place.
    leads_db.add_mail_message(
        direction="out", counterpart=to_addr, subject=record["subject"],
        body_text=record["body_text"], body_html=html,
        lead_id=lead["id"], read=True,
    )
    log.info("lead %s: email sent to %s (%s)", lead["id"], to_addr, resend_id)
    return leads_db.get_email(email_id)


# ---------------------------------------------------------------------------
# Resend webhook (delivery/open/bounce/complaint events)
# ---------------------------------------------------------------------------

def handle_webhook(event: dict) -> None:
    kind = event.get("type", "")
    data = event.get("data") or {}
    resend_id = data.get("email_id") or data.get("id")
    if not resend_id:
        return
    record = leads_db.find_email_by_resend_id(resend_id)
    if not record:
        return
    lead_id = record["lead_id"]
    lead = leads_db.get_lead(lead_id)

    if kind == "email.delivered":
        leads_db.add_event(lead_id, "email_delivered")
    elif kind == "email.opened":
        leads_db.add_event(lead_id, "email_opened")
        if lead and lead["status"] == "sent":
            leads_db.update_lead(lead_id, status="opened")
    elif kind in ("email.bounced", "email.delivery_delayed"):
        leads_db.add_event(lead_id, "email_bounced", {"type": kind})
        if kind == "email.bounced" and lead:
            leads_db.update_lead(lead_id, status="error", status_detail="email bounced")
    elif kind == "email.complained":
        leads_db.add_event(lead_id, "email_complained")
        to = (lead or {}).get("email") or ""
        if to:
            leads_db.suppress_email(to, "spam complaint")
        if lead:
            leads_db.update_lead(lead_id, status="lost", status_detail="marked as spam")
