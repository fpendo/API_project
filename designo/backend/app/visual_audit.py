"""Creative-director visual audit of a prospect's existing website.

HTML heuristics (sources._audit_website) measure *technical* age, but the
buying signal is *visual* age: a site can fail every technical check and
still look perfectly presentable (TWR Lighting), or pass a few and look like
2005 (SBR Electrical). Only a design judgement can tell them apart.

This module screenshots the homepage with Playwright (with stealth patches so
Cloudflare-style bot checks mostly pass) and asks Fable (vision) to judge it
like a creative director in 2026. The verdict gates which dated-website leads
are worth pitching:

  - design_score 1-3  -> "rebuild"   : visibly old to any customer — pitch it
  - design_score 4-5  -> "borderline": dated but presentable — judgement call
  - design_score 6-10 -> "modern"    : don't pitch a redesign

Cost: one screenshot (~5-10s) + one small vision call (~$0.01-0.03) per site.
"""
import base64
import logging

from . import config, generator

log = logging.getLogger("designo.visual_audit")

VIEWPORT = {"width": 1440, "height": 900}
SCREENSHOT_WIDTH = 1024  # downscaled before sending to Claude

_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

# Bot-challenge fingerprints (SiteGround sgcaptcha, Cloudflare, generic WAFs).
# These pages resolve themselves after a few seconds of JS execution, so the
# screenshot loop polls until they clear.
_CHALLENGE_URL_MARKERS = ("sgcaptcha", "cdn-cgi/challenge", "_Incapsula_")
_CHALLENGE_BODY_MARKERS = (
    "checking the site connection security", "checking your browser",
    "just a moment", "verify you are human", "requires cookies to be enabled",
)

CREATIVE_DIRECTOR_PROMPT = """\
You are the creative director at Designo, a studio that rebuilds dated
websites for local service businesses. You are shown a screenshot of a
business's current homepage. Judge how DATED THE DESIGN LOOKS TO A CUSTOMER
in 2026 — not the technology, the visual impression.

Score 1-10 (1 = screams 2005, 10 = contemporary):

- 1-3 REBUILD: fixed-width boxed layout floating on the page, browser-default
  or system fonts, underlined link-blue text, ALL-CAPS coloured headings,
  low-res snapshot photos used as banners, web-safe colour tab navigation,
  competing columns with no focal point, no clear call to action. A customer
  wonders if the business still trades.
- 4-5 BORDERLINE: template-built and tidy but visibly dated — bland stock
  hero, cramped spacing, inconsistent type, weak hierarchy. Presentable, not
  persuasive.
- 6-10 MODERN: full-bleed imagery, designed typography, disciplined palette,
  clear hierarchy and call to action. Fine as-is; do not pitch a redesign.

IMPORTANT — two special verdicts:
- "dead": the page shows the SITE ITSELF is gone — "site not found", "this
  site is not published", a domain-parking or for-sale page, a hosting
  provider's placeholder, or a server error page. A dead site is our best
  lead; do not confuse it with a modern design.
- "unknown": you cannot see the real homepage for OTHER reasons — an anti-bot
  or CAPTCHA check, a cookie wall covering everything, or a blank/failed
  render. Do NOT guess a score in that case.

Judge ONLY what you can see. Respond with ONLY a valid JSON object:

{
  "design_score": <1-10, or 0 when verdict is "dead"/"unknown">,
  "era": "the design era it reads as, e.g. '2004-2009'",
  "verdict": "rebuild" | "borderline" | "modern" | "dead" | "unknown",
  "reasons": ["3-5 short, specific visual observations"],
  "pitch_line": "one respectful sentence to the owner about why the design
                 undersells them (empty string if verdict is modern/dead/unknown)"
}
"""


def _is_challenge(page) -> bool:
    try:
        if any(m in page.url for m in _CHALLENGE_URL_MARKERS):
            return True
        body = (page.content()[:4_000] or "").lower()
        return any(m in body for m in _CHALLENGE_BODY_MARKERS)
    except Exception:
        return False


