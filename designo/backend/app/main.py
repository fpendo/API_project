"""Designo backend — motion website generator API."""
import io
import logging

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from PIL import Image

from . import (auth, config, db, generator, lead_agent, leads_db, mailbox,
               outreach, payments, preview_media, prospect, retouch, sources,
               storage, video, welcome)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("designo")

app = FastAPI(title="Designo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db.init_db()
leads_db.init_db()
auth.ensure_password()
app.include_router(prospect.router)
app.middleware("http")(auth.middleware)
mailbox.start_poller()

PHOTO_TAGS = ["hero", "product", "team", "gallery", "background", "texture", "logo", "artwork"]


# --- Models ---

class ProjectCreate(BaseModel):
    name: str
    brief: dict | None = None


class BriefUpdate(BaseModel):
    brief: dict


class PhotoUpdate(BaseModel):
    tag: str | None = None
    caption: str | None = None


class IterateRequest(BaseModel):
    instruction: str


class RetouchRequest(BaseModel):
    instruction: str = ""


class SpliceRequest(BaseModel):
    photo_ids: list[str]
    instruction: str = ""
    touch_up: bool = True


class HeroVideoRequest(BaseModel):
    photo_id: str
    tier: str = "draft"  # draft | final
    prompt: str = ""
    duration_s: int | None = 6


class DiscoverRequest(BaseModel):
    source: str  # apify | companies_house
    query: str = ""            # apify: "plumbers in Shrewsbury"
    sic_code: str = ""         # companies house
    days_back: int = 30
    max_results: int = 40


class LeadUpdate(BaseModel):
    email: str | None = None
    phone: str | None = None
    status: str | None = None  # manual moves: won / lost / new


class EmailUpdate(BaseModel):
    subject: str | None = None
    body_text: str | None = None


class SettingsUpdate(BaseModel):
    settings: dict[str, str]


class MailboxSettings(BaseModel):
    imap_host: str | None = None
    imap_port: str | None = None
    imap_user: str | None = None
    imap_password: str | None = None


class MailReply(BaseModel):
    counterpart: str
    subject: str
    body_text: str
    lead_id: str | None = None


class LoginRequest(BaseModel):
    password: str


# --- Helpers ---

def _get_project_or_404(project_id: str) -> dict:
    project = db.get_project(project_id)
    if not project:
        raise HTTPException(404, "project not found")
    return project


def _project_payload(project: dict) -> dict:
    return {
        **project,
        "photos": db.list_photos(project["id"]),
        "videos": db.list_videos(project["id"]),
        "has_site": storage.read_site_html(project["id"]) is not None,
        "has_shadow": (storage.site_dir(project["id"]) / "agent.json").exists(),
    }


# --- Meta ---

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "designo"}


# --- Auth ---

@app.post("/api/auth/login")
def login(body: LoginRequest):
    if not auth.check_password(body.password):
        raise HTTPException(401, "wrong password")
    from fastapi.responses import JSONResponse
    resp = JSONResponse({"authenticated": True})
    resp.set_cookie(auth.COOKIE_NAME, auth.make_session(),
                    max_age=auth.SESSION_TTL_S, httponly=True, samesite="lax",
                    secure=config.PUBLIC_URL.startswith("https"), path="/")
    return resp


@app.get("/api/auth/me")
def auth_me(request: Request):
    return {"authenticated": auth.check_session(request)}


@app.post("/api/auth/logout")
def logout():
    from fastapi.responses import JSONResponse
    resp = JSONResponse({"authenticated": False})
    resp.delete_cookie(auth.COOKIE_NAME, path="/")
    return resp


@app.get("/api/config")
def get_config():
    return {
        "video_enabled": video.enabled(),
        "video_models": {"draft": config.VIDEO_MODEL_DRAFT, "final": config.VIDEO_MODEL_FINAL},
        "retouch_enabled": retouch.enabled(),
        "apify_enabled": sources.apify_enabled(),
        "companies_house_enabled": sources.companies_house_enabled(),
        "outreach_enabled": outreach.enabled(),
        "payments_enabled": payments.enabled(),
        "price_build": f"£{config.PRICE_BUILD_PENCE // 100}",
        "price_monthly": f"£{config.PRICE_MONTHLY_PENCE // 100}",
        "public_url": config.PUBLIC_URL,
        "llm_model": config.LLM_MODEL,
        "photo_tags": PHOTO_TAGS,
        "max_photo_bytes": config.MAX_PHOTO_BYTES,
    }


# --- Projects ---

