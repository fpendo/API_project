"""Optional AI hero-video generation via fal.ai (queue API).

Disabled unless FAL_KEY is set. Two tiers:
  draft -> cheap/fast model (default Hailuo 02 Standard)
  final -> best cinematic quality/price (default Kling standard)

The source photo is sent as a data URI so ringfenced photos never need to be
publicly reachable. Runs in a background thread; the videos table tracks
status (pending -> generating -> ready | error) and the frontend polls.
"""
import base64
import io
import logging
import threading
import time

import httpx
from PIL import Image, ImageOps

from . import config, db, storage

log = logging.getLogger("designo.video")

QUEUE_BASE = "https://queue.fal.run"
POLL_INTERVAL_S = 4
TIMEOUT_S = 15 * 60

# fal image-to-video models reject sources with width/height outside 0.4-2.5.
# Stay comfortably inside so ultra-wide splices and tall crops still work.
MIN_ASPECT = 0.5
MAX_ASPECT = 2.2
MAX_EDGE = 2048


def enabled() -> bool:
    return bool(config.FAL_KEY)


def model_for_tier(tier: str) -> str:
    return config.VIDEO_MODEL_FINAL if tier == "final" else config.VIDEO_MODEL_DRAFT


def _photo_data_uri(project_id: str, filename: str) -> str:
    """Photo as a JPEG data URI, center-cropped into fal's accepted aspect range."""
    path = storage.safe_resolve(storage.photos_dir(project_id), filename)
    img = ImageOps.exif_transpose(Image.open(path))
    w, h = img.size
    aspect = w / h
    if aspect > MAX_ASPECT:
        new_w = int(h * MAX_ASPECT)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
        log.info("video source %s: aspect %.2f too wide, center-cropped to %.2f", filename, aspect, MAX_ASPECT)
    elif aspect < MIN_ASPECT:
        new_h = int(w / MIN_ASPECT)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))
        log.info("video source %s: aspect %.2f too tall, center-cropped to %.2f", filename, aspect, MIN_ASPECT)
    img.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
    if img.mode != "RGB":
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=90, optimize=True)
    return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"


def _run(video_id: str, project_id: str, model: str, payload: dict, filename: str) -> None:
    headers = {"Authorization": f"Key {config.FAL_KEY}"}
    try:
        db.update_video(video_id, status="generating")
        with httpx.Client(timeout=120) as client:
            submit = client.post(f"{QUEUE_BASE}/{model}", json=payload, headers=headers)
            if not submit.is_success:
                raise RuntimeError(f"fal.ai returned {submit.status_code}: {_extract_detail(submit.json())}")
            job = submit.json()
            status_url = job.get("status_url") or f"{QUEUE_BASE}/{model}/requests/{job['request_id']}/status"
            response_url = job.get("response_url") or f"{QUEUE_BASE}/{model}/requests/{job['request_id']}"

            deadline = time.time() + TIMEOUT_S
            while True:
                if time.time() > deadline:
                    raise TimeoutError("video generation timed out")
                status = client.get(status_url, headers=headers).json()
                state = status.get("status")
                if state == "COMPLETED":
                    break
                if state in ("FAILED", "CANCELLED", "ERROR"):
                    raise RuntimeError(f"fal.ai job {state}: {status}")
                time.sleep(POLL_INTERVAL_S)

            result = client.get(response_url, headers=headers).json()
            video_url = _find_video_url(result)
            if not video_url:
                raise RuntimeError(f"fal.ai error: {_extract_detail(result)}")

            dest = storage.videos_dir(project_id) / filename
            with client.stream("GET", video_url) as resp:
                resp.raise_for_status()
                with open(dest, "wb") as fh:
                    for chunk in resp.iter_bytes():
                        fh.write(chunk)

        db.update_video(video_id, status="ready", error=None)
        log.info("video %s ready (%s)", video_id, filename)
    except Exception as exc:
        log.exception("video %s failed", video_id)
        db.update_video(video_id, status="error", error=str(exc))


def _extract_detail(result: dict) -> str:
    """Pull the human-readable message out of a fal error payload."""
    detail = result.get("detail")
    if isinstance(detail, list):
        msgs = [d.get("msg", str(d)) for d in detail if isinstance(d, dict)]
        if msgs:
            return "; ".join(msgs)
    if isinstance(detail, str):
        return detail
    return f"no video url in response: {str(result)[:300]}"


def _find_video_url(result: dict) -> str | None:
    """fal models differ slightly in response shape; search common spots."""
    video = result.get("video")
    if isinstance(video, dict) and video.get("url"):
        return video["url"]
    if isinstance(video, str):
        return video
    videos = result.get("videos")
    if isinstance(videos, list) and videos and isinstance(videos[0], dict):
        return videos[0].get("url")
    output = result.get("output")
    if isinstance(output, dict):
        return _find_video_url(output)
    return None


def start_hero_video(project_id: str, photo: dict, prompt: str, tier: str,
                     duration_s: int | None = None) -> dict:
    if not enabled():
        raise RuntimeError("FAL_KEY is not configured — AI video is disabled")
    model = model_for_tier(tier)
    filename = f"hero-{int(time.time())}.mp4"
    payload: dict = {
        "prompt": prompt or "Slow cinematic camera push-in, subtle parallax, natural motion, no cuts",
        "image_url": _photo_data_uri(project_id, photo["filename"]),
    }
    if duration_s:
        payload["duration"] = str(duration_s)

    record = db.add_video(project_id, filename, model, payload["prompt"])
    threading.Thread(
        target=_run, args=(record["id"], project_id, model, payload, filename), daemon=True
    ).start()
    return record
