"""AI artwork generation via Pollinations.ai (free, keyless).

The creative-director stage commissions 2-4 atmosphere pieces; we render them
here and drop them into the project's ringfenced photo storage tagged
"artwork" so the builder can use them like any other asset. Failures are
non-fatal — the build proceeds with whatever artwork succeeded.
"""
import logging
import random
import urllib.parse

import httpx

from . import db, storage

log = logging.getLogger("designo.artwork")

BASE = "https://image.pollinations.ai/prompt/"

ASPECTS = {
    "wide": (1600, 900),
    "portrait": (900, 1400),
    "square": (1200, 1200),
}


def _render(prompt: str, aspect: str) -> bytes:
    width, height = ASPECTS.get(aspect, ASPECTS["wide"])
    params = {
        "width": width,
        "height": height,
        "nologo": "true",
        "model": "flux",
        "seed": random.randint(1, 10**9),
    }
    url = BASE + urllib.parse.quote(prompt[:1500]) + "?" + urllib.parse.urlencode(params)
    with httpx.Client(timeout=180, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        if not resp.headers.get("content-type", "").startswith("image/"):
            raise RuntimeError(f"unexpected content-type: {resp.headers.get('content-type')}")
        return resp.content


def generate_commissions(project_id: str, commissions: list[dict]) -> list[dict]:
    """Render each commission and register it as an 'artwork' photo. Returns created photo rows."""
    created: list[dict] = []
    # Photo-less (speculative pitch) projects: promote the hero-backdrop
    # commission to the 'hero' tag so the builder treats it as the opener.
    no_client_photos = not db.list_photos(project_id)
    hero_assigned = False
    for i, c in enumerate(commissions[:10]):
        prompt = (c.get("prompt") or "").strip()
        if not prompt:
            continue
        aspect = c.get("aspect", "wide")
        role = (c.get("role") or f"artwork {i + 1}").strip()
        tag = "artwork"
        if no_client_photos and not hero_assigned and "hero" in role.lower():
            tag = "hero"
            hero_assigned = True
        try:
            data = _render(prompt, aspect)
            filename = storage.save_photo_bytes(project_id, data, f"artwork-{i + 1}.jpg")
            w, h = ASPECTS.get(aspect, ASPECTS["wide"])
            photo = db.add_photo(
                project_id, filename, f"ai-artwork-{i + 1}.jpg", tag,
                caption=role, width=w, height=h, size_bytes=len(data),
            )
            created.append(photo)
            log.info("project %s: artwork %d rendered (%s, %d bytes)", project_id, i + 1, aspect, len(data))
        except Exception:
            log.exception("project %s: artwork %d failed (continuing)", project_id, i + 1)
    return created
