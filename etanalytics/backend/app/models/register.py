"""
Share Register models
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, Integer, Float, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from app.database import Base


class RegisterStatus(str, Enum):
    """Register processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    ANALYZED = "analyzed"
    DELIVERED = "delivered"
    FAILED = "failed"


class EntityType(str, Enum):
    """Entity types for classification"""
    # Terminal types (Investment Decision Makers)
    WEALTH_MANAGER = "wealth_manager"
    PLATFORM = "platform"
    PRIVATE_BANK = "private_bank"
    ASSET_MANAGER = "asset_manager"
    PENSION_FUND = "pension_fund"
    INSURANCE = "insurance"
    FUND_OF_FUNDS = "fund_of_funds"
    
    # Intermediary types (Need Disclosure)
    CSD = "csd"
    GLOBAL_CUSTODIAN = "global_custodian"
    LOCAL_CUSTODIAN = "local_custodian"
    DEDICATED_NOMINEE = "dedicated_nominee"
    POOLED_NOMINEE = "pooled_nominee"
    MARKET_MAKER = "market_maker"
    
    # Unknown
    UNKNOWN = "unknown"


class Register(Base):
    """Share register upload"""
    __tablename__ = "registers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    issuer_id: Mapped[str] = mapped_column(String(50), index=True)
    
    # Dates
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    as_of_date: Mapped[datetime] = mapped_column(DateTime)
    
    # Status
    status: Mapped[str] = mapped_column(String(50), default=RegisterStatus.PENDING.value, index=True)
    
    # File info
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Summary stats
    total_holders: Mapped[int] = mapped_column(Integer, default=0)
    total_etfs: Mapped[int] = mapped_column(Integer, default=0)
    
    # Analysis results
    identified_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    discovered_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    entries: Mapped[List["RegisterEntry"]] = relationship(back_populates="register", cascade="all, delete-orphan")
    etf_columns: Mapped[List["ETFColumn"]] = relationship(back_populates="register", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Register {self.id} for {self.issuer_id}>"


class ETFColumn(Base):
    """ETF column in a register"""
    __tablename__ = "etf_columns"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    register_id: Mapped[int] = mapped_column(ForeignKey("registers.id", ondelete="CASCADE"))
    
    isin: Mapped[str] = mapped_column(String(12), index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    total_shares: Mapped[int] = mapped_column(Integer, default=0)
    
    # Relationships
    register: Mapped["Register"] = relationship(back_populates="etf_columns")

    def __repr__(self):
        return f"<ETFColumn {self.isin}>"


class RegisterEntry(Base):
    """Entry (row) in a share register - represents an account"""
    __tablename__ = "register_entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    register_id: Mapped[int] = mapped_column(ForeignKey("registers.id", ondelete="CASCADE"))
    
    # Account info
    account_name: Mapped[str] = mapped_column(String(500))
    account_number: Mapped[str] = mapped_column(String(100))
    
    # Classification
    entity_type: Mapped[str] = mapped_column(String(50), default=EntityType.UNKNOWN.value)
    resolved_entity: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    confidence: Mapped[int] = mapped_column(Integer, default=0)
    requires_disclosure: Mapped[bool] = mapped_column(Boolean, default=True)
    disclosure_status: Mapped[str] = mapped_column(String(50), default="pending")
    
    # Total shares across all ETFs
    total_shares: Mapped[int] = mapped_column(Integer, default=0)
    
    # Relationships
    register: Mapped["Register"] = relationship(back_populates="entries")
    holdings: Mapped[List["RegisterHolding"]] = relationship(back_populates="entry", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<RegisterEntry {self.account_name}>"


class RegisterHolding(Base):
    """Holdings per ETF for an entry"""
    __tablename__ = "register_holdings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("register_entries.id", ondelete="CASCADE"))
    
    isin: Mapped[str] = mapped_column(String(12), index=True)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    
    # Relationships
    entry: Mapped["RegisterEntry"] = relationship(back_populates="holdings")

    def __repr__(self):
        return f"<RegisterHolding {self.isin}: {self.shares}>"



