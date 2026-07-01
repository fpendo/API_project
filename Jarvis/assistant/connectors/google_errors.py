"""Friendly error messages for Google API failures."""


def format_google_api_error(exc: Exception) -> str:
    msg = str(exc)
    if "accessNotConfigured" in msg:
        if "tasks" in msg.lower():
            return (
                "Google Tasks API is not enabled in your Google Cloud project. "
                "Go to console.cloud.google.com → APIs & Services → Library, "
                "search 'Google Tasks API', and click Enable. No re-login needed."
            )
        return (
            "A required Google API is not enabled in your Cloud project. "
            "Check APIs & Services → Library in console.cloud.google.com."
        )
    if "insufficientPermissions" in msg or "403" in msg:
        return (
            f"Google permission error: {msg}. "
            "You may need to re-run: python -m assistant.scripts.google_login --user <your_id>"
        )
    return msg
