"""Central configuration loaded from environment variables (.env)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _split_ids(raw: str | None) -> set[int]:
    if not raw:
        return set()
    ids: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if part:
            try:
                ids.add(int(part))
            except ValueError:
                continue
    return ids


@dataclass(frozen=True)
class Config:
    telegram_bot_token: str
    allowed_user_ids: set[int]

    llm_provider: str
    llm_api_key: str
    llm_base_url: str | None
    llm_model: str

    whisper_model: str
    whisper_device: str
    whisper_compute_type: str
    stt_language: str
    stt_vocabulary: str

    google_client_secrets_file: Path
    data_dir: Path
    vault_dir: Path

    voice_replies: str  # 'auto' | 'always' | 'off'
    tts_voice: str

    tts_provider: str  # 'edge' | 'openai'
    openai_api_key: str
    openai_tts_model: str
    openai_tts_voice: str
    tts_instructions: str

    web_password: str
    web_port: int

    # Agentic web browsing (browser-use). A stronger model than the chat LLM.
    llm_browse_model: str
    browse_headless: bool
    browse_max_steps: int

    school_portal_url: str
    school_portal_username: str
    school_portal_password: str

    # Google scopes: Gmail (read), Calendar (read/write), Drive (read), Tasks (read/write).
    google_scopes: tuple[str, ...] = field(
        default=(
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/tasks",
        )
    )

    @property
    def allow_all_users(self) -> bool:
        return len(self.allowed_user_ids) == 0


def load_config() -> Config:
    data_dir = Path(os.getenv("DATA_DIR", "data")).resolve()
    data_dir.mkdir(parents=True, exist_ok=True)

    vault_dir = Path(os.getenv("VAULT_DIR", "vault")).resolve()
    vault_dir.mkdir(parents=True, exist_ok=True)

    base_url = os.getenv("LLM_BASE_URL", "").strip() or None

    return Config(
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN", "").strip(),
        allowed_user_ids=_split_ids(os.getenv("ALLOWED_TELEGRAM_USER_IDS")),
        llm_provider=os.getenv("LLM_PROVIDER", "openai").strip(),
        llm_api_key=(
            os.getenv("LLM_API_KEY")
            or os.getenv("ANTHROPIC_API_KEY")
            or os.getenv("OPENAI_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or ""
        ).strip(),
        llm_base_url=base_url,
        llm_model=os.getenv("LLM_MODEL", "gpt-5-nano").strip(),
        whisper_model=os.getenv("WHISPER_MODEL", "small").strip(),
        whisper_device=os.getenv("WHISPER_DEVICE", "cpu").strip(),
        whisper_compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8").strip(),
        stt_language=os.getenv("STT_LANGUAGE", "en").strip(),
        stt_vocabulary=os.getenv("STT_VOCABULARY", "").strip(),
        google_client_secrets_file=Path(
            os.getenv("GOOGLE_CLIENT_SECRETS_FILE", "client_secret.json")
        ).resolve(),
        data_dir=data_dir,
        vault_dir=vault_dir,
        voice_replies=os.getenv("VOICE_REPLIES", "auto").strip().lower(),
        tts_voice=os.getenv("TTS_VOICE", "en-GB-RyanNeural").strip(),
        tts_provider=os.getenv("TTS_PROVIDER", "edge").strip().lower(),
        openai_api_key=(os.getenv("OPENAI_API_KEY") or "").strip(),
        openai_tts_model=os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts").strip(),
        openai_tts_voice=os.getenv("OPENAI_TTS_VOICE", "ash").strip(),
        tts_instructions=os.getenv(
            "TTS_INSTRUCTIONS",
            "Speak in a warm, natural, conversational British tone, "
            "like a helpful personal assistant. Keep it relaxed and unhurried.",
        ).strip(),
        web_password=os.getenv("JARVIS_WEB_PASSWORD", "").strip(),
        web_port=int(os.getenv("JARVIS_WEB_PORT", "8810").strip() or "8810"),
        llm_browse_model=os.getenv("LLM_BROWSE_MODEL", "claude-sonnet-4-5").strip(),
        browse_headless=os.getenv("BROWSE_HEADLESS", "true").strip().lower() != "false",
        browse_max_steps=int(os.getenv("BROWSE_MAX_STEPS", "40").strip() or "40"),
        school_portal_url=os.getenv(
            "SCHOOL_PORTAL_URL", "https://kingshalltaunton.myschoolportal.co.uk"
        ).strip(),
        school_portal_username=os.getenv("SCHOOL_PORTAL_USERNAME", "").strip(),
        school_portal_password=os.getenv("SCHOOL_PORTAL_PASSWORD", "").strip(),
    )
