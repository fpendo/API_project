"""
User and Session models
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from app.database import Base


class UserRole(str, Enum):
    """User roles for RBAC"""
    ADMIN = "admin"
    ANALYST = "analyst"
    ISSUER = "issuer"
    CLIENT_SERVICES = "client_services"


class User(Base):
    """User account model"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default=UserRole.ISSUER.value)
    
    # Optional link to application (for issuer users)
    application_id: Mapped[Optional[int]] = mapped_column(ForeignKey("applications.id"), nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    sessions: Mapped[List["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    application: Mapped[Optional["Application"]] = relationship(back_populates="user")

    def __repr__(self):
        return f"<User {self.email}>"


class Session(Base):
    """User session model for token management"""
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    refresh_token: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    
    # Device info
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    
    # Status
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    refresh_expires_at: Mapped[datetime] = mapped_column(DateTime)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="sessions")

    def __repr__(self):
        return f"<Session {self.id} for User {self.user_id}>"


# Import at bottom to avoid circular imports
from app.models.application import Application



