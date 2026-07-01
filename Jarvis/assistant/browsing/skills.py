"""Skill library: learned website flows stored as replayable scripts.

A skill lives at ``<DATA_DIR>/skills/<domain>/<slug>/`` containing:
    script.py  - generated Playwright module defining  async def run(page, creds)
    meta.json  - {task, site, created, last_success, last_failure, runs, ...}

Main entry point is :func:`browse_or_replay`:

    1. look for an existing skill matching (site, task)
    2. if found -> replay the script (fast, no LLM)
    3. if replay fails (site changed) or no skill -> exploratory browse
       (Sonnet agent), then generate + save a fresh script for next time
"""

from __future__ import annotations

import asyncio
import datetime as _dt
import json
import logging
import re

from assistant.browsing import codegen, credentials as creds_mod
from assistant.browsing.engine import BrowseResult, run_browse
from assistant.core.config import Config

logger = logging.getLogger(__name__)

_REPLAY_TIMEOUT_S = 180


# ---------------------------------------------------------------------------
# Store helpers
# ---------------------------------------------------------------------------

def _skills_root(config: Config):
    d = config.data_dir / "skills"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _slug(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", (text or "").lower())
    text = re.sub(r"[\s_]+", "-", text).strip("-")
    return text[:60] or "task"


def _meta_path(skill_dir):
    return skill_dir / "meta.json"


def _load_meta(skill_dir) -> dict:
    try:
        return json.loads(_meta_path(skill_dir).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _save_meta(skill_dir, meta: dict) -> None:
    _meta_path(skill_dir).write_text(json.dumps(meta, indent=2), encoding="utf-8")


def list_skills(config: Config) -> list[dict]:
    """All stored skills with their metadata."""
    out: list[dict] = []
    root = _skills_root(config)
    for domain_dir in sorted(root.iterdir()):
        if not domain_dir.is_dir():
            continue
        for skill_dir in sorted(domain_dir.iterdir()):
            if not (skill_dir / "script.py").exists():
                continue
            meta = _load_meta(skill_dir)
            meta["name"] = f"{domain_dir.name}/{skill_dir.name}"
            out.append(meta)
    return out


def _keywords(text: str) -> set[str]:
    stop = {"the", "a", "an", "my", "me", "and", "of", "to", "for", "from",
            "in", "on", "at", "with", "get", "find", "latest", "please"}
    words = re.split(r"[^\w]+", (text or "").lower())
    return {w for w in words if len(w) > 2 and w not in stop}


def find_skill(config: Config, site: str, task: str):
    """Best matching skill dir for (site, task), or None.

    Match = same domain AND >=50% keyword overlap with the stored task.
    """
    domain = creds_mod.normalize_domain(site) if site else ""
    root = _skills_root(config)
    task_kw = _keywords(task)
    best, best_score = None, 0.0

    domains = [root / domain] if domain and (root / domain).exists() else \
              [d for d in root.iterdir() if d.is_dir()]
    for domain_dir in domains:
        if not domain_dir.is_dir():
            continue
        for skill_dir in domain_dir.iterdir():
            if not (skill_dir / "script.py").exists():
                continue
            meta = _load_meta(skill_dir)
            stored_kw = _keywords(meta.get("task", "") + " " + skill_dir.name)
            if not task_kw or not stored_kw:
                continue
            overlap = len(task_kw & stored_kw) / max(1, min(len(task_kw), len(stored_kw)))
            if overlap > best_score:
                best, best_score = skill_dir, overlap
    if best is not None and best_score >= 0.5:
        logger.info("skill match: %s (score %.2f)", best, best_score)
        return best
    return None


def save_skill(
    config: Config, site: str, task: str, code: str
) -> str:
    """Store a generated script; returns the skill name."""
    domain = creds_mod.normalize_domain(site) or "misc"
    skill_dir = _skills_root(config) / domain / _slug(task)
    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / "script.py").write_text(code, encoding="utf-8")
    now = _dt.datetime.now().isoformat(timespec="seconds")
    meta = _load_meta(skill_dir)
    meta.update(
        {
            "task": task,
            "site": site,
            "domain": domain,
            "created": meta.get("created", now),
            "updated": now,
            "runs": meta.get("runs", 0),
        }
    )
    _save_meta(skill_dir, meta)
    logger.info("skill saved: %s/%s", domain, skill_dir.name)
    return f"{domain}/{skill_dir.name}"


# ---------------------------------------------------------------------------
# Replay
# ---------------------------------------------------------------------------

async def replay_skill(config: Config, skill_dir) -> str:
    """Execute a stored script in a fresh headless browser. Returns its output.

    Raises on any failure so the caller can escalate to the learning agent.
    """
    code = (skill_dir / "script.py").read_text(encoding="utf-8")
    namespace: dict = {}
    exec(compile(code, str(skill_dir / "script.py"), "exec"), namespace)  # noqa: S102
    run_fn = namespace.get("run")
    if run_fn is None:
        raise RuntimeError("stored script has no run() function")

    meta = _load_meta(skill_dir)
    creds = creds_mod.get_credentials(config, meta.get("site", "")) or {}

    from playwright.async_api import async_playwright

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=config.browse_headless)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
        )
        context.set_default_timeout(30_000)
        page = await context.new_page()
        try:
            result = await asyncio.wait_for(
                run_fn(page, creds), timeout=_REPLAY_TIMEOUT_S
            )
        finally:
            await context.close()
            await browser.close()

    now = _dt.datetime.now().isoformat(timespec="seconds")
    meta["last_success"] = now
    meta["runs"] = meta.get("runs", 0) + 1
    _save_meta(skill_dir, meta)
    return str(result)


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

async def browse_or_replay(
    config: Config,
    task: str,
    site: str = "",
    chat_id: int | None = None,
) -> dict:
    """Main entry: replay a known skill or learn a new one.

    Returns {ok, result, mode, skill, note}.
    """
    # 1. Try a stored skill first.
    skill_dir = find_skill(config, site, task)
    if skill_dir is not None:
        try:
            result = await replay_skill(config, skill_dir)
            return {
                "ok": True,
                "result": result,
                "mode": "replay",
                "skill": skill_dir.name,
            }
        except Exception as exc:  # noqa: BLE001 - any failure escalates to learning
            logger.warning("skill replay failed (%s); re-learning", exc)
            meta = _load_meta(skill_dir)
            meta["last_failure"] = _dt.datetime.now().isoformat(timespec="seconds")
            meta["last_error"] = str(exc)[:300]
            _save_meta(skill_dir, meta)

    # 2. Exploratory browse with the learning agent.
    browse: BrowseResult = await run_browse(config, task, site, chat_id)
    if not browse.success:
        return {
            "ok": False,
            "result": browse.final_answer,
            "mode": "explore",
            "errors": browse.errors[-3:],
            "note": "The browsing agent could not complete the task.",
        }

    # 3. Learn: generate + store a replay script for next time (best-effort).
    skill_name = None
    if site and browse.action_log:
        code = await asyncio.to_thread(
            codegen.generate_script,
            config, task, site, browse.action_log, browse.urls, browse.final_answer,
        )
        if code:
            skill_name = save_skill(config, site, task, code)

    return {
        "ok": True,
        "result": browse.final_answer,
        "mode": "explore",
        "skill": skill_name,
        "note": (
            "Learned this flow and saved it for future reuse."
            if skill_name
            else "Completed, but no reusable script was saved."
        ),
    }
