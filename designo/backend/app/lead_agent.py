"""Lead pipeline orchestrator.

For each lead, a background worker runs:

    researching  Fable writes the questionnaire brief from scraped data
    generating   the normal two-stage Designo build (all-AI artwork)
                 + Playwright preview media (hero screenshot, scrolling GIF)
    drafting     prospect login credentials + Fable-written pitch email
    review       STOP. A human approves/edits the email in the UI.

Approval and sending live in outreach.py. Statuses are recovered to 'error'
on startup by leads_db.init_db().
"""
import json
import logging
import re
import secrets
import threading
import time

from . import db, generator, leads_db, preview_media, skill, storage

log = logging.getLogger("designo.leads")

_active: set[str] = set()
_active_lock = threading.Lock()

BUILD_TIMEOUT_S = 40 * 60

# States from which the pipeline may be (re)started.
RESTARTABLE = ("new", "error", "review")


def _claim(lead_id: str) -> None:
    with _active_lock:
        if lead_id in _active:
            raise RuntimeError("pipeline already running for this lead")
        _active.add(lead_id)


def _release(lead_id: str) -> None:
    with _active_lock:
        _active.discard(lead_id)


def start_pipeline(lead_id: str) -> None:
    lead = leads_db.get_lead(lead_id)
    if not lead:
        raise FileNotFoundError("lead not found")
    if lead["status"] not in RESTARTABLE:
        raise RuntimeError(f"lead is {lead['status']} — pipeline can't be restarted from there")
    _claim(lead_id)
    threading.Thread(target=_run_pipeline, args=(lead_id,), daemon=True).start()


def _run_pipeline(lead_id: str) -> None:
    try:
        lead = leads_db.get_lead(lead_id)

        # 1. Brief — reuse an existing one if this is a retry past that stage.
        project_id = lead.get("project_id")
        project = db.get_project(project_id) if project_id else None
        if project and project.get("brief", {}).get("business_name"):
            brief = project["brief"]
        else:
            leads_db.update_lead(lead_id, status="researching",
                                 status_detail="Fable is studying the business")
            lead = _ensure_site_content(lead)
            brief = _write_brief(lead)
            project = db.create_project(brief.get("business_name") or lead["business_name"], brief)
            project_id = project["id"]
            storage.ensure_project_dirs(project_id)
            leads_db.update_lead(lead_id, project_id=project_id)
            leads_db.add_event(lead_id, "brief_written", {"project_id": project_id})
            log.info("lead %s: brief written, project %s", lead_id, project_id)

        # 2. Mockup build (skip if the linked project already has a site).
        if not storage.read_site_html(project_id):
            leads_db.update_lead(lead_id, status="generating",
                                 status_detail="Building the mockup website")
            _build_site(lead_id, project_id)
        leads_db.add_event(lead_id, "mockup_ready", {"project_id": project_id})

        # 3. Preview media for the email (non-fatal on failure).
        leads_db.update_lead(lead_id, status="generating",
                             status_detail="Capturing email preview media")
        try:
            preview_media.capture(project_id)
        except Exception as exc:
            log.exception("lead %s: preview media capture failed (continuing)", lead_id)
            leads_db.add_event(lead_id, "preview_media_failed", {"error": str(exc)})

        # 4. Credentials + pitch email draft.
        leads_db.update_lead(lead_id, status="drafting",
                             status_detail="Writing the pitch email")
        _ensure_access(lead_id, leads_db.get_lead(lead_id))
        _draft_email(lead_id, brief)

        leads_db.update_lead(lead_id, status="review",
                             status_detail="Waiting for your approval")
        leads_db.add_event(lead_id, "email_drafted")
        log.info("lead %s: ready for review", lead_id)
    except Exception as exc:
        log.exception("lead %s: pipeline failed", lead_id)
        leads_db.update_lead(lead_id, status="error", status_detail=str(exc))
    finally:
        _release(lead_id)


def _ensure_site_content(lead: dict) -> dict:
    """If the lead has an existing website, scrape its real content so the
    brief keeps their true services/story instead of inferring them."""
    website = (lead.get("website") or "").strip()
    raw = lead.get("raw") or {}
    if not website or raw.get("site_content"):
        return lead
    from . import site_scraper

    leads_db.update_lead(lead["id"],
                         status_detail="Reading their current website")
    content = site_scraper.scrape(website)
    if content:
        raw["site_content"] = content
        lead = leads_db.update_lead(lead["id"], raw=raw)
        leads_db.add_event(lead["id"], "site_content_scraped", {
            "pages": len(content["pages"]), "chars": content["total_chars"]})
        log.info("lead %s: scraped %d pages (%d chars) from %s",
                 lead["id"], len(content["pages"]),
                 content["total_chars"], website)
    else:
        log.info("lead %s: existing site %s not scrapeable", lead["id"], website)
    return lead


def _write_brief(lead: dict) -> dict:
    brief = generator.call_claude_json(
        [{"role": "user", "content": skill.build_lead_brief_prompt(lead)}],
        system=skill.LEAD_BRIEF_SKILL,
        max_tokens=4000,
    )
    if not brief.get("business_name"):
        brief["business_name"] = lead["business_name"]
    return brief


def _build_site(lead_id: str, project_id: str) -> None:
    """Run the standard build and wait for it (it manages its own thread)."""
    generator.start_generation(project_id, fresh_concept=True)
    deadline = time.time() + BUILD_TIMEOUT_S
    while time.time() < deadline:
        time.sleep(5)
        project = db.get_project(project_id)
        if project["status"] == "ready":
            return
        if project["status"] == "error":
            raise RuntimeError(f"mockup build failed: {project['error']}")
        if project.get("phase"):
            leads_db.update_lead(lead_id, status_detail=project["phase"])
    raise RuntimeError("mockup build timed out")


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40] or "prospect"
    if not leads_db.slug_taken(slug):
        return slug
    for _ in range(20):
        candidate = f"{slug}-{secrets.token_hex(2)}"
        if not leads_db.slug_taken(candidate):
            return candidate
    return f"{slug}-{secrets.token_hex(4)}"


def _ensure_access(lead_id: str, lead: dict) -> dict:
    access = leads_db.get_prospect_access(lead_id)
    if access:
        return access
    slug = _slugify(lead["business_name"])
    # Friendly, phone-typable password: word-word-##
    words = ("amber", "birch", "cedar", "coral", "delta", "ember", "fable", "harbor",
             "indigo", "juno", "koa", "lumen", "maple", "north", "onyx", "pearl",
             "quill", "raven", "slate", "topaz", "vela", "willow")
    password = f"{secrets.choice(words)}-{secrets.choice(words)}-{secrets.randbelow(90) + 10}"
    access = leads_db.create_prospect_access(lead_id, slug, slug, password)
    leads_db.add_event(lead_id, "access_created", {"slug": slug})
    return access


def _draft_email(lead_id: str, brief: dict) -> dict:
    from . import outreach

    lead = leads_db.get_lead(lead_id)
    parts = generator.call_claude_json(
        [{"role": "user", "content": skill.build_pitch_email_prompt(lead, brief)}],
        system=skill.PITCH_EMAIL_SKILL,
        max_tokens=2000,
    )
    subject = (parts.get("subject") or f"A website for {lead['business_name']}").strip()
    paragraphs = [p.strip() for p in (parts.get("paragraphs") or []) if p and p.strip()]
    if not paragraphs:
        raise RuntimeError("email writer returned no paragraphs")

    body_text = "\n\n".join(paragraphs)
    html = outreach.render_email(lead_id, paragraphs)
    return leads_db.create_email(lead_id, subject, html, body_text)
