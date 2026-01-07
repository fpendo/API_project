"""
Production configuration for NEMX backend.
These settings override defaults when ENVIRONMENT=production is set.
"""
import os
from pathlib import Path


def is_production() -> bool:
    """Check if running in production mode."""
    return os.getenv("ENVIRONMENT", "development").lower() == "production"


def get_cors_origins() -> list[str]:
    """Get CORS origins based on environment."""
    if is_production():
        # In production, use configured domain
        domain = os.getenv("DOMAIN_URL", "")
        origins = []
        if domain:
            origins.append(domain)
            origins.append(f"https://{domain}")
            origins.append(f"https://www.{domain}")
        # Also allow portal backend
        portal_url = os.getenv("PORTAL_URL", "")
        if portal_url:
            origins.append(portal_url)
        return origins if origins else ["*"]
    else:
        # Development mode - allow localhost
        return [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "*"
        ]


def get_log_level() -> str:
    """Get log level based on environment."""
    if is_production():
        return os.getenv("LOG_LEVEL", "INFO")
    return os.getenv("LOG_LEVEL", "DEBUG")


def get_api_prefix() -> str:
    """Get API prefix for routes."""
    return os.getenv("API_PREFIX", "")


# Print startup mode
if __name__ == "__main__":
    print(f"Environment: {'production' if is_production() else 'development'}")
    print(f"CORS Origins: {get_cors_origins()}")
    print(f"Log Level: {get_log_level()}")

