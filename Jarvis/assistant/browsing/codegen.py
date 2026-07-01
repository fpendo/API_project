"""Turn a successful exploratory browse into a deterministic Playwright script.

Sonnet reads the action log (what the browsing agent actually did: URLs,
clicks, form fills, extractions) and writes a standalone async Playwright
script. The script must define:

    async def run(page, creds: dict) -> str

It receives a ready Playwright ``page`` and a ``creds`` dict (may be empty),
performs the whole flow, and returns the extracted result as text.

Generated code never contains real credentials — it reads them from ``creds``.
"""

from __future__ import annotations

import json
import logging
import re

from assistant.core.config import Config

logger = logging.getLogger(__name__)

_CODEGEN_SYSTEM = """You are an expert Playwright (Python, async API) engineer.
You will be given: a task description, a website, and the action log of a
browser agent that just completed the task successfully (steps, URLs visited,
elements interacted with, extracted content).

Write a SINGLE standalone Python module that replays this flow deterministically.

Requirements:
- Define exactly:  async def run(page, creds: dict) -> str
- `page` is a live playwright.async_api.Page (browser/context already set up).
- `creds` may contain 'username' and 'password' — NEVER hard-code credentials.
- Use robust selectors (roles, text, stable attributes) rather than brittle
  auto-generated class names. Prefer page.get_by_role / get_by_text /
  css with semantic attributes.
- Use generous timeouts (15-30s) and `wait_for_load_state('domcontentloaded')`
  after navigations. SPAs may need `page.wait_for_timeout(2000)` after clicks.
- The function must RETURN the extracted information as plain text (the same
  kind of content the agent's final answer contained).
- If a step cannot be completed, raise RuntimeError with a clear message —
  do NOT return partial/empty results silently.
- No imports beyond: asyncio, re, json, datetime, urllib.parse.
- Output ONLY the Python code, in one ```python code block, nothing else."""


def _extract_code(text: str) -> str | None:
    m = re.search(r"```(?:python)?\s*\n(.*?)```", text, re.DOTALL)
    if m:
        return m.group(1).strip()
    # Maybe the model returned bare code
    if "async def run(" in text:
        return text.strip()
    return None


def generate_script(
    config: Config,
    task: str,
    site: str,
    action_log: list[dict],
    urls: list[str],
    final_answer: str,
) -> str | None:
    """Ask Sonnet to write a replay script. Returns code or None on failure."""
    # Compact the action log to keep tokens sane.
    log_json = json.dumps(action_log, default=str)
    if len(log_json) > 20000:
        log_json = log_json[:20000] + " ...[truncated]"

    user_msg = (
        f"TASK: {task}\n"
        f"WEBSITE: {site}\n"
        f"URLS VISITED (in order): {json.dumps(urls[:30])}\n"
        f"AGENT FINAL ANSWER (what correct output looks like):\n{final_answer[:2000]}\n\n"
        f"ACTION LOG:\n{log_json}"
    )

    # Use the browse model (Sonnet) for codegen quality.
    import litellm

    try:
        resp = litellm.completion(
            model=f"anthropic/{config.llm_browse_model}",
            messages=[
                {"role": "system", "content": _CODEGEN_SYSTEM},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=4000,
        )
        text = resp.choices[0].message.content or ""
    except Exception:  # noqa: BLE001
        logger.exception("codegen LLM call failed")
        return None

    code = _extract_code(text)
    if not code:
        logger.warning("codegen produced no usable code block")
        return None

    # Sanity: must compile and define run()
    try:
        compile(code, "<generated-skill>", "exec")
    except SyntaxError:
        logger.exception("generated script has syntax errors")
        return None
    if "async def run(" not in code:
        logger.warning("generated script missing run()")
        return None
    return code
