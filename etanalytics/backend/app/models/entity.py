"""
Known Entities model
"""
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional

from app.database import Base


class Entity(Base):
    """Known entity for matching"""
    __tablename__ = "entities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Pattern for matching (uppercase)
    pattern: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    
    # Entity details
    name: Mapped[str] = mapped_column(String(255))
    entity_type: Mapped[str] = mapped_column(String(50), index=True)
    
    # Classification
    requires_disclosure: Mapped[bool] = mapped_column(Boolean, default=True)
    confidence: Mapped[int] = mapped_column(Integer, default=0)
    
    # Metadata
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lei: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Legal Entity Identifier
    parent_entity: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Entity {self.pattern}: {self.name}>"


class ETFProduct(Base):
    """ETF product metadata"""
    __tablename__ = "etf_products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Identifiers
    isin: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    ticker: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sedol: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    
    # Product info
    name: Mapped[str] = mapped_column(String(255))
    issuer_id: Mapped[str] = mapped_column(String(50), index=True)
    
    # Fund details
    asset_class: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    domicile: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # AUM
    current_aum: Mapped[Optional[float]] = mapped_column(nullable=True)
    
    # Yahoo Finance symbol for NAV data
    yahoo_symbol: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<ETFProduct {self.isin}: {self.name}>"


class NAVHistory(Base):
    """Historical NAV data"""
    __tablename__ = "nav_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    isin: Mapped[str] = mapped_column(String(12), index=True)
    date: Mapped[datetime] = mapped_column(DateTime, index=True)
    
    # Price data
    nav: Mapped[float] = mapped_column()
    open_price: Mapped[Optional[float]] = mapped_column(nullable=True)
    high: Mapped[Optional[float]] = mapped_column(nullable=True)
    low: Mapped[Optional[float]] = mapped_column(nullable=True)
    close: Mapped[Optional[float]] = mapped_column(nullable=True)
    volume: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<NAVHistory {self.isin} {self.date}: {self.nav}>"



