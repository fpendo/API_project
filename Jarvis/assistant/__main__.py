"""Entry point: run the Telegram bot via long polling.

    python -m assistant
"""

from __future__ import annotations

import logging
import sys

from assistant.bot.telegram_bot import build_application
from assistant.core.config import load_config


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    config = load_config()

    if not config.telegram_bot_token:
        print("TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env and fill it in.")
        return 1

    from assistant.agent.llm import _set_api_keys
    _set_api_keys(config)

    import os
    provider = config.llm_provider.lower()
    key_var = {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY", "gemini": "GEMINI_API_KEY"}.get(provider, "LLM_API_KEY")
    if not os.environ.get(key_var):
        print(f"{key_var} is not set for provider '{provider}'. Check your .env file.")
        return 1

    app = build_application(config)
    logging.getLogger(__name__).info("Starting bot (polling)...")
    app.run_polling()
    return 0


if __name__ == "__main__":
    sys.exit(main())
