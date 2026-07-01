"""Per-user local storage.

Phase 1 keeps everything on local disk, partitioned by Telegram user id, so the
isolation model (one user can never see another user's data) is in place from
the start and can later be swapped for encrypted per-user vaults in the cloud.
"""

from __future__ import annotations

import json
from pathlib import Path

from assistant.core.config import Config


class UserStore:
    def __init__(self, config: Config, user_id: int) -> None:
        self._config = config
        self.user_id = user_id
        self.dir = config.data_dir / str(user_id)
        self.dir.mkdir(parents=True, exist_ok=True)

    @property
    def google_token_file(self) -> Path:
        return self.dir / "google_token.json"

    def has_google_credentials(self) -> bool:
        return self.google_token_file.exists()

    # ---- lightweight per-user settings (json) ----
    @property
    def _settings_file(self) -> Path:
        return self.dir / "settings.json"

    def _load_settings(self) -> dict:
        try:
            return json.loads(self._settings_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}

    def get_setting(self, key: str, default=None):
        return self._load_settings().get(key, default)

    def set_setting(self, key: str, value) -> None:
        settings = self._load_settings()
        settings[key] = value
        self._settings_file.write_text(json.dumps(settings, indent=2), encoding="utf-8")

    # ---- inbox for documents awaiting filing into the vault ----
    @property
    def inbox_dir(self) -> Path:
        d = self.dir / "inbox"
        d.mkdir(parents=True, exist_ok=True)
        return d
