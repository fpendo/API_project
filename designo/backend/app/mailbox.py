"""Designo mailbox — a unified inbox/sent view for the outreach address.

Inbound:  polls the user's mailbox over IMAP (works with any provider —
          Gmail app password, Zoho, Fastmail, your own server). New messages
          from known prospects are matched to their lead by sender address
          and appear in the Mailbox page; unknown senders still show up as
          unmatched threads.

Outbound: replies are sent through Resend (same verified domain as the
          pitch emails) with In-Reply-To/References headers so they thread
          correctly in the prospect's mail client. Every send is recorded
          as a 'sent items' row. The original pitch emails are also
          mirrored here by outreach.send_email.

Follow-up pack: one canned, non-personalised package response (same price
          for every site). The only per-lead parts are the proposal URL and
          login credentials — the proposal page then creates Stripe Checkout
          sessions with the lead_id in metadata, which is how a payment is
          tied back to the right website.

IMAP credentials live in the settings table (mailbox_imap_host/port/user/
password) so they can be configured from the UI without touching .env.
"""
import email as email_lib
import email.utils
import html as html_mod
import imaplib
import logging
import re
import threading
import time

import httpx

from . import config, leads_db, outreach

log = logging.getLogger("designo.mailbox")

POLL_INTERVAL_S = 120
RESEND_BASE = "https://api.resend.com"

_poll_thread: threading.Thread | None = None
_poll_state: dict = {"last_poll": None, "last_error": None, "polling": False}


# ---------------------------------------------------------------------------
# Settings / status
# ---------------------------------------------------------------------------

IMAP_SETTING_KEYS = ("mailbox_imap_host", "mailbox_imap_port",
                     "mailbox_imap_user", "mailbox_imap_password")


def imap_configured() -> bool:
    return bool(leads_db.get_setting("mailbox_imap_host")
                and leads_db.get_setting("mailbox_imap_user")
                and leads_db.get_setting("mailbox_imap_password"))


def status() -> dict:
    return {
        "imap_configured": imap_configured(),
        "imap_host": leads_db.get_setting("mailbox_imap_host"),
        "imap_user": leads_db.get_setting("mailbox_imap_user"),
        "send_enabled": outreach.enabled(),
        "last_poll": _poll_state["last_poll"],
        "last_error": _poll_state["last_error"],
        "unread": leads_db.unread_mail_count(),
    }


def test_connection() -> dict:
    """Try logging into the configured IMAP account. Returns {ok, detail}."""
    try:
        conn = _imap_connect()
        conn.select("INBOX", readonly=True)
        n = int(conn.search(None, "ALL")[1][0].split()[-1]) if conn.search(None, "ALL")[1][0] else 0
        conn.logout()
        return {"ok": True, "detail": f"Connected — {n} messages in INBOX"}
    except Exception as exc:
        return {"ok": False, "detail": str(exc)}


# ---------------------------------------------------------------------------
# IMAP polling
# ---------------------------------------------------------------------------

def _imap_connect() -> imaplib.IMAP4_SSL:
    host = leads_db.get_setting("mailbox_imap_host")
    port = int(leads_db.get_setting("mailbox_imap_port") or "993")
    user = leads_db.get_setting("mailbox_imap_user")
    password = leads_db.get_setting("mailbox_imap_password")
    conn = imaplib.IMAP4_SSL(host, port)
    conn.login(user, password)
    return conn


def poll_now() -> dict:
    """Fetch new inbound messages. Returns {fetched: n}."""
    if not imap_configured():
        raise RuntimeError("mailbox is not configured — add IMAP details in Mailbox settings")
    fetched = 0
    conn = _imap_connect()
    try:
        conn.select("INBOX", readonly=True)
        # UID-based incremental fetch: only look at messages after the last seen UID.
        last_uid = int(leads_db.get_setting("mailbox_last_uid") or "0")
        typ, data = conn.uid("search", None, f"UID {last_uid + 1}:*")
        if typ != "OK" or not data or not data[0]:
            return {"fetched": 0}
        uids = [int(u) for u in data[0].split()]
        uids = [u for u in uids if u > last_uid]
        # First-ever poll: don't import the whole historic mailbox, just mark position.
        if last_uid == 0 and len(uids) > 25:
            leads_db.set_setting("mailbox_last_uid", str(max(uids)))
            log.info("mailbox: first poll — skipping %d historic messages", len(uids))
            return {"fetched": 0, "skipped_historic": len(uids)}
        for uid in sorted(uids):
            try:
                typ, msg_data = conn.uid("fetch", str(uid), "(RFC822)")
                if typ != "OK" or not msg_data or msg_data[0] is None:
                    continue
                _store_inbound(email_lib.message_from_bytes(msg_data[0][1]))
                fetched += 1
            except Exception as exc:
                log.warning("mailbox: failed to process UID %s: %s", uid, exc)
            leads_db.set_setting("mailbox_last_uid", str(uid))
    finally:
        try:
            conn.logout()
        except Exception:
            pass
    _poll_state["last_poll"] = time.time()
    _poll_state["last_error"] = None
    return {"fetched": fetched}