@app.post("/api/projects")
def create_project(body: ProjectCreate):
    project = db.create_project(body.name.strip() or "Untitled site", body.brief)
    storage.ensure_project_dirs(project["id"])
    return _project_payload(project)


@app.get("/api/projects")
def list_projects():
    return [_project_payload(p) for p in db.list_projects()]


@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    return _project_payload(_get_project_or_404(project_id))


@app.put("/api/projects/{project_id}/brief")
def update_brief(project_id: str, body: BriefUpdate):
    _get_project_or_404(project_id)
    name = (body.brief.get("business_name") or "").strip()
    fields: dict = {"brief": body.brief}
    if name:
        fields["name"] = name
    return _project_payload(db.update_project(project_id, **fields))


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str):
    _get_project_or_404(project_id)
    db.delete_project(project_id)
    storage.delete_project_storage(project_id)
    return {"deleted": project_id}


# --- Photos (ringfenced per project) ---

@app.post("/api/projects/{project_id}/photos")
async def upload_photo(
    project_id: str,
    file: UploadFile = File(...),
    tag: str = Form("gallery"),
    caption: str = Form(""),
):
    _get_project_or_404(project_id)
    if tag not in PHOTO_TAGS:
        raise HTTPException(400, f"tag must be one of {PHOTO_TAGS}")
    data = await file.read()
    if len(data) > config.MAX_PHOTO_BYTES:
        raise HTTPException(413, "photo too large")
    try:
        img = Image.open(io.BytesIO(data))
        width, height = img.size
    except Exception:
        raise HTTPException(400, "file is not a valid image")
    storage.ensure_project_dirs(project_id)
    try:
        filename = storage.save_photo_bytes(project_id, data, file.filename or "photo.jpg")
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return db.add_photo(project_id, filename, file.filename or filename, tag, caption,
                        width, height, len(data))


@app.get("/api/projects/{project_id}/photos/{photo_id}/file")
def photo_file(project_id: str, photo_id: str):
    photo = db.get_photo(photo_id)
    if not photo or photo["project_id"] != project_id:
        raise HTTPException(404, "photo not found")
    try:
        path = storage.safe_resolve(storage.photos_dir(project_id), photo["filename"])
    except PermissionError:
        raise HTTPException(403, "forbidden")
    if not path.exists():
        raise HTTPException(404, "photo file missing")
    return FileResponse(path)


@app.patch("/api/projects/{project_id}/photos/{photo_id}")
def update_photo(project_id: str, photo_id: str, body: PhotoUpdate):
    photo = db.get_photo(photo_id)
    if not photo or photo["project_id"] != project_id:
        raise HTTPException(404, "photo not found")
    fields = {}
    if body.tag is not None:
        if body.tag not in PHOTO_TAGS:
            raise HTTPException(400, f"tag must be one of {PHOTO_TAGS}")
        fields["tag"] = body.tag
    if body.caption is not None:
        fields["caption"] = body.caption
    if not fields:
        return photo
    return db.update_photo(photo_id, **fields)


@app.delete("/api/projects/{project_id}/photos/{photo_id}")
def delete_photo(project_id: str, photo_id: str):
    photo = db.get_photo(photo_id)
    if not photo or photo["project_id"] != project_id:
        raise HTTPException(404, "photo not found")
    storage.delete_photo_file(project_id, photo["filename"])
    db.delete_photo(photo_id)
    return {"deleted": photo_id}


# --- AI retouch (photo art director + fal.ai edit) ---

@app.post("/api/projects/{project_id}/photos/{photo_id}/retouch")
def retouch_photo(project_id: str, photo_id: str, body: RetouchRequest):
    _get_project_or_404(project_id)
    photo = db.get_photo(photo_id)
    if not photo or photo["project_id"] != project_id:
        raise HTTPException(404, "photo not found")
    if photo["tag"] == "artwork":
        raise HTTPException(400, "artwork is AI-generated — regenerate instead of retouching")
    try:
        return retouch.start_retouch(project_id, photo, body.instruction)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc))


@app.post("/api/projects/{project_id}/photos/splice")
def splice_photos(project_id: str, body: SpliceRequest):
    _get_project_or_404(project_id)
    photos = []
    for pid in body.photo_ids:
        photo = db.get_photo(pid)
        if not photo or photo["project_id"] != project_id:
            raise HTTPException(404, f"photo {pid} not found")
        if photo["edit_status"] == "editing":
            raise HTTPException(409, "one of the selected photos is still being edited")
        photos.append(photo)
    try:
        return retouch.start_splice(project_id, photos, body.instruction, body.touch_up)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc))


