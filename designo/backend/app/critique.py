"""Post-build design critique — the brutal Awwwards juror.

After a site is generated, Playwright loads it from the local preview route,
captures desktop screenshots at several scroll depths plus a mobile view, and
collects hard technical evidence (console errors, horizontal overflow). A
vision call then judges the design like an Awwwards juror and, when it finds
faults, writes the improvement instruction that feeds the next iteration
round. The generator loops build -> critique -> improve until the score
clears DESIGNO_CRITIQUE_TARGET or DESIGNO_CRITIQUE_ROUNDS is spent.
"""
import base64
import io
import logging
import time

from PIL import Image

from . import config

log = logging.getLogger("designo.critique")

DESKTOP = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}
SHOT_WIDTH = 1000  # downscale before vision to keep tokens sane
SETTLE_S = 5.0     # preloader/intro

JUROR_SKILL = """\
You are an Awwwards Site-of-the-Day juror with a reputation for brutality.
You are shown screenshots of a freshly built cinematic scroll site: several
desktop frames captured at increasing scroll depths, then mobile frames.
Technical evidence (console errors, overflow measurements) is included.

Judge it against actual Site-of-the-Day winners. "Pleasant" scores 6. Award
calibre means: distinctive art direction, editorial typography with real
scale contrast, choreographed motion evident even in stills (mid-reveal
states, pinned compositions), disciplined palette, zero layout faults.

Score harshly:
- 9-10: genuinely SOTD-competitive; you would defend it to the jury
- 8: excellent, one refinement away
- 6-7: competent studio work with visible weaknesses
- 4-5: template energy — generic hero, timid type, decorative-only motion
- 1-3: broken or amateur

Look specifically for these defects:
- dead scroll: frames at different depths that look near-identical, or vast
  empty gaps between content
- timid typography: hero type that doesn't command the frame; body text
  walls; weak hierarchy
- unearned effects: grain/particles/vignette present but no compositional
  ideas; motion that decorates instead of narrates
- layout faults: clipped or overlapping text, images stretched or letterboxed
  badly, misaligned grids, content wider than the viewport (see evidence)
- SUPERIMPOSED CONTENT (critical): two unrelated blocks of copy or UI
  occupying the same area of a frame — e.g. one section's text readable
  through another's, or several stacked "cards" all visible at once. This is
  a broken pinned/crossfade transition, not a style choice. Compare frames:
  if content from an earlier frame is still visible underneath a later
  frame's content, fail it as critical.
- mobile neglect: cramped type, broken pinned sections, horizontal scroll
- any console errors = automatic cap of 7

Respond with ONLY a valid JSON object:
{
  "score": <1-10, one decimal>,
  "verdict": "ship" | "improve",
  "strengths": ["2-4 short observations"],
  "defects": [
    {"severity": "critical" | "major" | "minor",
     "issue": "specific, referencing which frame",
     "fix": "the concrete change that repairs it"}
  ],
  "improvement_instruction": "ONE dense paragraph addressed to the builder:
    the exact revisions to make, most damaging first, concrete and
    actionable (name sections, name treatments). Empty string when verdict
    is ship."
}
"""


def _downscale(png: bytes) -> bytes:
    img = Image.open(io.BytesIO(png))
    if img.width > SHOT_WIDTH:
        img = img.resize((SHOT_WIDTH, round(img.height * SHOT_WIDTH / img.width)))
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=72)
    return buf.getvalue()


