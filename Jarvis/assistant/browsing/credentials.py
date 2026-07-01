"""Per-site credential store for the browsing agent.

Credentials live in ``<DATA_DIR>/credentials.json`` (chmod 600) keyed by
domain. They are handed to browser-use via its ``sensitive_data`` mechanism:
the LLM sees placeholders like ``x_username`` and the real values are typed
into the page locally — secrets never enter the LLM prompt or logs.

Site keys are bare domains, e.g. ``kingshalltaunton.myschoolportal.co.uk``.
"""

from __future__ import annotations

import json
import os
from urllib.parse import urlparse

from assistant.core.config import Config


def _store_file(config: Config):
    return config.data_dir / "credentials.json"


def _load(config: Config) -> dict:
    path = _store_file(config)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _save(config: Config, data: dict) -> None:
    path = _store_file(config)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    os.chmod(path, 0o600)


def normalize_domain(site: str) -> str:
    """'https://foo.bar/baz' or 'foo.bar' -> 'foo.bar'."""
    site = (site or "").strip().lower()
    if "://" in site:
        site = urlparse(site).netloc
    return site.split("/")[0].removeprefix("www.")


def get_credentials(config: Config, site: str) -> dict[str, str] | None:
    """Return {'username': ..., 'password': ..., ...} for a domain, or None."""
    return _load(config).get(normalize_domain(site))


def set_credentials(config: Config, site: str, creds: dict[str, str]) -> None:
    data = _load(config)
    data[normalize_domain(site)] = creds
    _save(config, data)


def list_sites(config: Config) -> list[str]:
    return sorted(_load(config).keys())


def sensitive_data_for(config: Config, site: str) -> dict[str, str] | None:
    """Build the browser-use ``sensitive_data`` mapping for a site.

    Returns e.g. {'x_username': 'me@example.com', 'x_password': 'secret'}.
    The agent's task text references the placeholder names only.
    """
    creds = get_credentials(config, site)
    if not creds:
        return None
    return {f"x_{k}": v for k, v in creds.items() if v}


def migrate_school_portal(config: Config) -> None:
    """Seed the store with the school portal creds from .env (idempotent)."""
    if not config.school_portal_url or not config.school_portal_username:
        return
    domain = normalize_domain(config.school_portal_url)
    if get_credentials(config, domain):
        return
    set_credentials(
        config,
        domain,
        {
            "username": config.school_portal_username,
            "password": config.school_portal_password,
        },
    )