@app.post("/api/projects/{project_id}/photos/{photo_id}/revert")
def revert_photo(project_id: str, photo_id: str):
    _get_project_or_404(project_id)
    photo = db.get_photo(photo_id)
    if not photo or photo["project_id"] != project_id:
        raise HTTPException(404, "photo not found")
    try:
        return retouch.revert(project_id, photo)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc))


# --- Generation ---

@app.post("/api/projects/{project_id}/generate")
def generate_site(project_id: str):
    project = _get_project_or_404(project_id)
    if project["status"] == "generating":
        raise HTTPException(409, "generation already in progress")
    # Zero photos is fine — the creative director commissions AI artwork instead
    # (same path the lead-gen mockups use).
    try:
        generator.start_generation(project_id)
    except RuntimeError as exc:
        raise HTTPException(409, str(exc))
    return _project_payload(db.get_project(project_id))


@app.post("/api/projects/{project_id}/iterate")
def iterate_site(project_id: str, body: IterateRequest):
    project = _get_project_or_404(project_id)
    if project["status"] == "generating":
        raise HTTPException(409, "generation already in progress")
    if not body.instruction.strip():
        raise HTTPException(400, "instruction is required")
    try:
        generator.start_iteration(project_id, body.instruction.strip())
    except FileNotFoundError as exc:
        raise HTTPException(400, str(exc))
    except RuntimeError as exc:
        raise HTTPException(409, str(exc))
    return _project_payload(db.get_project(project_id))


# --- AI hero video (optional, fal.ai) ---

@app.post("/api/projects/{project_id}/hero-video")
def hero_video(project_id: str, body: HeroVideoRequest):
    _get_project_or_404(project_id)
    if not video.enabled():
        raise HTTPException(400, "AI video is disabled — set FAL_KEY in the backend .env")
    photo = db.get_photo(body.photo_id)
    if not photo or photo["project_id"] != project_id:
        raise HTTPException(404, "photo not found")
    if body.tier not in ("draft", "final"):
        raise HTTPException(400, "tier must be 'draft' or 'final'")
    try:
        return video.start_hero_video(project_id, photo, body.prompt, body.tier, body.duration_s)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc))


@app.post("/api/projects/{project_id}/videos/{video_id}/add-to-site")
def add_video_to_site(project_id: str, video_id: str):
    """Rebuild/iterate the site so this specific clip becomes the hero video."""
    project = _get_project_or_404(project_id)
    if project["status"] == "generating":
        raise HTTPException(409, "generation already in progress")
    record = db.get_video(video_id)
    if not record or record["project_id"] != project_id:
        raise HTTPException(404, "video not found")
    if record["status"] != "ready":
        raise HTTPException(400, "video is not ready yet")

    instruction = (
        f'Feature the AI-generated hero video at the relative path "videos/{record["filename"]}" '
        "as the hero section's full-bleed background video (autoplay muted loop playsinline, "
        "poster = the hero photo, behind a tint/scrim so the headline stays perfectly legible, "
        "with the same scroll choreography the hero already has). "
        "Keep everything else about the site exactly as it is."
    )
    try:
        generator.start_iteration(project_id, instruction)
    except FileNotFoundError:
        # No site yet — run a full build; ready videos are already in the manifest.
        try:
            generator.start_generation(project_id, fresh_concept=False)
        except RuntimeError as exc:
            raise HTTPException(409, str(exc))
    except RuntimeError as exc:
        raise HTTPException(409, str(exc))
    return _project_payload(db.get_project(project_id))


@app.get("/api/projects/{project_id}/videos/{video_id}/file")
def video_file(project_id: str, video_id: str):
    record = db.get_video(video_id)
    if not record or record["project_id"] != project_id:
        raise HTTPException(404, "video not found")
    try:
        path = storage.safe_resolve(storage.videos_dir(project_id), record["filename"])
    except PermissionError:
        raise HTTPException(403, "forbidden")
    if not path.exists():
        raise HTTPException(404, "video file missing")
    return FileResponse(path, media_type="video/mp4")


# --- Lead generation ---

