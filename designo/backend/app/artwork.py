"""AI artwork generation via fal.ai (Flux Pro).

The creative-director stage commissions atmosphere pieces; we render them
here and drop them into the project's ringfenced photo storage tagged
"artwork" so the builder can use them like any other asset. Failures are
non-fatal — the build proceeds with whatever artwork succeeded.

Requires FAL_KEY. Model defaults to fal-ai/flux-pro/v1.1 (override with
DESIGNO_ARTWORK_MODEL).
"""
import logging
import random
import threading
import time

import httpx

from . import config, db, storage

log = logging.getLogger("designo.artwork")

QUEUE_BASE = "https://queue.fal.run"
POLL_INTERVAL_S = 2
TIMEOUT_S = 6 * 60
RETRYABLE_STATUSES = {403, 429, 500, 502, 503}

# fal rejects bursts of concurrent paid jobs; keep artwork civil with retouch.
_fal_slots = threading.Semaphore(2)

# Map creative-director aspect labels to fal image_size enums / custom sizes.
# Prefer true HD so cinematic sites aren't soft 1024px Pollinations output.
ASPECTS = {
    "wide": {"image_size": "landscape_16_9", "width": 1920, "height": 1080},
    "portrait": {"image_size": "portrait_16_9", "width": 1080, "height": 1920},
    "square": {"image_size": "square_hd", "width": 1024, "height": 1024},
}

QUALITY_SUFFIX = (
    " Photorealistic cinematic still photography, shot on 35mm, rich natural "
    "texture, sharp focus, high dynamic range, no text, no logos, no watermarks, "
    "no gibberish lettering."
)


def enabled() -> bool:
    return bool(config.FAL_KEY)


def _raise_with_detail(response: httpx.Response) -> None:
    if response.is_success:
        return
    try:
        detail = response.json().get("detail", response.text[:300])
    except Exception:
        detail = response.text[:300]
    raise RuntimeError(f"fal.ai returned {response.status_code}: {detail}")


def _find_image_url(result: dict) -> str | None:
    images = result.get("images") or []
    if images and isinstance(images[0], dict) and images[0].get("url"):
        return images[0]["url"]
    for key in ("image", "output"):
        val = result.get(key)
        if isinstance(val, dict) and val.get("url"):
            return val["url"]
        if isinstance(val, str) and val.startswith("http"):
            return val
    return None


def _render(prompt: str, aspect: str) -> tuple[bytes, int, int]:
    """Render one commission via fal queue API. Returns (jpeg_bytes, w, h)."""
    if not config.FAL_KEY:
        raise RuntimeError("FAL_KEY not set — artwork generation disabled")

    meta = ASPECTS.get(aspect, ASPECTS["wide"])
    model = config.ARTWORK_MODEL
    full_prompt = (prompt.strip() + QUALITY_SUFFIX)[:4000]
    payload = {
        "prompt": full_prompt,
        "image_size": meta["image_size"],
        "num_images": 1,
        "output_format": "jpeg",
        "seed": random.randint(1, 10**9),
        "enhance_prompt": True,
    }
    # Custom exact size when the model accepts width/height objects — prefer
    # the enum above; override with explicit dims for wide/portrait HD.
    if aspect == "wide":
        payload["image_size"] = {"width": 1920, "height": 1080}
    elif aspect == "portrait":
        payload["image_size"] = {"width": 1080, "height": 1920}

    headers = {"Authorization": f"Key {config.FAL_KEY}"}
    with _fal_slots, httpx.Client(timeout=120) as client:
        for attempt in range(3):
            submit = client.post(f"{QUEUE_BASE}/{model}", json=payload, headers=headers)
            if submit.status_code in RETRYABLE_STATUSES and attempt < 2:
                log.warning("fal artwork submit got %d, retrying (%d/2)", submit.status_code, attempt + 1)
                time.sleep(5 * (attempt + 1))
                continue
            _raise_with_detail(submit)
            break
        job = submit.json()
        status_url = job.get("status_url") or f"{QUEUE_BASE}/{model}/requests/{job['request_id']}/status"
        response_url = job.get("response_url") or f"{QUEUE_BASE}/{model}/requests/{job['request_id']}"

        deadline = time.time() + TIMEOUT_S
        while True:
            if time.time() > deadline:
                raise TimeoutError("artwork generation timed out")
            status = client.get(status_url, headers=headers).json()
            state = status.get("status")
            if state == "COMPLETED":
                break
            if state in ("FAILED", "CANCELLED", "ERROR"):
                raise RuntimeError(f"fal.ai artwork {state}: {status}")
            time.sleep(POLL_INTERVAL_S)

        result = client.get(response_url, headers=headers).json()
        image_url = _find_image_url(result)
        if not image_url:
            raise RuntimeError(f"no image url in fal.ai response: {result}")
        resp = client.get(image_url)
        resp.raise_for_status()
        return resp.content, meta["width"], meta["height"]


def generate_commissions(project_id: str, commissions: list[dict]) -> list[dict]:
    """Render each commission and register it as an 'artwork' photo. Returns created photo rows."""
    if not enabled():
        log.warning("project %s: skipping artwork — FAL_KEY not set", project_id)
        return []

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
            data, w, h = _render(prompt, aspect)
            filename = storage.save_photo_bytes(project_id, data, f"artwork-{i + 1}.jpg")
            photo = db.add_photo(
                project_id, filename, f"ai-artwork-{i + 1}.jpg", tag,
                caption=role, width=w, height=h, size_bytes=len(data),
            )
            created.append(photo)
            log.info(
                "project %s: artwork %d rendered via fal (%s, %dx%d, %d bytes)",
                project_id, i + 1, aspect, w, h, len(data),
            )
        except Exception:
            log.exception("project %s: artwork %d failed (continuing)", project_id, i + 1)
    return created
