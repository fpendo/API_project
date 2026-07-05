"""AI photo retouching — a photo art director that stages shots like a show home.

Two steps per photo:
  1. Claude (vision) inspects the photo in the context of the client's brief
     and writes a precise edit instruction (remove the towel, clear the baby
     bath, tidy cables, balance the light...), or refines the user's own note.
  2. fal.ai instruction-based image editing applies it while preserving the
     room's architecture (walls, windows, floors, fixed joinery).

The edited image replaces the photo's file; the original is kept on disk and
referenced by original_filename so the edit can be reverted. Runs in a
background thread; photos.edit_status tracks progress.
"""
import base64
import io
import logging
import shutil
import threading
import time
import uuid

import anthropic
import httpx
from PIL import Image, ImageOps

from . import config, db, storage

log = logging.getLogger("designo.retouch")

QUEUE_BASE = "https://queue.fal.run"
POLL_INTERVAL_S = 3
TIMEOUT_S = 10 * 60

# fal rejects bursts of concurrent paid jobs (transient 403s); keep edits civil.
_fal_slots = threading.Semaphore(2)
RETRYABLE_STATUSES = {403, 429, 500, 502, 503}

PHOTO_DIRECTOR_PROMPT = """\
You are the photo art director at a high-end design studio. A client photo is
about to appear on their showcase website. Your job: make it look like a
professionally staged, magazine-ready shot — the way a show home is dressed.

Study the photo and write ONE edit instruction for an AI image-editing model.

Rules for the instruction:
- REMOVE clutter and out-of-place objects (towels, laundry, baby baths, toys,
  bins, cables, chargers, packaging, personal items) — name each item and its
  location so the editor can find it.
- KEEP the architecture and identity of the space exactly: same walls,
  windows, doors, floors, ceiling, fixed joinery, layout and camera angle.
  Furniture that belongs in a staged room stays.
- Optionally straighten/tidy what remains (cushions, throws, books) and ask
  for a subtle professional grade: balanced exposure, natural colour, gentle
  contrast. Nothing artificial, no style transfer, no new furniture unless
  replacing something removed would leave an obvious hole.
- Be concrete and complete in ONE paragraph. Plain text only.
- If the client gave their own note, treat it as the priority and fold it in.

Respond with ONLY the instruction paragraph."""


SPLICE_DIRECTOR_PROMPT = """\
You are the photo art director at a high-end design studio. The client has
supplied SEVERAL photos of the same room or space, shot from different angles
or positions. Your job: direct an AI image-editing model to combine them into
ONE seamless, professional composite — the definitive shot of that space, as
if a magazine photographer had captured it in a single wide frame.

Study all the photos and write ONE edit instruction.

Rules for the instruction:
- Describe how the views relate (what overlaps, what continues where) and
  what the single combined frame should show.
- The result must be ONE coherent, realistic photograph — consistent
  perspective, lighting and colour throughout. No visible seams, no collage
  borders, no split-screen.
- PRESERVE the room's real architecture and identity: same walls, windows,
  doors, floors, ceiling and fixed joinery as in the source photos. Do not
  invent rooms or features that contradict the sources.
- If staging clean-up is requested, also name clutter/out-of-place objects to
  remove (towels, laundry, baby baths, toys, bins, cables, personal items)
  and ask for a subtle professional grade.
- Be concrete and complete in ONE paragraph. Plain text only.
- If the client gave their own note, treat it as the priority and fold it in.

Respond with ONLY the instruction paragraph."""


def enabled() -> bool:
    return bool(config.FAL_KEY)


def _raise_with_detail(response: httpx.Response) -> None:
    """Raise on HTTP error, including fal's response body (the real reason)."""
    if response.is_success:
        return
    try:
        detail = response.json().get("detail", response.text[:300])
    except Exception:
        detail = response.text[:300]
    raise RuntimeError(f"fal.ai returned {response.status_code}: {detail}")


