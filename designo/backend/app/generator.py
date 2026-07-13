"""Claude-powered site generation pipeline (two-stage).

Stage 1 — creative director: studies the industry, produces an art-direction
concept (palette, typography, motifs, section storyboard) and commissions
AI artwork. Concept is cached per project in concept.json.
Stage 2 — builder: generates the single-file motion website from the brief,
the concept and all assets.

Runs in a background thread; the project row tracks status and a human
readable `phase` that the frontend polls.
"""
import json
import logging
import re
import threading
import time

import anthropic

from . import artwork, config, critique, db, shadow, skill, storage

log = logging.getLogger("designo.generator")

_active: set[str] = set()
_active_lock = threading.Lock()


def _extract_html(text: str) -> str:
    """Claude is told to return raw HTML, but strip fences defensively."""
    text = text.strip()
    fence = re.match(r"^```(?:html)?\s*\n(.*)\n```\s*$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    idx = text.find("<!DOCTYPE")
    if idx == -1:
        idx = text.find("<html")
    if idx > 0:
        text = text[idx:]
    if "<html" not in text[:2000].lower():
        raise ValueError("model did not return an HTML document")
    return text


def _extract_json(text: str) -> dict:
    text = text.strip()
    fence = re.match(r"^```(?:json)?\s*\n(.*)\n```\s*$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("model did not return a JSON object")
    blob = text[start:end + 1]
    try:
        return json.loads(blob)
    except json.JSONDecodeError:
        # Repair the common failures: raw newlines inside strings and
        # trailing commas. If it still fails, the caller retries the model.
        repaired = re.sub(r",\s*([}\]])", r"\1", blob)
        repaired = re.sub(
            r'"((?:[^"\\]|\\.)*)"',
            lambda m: '"' + m.group(1).replace("\n", "\\n").replace("\t", "\\t") + '"',
            repaired,
            flags=re.DOTALL,
        )
        return json.loads(repaired)


def call_claude_json(messages: list[dict], system: str, max_tokens: int | None = None,
                     attempts: int = 3, model: str | None = None) -> dict:
    """Call Claude expecting JSON; retry on malformed output. Failed raw
    responses are dumped to /tmp/designo_bad_json_*.txt for diagnosis."""
    last_exc: Exception | None = None
    for attempt in range(attempts):
        raw = _call_claude(messages, system=system, max_tokens=max_tokens, model=model)
        try:
            return _extract_json(raw)
        except (ValueError, json.JSONDecodeError) as exc:
            last_exc = exc
            dump = f"/tmp/designo_bad_json_{int(time.time())}_{attempt}.txt"
            try:
                with open(dump, "w", encoding="utf-8") as fh:
                    fh.write(raw)
            except OSError:
                dump = "(dump failed)"
            log.warning("JSON parse failed (attempt %d/%d): %s — raw saved to %s",
                        attempt + 1, attempts, exc, dump)
    raise ValueError(f"model returned malformed JSON after {attempts} attempts: {last_exc}")


# Prompt-cache breakpoint. 1h TTL covers a full build+critique loop (~20min);
# cache reads are ~0.1× input price, so improvement rounds stop re-paying for
# the static skill + build prompt.
_CACHE = {"type": "ephemeral", "ttl": "1h"}


def _text_block(text: str, *, cache: bool = False) -> dict:
    block: dict = {"type": "text", "text": text}
    if cache:
        block["cache_control"] = dict(_CACHE)
    return block


def _with_cache_breakpoints(messages: list[dict]) -> list[dict]:
    """Mark every message except the final one for caching.

    Multi-turn improve calls look like [build_prompt, prior_html, instruction].
    Caching the prefix means round 2+ only pay full price for the new HTML +
    the new instruction — the skill and brief/manifest reuse at ~10% cost.
    Anthropic allows ≤4 explicit breakpoints; we use system + up to 3 here.
    """
    out: list[dict] = []
    n = len(messages)
    for i, msg in enumerate(messages):
        content = msg["content"]
        if isinstance(content, str):
            blocks = [{"type": "text", "text": content}]
        else:
            # Vision / mixed content — copy so we don't mutate the caller's list.
            blocks = [dict(b) if isinstance(b, dict) else b for b in content]
        if n > 1 and i < n - 1 and blocks and isinstance(blocks[-1], dict):
            blocks[-1] = {**blocks[-1], "cache_control": dict(_CACHE)}
        out.append({"role": msg["role"], "content": blocks})
    return out


def _log_cache_usage(usage, model: str) -> None:
    if usage is None:
        return
    created = getattr(usage, "cache_creation_input_tokens", 0) or 0
    read = getattr(usage, "cache_read_input_tokens", 0) or 0
    inp = getattr(usage, "input_tokens", 0) or 0
    out = getattr(usage, "output_tokens", 0) or 0
    if created or read:
        log.info("claude cache [%s]: read=%d write=%d input=%d output=%d",
                 model, read, created, inp, out)
    else:
        log.info("claude usage [%s]: input=%d output=%d (no cache hit)",
                 model, inp, out)


def _call_claude(messages: list[dict], system: str, max_tokens: int | None = None,
                 model: str | None = None) -> str:
    if not config.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    use_model = model or config.LLM_MODEL
    cache_on = config.PROMPT_CACHE

    if cache_on and system:
        system_arg: str | list = [_text_block(system, cache=True)]
        msgs = _with_cache_breakpoints(messages)
    else:
        system_arg = system
        msgs = messages

    chunks: list[str] = []
    with client.messages.stream(
        model=use_model,
        max_tokens=max_tokens or config.LLM_MAX_TOKENS,
        system=system_arg,
        messages=msgs,
    ) as stream:
        for text in stream.text_stream:
            chunks.append(text)
        try:
            final = stream.get_final_message()
            _log_cache_usage(getattr(final, "usage", None), use_model)
        except Exception:
            log.debug("could not read final message usage", exc_info=True)
    return "".join(chunks)


def _concept_path(project_id: str):
    return storage.project_dir(project_id) / "concept.json"


def load_concept(project_id: str) -> dict | None:
    path = _concept_path(project_id)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _set_phase(project_id: str, phase: str) -> None:
    db.update_project(project_id, phase=phase)


def _develop_concept(project_id: str) -> dict:
    """Stage 1: creative direction + artwork. Cached in concept.json."""
    project = db.get_project(project_id)
    photos = db.list_photos(project_id)

    _set_phase(project_id, "Studying the industry & developing the creative concept")
    prompt = skill.build_concept_prompt(project["brief"], photos)
    # 16k: rich briefs (esp. photo-less ones that commission 6-10 artworks with
    # detailed prompts) were truncating at 8k, producing malformed JSON.
    concept = call_claude_json(
        [{"role": "user", "content": prompt}], system=skill.CONCEPT_SKILL, max_tokens=16000,
    )
    _concept_path(project_id).write_text(json.dumps(concept, indent=2), encoding="utf-8")
    log.info("project %s: concept '%s'", project_id,
             str(concept.get("creative_concept", ""))[:80])

    commissions = concept.get("artwork_commissions") or []
    has_artwork = any(p["tag"] == "artwork" for p in photos)
    if commissions and not has_artwork:
        _set_phase(project_id, "Commissioning AI artwork")
        artwork.generate_commissions(project_id, commissions)
    return concept


def _apply_shadow(project_id: str, brief: dict, concept: dict | None,
                  html: str, fresh: bool) -> str:
    """Generate/refresh the machine-readable layer and inject JSON-LD.

    Non-fatal: a shadow failure never blocks the visual site.
    """
    try:
        _set_phase(project_id, "Writing the machine-readable shadow site")
        data = shadow.ensure(project_id, brief, concept, force=fresh)
        return shadow.inject(html, data)
    except Exception:
        log.exception("project %s: shadow site generation failed (continuing)", project_id)
        return html


def _write_shadow_files(project_id: str) -> None:
    data = shadow.load(project_id)
    if not data:
        return
    try:
        shadow.write_files(project_id, data)
    except Exception:
        log.exception("project %s: writing shadow files failed (continuing)", project_id)


def _refine(project_id: str, brief: dict, concept: dict | None,
            photos: list[dict], videos: list[dict], html: str) -> str:
    """Critique loop: screenshot -> brutal juror review -> improvement round.

    Runs after the site is written; every intermediate version is also
    written so a crash mid-loop still leaves a working site. Non-fatal: any
    critique failure ships the current version.
    """
    build_prompt = skill.build_generation_prompt(brief, photos, videos, concept)
    for round_no in range(1, config.CRITIQUE_ROUNDS + 1):
        _set_phase(project_id, f"Design critique — round {round_no}")
        report = critique.review(project_id)
        if report is None:
            log.warning("project %s: critique round %d not reviewable — shipping",
                        project_id, round_no)
            break
        score = report["score"]
        if score >= config.CRITIQUE_TARGET or report.get("verdict") == "ship":
            log.info("project %s: critique passed at %.1f (round %d)",
                     project_id, score, round_no)
            break

        instruction = critique.improvement_instruction(report)
        if not instruction:
            break
        _set_phase(project_id,
                   f"Improving the design — round {round_no} (scored {score})")
        log.info("project %s: critique %.1f — improving (round %d)",
                 project_id, score, round_no)
        try:
            messages = [
                {"role": "user", "content": build_prompt},
                {"role": "assistant", "content": html},
                {"role": "user", "content": skill.build_iteration_prompt(instruction)},
            ]
            html = _extract_html(_call_claude(messages, system=skill.MOTION_WEBSITE_SKILL))
            storage.write_site(project_id, html)
        except Exception:
            log.exception("project %s: improvement round %d failed — shipping "
                          "previous version", project_id, round_no)
            break
    return html


def _run_build(project_id: str, fresh_concept: bool) -> None:
    import time

    try:
        concept = None if fresh_concept else load_concept(project_id)
        if concept is None:
            concept = _develop_concept(project_id)

        project = db.get_project(project_id)
        photos = db.list_photos(project_id)
        videos = db.list_videos(project_id)

        _set_phase(project_id, "Building the motion website")
        prompt = skill.build_generation_prompt(project["brief"], photos, videos, concept)
        html = _extract_html(_call_claude(
            [{"role": "user", "content": prompt}], system=skill.MOTION_WEBSITE_SKILL,
        ))
        storage.write_site(project_id, html)

        if config.CRITIQUE_ROUNDS > 0:
            html = _refine(project_id, project["brief"], concept, photos, videos, html)

        html = _apply_shadow(project_id, project["brief"], concept, html,
                             fresh=fresh_concept)
        storage.write_site(project_id, html)
        _write_shadow_files(project_id)
        db.update_project(project_id, status="ready", error=None, phase=None,
                          site_generated_at=time.time())
        log.info("project %s: site generated (%d bytes)", project_id, len(html))
    except Exception as exc:  # surface any failure to the UI
        log.exception("project %s: generation failed", project_id)
        db.update_project(project_id, status="error", error=str(exc), phase=None)
    finally:
        with _active_lock:
            _active.discard(project_id)


def _run_iteration(project_id: str, instruction: str) -> None:
    import time

    try:
        current_html = storage.read_site_html(project_id)
        concept = load_concept(project_id)
        project = db.get_project(project_id)
        photos = db.list_photos(project_id)
        videos = db.list_videos(project_id)

        _set_phase(project_id, "Applying your feedback")
        build_prompt = skill.build_generation_prompt(project["brief"], photos, videos, concept)
        messages = [
            {"role": "user", "content": build_prompt},
            {"role": "assistant", "content": current_html},
            {"role": "user", "content": skill.build_iteration_prompt(instruction)},
        ]
        html = _extract_html(_call_claude(messages, system=skill.MOTION_WEBSITE_SKILL))
        html = _apply_shadow(project_id, project["brief"], concept, html, fresh=False)
        storage.write_site(project_id, html)
        _write_shadow_files(project_id)
        db.update_project(project_id, status="ready", error=None, phase=None,
                          site_generated_at=time.time())
        log.info("project %s: iteration applied (%d bytes)", project_id, len(html))
    except Exception as exc:
        log.exception("project %s: iteration failed", project_id)
        db.update_project(project_id, status="error", error=str(exc), phase=None)
    finally:
        with _active_lock:
            _active.discard(project_id)


def _claim(project_id: str) -> None:
    with _active_lock:
        if project_id in _active:
            raise RuntimeError("generation already in progress")
        _active.add(project_id)
    db.update_project(project_id, status="generating", error=None)


def start_generation(project_id: str, fresh_concept: bool = True) -> None:
    """Full build. fresh_concept=True re-runs the creative director stage."""
    _claim(project_id)
    threading.Thread(target=_run_build, args=(project_id, fresh_concept), daemon=True).start()


def start_iteration(project_id: str, instruction: str) -> None:
    if not storage.read_site_html(project_id):
        raise FileNotFoundError("no generated site to iterate on")
    _claim(project_id)
    threading.Thread(target=_run_iteration, args=(project_id, instruction), daemon=True).start()
