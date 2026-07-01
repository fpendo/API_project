"""Google OAuth handling for Gmail, Calendar, Drive, and Tasks.

Tokens are stored per user under the user's data directory. Use
``python -m assistant.scripts.google_login --user <telegram_user_id>`` once to
authorise; after that the bot loads and refreshes the token automatically.
Re-run after adding new API scopes.
"""

from __future__ import annotations

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

from assistant.core.config import Config
from assistant.core.store import UserStore


class GoogleAuthError(RuntimeError):
    """Raised when valid Google credentials are unavailable for a user."""


def load_credentials(config: Config, user_id: int) -> Credentials:
    """Load (and refresh if needed) stored credentials for a user."""
    store = UserStore(config, user_id)
    if not store.has_google_credentials():
        raise GoogleAuthError(
            "No Google account is linked yet. Run:\n"
            f"    python -m assistant.scripts.google_login --user {user_id}"
        )

    creds = Credentials.from_authorized_user_file(
        str(store.google_token_file), list(config.google_scopes)
    )

    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            store.google_token_file.write_text(creds.to_json(), encoding="utf-8")
        else:
            raise GoogleAuthError(
                "Google credentials are invalid. Re-run:\n"
                f"    python -m assistant.scripts.google_login --user {user_id}"
            )
    return creds


def run_login_flow(config: Config, user_id: int) -> None:
    """Run the OAuth flow on a headless server and persist the token.

    Prints an authorisation URL for the user to open in a browser, then waits
    for them to paste back the authorisation code. Works without a local
    browser or open port.
    """
    if not config.google_client_secrets_file.exists():
        raise GoogleAuthError(
            f"Client secrets file not found: {config.google_client_secrets_file}. "
            "Download Desktop OAuth credentials from Google Cloud Console and set "
            "GOOGLE_CLIENT_SECRETS_FILE."
        )

    store = UserStore(config, user_id)
    flow = InstalledAppFlow.from_client_secrets_file(
        str(config.google_client_secrets_file),
        list(config.google_scopes),
        redirect_uri="urn:ietf:wg:oauth:2.0:oob",
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",  # force consent so a fresh refresh_token is always issued
    )

    print("\n" + "=" * 60)
    print("Open this URL in your browser and sign in:")
    print()
    print(auth_url)
    print()
    print("After approving, Google will show you a code.")
    print("=" * 60 + "\n")

    code = input("Paste the code here and press Enter: ").strip()
    flow.fetch_token(code=code)
    creds = flow.credentials
    store.google_token_file.write_text(creds.to_json(), encoding="utf-8")
    print(f"\nToken saved. Google account linked for user {user_id}.")