def _lead_payload(lead: dict, full: bool = False) -> dict:
    payload = {
        **lead,
        "access": leads_db.get_prospect_access(lead["id"]),
        "outreach_email": leads_db.latest_email_for_lead(lead["id"]),
        "has_site": bool(lead.get("project_id"))
        and storage.read_site_html(lead["project_id"]) is not None,
    }
    if full:
        payload["events"] = leads_db.list_events(lead["id"])
        project = db.get_project(lead["project_id"]) if lead.get("project_id") else None
        payload["project"] = project
        if lead.get("project_id"):
            media = preview_media.get_media(lead["project_id"])
            payload["preview_media"] = {k: bool(v) for k, v in media.items()}
        else:
            payload["preview_media"] = {"hero": False, "gif": False}
    return payload


def _get_lead_or_404(lead_id: str) -> dict:
    lead = leads_db.get_lead(lead_id)
    if not lead:
        raise HTTPException(404, "lead not found")
    return lead


@app.get("/api/leads")
def list_leads(status: str | None = None):
    return [_lead_payload(lead) for lead in leads_db.list_leads(status)]


@app.post("/api/leads/discover")
def discover_leads(body: DiscoverRequest):
    try:
        if body.source == "apify":
            if not body.query.strip():
                raise HTTPException(400, "query is required (e.g. 'plumbers in Shrewsbury')")
            return sources.start_apify_discovery(body.query.strip(), body.max_results)
        if body.source == "companies_house":
            if not body.sic_code.strip():
                raise HTTPException(400, "sic_code is required (e.g. 43220 for plumbers)")
            return sources.start_companies_house_discovery(
                body.sic_code.strip(), body.days_back, body.max_results)
        raise HTTPException(400, "source must be 'apify' or 'companies_house'")
    except RuntimeError as exc:
        raise HTTPException(400, str(exc))


@app.get("/api/leads/discovery/{job_id}")
def discovery_status(job_id: str):
    job = sources.get_job(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return job


@app.post("/api/leads/import-csv")
async def import_leads_csv(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "CSV too large (max 5MB)")
    try:
        return sources.import_csv(data)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@app.get("/api/leads/settings")
def get_lead_settings():
    return leads_db.all_settings()


@app.put("/api/leads/settings")
def update_lead_settings(body: SettingsUpdate):
    allowed = set(leads_db.DEFAULT_SETTINGS)
    for key, value in body.settings.items():
        if key in allowed:
            leads_db.set_setting(key, str(value))
    return leads_db.all_settings()


@app.post("/api/leads/webhook/resend")
async def resend_webhook(request: Request):
    try:
        event = await request.json()
    except Exception:
        return {"ok": True}
    try:
        outreach.handle_webhook(event)
    except Exception:
        log.exception("resend webhook handling failed")
    return {"ok": True}


@app.post("/api/leads/{lead_id}/send-welcome")
def send_welcome(lead_id: str):
    """Send (or re-send) the welcome pack — normally automatic after payment."""
    lead = _get_lead_or_404(lead_id)
    try:
        welcome.send(lead["id"])
    except (RuntimeError, FileNotFoundError) as exc:
        raise HTTPException(400, str(exc))
    return _lead_payload(leads_db.get_lead(lead_id), full=True)


@app.get("/api/leads/{lead_id}/welcome-preview", response_class=HTMLResponse)
def welcome_preview(lead_id: str):
    lead = _get_lead_or_404(lead_id)
    return HTMLResponse(welcome.render_email(lead))


# --- Documents (template previews with sample data) ---

_SAMPLE_LEAD = {
    "id": "__sample__",
    "business_name": "Harper & Sons Roofing",
    "category": "roofing contractor",
    "town": "Shrewsbury",
    "email": "sample@example.com",
    "reply_to": "",
}


@app.get("/api/documents/proposal", response_class=HTMLResponse)
def document_proposal():
    """The follow-up pack: proposal page incl. the sample weekly SEO report."""
    build_fee = leads_db.get_setting("pricing_build_fee") or "£695"
    monthly_fee = (leads_db.get_setting("pricing_monthly_fee") or "£59/month").split("/")[0].strip()
    from . import proposal as proposal_mod
    return HTMLResponse(proposal_mod.render_proposal(
        lead={**_SAMPLE_LEAD, "reply_to": config.OUTREACH_REPLY_TO},
        access={"slug": "sample"},
        public_url=config.PUBLIC_URL,
        build_fee=build_fee.split(" ")[0],
        monthly_fee=monthly_fee,
    ))


@app.get("/api/documents/welcome", response_class=HTMLResponse)
def document_welcome():
    """The welcome pack email, as the client receives it after paying."""
    return HTMLResponse(welcome.render_email(_SAMPLE_LEAD))


@app.get("/api/documents/followup-email")
def document_followup_email():
    """The canned package follow-up reply used from the Mailbox."""
    return mailbox.followup_template(None)


# --- Mailbox ---

@app.get("/api/mailbox/status")
def mailbox_status():
    return mailbox.status()


@app.get("/api/mailbox/settings")
def mailbox_settings():
    return {
        "imap_host": leads_db.get_setting("mailbox_imap_host"),
        "imap_port": leads_db.get_setting("mailbox_imap_port") or "993",
        "imap_user": leads_db.get_setting("mailbox_imap_user"),
        "imap_password_set": bool(leads_db.get_setting("mailbox_imap_password")),
    }


@app.put("/api/mailbox/settings")
def save_mailbox_settings(body: MailboxSettings):
    mapping = {
        "imap_host": "mailbox_imap_host",
        "imap_port": "mailbox_imap_port",
        "imap_user": "mailbox_imap_user",
        "imap_password": "mailbox_imap_password",
    }
    for field, key in mapping.items():
        value = getattr(body, field)
        if value is not None:
            leads_db.set_setting(key, value.strip())
    # Changing the account invalidates the UID cursor.
    if body.imap_host is not None or body.imap_user is not None:
        leads_db.set_setting("mailbox_last_uid", "0")
    return mailbox_settings()


@app.post("/api/mailbox/test")
def mailbox_test():
    return mailbox.test_connection()


@app.post("/api/mailbox/poll")
def mailbox_poll():
    try:
        return mailbox.poll_now()
    except Exception as exc:
        raise HTTPException(502, str(exc))


@app.get("/api/mailbox/threads")
def mailbox_threads():
    threads = leads_db.list_mail_threads()
    # Attach business names for matched leads
    for t in threads:
        if t.get("lead_id"):
            lead = leads_db.get_lead(t["lead_id"])
            t["business_name"] = lead["business_name"] if lead else None
            t["lead_status"] = lead["status"] if lead else None
        else:
            t["business_name"] = None
            t["lead_status"] = None
    return threads


@app.get("/api/mailbox/thread")
def mailbox_thread(counterpart: str):
    messages = leads_db.list_mail_for_counterpart(counterpart)
    if not messages:
        raise HTTPException(404, "no messages for this address")
    leads_db.mark_mail_read(counterpart)
    lead = leads_db.find_lead_by_email(counterpart)
    return {
        "counterpart": counterpart.strip().lower(),
        "lead": _lead_payload(lead) if lead else None,
        "messages": messages,
    }


@app.post("/api/mailbox/reply")
def mailbox_reply(body: MailReply):
    if not body.body_text.strip():
        raise HTTPException(400, "reply is empty")
    if not body.subject.strip():
        raise HTTPException(400, "subject is empty")
    try:
        return mailbox.send_reply(body.counterpart, body.subject.strip(),
                                  body.body_text.strip(), lead_id=body.lead_id)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc))


