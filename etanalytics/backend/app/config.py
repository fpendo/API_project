"""
Application configuration using Pydantic Settings
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # App
    app_name: str = "ETAnalytics API"
    app_version: str = "2.0.0"
    debug: bool = False
    
    # Database
    database_url: str = "postgresql+asyncpg://etanalytics:ETAnalytics2024!@localhost:5432/etanalytics"
    database_echo: bool = False
    
    # JWT Auth
    jwt_secret_key: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Security
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://www.etanalytics.co.uk"
    ]
    
    # File Upload
    upload_dir: str = "/opt/app/etanalytics/uploads"
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    allowed_extensions: list[str] = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"]
    
    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds
    
    # Email Settings - Mailgun (preferred)
    MAILGUN_API_KEY: str = "your-mailgun-api-key"
    MAILGUN_DOMAIN: str = "your-mailgun-domain.mailgun.org"
    FROM_EMAIL: str = "accounts@etanalytics.co.uk"
    FROM_NAME: str = "ET Analytics"
    
    # Email Settings - SMTP (fallback)
    SMTP_HOST: str = "smtp.office365.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "accounts@etanalytics.co.uk"
    SMTP_PASSWORD: str = "CHANGE_ME"
    
    # Templates and Contracts
    TEMPLATE_DIR: str = "/opt/app/etanalytics/templates"
    CONTRACTS_DIR: str = "/opt/app/etanalytics/contracts"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()