def _jpeg_bytes(path, max_edge: int, quality: int = 88) -> bytes:
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)
    img.thumbnail((max_edge, max_edge), Image.LANCZOS)
    if img.mode != "RGB":
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def _analyze(photo_paths, brief: dict, instruction: str, system: str, extra: str = "") -> str:
    """Claude vision writes the edit instruction for one or several photos."""
    if not isinstance(photo_paths, (list, tuple)):
        photo_paths = [photo_paths]
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    content: list = [
        {"type": "image", "source": {
            "type": "base64", "media_type": "image/jpeg",
            "data": base64.b64encode(_jpeg_bytes(p, 1280, 80)).decode(),
        }}
        for p in photo_paths
    ]
    context = (
        f"Business: {brief.get('business_name', '')} — {brief.get('industry', '')}. "
        f"Website mood: {brief.get('mood') or 'premium'}."
    )
    if extra:
        context += f"\n{extra}"
    if instruction.strip():
        context += f"\nClient's own note (priority): {instruction.strip()}"
    content.append({"type": "text", "text": context})
    response = client.messages.create(
        model=config.LLM_MODEL,
        max_tokens=600,
        system=system,
        messages=[{"role": "user", "content": content}],
    )
    for block in response.content:
        if getattr(block, "type", None) == "text":
            return block.text.strip()
    raise RuntimeError("no text block in vision response")


def _fal_edit(photo_paths, edit_prompt: str) -> bytes:
    """Instruction-based image edit via fal.ai queue API; returns edited image bytes.

    Accepts one or several source photos (several = splice/composite job).
    """
    if not isinstance(photo_paths, (list, tuple)):
        photo_paths = [photo_paths]
    model = config.PHOTO_EDIT_MODEL
    data_uris = [
        f"data:image/jpeg;base64,{base64.b64encode(_jpeg_bytes(p, 2048, 90)).decode()}"
        for p in photo_paths
    ]
    payload: dict = {"prompt": edit_prompt}
    if "nano-banana" in model or "gemini" in model:
        payload["image_urls"] = data_uris
    else:
        payload["image_url"] = data_uris[0]

    headers = {"Authorization": f"Key {config.FAL_KEY}"}
    with _fal_slots, httpx.Client(timeout=120) as client:
        for attempt in range(3):
            submit = client.post(f"{QUEUE_BASE}/{model}", json=payload, headers=headers)
            if submit.status_code in RETRYABLE_STATUSES and attempt < 2:
                log.warning("fal submit got %d, retrying (%d/2)", submit.status_code, attempt + 1)
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
                raise TimeoutError("photo edit timed out")
            status = client.get(status_url, headers=headers).json()
            state = status.get("status")
            if state == "COMPLETED":
                break
            if state in ("FAILED", "CANCELLED", "ERROR"):
                raise RuntimeError(f"fal.ai edit {state}: {status}")
            time.sleep(POLL_INTERVAL_S)

        result = client.get(response_url, headers=headers).json()
        image_url = _find_image_url(result)
        if not image_url:
            raise RuntimeError(f"no image url in fal.ai response: {result}")
        resp = client.get(image_url)
        resp.raise_for_status()
        return resp.content


def _find_image_url(result: dict) -> str | None:
    images = result.get("images")
    if isinstance(images, list) and images:
        first = images[0]
        if isinstance(first, dict):
            return first.get("url")
        if isinstance(first, str):
            return first
    image = result.get("image")
    if isinstance(image, dict):
        return image.get("url")
    output = result.get("output")
    if isinstance(output, dict):
        return _find_image_url(output)
    return None


def _run(photo_id: str, project_id: str, instruction: str) -> None:
    try:
        photo = db.get_photo(photo_id)
        project = db.get_project(project_id)
        path = storage.safe_resolve(storage.photos_dir(project_id), photo["filename"])

        edit_prompt = _analyze(path, project["brief"], instruction, PHOTO_DIRECTOR_PROMPT)
        log.info("photo %s: edit plan: %s", photo_id, edit_prompt[:160])

        edited = _fal_edit(path, edit_prompt)
        img = Image.open(io.BytesIO(edited))
        new_filename = f"{uuid.uuid4().hex}.jpg"
        if img.mode != "RGB":
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, "JPEG", quality=90, optimize=True)
        (storage.photos_dir(project_id) / new_filename).write_bytes(out.getvalue())

        # First edit keeps the upload as the revert point; later edits replace
        # the previous edit file but keep the same original.
        original = photo["original_filename"]
        if original is None:
            original = photo["filename"]
        elif photo["filename"] != original:
            storage.delete_photo_file(project_id, photo["filename"])

        db.update_photo(
            photo_id, filename=new_filename, original_filename=original,
            width=img.width, height=img.height, size_bytes=len(out.getvalue()),
            edit_status="done", edit_error=None,
        )
        log.info("photo %s: retouched -> %s", photo_id, new_filename)
    except Exception as exc:
        log.exception("photo %s: retouch failed", photo_id)
        db.update_photo(photo_id, edit_status="error", edit_error=str(exc))


