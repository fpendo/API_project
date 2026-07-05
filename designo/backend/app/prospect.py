"""Public prospect-facing routes: /p/{slug}/...

Each lead's mockup site is hosted behind a bespoke username/password. After
login (signed cookie, 30 days) the generated site is served with an injected
snippet that (a) reports engagement events — page views, scroll depth, time
on page — and (b) overlays a dismissible pricing panel, so the email itself
never has to lead with money.

Also serves the email preview media (hero.png / scroll.gif) without auth —
fetching the GIF from the email doubles as our own open signal.
"""
import hashlib
import hmac
import html as html_mod
import json
import logging
import time

from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, Response

from . import (config, db, leads_db, outreach, payments, preview_media,
               proposal, storage, welcome)

log = logging.getLogger("designo.prospect")

router = APIRouter(prefix="/p")

SESSION_TTL_S = 30 * 24 * 3600


# --- session helpers ---

def _secret() -> bytes:
    return (config.SECRET or leads_db.get_setting("secret")).encode()


def _session_sig(slug: str, ts: str) -> str:
    return hmac.new(_secret(), f"session:{slug}:{ts}".encode(), hashlib.sha256).hexdigest()[:40]


def _make_session(slug: str) -> str:
    ts = str(int(time.time()))
    return f"{ts}.{_session_sig(slug, ts)}"


def _check_session(request: Request, slug: str) -> bool:
    token = request.cookies.get(f"dp_{slug}", "")
    if "." not in token:
        return False
    ts, sig = token.split(".", 1)
    if not hmac.compare_digest(sig, _session_sig(slug, ts)):
        return False
    try:
        return time.time() - int(ts) < SESSION_TTL_S
    except ValueError:
        return False


def _access_or_404(slug: str) -> dict:
    access = leads_db.get_prospect_by_slug(slug)
    if not access:
        raise HTTPException(404, "not found")
    return access


def _lead_project(access: dict) -> tuple[dict, str]:
    lead = leads_db.get_lead(access["lead_id"])
    if not lead or not lead.get("project_id"):
        raise HTTPException(404, "not found")
    return lead, lead["project_id"]


# --- unsubscribe (fixed path; must be declared before /{slug} routes) ---

@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe(email: str = "", sig: str = ""):
    email = email.strip().lower()
    if not email or not hmac.compare_digest(sig, outreach.unsubscribe_sig(email)):
        raise HTTPException(400, "invalid unsubscribe link")
    leads_db.suppress_email(email, "unsubscribed")
    for lead in leads_db.list_leads():
        if lead["email"].strip().lower() == email:
            leads_db.add_event(lead["id"], "unsubscribed")
    return HTMLResponse(_simple_page(
        "You're unsubscribed",
        "Done — we won't email you again. Sorry to have bothered you.",
    ))


# --- email preview media (no auth) ---

@router.get("/{slug}/media/{name}")
def media(slug: str, name: str, request: Request):
    access = _access_or_404(slug)
    lead, project_id = _lead_project(access)
    files = preview_media.get_media(project_id)
    path = {"hero.png": files["hero"], "scroll.gif": files["gif"]}.get(name)
    if not path:
        raise HTTPException(404, "media not found")
    if request.query_params.get("src") == "email":
        _log_deduped(lead["id"], "email_image_loaded", window_s=600)
    media_type = "image/png" if name.endswith(".png") else "image/gif"
    return FileResponse(path, media_type=media_type)


def _log_deduped(lead_id: str, kind: str, window_s: int) -> None:
    recent = leads_db.list_events(lead_id, limit=25)
    now = time.time()
    if any(e["kind"] == kind and now - e["created_at"] < window_s for e in recent):
        return
    leads_db.add_event(lead_id, kind)


# --- login + site ---

@router.get("/{slug}/", response_class=HTMLResponse)
@router.get("/{slug}", response_class=HTMLResponse)
def site_index(slug: str, request: Request):
    access = _access_or_404(slug)
    lead, project_id = _lead_project(access)
    if not _check_session(request, slug):
        return HTMLResponse(_login_page(lead["business_name"]))
    html = storage.read_site_html(project_id)
    if html is None:
        raise HTTPException(404, "site not ready")
    return HTMLResponse(_inject_overlay(html, lead))