def capture(project_id: str) -> dict:
    """Screenshot the generated site desktop + mobile and gather evidence.

    Returns {"frames": [(label, jpeg_bytes), ...], "evidence": {...}}.
    """
    from playwright.sync_api import sync_playwright

    url = f"http://127.0.0.1:{config.PORT}/api/preview/{project_id}/"
    frames: list[tuple[str, bytes]] = []
    evidence: dict = {"console_errors": [], "desktop_overflow_px": 0,
                      "mobile_overflow_px": 0}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            # --- Desktop pass ---
            page = browser.new_page(viewport=DESKTOP, device_scale_factor=1)
            page.on("console", lambda m: evidence["console_errors"].append(m.text[:200])
                    if m.type == "error" else None)
            page.goto(url, wait_until="load", timeout=90_000)
            time.sleep(SETTLE_S)

            total = page.evaluate("document.body.scrollHeight")
            vh = DESKTOP["height"]
            depths = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9]
            for i, frac in enumerate(depths):
                target = int(max(0, (total - vh) * frac))
                # wheel (not scrollTo) so Lenis + ScrollTrigger animate naturally
                current = page.evaluate("window.scrollY")
                remaining = target - current
                steps = 6
                for _ in range(steps):
                    page.mouse.wheel(0, remaining / steps)
                    page.wait_for_timeout(180)
                page.wait_for_timeout(1400)
                frames.append((f"desktop scroll {int(frac * 100)}%",
                               _downscale(page.screenshot(type="jpeg", quality=80))))
            evidence["desktop_overflow_px"] = page.evaluate(
                "Math.max(0, document.documentElement.scrollWidth - window.innerWidth)")
            page.close()

            # --- Mobile pass ---
            page = browser.new_page(viewport=MOBILE, device_scale_factor=2,
                                    is_mobile=True, has_touch=True)
            page.goto(url, wait_until="load", timeout=90_000)
            time.sleep(SETTLE_S)
            frames.append(("mobile top",
                           _downscale(page.screenshot(type="jpeg", quality=80))))
            total_m = page.evaluate("document.body.scrollHeight")
            page.evaluate(f"window.scrollTo(0, {int(total_m * 0.45)})")
            page.wait_for_timeout(1800)
            frames.append(("mobile mid",
                           _downscale(page.screenshot(type="jpeg", quality=80))))
            evidence["mobile_overflow_px"] = page.evaluate(
                "Math.max(0, document.documentElement.scrollWidth - window.innerWidth)")
            page.close()
        finally:
            browser.close()

    evidence["console_errors"] = evidence["console_errors"][:8]
    return {"frames": frames, "evidence": evidence}


def review(project_id: str) -> dict | None:
    """Full critique. Returns the juror JSON, or None when not reviewable."""
    import json

    from . import generator  # lazy: avoid import cycle

    try:
        shots = capture(project_id)
    except Exception:
        log.exception("critique: capture failed for project %s", project_id)
        return None

    content: list = []
    for label, jpeg in shots["frames"]:
        content.append({"type": "text", "text": f"--- {label} ---"})
        content.append({"type": "image", "source": {
            "type": "base64", "media_type": "image/jpeg",
            "data": base64.b64encode(jpeg).decode(),
        }})
    content.append({"type": "text", "text": (
        "## TECHNICAL EVIDENCE\n"
        f"{json.dumps(shots['evidence'], indent=2)}\n\n"
        "Judge this site now. Respond with ONLY the JSON object."
    )})

    try:
        report = generator.call_claude_json(
            [{"role": "user", "content": content}],
            system=JUROR_SKILL, max_tokens=2000, model=config.LLM_SMALL_MODEL,
        )
    except Exception:
        log.exception("critique: juror call failed for project %s", project_id)
        return None

    score = report.get("score")
    if not isinstance(score, (int, float)):
        return None
    report["score"] = round(float(score), 1)
    log.info("critique: project %s scored %.1f (%s) — %d defects",
             project_id, report["score"], report.get("verdict"),
             len(report.get("defects") or []))
    return report


def improvement_instruction(report: dict) -> str:
    """Flatten a failing report into the iteration instruction."""
    lines = [report.get("improvement_instruction") or ""]
    defects = report.get("defects") or []
    if defects:
        lines.append("\nSpecific defects to repair (most severe first):")
        order = {"critical": 0, "major": 1, "minor": 2}
        for d in sorted(defects, key=lambda d: order.get(d.get("severity"), 3)):
            lines.append(f"- [{d.get('severity')}] {d.get('issue')} — fix: {d.get('fix')}")
    return "\n".join(line for line in lines if line).strip()
