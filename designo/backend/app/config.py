"""Designo backend configuration."""
from pathlib import Path

from dotenv import load_dotenv
import os

BACKEND_DIR = Path(__file__).resolve().parent.parent
DESIGNO_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")

# Ringfenced storage root — every project lives in its own directory below this.
STORAGE_DIR = Path(os.getenv("DESIGNO_STORAGE_DIR", str(DESIGNO_DIR / "storage"))).resolve()
PROJECTS_DIR = STORAGE_DIR / "projects"
DB_PATH = STORAGE_DIR / "designo.db"

HOST = os.getenv("DESIGNO_HOST", "127.0.0.1")
PORT = int(os.getenv("DESIGNO_PORT", "8620"))

# Claude (site generation)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
LLM_MODEL = os.getenv("DESIGNO_LLM_MODEL", "claude-sonnet-4-5")
LLM_MAX_TOKENS = int(os.getenv("DESIGNO_LLM_MAX_TOKENS", "64000"))
# Cheaper model for small judgement calls (critique juror, artwork QA,
# visual audit). Defaults to LLM_MODEL; set e.g. a Haiku-class model to cut
# vision-call costs without touching build quality.
LLM_SMALL_MODEL = os.getenv("DESIGNO_LLM_SMALL_MODEL", "") or LLM_MODEL

# fal.ai (optional AI hero video). Feature is disabled when FAL_KEY is empty.
FAL_KEY = os.getenv("FAL_KEY", "")
VIDEO_MODEL_DRAFT = os.getenv(
    "DESIGNO_VIDEO_MODEL_DRAFT",
    "fal-ai/minimax/hailuo-02/standard/image-to-video",
)
VIDEO_MODEL_FINAL = os.getenv(
    "DESIGNO_VIDEO_MODEL_FINAL",
    "fal-ai/kling-video/v3/standard/image-to-video",
)
# Instruction-based photo editing (AI retouch / show-home staging)
PHOTO_EDIT_MODEL = os.getenv("DESIGNO_PHOTO_EDIT_MODEL", "fal-ai/nano-banana/edit")
# Text-to-image for creative-director artwork commissions (requires FAL_KEY)
ARTWORK_MODEL = os.getenv("DESIGNO_ARTWORK_MODEL", "fal-ai/flux-pro/v1.1")

# Post-build design critique loop: after generation the site is screenshot,
# judged by a vision "Awwwards juror", and improved. 0 rounds disables it.
CRITIQUE_ROUNDS = int(os.getenv("DESIGNO_CRITIQUE_ROUNDS", "2"))
CRITIQUE_TARGET = float(os.getenv("DESIGNO_CRITIQUE_TARGET", "8.5"))

# --- Lead generation ---
# Apify Google Maps scraper (paid) — finds businesses without websites.
APIFY_TOKEN = os.getenv("APIFY_TOKEN", "")
APIFY_GMAPS_ACTOR = os.getenv("DESIGNO_APIFY_GMAPS_ACTOR", "compass~crawler-google-places")
# Companies House API (free) — newly incorporated UK companies.
COMPANIES_HOUSE_KEY = os.getenv("COMPANIES_HOUSE_KEY", "")
# Resend (transactional email) — outreach is disabled until this is set.
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
OUTREACH_FROM = os.getenv("DESIGNO_OUTREACH_FROM", "")  # e.g. "Studio Designo <hello@nemx.co.uk>"
OUTREACH_REPLY_TO = os.getenv("DESIGNO_OUTREACH_REPLY_TO", "")
# Public base URL for links/images in outreach emails and prospect logins.
PUBLIC_URL = os.getenv("DESIGNO_PUBLIC_URL", "https://nemx.co.uk/designo").rstrip("/")
# Secret for signing prospect sessions / unsubscribe tokens (auto-generated into
# the settings table when empty).
SECRET = os.getenv("DESIGNO_SECRET", "")
# Admin (portal) password — falls back to the admin_password setting; a random
# one is generated on first start if neither exists.
ADMIN_PASSWORD = os.getenv("DESIGNO_ADMIN_PASSWORD", "")

# --- Stripe payments ---
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
# Cached monthly Price ID — set automatically on first subscription checkout.
STRIPE_MONTHLY_PRICE_ID = os.getenv("STRIPE_MONTHLY_PRICE_ID", "")
# Build fee in pence (default £695). Monthly subscription fee (default £59).
PRICE_BUILD_PENCE = int(os.getenv("DESIGNO_PRICE_BUILD_PENCE", "69500"))
PRICE_MONTHLY_PENCE = int(os.getenv("DESIGNO_PRICE_MONTHLY_PENCE", "5900"))

MAX_PHOTO_BYTES = int(os.getenv("DESIGNO_MAX_PHOTO_BYTES", str(15 * 1024 * 1024)))
ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