def _store_inbound(msg: email_lib.message.Message) -> None:
    from_addr = email.utils.parseaddr(msg.get("From", ""))[1].strip().lower()
    if not from_addr:
        return
    # Skip our own sent mail appearing in INBOX (some providers do this)
    own = email.utils.parseaddr(config.OUTREACH_FROM or "")[1].strip().lower()
    if own and from_addr == own:
        return
    message_id = (msg.get("Message-ID") or "").strip()
    if message_id and leads_db.mail_message_id_exists(message_id):
        return  # already imported

    subject = _decode_header(msg.get("Subject", ""))
    body_text, body_html = _extract_bodies(msg)
    date_hdr = msg.get("Date")
    try:
        created_at = email.utils.parsedate_to_datetime(date_hdr).timestamp() if date_hdr else time.time()
    except Exception:
        created_at = time.time()

    lead = leads_db.find_lead_by_email(from_addr)
    leads_db.add_mail_message(
        direction="in", counterpart=from_addr, subject=subject,
        body_text=body_text, body_html=body_html,
        lead_id=lead["id"] if lead else None,
        message_id=message_id or None,
        in_reply_to=(msg.get("In-Reply-To") or "").strip() or None,
        created_at=created_at,
    )
    if lead:
        leads_db.add_event(lead["id"], "email_reply_received", {"subject": subject[:120]})
        if lead["status"] in ("sent", "opened", "logged_in"):
            leads_db.update_lead(lead["id"], status_detail="replied — check the Mailbox")
    log.info("mailbox: inbound from %s (%s)", from_addr, subject[:60])


def _decode_header(raw: str) -> str:
    try:
        parts = email_lib.header.decode_header(raw)
        return "".join(
            p.decode(enc or "utf-8", "replace") if isinstance(p, bytes) else p
            for p, enc in parts
        )
    except Exception:
        return raw


def _extract_bodies(msg: email_lib.message.Message) -> tuple[str, str]:
    text, html = "", ""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if part.get_content_disposition() == "attachment":
                continue
            payload = part.get_payload(decode=True)
            if payload is None:
                continue
            charset = part.get_content_charset() or "utf-8"
            try:
                decoded = payload.decode(charset, "replace")
            except LookupError:
                decoded = payload.decode("utf-8", "replace")
            if ctype == "text/plain" and not text:
                text = decoded
            elif ctype == "text/html" and not html:
                html = decoded
    else:
        payload = msg.get_payload(decode=True)
        if payload is not None:
            charset = msg.get_content_charset() or "utf-8"
            try:
                decoded = payload.decode(charset, "replace")
            except LookupError:
                decoded = payload.decode("utf-8", "replace")
            if msg.get_content_type() == "text/html":
                html = decoded
            else:
                text = decoded
    if not text and html:
        text = _strip_html(html)
    return text.strip(), html


def _strip_html(html: str) -> str:
    html = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    html = re.sub(r"<br\s*/?>|</p>|</div>", "\n", html, flags=re.I)
    html = re.sub(r"<[^>]+>", "", html)
    return html_mod.unescape(re.sub(r"\n{3,}", "\n\n", html)).strip()


def start_poller() -> None:
    """Start the background IMAP polling thread (no-op if already running)."""
    global _poll_thread
    if _poll_thread and _poll_thread.is_alive():
        return

    def loop():
        while True:
            if imap_configured():
                _poll_state["polling"] = True
                try:
                    poll_now()
                except Exception as exc:
                    _poll_state["last_error"] = str(exc)
                    log.warning("mailbox poll failed: %s", exc)
                _poll_state["polling"] = False
            time.sleep(POLL_INTERVAL_S)

    _poll_thread = threading.Thread(target=loop, daemon=True, name="mailbox-poller")
    _poll_thread.start()


# ---------------------------------------------------------------------------
# Sending replies
# ---------------------------------------------------------------------------