@router.post("/{slug}/login")
def login(slug: str, request: Request, username: str = Form(""), password: str = Form("")):
    access = _access_or_404(slug)
    lead, _ = _lead_project(access)
    if username.strip().lower() != access["username"].lower() or password.strip() != access["password"]:
        leads_db.add_event(lead["id"], "login_failed")
        return HTMLResponse(
            _login_page(lead["business_name"], error="That didn't match — check the details in our email."),
            status_code=401,
        )
    leads_db.add_event(lead["id"], "login")
    if lead["status"] in ("sent", "opened"):
        leads_db.update_lead(lead["id"], status="logged_in")
    resp = RedirectResponse(url=f"{config.PUBLIC_URL}/p/{slug}/", status_code=303)
    resp.set_cookie(f"dp_{slug}", _make_session(slug), max_age=SESSION_TTL_S,
                    httponly=True, samesite="lax", secure=config.PUBLIC_URL.startswith("https"))
    return resp


@router.post("/{slug}/event")
async def collect_event(slug: str, request: Request):
    access = _access_or_404(slug)
    if not _check_session(request, slug):
        return Response(status_code=204)
    lead, _ = _lead_project(access)
    try:
        payload = json.loads((await request.body()).decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return Response(status_code=204)
    kind = str(payload.get("kind", ""))[:40]
    if kind in ("page_view", "scroll", "time_on_page", "pricing_viewed",
                "pricing_dismissed", "pricing_cta"):
        data = payload.get("data") or {}
        if not isinstance(data, dict):
            data = {}
        leads_db.add_event(lead["id"], kind, {k: data[k] for k in list(data)[:6]})
    return Response(status_code=204)


# --- follow-up pack: proposal page, Stripe checkout, thank-you ---

@router.get("/{slug}/proposal", response_class=HTMLResponse)
@router.get("/{slug}/proposal/", response_class=HTMLResponse)
def proposal_page(slug: str, request: Request):
    access = _access_or_404(slug)
    if not _check_session(request, slug):
        return HTMLResponse(_login_page(
            (leads_db.get_lead(access["lead_id"]) or {}).get("business_name", ""),
        ))
    lead, _ = _lead_project(access)
    _log_deduped(lead["id"], "proposal_viewed", window_s=3600)

    pay_url = subscribe_url = ""
    if payments.enabled():
        try:
            pay_url = payments.create_one_off_session(lead["id"], slug, config.PUBLIC_URL)
            subscribe_url = payments.create_subscription_session(lead["id"], slug, config.PUBLIC_URL)
        except Exception as exc:
            log.warning("Stripe session creation failed for lead %s: %s", lead["id"], exc)

    build_fee = leads_db.get_setting("pricing_build_fee") or "£695"
    monthly_fee = leads_db.get_setting("pricing_monthly_fee") or "£59/month"
    # Strip trailing /month from the stored setting if present (proposal renders it separately)
    monthly_fee_bare = monthly_fee.split("/")[0].strip()

    html = proposal.render_proposal(
        lead={**lead, "reply_to": config.OUTREACH_REPLY_TO},
        access=access,
        pay_url=pay_url,
        subscribe_url=subscribe_url,
        public_url=config.PUBLIC_URL,
        build_fee=build_fee,
        monthly_fee=monthly_fee_bare,
    )
    return HTMLResponse(html)


@router.post("/{slug}/pay")
def pay_redirect(slug: str, request: Request):
    """Create a Stripe Checkout session for the one-off build fee and redirect."""
    access = _access_or_404(slug)
    if not _check_session(request, slug):
        raise HTTPException(401, "login required")
    lead, _ = _lead_project(access)
    if not payments.enabled():
        raise HTTPException(503, "payment processing is not configured")
    try:
        url = payments.create_one_off_session(lead["id"], slug, config.PUBLIC_URL)
    except Exception as exc:
        log.error("Stripe one-off session error for lead %s: %s", lead["id"], exc)
        raise HTTPException(502, "could not create payment session")
    return RedirectResponse(url, status_code=303)


@router.post("/{slug}/subscribe")
def subscribe_redirect(slug: str, request: Request):
    """Create a Stripe Checkout session for the monthly BACS subscription and redirect."""
    access = _access_or_404(slug)
    if not _check_session(request, slug):
        raise HTTPException(401, "login required")
    lead, _ = _lead_project(access)
    if not payments.enabled():
        raise HTTPException(503, "payment processing is not configured")
    try:
        url = payments.create_subscription_session(lead["id"], slug, config.PUBLIC_URL)
    except Exception as exc:
        log.error("Stripe subscription session error for lead %s: %s", lead["id"], exc)
        raise HTTPException(502, "could not create subscription session")
    return RedirectResponse(url, status_code=303)


@router.get("/{slug}/welcome", response_class=HTMLResponse)
@router.get("/{slug}/welcome/", response_class=HTMLResponse)
def welcome_page(slug: str, request: Request):
    access = _access_or_404(slug)
    if not _check_session(request, slug):
        return HTMLResponse(_login_page(
            (leads_db.get_lead(access["lead_id"]) or {}).get("business_name", ""),
        ))
    lead, _ = _lead_project(access)
    _log_deduped(lead["id"], "welcome_viewed", window_s=3600)
    return HTMLResponse(welcome.render_page(lead, access))


@router.get("/{slug}/thank-you", response_class=HTMLResponse)
def thank_you(slug: str, request: Request, payment: str = "", setup: str = ""):
    access = _access_or_404(slug)
    if not _check_session(request, slug):
        return RedirectResponse(f"{config.PUBLIC_URL}/p/{slug}/", status_code=303)
    lead, _ = _lead_project(access)
    payment_type = "setup" if setup else "payment"
    return HTMLResponse(proposal.render_thank_you(lead, payment_type=payment_type))


@router.get("/{slug}/{asset_path:path}")
def site_asset(slug: str, asset_path: str, request: Request):
    access = _access_or_404(slug)
    _, project_id = _lead_project(access)
    if not _check_session(request, slug):
        raise HTTPException(401, "login required")
    try:
        path = storage.safe_resolve(storage.site_dir(project_id), asset_path)
    except PermissionError:
        raise HTTPException(403, "forbidden")
    if not path.exists() or not path.is_file():
        raise HTTPException(404, "asset not found")
    return FileResponse(path)


# --- HTML fragments ---

def _simple_page(title: str, message: str) -> str:
    esc = html_mod.escape
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title>
<style>body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#141313;color:#efeeea;
font-family:Georgia,serif}}main{{text-align:center;padding:40px;max-width:480px}}
h1{{font-size:26px;font-weight:600;margin:0 0 12px}}p{{color:#b9b6ad;line-height:1.6;margin:0}}</style>
</head><body><main><h1>{esc(title)}</h1><p>{esc(message)}</p></main></body></html>"""


def _login_page(business_name: str, error: str = "") -> str:
    esc = html_mod.escape
    error_html = (
        f'<p style="color:#e08a7a;font-size:14px;margin:0 0 14px;">{esc(error)}</p>' if error else ""
    )
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>{esc(business_name)} — private preview</title>
<style>
  body{{margin:0;min-height:100vh;display:grid;place-items:center;background:
    radial-gradient(1200px 800px at 80% -10%, #26231e 0%, #141313 55%);color:#efeeea;font-family:Georgia,serif}}
  .card{{width:min(420px,90vw);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
    border-radius:18px;padding:38px 36px;backdrop-filter:blur(14px)}}
  .kicker{{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9a988f;margin:0 0 10px}}
  h1{{font-size:24px;font-weight:600;margin:0 0 6px;line-height:1.3}}
  .sub{{color:#b9b6ad;font-size:14px;line-height:1.6;margin:0 0 24px}}
  label{{display:block;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9a988f;margin:0 0 6px}}
  input{{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);
    border-radius:10px;color:#efeeea;font-size:15px;padding:12px 14px;margin:0 0 16px;font-family:inherit}}
  input:focus{{outline:none;border-color:rgba(255,255,255,.35)}}
  button{{width:100%;background:#efeeea;color:#141313;border:0;border-radius:999px;font-family:inherit;
    font-size:15px;padding:13px;cursor:pointer}}
  .foot{{text-align:center;color:#6f6d66;font-size:12px;margin-top:18px}}
</style></head><body>
<main class="card">
  <p class="kicker">A website built for</p>
  <h1>{esc(business_name)}</h1>
  <p class="sub">This is a private preview made just for you. Use the login details from our email.</p>
  {error_html}
  <form method="post" action="login">
    <label for="u">Username</label>
    <input id="u" name="username" autocomplete="username" autocapitalize="none" required>
    <label for="p">Password</label>
    <input id="p" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">View my website</button>
  </form>
  <p class="foot">Designed by Designo Studio</p>
</main></body></html>"""


def _inject_overlay(site_html: str, lead: dict) -> str:
    """Append the analytics beacon + pricing panel before </body>."""
    esc = html_mod.escape
    build_fee = esc(leads_db.get_setting("pricing_build_fee"))
    monthly_fee = esc(leads_db.get_setting("pricing_monthly_fee"))
    reply_to = esc(config.OUTREACH_REPLY_TO or "")
    contact_line = (
        f'<a href="mailto:{reply_to}" style="color:#141313;text-decoration:underline;" '
        f'onclick="window.__dpev(\'pricing_cta\')">Reply by email</a> and it\'s yours.'
        if reply_to else "Just reply to our email and it's yours."
    )
    snippet = f"""
<!-- designo prospect overlay -->
<div id="dp-panel" style="position:fixed;right:18px;bottom:18px;z-index:2147483000;width:min(320px,calc(100vw - 36px));
  background:rgba(250,249,246,.96);color:#141313;border-radius:16px;padding:20px 22px;
  font-family:Georgia,serif;box-shadow:0 18px 50px rgba(0,0,0,.35);backdrop-filter:blur(8px);
  transform:translateY(16px);opacity:0;transition:all .5s ease .8s;">
  <button aria-label="Dismiss" onclick="window.__dpdismiss()" style="position:absolute;top:10px;right:12px;background:none;
    border:0;font-size:16px;color:#8a887f;cursor:pointer;line-height:1;">&times;</button>
  <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a887f;">Like what you see?</p>
  <p style="margin:0 0 10px;font-size:15px;line-height:1.55;">This site is ready to go live for {esc(lead['business_name'])}.</p>
  <p style="margin:0 0 4px;font-size:14px;"><strong>{build_fee}</strong> to launch</p>
  <p style="margin:0 0 14px;font-size:14px;"><strong>{monthly_fee}</strong></p>
  <a href="proposal/" onclick="window.__dpev('pricing_cta')"
     style="display:block;text-align:center;background:#141313;color:#efeeea;text-decoration:none;
     border-radius:999px;font-family:Georgia,serif;font-size:14px;padding:10px 16px;margin-bottom:10px;">
    See full proposal &amp; pricing →
  </a>
  <p style="margin:0;font-size:13px;color:#8a887f;line-height:1.5;">{contact_line}</p>
</div>
<script>
(function() {{
  var send = function(kind, data) {{
    try {{
      navigator.sendBeacon('event', JSON.stringify({{ kind: kind, data: data || {{}} }}));
    }} catch (e) {{}}
  }};
  window.__dpev = send;
  window.__dpdismiss = function() {{
    var p = document.getElementById('dp-panel');
    if (p) p.remove();
    send('pricing_dismissed');
  }};
  send('page_view', {{ ref: document.referrer || '' }});
  var panel = document.getElementById('dp-panel');
  setTimeout(function() {{
    if (panel) {{ panel.style.opacity = '1'; panel.style.transform = 'translateY(0)'; send('pricing_viewed'); }}
  }}, 3500);
  var marks = [25, 50, 75, 100], seen = {{}};
  window.addEventListener('scroll', function() {{
    var h = document.documentElement;
    var depth = Math.round(100 * (h.scrollTop + window.innerHeight) / Math.max(1, h.scrollHeight));
    marks.forEach(function(m) {{
      if (depth >= m && !seen[m]) {{ seen[m] = true; send('scroll', {{ depth: m }}); }}
    }});
  }}, {{ passive: true }});
  var start = Date.now();
  var reportTime = function() {{ send('time_on_page', {{ seconds: Math.round((Date.now() - start) / 1000) }}); }};
  window.addEventListener('pagehide', reportTime);
  setTimeout(reportTime, 60000);
}})();
</script>
"""
    idx = site_html.rfind("</body>")
    if idx == -1:
        return site_html + snippet
    return site_html[:idx] + snippet + site_html[idx:]