@app.get("/api/mailbox/followup-template")
def mailbox_followup_template(lead_id: str | None = None, counterpart: str | None = None):
    """Canned package response; resolves the lead from the address if needed."""
    if not lead_id and counterpart:
        lead = leads_db.find_lead_by_email(counterpart)
        lead_id = lead["id"] if lead else None
    return mailbox.followup_template(lead_id)


@app.get("/api/leads/{lead_id}")
def get_lead(lead_id: str):
    return _lead_payload(_get_lead_or_404(lead_id), full=True)


@app.patch("/api/leads/{lead_id}")
def update_lead(lead_id: str, body: LeadUpdate):
    _get_lead_or_404(lead_id)
    fields = {}
    if body.email is not None:
        fields["email"] = body.email.strip().lower()
    if body.phone is not None:
        fields["phone"] = body.phone.strip()
    if body.status is not None:
        if body.status not in ("new", "won", "lost", "skipped", "review"):
            raise HTTPException(400, "status can only be set to new/won/lost/skipped/review")
        fields["status"] = body.status
        fields["status_detail"] = None
    if fields:
        leads_db.update_lead(lead_id, **fields)
    return _lead_payload(leads_db.get_lead(lead_id), full=True)


@app.delete("/api/leads/{lead_id}")
def delete_lead(lead_id: str):
    lead = _get_lead_or_404(lead_id)
    if lead.get("project_id"):
        db.delete_project(lead["project_id"])
        storage.delete_project_storage(lead["project_id"])
    leads_db.delete_lead(lead_id)
    return {"deleted": lead_id}


