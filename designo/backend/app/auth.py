"""Admin authentication for the Designo portal.

One operator account (Angie). Password lives in the settings table
('admin_password'); DESIGNO_ADMIN_PASSWORD in .env overrides it. On first
start, if neither exists, a random password is generated, stored, and
printed once to the backend log.

Sessions are HMAC-signed cookies (same pattern as prospect sessions),
valid 30 days. An HTTP middleware protects every /api route except:

  * /api/auth/*                    — the login endpoints themselves
  * /api/config                    — harmless feature flags
  * /api/payments/webhook          — Stripe (verified by signature)
  * /api/leads/webhook/resend      — Resend webhook
  * /api/preview/*                 — used by the Playwright capture worker,
                                     which calls localhost without cookies;
                                     project IDs are unguessable UUIDs

Prospect-facing routes live under /p/ and have their own per-site logins.
"""
import hashlib
import hmac
import logging
import secrets
import time

from fastapi import Request
from fastapi.responses import JSONResponse

from . import config, leads_db

log = logging.getLogger("designo.auth")

SESSION_TTL_S = 30 * 24 * 3600
COOKIE_NAME = "designo_admin"

PUBLIC_PREFIXES = (
    "/api/auth/",
    "/api/config",
    "/api/payments/webhook",
    "/api/leads/webhook/resend",
    "/api/preview/",
)


def ensure_password() -> None:
    """Generate and store an admin password if none is configured yet."""
    if config.ADMIN_PASSWORD or leads_db.get_setting("admin_password"):
        return
    password = "-".join(secrets.token_hex(2) for _ in range(3))  # e.g. 3f2a-9c81-04de
    leads_db.set_setting("admin_password", password)
    log.warning("generated Designo admin password: %s  (change it with "
                "DESIGNO_ADMIN_PASSWORD in .env or the admin_password setting)", password)


def _password() -> str:
    return config.ADMIN_PASSWORD or leads_db.get_setting("admin_password")


def check_password(candidate: str) -> bool:
    expected = _password()
    return bool(expected) and hmac.compare_digest(candidate, expected)


def _secret() -> bytes:
    return (config.SECRET or leads_db.get_setting("secret")).encode()


def _sig(ts: str) -> str:
    return hmac.new(_secret(), f"admin:{ts}".encode(), hashlib.sha256).hexdigest()[:40]


def make_session() -> str:
    ts = str(int(time.time()))
    return f"{ts}.{_sig(ts)}"


def check_session(request: Request) -> bool:
    token = request.cookies.get(COOKIE_NAME, "")
    if "." not in token:
        return False
    ts, sig = token.split(".", 1)
    if not hmac.compare_digest(sig, _sig(ts)):
        return False
    try:
        return time.time() - int(ts) < SESSION_TTL_S
    except ValueError:
        return False


async def middleware(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api") and not any(path.startswith(p) for p in PUBLIC_PREFIXES):
        if not check_session(request):
            return JSONResponse({"detail": "login required"}, status_code=401)
    return await call_next(request)
