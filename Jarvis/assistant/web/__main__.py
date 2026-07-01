"""Run the browser voice interface:

    python -m assistant.web
"""

from __future__ import annotations

import logging

import uvicorn

from assistant.core.config import load_config


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    config = load_config()
    if not config.web_password:
        logging.getLogger("jarvis.web").warning(
            "JARVIS_WEB_PASSWORD is empty - the voice app will be UNPROTECTED."
        )
    uvicorn.run(
        "assistant.web.server:app",
        host="127.0.0.1",
        port=config.web_port,
        log_level="info",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