@app.post("/api/leads/{lead_id}/run")
def run_lead_pipeline(lead_id: str):
    _get_lead_or_404(lead_id)
    try:
        lead_agent.start_pipeline(lead_id)
    except (RuntimeError, FileNotFoundError) as exc:
        raise HTTPException(409, str(exc))
    return _lead_payload(leads_db.get_lead(lead_id), full=True)


@app.patch("/api/leads/{lead_id}/email")
def update_lead_email(lead_id: str, body: EmailUpdate):
    _get_lead_or_404(lead_id)
    record = leads_db.latest_email_for_lead(lead_id)
    if not record:
        raise HTTPException(404, "no email draft yet")
    if record["status"] == "sent":
        raise HTTPException(409, "email already sent")
    fields = {}
    if body.subject is not None:
        fields["subject"] = body.subject.strip()
    if body.body_text is not None:
        fields["body_text"] = body.body_text.strip()
    if fields:
        paragraphs = [p.strip() for p in
                      (fields.get("body_text") or record["body_text"]).split("\n\n") if p.strip()]
        fields["body_html"] = outreach.render_email(lead_id, paragraphs)
        leads_db.update_email(record["id"], **fields)
    return leads_db.get_email(record["id"])


@app.post("/api/leads/{lead_id}/approve")
def approve_and_send(lead_id: str):
    lead = _get_lead_or_404(lead_id)
    if lead["status"] != "review":
        raise HTTPException(409, f"lead is '{lead['status']}' — only leads in review can be sent")
    record = leads_db.latest_email_for_lead(lead_id)
    if not record:
        raise HTTPException(404, "no email draft to send")
    leads_db.add_event(lead_id, "approved")
    try:
        outreach.send_email(record["id"])
    except (RuntimeError, FileNotFoundError) as exc:
        raise HTTPException(400, str(exc))
    return _lead_payload(leads_db.get_lead(lead_id), full=True)


@app.get("/api/leads/{lead_id}/email-preview", response_class=HTMLResponse)
def lead_email_preview(lead_id: str):
    _get_lead_or_404(lead_id)
    record = leads_db.latest_email_for_lead(lead_id)
    if not record:
        raise HTTPException(404, "no email draft yet")
    return HTMLResponse(record["body_html"])


@app.get("/api/leads/{lead_id}/media/{name}")
def lead_media(lead_id: str, name: str):
    lead = _get_lead_or_404(lead_id)
    if not lead.get("project_id"):
        raise HTTPException(404, "no mockup yet")
    files = preview_media.get_media(lead["project_id"])
    path = {"hero.png": files["hero"], "scroll.gif": files["gif"]}.get(name)
    if not path:
        raise HTTPException(404, "media not found")
    return FileResponse(path, media_type="image/png" if name.endswith(".png") else "image/gif")


# --- Stripe webhook (raw body required for signature verification) ---

@app.post("/api/payments/webhook")
async def stripe_webhook(request: Request,
                         stripe_signature: str = Header(None, alias="stripe-signature")):
    """Receive Stripe webhook events — payment & subscription lifecycle."""
    if not payments.enabled():
        raise HTTPException(503, "payments not configured")
    payload = await request.body()
    try:
        payments.handle_webhook(payload, stripe_signature or "")
    except ValueError as exc:
        log.warning("stripe webhook rejected: %s", exc)
        raise HTTPException(400, str(exc))
    return {"ok": True}


# --- Preview & export ---

@app.get("/api/preview/{project_id}/", response_class=HTMLResponse)
def preview_index(project_id: str):
    _get_project_or_404(project_id)
    html = storage.read_site_html(project_id)
    if html is None:
        raise HTTPException(404, "no generated site yet")
    return HTMLResponse(html)


@app.get("/api/preview/{project_id}/{asset_path:path}")
def preview_asset(project_id: str, asset_path: str):
    _get_project_or_404(project_id)
    try:
        path = storage.safe_resolve(storage.site_dir(project_id), asset_path)
    except PermissionError:
        raise HTTPException(403, "forbidden")
    if not path.exists() or not path.is_file():
        raise HTTPException(404, "asset not found")
    return FileResponse(path)


@app.get("/api/projects/{project_id}/export")
def export_site(project_id: str):
    project = _get_project_or_404(project_id)
    try:
        zip_path = storage.export_site_zip(project_id)
    except FileNotFoundError:
        raise HTTPException(404, "no generated site yet")
    safe_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in project["name"].lower())
    return FileResponse(zip_path, media_type="application/zip",
                        filename=f"{safe_name or 'designo-site'}.zip")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=config.HOST, port=config.PORT)
