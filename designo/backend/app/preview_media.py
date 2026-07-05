"""Preview media for outreach emails.

Headless Chromium (Playwright) loads the generated site from the local
preview route, then captures:

    preview/hero.png    the hero viewport, crisp, first thing seen in the email
    preview/scroll.gif  ~7s animated scroll-through (autoplays in Gmail/Apple
                        Mail; Outlook shows the hero first frame)

Saved into the project's ringfenced storage under preview/.
"""
import io
import logging
import time
from pathlib import Path

from PIL import Image

from . import config, storage

log = logging.getLogger("designo.preview")

VIEWPORT = {"width": 1280, "height": 800}
GIF_WIDTH = 560          # email-friendly width; keeps file size down
GIF_FRAMES = 22
GIF_FRAME_MS = 320       # ~7s loop
SETTLE_S = 5.0           # let the preloader/intro finish before capturing


def media_dir(project_id: str) -> Path:
    d = storage.project_dir(project_id) / "preview"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_media(project_id: str) -> dict:
    d = storage.project_dir(project_id) / "preview"
    hero = d / "hero.png"
    gif = d / "scroll.gif"
    return {
        "hero": hero if hero.exists() else None,
        "gif": gif if gif.exists() else None,
    }


def capture(project_id: str) -> dict:
    """Capture hero screenshot + scrolling GIF. Raises on total failure."""
    from playwright.sync_api import sync_playwright

    url = f"http://127.0.0.1:{config.PORT}/api/preview/{project_id}/"
    out = media_dir(project_id)
    hero_path = out / "hero.png"
    gif_path = out / "scroll.gif"

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            page = browser.new_page(viewport=VIEWPORT, device_scale_factor=1)
            page.goto(url, wait_until="networkidle", timeout=90_000)
            time.sleep(SETTLE_S)  # intro/preloader + first hero choreography

            hero_path.write_bytes(page.screenshot(type="png"))

            frames = _capture_scroll_frames(page)
        finally:
            browser.close()

    _write_gif(frames, gif_path)
    log.info("project %s: preview media captured (%dKB png, %dKB gif)",
             project_id, hero_path.stat().st_size // 1024, gif_path.stat().st_size // 1024)
    return get_media(project_id)


def _capture_scroll_frames(page) -> list[Image.Image]:
    total = page.evaluate(
        "Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)"
    )
    max_scroll = max(0, total - VIEWPORT["height"])
    frames: list[Image.Image] = []
    for i in range(GIF_FRAMES):
        y = int(max_scroll * i / (GIF_FRAMES - 1)) if GIF_FRAMES > 1 else 0
        page.evaluate(f"window.scrollTo(0, {y})")
        # Let ScrollTrigger/Lenis animations respond to the new position.
        time.sleep(0.35)
        shot = page.screenshot(type="jpeg", quality=70)
        img = Image.open(io.BytesIO(shot)).convert("RGB")
        ratio = GIF_WIDTH / img.width
        img = img.resize((GIF_WIDTH, int(img.height * ratio)), Image.LANCZOS)
        frames.append(img)
    return frames


def _write_gif(frames: list[Image.Image], path: Path) -> None:
    if not frames:
        raise RuntimeError("no frames captured for GIF")
    # Hold the hero frame a beat longer so Outlook's static first frame and
    # the loop's start both read well.
    durations = [1200] + [GIF_FRAME_MS] * (len(frames) - 2) + [1500] if len(frames) > 2 \
        else [GIF_FRAME_MS] * len(frames)
    quantized = [f.quantize(colors=192, method=Image.MEDIANCUT) for f in frames]
    quantized[0].save(
        path,
        save_all=True,
        append_images=quantized[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )
