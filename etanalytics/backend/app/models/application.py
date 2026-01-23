"""
Application and Document models for onboarding
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from app.database import Base


class ApplicationStatus(str, Enum):
    """Application status in the pipeline"""
    NEW = "new"
    CONTRACT_SENT = "contract_sent"
    CONTRACT_SIGNED = "contract_signed"
    DOCS_PENDING = "docs_pending"
    PAYMENT_PENDING = "payment_pending"
    ACTIVE = "active"
    REJECTED = "rejected"


class PlanType(str, Enum):
    """Subscription plan types"""
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class DocumentType(str, Enum):
    """Types of documents for applications"""
    ARTICLES_OF_ASSOCIATION = "articles_of_association"
    PERMISSION_LETTER = "permission_letter"
    CONTRACT = "contract"
    OTHER = "other"


class Application(Base):
    """Issuer application for live access"""
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Company details
    company_name: Mapped[str] = mapped_column(String(255), index=True)
    registration_number: Mapped[str] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100))
    
    # Contact details
    contact_name: Mapped[str] = mapped_column(String(255))
    contact_email: Mapped[str] = mapped_column(String(255), index=True)
    contact_phone: Mapped[str] = mapped_column(String(50))
    
    # Plan
    selected_plan: Mapped[str] = mapped_column(String(50), default=PlanType.PROFESSIONAL.value)
    num_etfs: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    additional_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Status
    status: Mapped[str] = mapped_column(String(50), default=ApplicationStatus.NEW.value, index=True)
    
    # Access token for applicant to check status
    access_token: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    documents: Mapped[List["Document"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    user: Mapped[Optional["User"]] = relationship(back_populates="application")

    def __repr__(self):
        return f"<Application {self.company_name}>"


class Document(Base):
    """Document uploaded for an application"""
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"))
    
    # Document info
    doc_type: Mapped[str] = mapped_column(String(50))
    filename: Mapped[str] = mapped_column(String(255))
    original_filename: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int] = mapped_column(Integer)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    application: Mapped["Application"] = relationship(back_populates="documents")

    def __repr__(self):
        return f"<Document {self.original_filename}>"


# Import at bottom to avoid circular imports
from app.models.user import User



