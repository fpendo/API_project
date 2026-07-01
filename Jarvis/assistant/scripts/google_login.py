"""One-time Google OAuth login for a given Telegram user.

    python -m assistant.scripts.google_login --user <telegram_user_id>

Opens a browser, asks you to consent to Gmail (read) and Calendar (read/write),
and stores the token under data/<user_id>/google_token.json.
"""

from __future__ import annotations

import argparse
import sys

from assistant.connectors.google_auth import GoogleAuthError, run_login_flow
from assistant.core.config import load_config


def main() -> int:
    parser = argparse.ArgumentParser(description="Link a Google account for a user.")
    parser.add_argument(
        "--user",
        type=int,
        required=True,
        help="Telegram user ID (send /start to the bot to find yours).",
    )
    args = parser.parse_args()

    config = load_config()
    try:
        run_login_flow(config, args.user)
    except GoogleAuthError as exc:
        print(f"Error: {exc}")
        return 1

    print(f"Google account linked for user {args.user}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