def start_retouch(project_id: str, photo: dict, instruction: str = "") -> dict:
    if not enabled():
        raise RuntimeError("FAL_KEY is not configured — AI retouch is disabled")
    if photo["edit_status"] == "editing":
        raise RuntimeError("this photo is already being retouched")
    db.update_photo(photo["id"], edit_status="editing", edit_error=None)
    threading.Thread(target=_run, args=(photo["id"], project_id, instruction), daemon=True).start()
    return db.get_photo(photo["id"])


def _run_splice(photo_id: str, project_id: str, source_ids: list[str],
                instruction: str, touch_up: bool) -> None:
    try:
        project = db.get_project(project_id)
        sources = [db.get_photo(sid) for sid in source_ids]
        paths = [storage.safe_resolve(storage.photos_dir(project_id), s["filename"]) for s in sources]

        extra = f"You are looking at {len(paths)} photos of the same space."
        if touch_up:
            extra += " Staging clean-up IS requested: also remove clutter and apply a professional grade."
        edit_prompt = _analyze(paths, project["brief"], instruction, SPLICE_DIRECTOR_PROMPT, extra)
        log.info("splice %s: plan: %s", photo_id, edit_prompt[:160])

        edited = _fal_edit(paths, edit_prompt)
        img = Image.open(io.BytesIO(edited))
        if img.mode != "RGB":
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, "JPEG", quality=90, optimize=True)
        new_filename = f"{uuid.uuid4().hex}.jpg"
        (storage.photos_dir(project_id) / new_filename).write_bytes(out.getvalue())

        placeholder = db.get_photo(photo_id)
        storage.delete_photo_file(project_id, placeholder["filename"])
        db.update_photo(
            photo_id, filename=new_filename,
            caption=f"Spliced from {len(paths)} photos",
            width=img.width, height=img.height, size_bytes=len(out.getvalue()),
            edit_status="done", edit_error=None,
        )
        log.info("splice %s: done -> %s", photo_id, new_filename)
    except Exception as exc:
        log.exception("splice %s: failed", photo_id)
        db.update_photo(photo_id, edit_status="error", edit_error=str(exc),
                        caption="Splice failed")


def start_splice(project_id: str, photos: list[dict], instruction: str = "",
                 touch_up: bool = True) -> dict:
    """Combine several photos of the same space into one composite (new photo)."""
    if not enabled():
        raise RuntimeError("FAL_KEY is not configured — AI splice is disabled")
    if len(photos) < 2:
        raise RuntimeError("select at least 2 photos to splice")
    if len(photos) > 8:
        raise RuntimeError("splice supports at most 8 photos at once")

    # Placeholder row with its OWN copy of the first photo, so the card shows
    # a thumbnail while processing and deleting it never touches a source file.
    first_path = storage.safe_resolve(storage.photos_dir(project_id), photos[0]["filename"])
    placeholder_fn = f"{uuid.uuid4().hex}.jpg"
    shutil.copy2(first_path, storage.photos_dir(project_id) / placeholder_fn)

    tag = next((p["tag"] for p in photos if p["tag"] == "hero"), photos[0]["tag"])
    row = db.add_photo(
        project_id, placeholder_fn, f"spliced-{len(photos)}-photos.jpg", tag,
        caption="Splicing…", width=photos[0]["width"], height=photos[0]["height"],
        size_bytes=first_path.stat().st_size,
    )
    db.update_photo(row["id"], edit_status="editing")
    threading.Thread(
        target=_run_splice,
        args=(row["id"], project_id, [p["id"] for p in photos], instruction, touch_up),
        daemon=True,
    ).start()
    return db.get_photo(row["id"])


def revert(project_id: str, photo: dict) -> dict:
    original = photo["original_filename"]
    if not original:
        raise RuntimeError("no original to revert to")
    original_path = storage.safe_resolve(storage.photos_dir(project_id), original)
    if not original_path.exists():
        raise RuntimeError("original file is missing")
    if photo["filename"] != original:
        storage.delete_photo_file(project_id, photo["filename"])
    img = Image.open(original_path)
    return db.update_photo(
        photo["id"], filename=original, original_filename=None,
        width=img.width, height=img.height, size_bytes=original_path.stat().st_size,
        edit_status=None, edit_error=None,
    )