def screenshot(url: str, settle_ms: int = 4_000) -> bytes | None:
    """Full-viewport homepage screenshot as JPEG bytes, or None on failure."""
    from playwright.sync_api import sync_playwright
    from playwright_stealth import Stealth

    if not url.startswith(("http://", "https://")):
        url = "http://" + url
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                args=["--no-sandbox", "--disable-dev-shm-usage",
                      "--disable-blink-features=AutomationControlled"])
            try:
                context = browser.new_context(
                    viewport=VIEWPORT, user_agent=_UA, locale="en-GB",
                    ignore_https_errors=True)
                Stealth().apply_stealth_sync(context)
                page = context.new_page()
                page.goto(url, wait_until="load", timeout=25_000)
                try:
                    page.wait_for_load_state("networkidle", timeout=8_000)
                except Exception:
                    pass  # busy sites never go idle; the settle wait covers it
                # Bot challenges (sgcaptcha, Cloudflare…) clear themselves
                # after a few seconds of JS — poll until they do.
                for _ in range(8):
                    if not _is_challenge(page):
                        break
                    page.wait_for_timeout(5_000)
                # Dismiss cookie-consent modals so they don't cover the design.
                for label in ("Accept all", "Accept All", "Accept"):
                    try:
                        page.click(f'button:has-text("{label}")', timeout=1_200)
                        break
                    except Exception:
                        continue
                page.wait_for_timeout(settle_ms)
                shot = page.screenshot(type="jpeg", quality=70)
            finally:
                browser.close()
    except Exception as exc:
        log.info("visual_audit: screenshot failed for %s: %s", url, exc)
        return None

    # Downscale to keep vision tokens cheap.
    try:
        import io
        from PIL import Image

        img = Image.open(io.BytesIO(shot))
        if img.width > SCREENSHOT_WIDTH:
            img = img.resize(
                (SCREENSHOT_WIDTH,
                 round(img.height * SCREENSHOT_WIDTH / img.width)))
        buf = io.BytesIO()
        img.convert("RGB").save(buf, "JPEG", quality=72)
        return buf.getvalue()
    except Exception:
        return shot


def review(url: str, _retry: bool = True) -> dict | None:
    """Screenshot + creative-director judgement. None if not reviewable."""
    shot = screenshot(url, settle_ms=4_000 if _retry else 12_000)
    if not shot:
        return None
    try:
        parts = generator.call_claude_json(
            [{
                "role": "user",
                "content": [
                    {"type": "image",
                     "source": {"type": "base64", "media_type": "image/jpeg",
                                "data": base64.b64encode(shot).decode()}},
                    {"type": "text",
                     "text": "Review this business homepage now. "
                             "Respond with ONLY the JSON object."},
                ],
            }],
            system=CREATIVE_DIRECTOR_PROMPT,
            max_tokens=1000,
            model=config.LLM_SMALL_MODEL,
        )
    except Exception as exc:
        log.warning("visual_audit: review failed for %s: %s", url, exc)
        return None

    score = parts.get("design_score")
    if not isinstance(score, (int, float)):
        return None
    verdict = parts.get("verdict")
    if verdict == "dead":
        return {
            "design_score": 0, "era": "", "verdict": "dead",
            "reasons": [str(r)[:200] for r in (parts.get("reasons") or [])][:5],
            "pitch_line": "",
        }
    if not verdict:
        verdict = ("rebuild" if score <= 3
                   else "borderline" if score <= 5 else "modern")
    if verdict == "unknown" or score == 0:
        if _retry:
            # Bot checks often clear given more time — one retry with a
            # much longer settle before the screenshot.
            log.info("visual_audit: %s hit an interstitial — retrying "
                     "with longer settle", url)
            return review(url, _retry=False)
        log.info("visual_audit: %s not judgeable (interstitial/bot check)", url)
        return None
    return {
        "design_score": round(float(score), 1),
        "era": str(parts.get("era") or "")[:40],
        "verdict": verdict,
        "reasons": [str(r)[:200] for r in (parts.get("reasons") or [])][:5],
        "pitch_line": str(parts.get("pitch_line") or "")[:300],
    }