def send_reply(counterpart: str, subject: str, body_text: str,
               lead_id: str | None = None) -> dict:
    """Send a plain reply through Resend, threaded onto the conversation."""
    if not outreach.enabled():
        raise RuntimeError("sending is disabled — set RESEND_API_KEY and DESIGNO_OUTREACH_FROM")
    counterpart = counterpart.strip().lower()
    if leads_db.is_suppressed(counterpart):
        raise RuntimeError("this address unsubscribed — replies are blocked")

    if lead_id is None:
        lead = leads_db.find_lead_by_email(counterpart)
        lead_id = lead["id"] if lead else None

    html = _render_reply_html(body_text)
    payload = {
        "from": config.OUTREACH_FROM,
        "to": [counterpart],
        "subject": subject,
        "html": html,
        "text": body_text,
    }
    if config.OUTREACH_REPLY_TO:
        payload["reply_to"] = [config.OUTREACH_REPLY_TO]
    in_reply_to = leads_db.latest_inbound_message_id(counterpart)
    if in_reply_to:
        payload["headers"] = {"In-Reply-To": in_reply_to, "References": in_reply_to}

    with httpx.Client(timeout=30) as client:
        resp = client.post(
            f"{RESEND_BASE}/emails",
            headers={"Authorization": f"Bearer {config.RESEND_API_KEY}"},
            json=payload,
        )
    if resp.status_code >= 400:
        raise RuntimeError(f"Resend {resp.status_code}: {resp.text[:300]}")

    record = leads_db.add_mail_message(
        direction="out", counterpart=counterpart, subject=subject,
        body_text=body_text, body_html=html, lead_id=lead_id,
        in_reply_to=in_reply_to, read=True,
    )
    if lead_id:
        leads_db.add_event(lead_id, "reply_sent", {"subject": subject[:120]})
    log.info("mailbox: reply sent to %s (%s)", counterpart, subject[:60])
    return record


def _render_reply_html(body_text: str) -> str:
    esc = html_mod.escape
    sender = leads_db.get_setting("sender_name", "Designo Studio")
    paras = "".join(
        f'<p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#2a2a2e;">'
        f'{esc(p).replace(chr(10), "<br/>")}</p>'
        for p in body_text.split("\n\n") if p.strip()
    )
    return f"""<!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:600px;font-family:Georgia,'Times New Roman',serif;padding:8px 4px;">
{paras}
<p style="margin:18px 0 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a887f;">{esc(sender)}</p>
</div></body></html>"""


# ---------------------------------------------------------------------------
# Follow-up package template
# ---------------------------------------------------------------------------

def followup_template(lead_id: str | None) -> dict:
    """Canned package response — same pricing for all sites; only the proposal
    link and login credentials are per-lead. Returns {subject, body_text}."""
    build_fee = (leads_db.get_setting("pricing_build_fee") or "£695").split(" ")[0]
    monthly = (leads_db.get_setting("pricing_monthly_fee") or "£59/month").split("/")[0].strip()
    signoff = leads_db.get_setting("sender_signoff",
                                   leads_db.get_setting("sender_name", "Designo Studio"))

    proposal_line = "your proposal page (link in our first email)"
    creds_line = ""
    business = "your business"
    if lead_id:
        lead = leads_db.get_lead(lead_id)
        access = leads_db.get_prospect_access(lead_id)
        if lead:
            business = lead["business_name"]
        if access:
            proposal_line = f"{config.PUBLIC_URL}/p/{access['slug']}/proposal/"
            creds_line = (f"(Your login, in case you need it again: "
                          f"username {access['username']}, password {access['password']}.)")

    body = f"""Great to hear from you — glad the site caught your eye.

Here's how it works, simply:

1. {build_fee} one-off covers the full build — the design you've already seen, all the AI-commissioned artwork, the machine-readable shadow site for AI assistants, SSL, and your domain name (first year's registration included — you just tell us the name you'd like). Your site is live within 24 hours of payment.

2. {monthly}/month covers UK hosting, a weekly SEO + ASO report every Monday morning (real Google data plus your visibility to AI assistants — no jargon), one content update a month, and support — cancel anytime with 30 days' notice.

Everything — including secure card payment and direct debit setup — is on your proposal page:

{proposal_line}

{creds_line}

Both payments go through Stripe, so your details never touch our systems. The monthly plan is collected by direct debit (BACS), which you can cancel from your bank at any time.

If you'd like any changes to the design before going live, just say — one round of tweaks is included.

Warm regards,
{signoff}"""
    # Collapse the blank line left when creds_line is empty
    body = re.sub(r"\n{3,}", "\n\n", body)
    return {
        "subject": f"Re: your new website — how it works ({build_fee} + {monthly}/month)",
        "body_text": body,
    }
