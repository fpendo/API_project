"""Exploratory browsing engine: a browser-use Agent powered by Sonnet.

This is the "learning" path — used when no stored skill exists for a task, or
when a stored skill's replay script broke. The agent looks at the live page,
decides actions step by step, and can pause to ask the user for help
(credentials, captchas, one-time codes) via the HITL bridge.

The full action log of a successful run is returned so codegen can turn it
into a deterministic replay script.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field

from assistant.browsing import credentials as creds_mod
from assistant.browsing import hitl
from assistant.core.config import Config

logger = logging.getLogger(__name__)

# Only one browser at a time on this small server.
_browse_lock = asyncio.Lock()

_BROWSE_TIMEOUT_S = 600  # hard wall-clock cap per exploratory run


@dataclass
class BrowseResult:
    success: bool
    final_answer: str
    action_log: list[dict] = field(default_factory=list)
    urls: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _task_prompt(task: str, site: str, has_creds: bool) -> str:
    parts = [task.strip()]
    if site:
        parts.append(f"The website to use is: {site}")
    if has_creds:
        parts.append(
            "Login credentials are available as sensitive data: use x_username "
            "for the username/email field and x_password for the password field."
        )
    parts.append(
        "If you hit a captcha, a one-time code, or anything only the user can "
        "answer, use the ask_human action and follow the reply. "
        "When finished, your final answer must contain the extracted "
        "information the user asked for, in full."
    )
    return "\n".join(parts)


async def run_browse(
    config: Config,
    task: str,
    site: str = "",
    chat_id: int | None = None,
) -> BrowseResult:
    """Run an exploratory browse. Returns the result plus the action log."""
    # Imported lazily: browser-use pulls in a lot at import time.
    from browser_use import Agent, Browser, Tools
    from browser_use.llm import ChatAnthropic

    from assistant.agent.llm import _set_api_keys

    _set_api_keys(config)  # browser-use reads ANTHROPIC_API_KEY from env

    sensitive = creds_mod.sensitive_data_for(config, site) if site else None

    tools = Tools()

    if chat_id is not None:

        @tools.action(
            "Ask the human user a question when you are stuck: missing "
            "credentials, a captcha to solve, a one-time code, or a choice "
            "only they can make. Returns their reply."
        )
        async def ask_human(question: str, browser_session=None) -> str:  # noqa: ANN001
            shot: bytes | None = None
            try:
                if browser_session is not None:
                    shot = await browser_session.take_screenshot()
            except Exception:  # noqa: BLE001 - screenshot is best-effort
                logger.debug("HITL screenshot failed", exc_info=True)
            try:
                return await hitl.ask_human(chat_id, question, shot)
            except TimeoutError as exc:
                return f"(no reply from user: {exc})"

    async with _browse_lock:
        browser = Browser(
            headless=config.browse_headless,
            chromium_sandbox=False,  # running as root in a container-like VM
        )
        llm = ChatAnthropic(model=config.llm_browse_model)

        agent = Agent(
            task=_task_prompt(task, site, bool(sensitive)),
            llm=llm,
            browser=browser,
            tools=tools,
            sensitive_data=sensitive,
            use_vision=True,
            max_failures=3,
            step_timeout=90,
            calculate_cost=False,
        )

        try:
            history = await asyncio.wait_for(
                agent.run(max_steps=config.browse_max_steps),
                timeout=_BROWSE_TIMEOUT_S,
            )
        except asyncio.TimeoutError:
            return BrowseResult(
                success=False,
                final_answer="",
                errors=[f"Browse timed out after {_BROWSE_TIMEOUT_S}s"],
            )
        finally:
            try:
                await browser.kill()
            except Exception:  # noqa: BLE001
                pass

    # Collect outcome + action log for codegen.
    success = bool(history.is_successful())
    final = history.final_result() or ""
    try:
        actions = history.model_actions()
    except Exception:  # noqa: BLE001
        actions = []
    try:
        urls = [u for u in history.urls() if u]
    except Exception:  # noqa: BLE001
        urls = []
    errors = [e for e in (history.errors() or []) if e]

    logger.info(
        "browse done: success=%s steps=%d urls=%d", success, len(actions), len(urls)
    )
    return BrowseResult(
        success=success,
        final_answer=str(final),
        action_log=[a if isinstance(a, dict) else dict(a) for a in actions],
        urls=[str(u) for u in urls],
        errors=[str(e) for e in errors],
    )
