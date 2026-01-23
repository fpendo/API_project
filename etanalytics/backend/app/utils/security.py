"""
Security utilities
"""
import secrets
import re
from typing import Optional
from pydantic import BaseModel, field_validator


class PasswordValidator(BaseModel):
    """Validate password strength"""
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token"""
    return secrets.token_urlsafe(length)


def generate_magic_link_token() -> str:
    """Generate a magic link token for applicants"""
    return secrets.token_urlsafe(48)


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename to prevent path traversal attacks"""
    # Remove path components
    filename = filename.replace('\\', '/').split('/')[-1]
    # Remove special characters
    filename = re.sub(r'[^\w\s\-.]', '', filename)
    # Remove leading/trailing dots and spaces
    filename = filename.strip('. ')
    return filename or 'unnamed'


def validate_email_domain(email: str, allowed_domains: Optional[list[str]] = None) -> bool:
    """Validate that email is from an allowed domain"""
    if not allowed_domains:
        return True
    
    domain = email.split('@')[-1].lower()
    return domain in [d.lower() for d in allowed_domains]


def rate_limit_key(request) -> str:
    """Generate a rate limit key from request"""
    return request.client.host if request.client else "unknown"



