from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .db import Base


class AccountRole(str, enum.Enum):
    LANDOWNER = "LANDOWNER"
    CONSULTANT = "CONSULTANT"
    REGULATOR = "REGULATOR"
    BROKER = "BROKER"
    DEVELOPER = "DEVELOPER"
    PLANNING_OFFICER = "PLANNING_OFFICER"
    OPERATOR = "OPERATOR"


class SubmissionStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(Enum(AccountRole), nullable=False)
    evm_address = Column(String, nullable=True)  # Optional for now
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    submissions = relationship("SchemeSubmission", back_populates="submitter")


class SchemeSubmission(Base):
    __tablename__ = "scheme_submissions"

    id = Column(Integer, primary_key=True, index=True)
    submitter_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    scheme_name = Column(String, nullable=False)
    catchment = Column(String, nullable=False)
    location = Column(String, nullable=False)
    land_parcel_number = Column(String, nullable=False)  # e.g., "5b", "6n", "9n"
    unit_type = Column(String, nullable=False)  # "nitrate" or "phosphate"
    total_tonnage = Column(Float, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.PENDING_REVIEW)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    submitter = relationship("Account", back_populates="submissions")
    agreement_archives = relationship("AgreementArchive", back_populates="submission")


class AgreementArchive(Base):
    __tablename__ = "agreement_archives"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("scheme_submissions.id"), nullable=False)
    file_path = Column(String, nullable=False)
    sha256_hash = Column(String, nullable=True)  # Optional for now
    ipfs_cid = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    submission = relationship("SchemeSubmission", back_populates="agreement_archives")


class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(Integer, primary_key=True, index=True)
    # NFT token ID from the on-chain SchemeNFT contract.
    # Note: we do NOT enforce uniqueness at the database level because, in demo
    # mode, we may create multiple schemes with a fallback token ID (e.g. 0)
    # when on-chain minting is not configured. In production, uniqueness should
    # be enforced at the application/contract layer.
    nft_token_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    catchment = Column(String, nullable=False)
    location = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)  # "nitrate" or "phosphate"
    original_tonnage = Column(Float, nullable=False)
    remaining_tonnage = Column(Float, nullable=False)  # Synced from on-chain data
    created_by_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    creator = relationship("Account")
    notifications = relationship("Notification", back_populates="scheme")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=True)
    notification_type = Column(String, nullable=False)  # "SCHEME_APPROVED", "REDEEM_TO_CREDITS"
    message = Column(String, nullable=False)
    claim_token = Column(String, nullable=True, unique=True)  # For redeem notifications
    is_read = Column(Integer, default=0)  # 0 = unread, 1 = read
    is_used = Column(Integer, default=0)  # 0 = unused, 1 = used (for claim tokens)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    account = relationship("Account")
    scheme = relationship("Scheme", back_populates="notifications")


class BrokerMandate(Base):
    __tablename__ = "broker_mandates"

    id = Column(Integer, primary_key=True, index=True)
    landowner_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    broker_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=False)
    credits_amount = Column(Integer, nullable=False)  # Amount of credits assigned
    fee_percentage = Column(Float, nullable=False)  # e.g., 5.0 for 5%
    is_active = Column(Integer, default=1)  # 0 = inactive, 1 = active
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Transaction tracking
    fee_transaction_hash = Column(String, nullable=True)  # Transaction hash for fee transfer
    client_transaction_hash = Column(String, nullable=True)  # Transaction hash for client credits transfer
    house_address = Column(String, nullable=True)  # House address used for fee transfer
    
    # Recall tracking
    recalled_at = Column(DateTime(timezone=True), nullable=True)  # When mandate was recalled
    recall_transaction_hash = Column(String, nullable=True)  # Transaction hash for recall transfer
    is_recalled = Column(Integer, default=0)  # 0 = active, 1 = recalled

    # Relationships
    landowner = relationship("Account", foreign_keys=[landowner_account_id])
    broker = relationship("Account", foreign_keys=[broker_account_id])
    scheme = relationship("Scheme")


class ExchangeListing(Base):
    __tablename__ = "exchange_listings"

    id = Column(Integer, primary_key=True, index=True)
    owner_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    # Database scheme reference (FK to schemes.id)
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=False)
    # On-chain ERC-1155 tokenId for this scheme (mirrors Scheme.nft_token_id)
    nft_token_id = Column(Integer, nullable=False)
    catchment = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)  # "nitrate" or "phosphate"
    price_per_unit = Column(Float, nullable=False)
    quantity_units = Column(Integer, nullable=False)  # In credits
    reserved_units = Column(Integer, default=0)  # Units reserved but not yet sold
    status = Column(String, default="ACTIVE")  # ACTIVE, SOLD, CANCELLED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("Account")
    scheme = relationship("Scheme")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("exchange_listings.id"), nullable=True)  # Optional for order-based trades
    buyer_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    seller_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=False)
    quantity_units = Column(Integer, nullable=False)  # In credits
    price_per_unit = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)  # quantity_units * price_per_unit
    transaction_hash = Column(String, nullable=True)  # On-chain transaction hash
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    listing = relationship("ExchangeListing")
    buyer = relationship("Account", foreign_keys=[buyer_account_id])
    seller = relationship("Account", foreign_keys=[seller_account_id])
    scheme = relationship("Scheme")


class PlanningApplication(Base):
    __tablename__ = "planning_applications"

    id = Column(Integer, primary_key=True, index=True)
    developer_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    catchment = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)  # "nitrate" or "phosphate"
    required_tonnage = Column(Float, nullable=False)
    planning_reference = Column(String, nullable=True)
    application_token = Column(String, nullable=False, unique=True)  # QR token
    on_chain_application_id = Column(Integer, nullable=True)  # From PlanningLock contract
    status = Column(String, default="PENDING")  # PENDING, APPROVED, REJECTED
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    developer = relationship("Account")
    schemes = relationship("PlanningApplicationScheme", back_populates="application")


class PlanningApplicationScheme(Base):
    __tablename__ = "planning_application_schemes"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("planning_applications.id"), nullable=False)
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=False)
    tonnes_allocated = Column(Float, nullable=False)
    credits_allocated = Column(Integer, nullable=False)  # ERC-1155 units

    # Relationships
    application = relationship("PlanningApplication", back_populates="schemes")
    scheme = relationship("Scheme")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    order_type = Column(String, nullable=False)  # "LIMIT" or "MARKET"
    side = Column(String, nullable=False)  # "BUY" or "SELL"
    catchment = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)  # "nitrate" or "phosphate"
    price_per_unit = Column(Float, nullable=True)  # NULL for market orders
    quantity_units = Column(Integer, nullable=False)  # Total quantity in credits
    filled_quantity = Column(Integer, default=0)  # Credits filled so far
    remaining_quantity = Column(Integer, nullable=False)  # Credits remaining
    status = Column(String, default="PENDING")  # PENDING, PARTIALLY_FILLED, FILLED, CANCELLED
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=True)  # Optional, for tracking
    nft_token_id = Column(Integer, nullable=True)  # Optional, for on-chain transfers
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    account = relationship("Account")
    scheme = relationship("Scheme")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    catchment = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)  # "nitrate" or "phosphate"
    timeframe = Column(String, nullable=False)  # "1min", "5min", "15min", "1hr", "4hr", "1day"
    timestamp = Column(DateTime(timezone=True), nullable=False)  # Start of the period
    open_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=False)
    volume = Column(Integer, default=0)  # Total credits traded in this period
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MarketMakingBot(Base):
    __tablename__ = "market_making_bots"

    id = Column(Integer, primary_key=True, index=True)
    broker_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    catchment = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)  # "nitrate" or "phosphate"
    name = Column(String, nullable=False)
    is_active = Column(Integer, default=0)  # 0 = inactive, 1 = active
    strategy_config = Column(String, nullable=False)  # JSON string with strategy parameters
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    broker = relationship("Account", foreign_keys=[broker_account_id])
    assignments = relationship("BotAssignment", back_populates="bot")
    fifo_queues = relationship("FIFOCreditQueue", back_populates="bot")
    bot_orders = relationship("BotOrder", back_populates="bot")


class BotAssignment(Base):
    __tablename__ = "bot_assignments"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("market_making_bots.id"), nullable=False)
    mandate_id = Column(Integer, ForeignKey("broker_mandates.id"), nullable=True)  # NULL for house account
    is_house_account = Column(Integer, default=0)  # 0 = client, 1 = house account
    priority_order = Column(Integer, nullable=False)  # For FIFO ordering within same timestamp
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Integer, default=1)  # 0 = inactive, 1 = active

    # Relationships
    bot = relationship("MarketMakingBot", back_populates="assignments")
    mandate = relationship("BrokerMandate")
    fifo_queues = relationship("FIFOCreditQueue", back_populates="assignment")


class FIFOCreditQueue(Base):
    __tablename__ = "fifo_credit_queues"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("market_making_bots.id"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("bot_assignments.id"), nullable=False)
    mandate_id = Column(Integer, ForeignKey("broker_mandates.id"), nullable=True)  # NULL for house account
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=False)
    credits_available = Column(Integer, nullable=False)  # Remaining credits in queue
    credits_traded = Column(Integer, default=0)  # Credits already traded
    queue_position = Column(Integer, nullable=False)  # FIFO order: 1 = first, 2 = second, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    bot = relationship("MarketMakingBot", back_populates="fifo_queues")
    assignment = relationship("BotAssignment", back_populates="fifo_queues")
    mandate = relationship("BrokerMandate")
    scheme = relationship("Scheme")


class BotOrder(Base):
    __tablename__ = "bot_orders"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("market_making_bots.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    strategy_price = Column(Float, nullable=False)  # Price calculated by bot strategy
    order_type = Column(String, nullable=False)  # "BID" or "ASK"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    bot = relationship("MarketMakingBot", back_populates="bot_orders")
    order = relationship("Order")


class SellLadderBot(Base):
    __tablename__ = "sell_ladder_bots"

    id = Column(Integer, primary_key=True, index=True)
    broker_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    catchment = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Integer, default=0)
    strategy_config = Column(String, nullable=False)  # Stored as JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    broker = relationship("Account", foreign_keys=[broker_account_id])
    assignments = relationship("SellLadderBotAssignment", back_populates="bot")
    bot_orders = relationship("SellLadderBotOrder", back_populates="bot")


class SellLadderBotAssignment(Base):
    __tablename__ = "sell_ladder_bot_assignments"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("sell_ladder_bots.id"), nullable=False)
    mandate_id = Column(Integer, ForeignKey("broker_mandates.id"), nullable=True)  # NULL for house account
    is_house_account = Column(Integer, default=0)  # 0 = client, 1 = house account
    priority_order = Column(Integer, nullable=False)  # For FIFO ordering within same timestamp
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Integer, default=1)  # 0 = inactive, 1 = active

    # Relationships
    bot = relationship("SellLadderBot", back_populates="assignments")
    mandate = relationship("BrokerMandate")
    fifo_queues = relationship("SellLadderFIFOCreditQueue", back_populates="assignment")


class SellLadderFIFOCreditQueue(Base):
    __tablename__ = "sell_ladder_fifo_credit_queues"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("sell_ladder_bots.id"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("sell_ladder_bot_assignments.id"), nullable=False)
    mandate_id = Column(Integer, ForeignKey("broker_mandates.id"), nullable=True)  # NULL for house account
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=False)
    credits_available = Column(Integer, nullable=False)  # Remaining credits in queue
    credits_traded = Column(Integer, default=0)  # Credits already traded
    queue_position = Column(Integer, nullable=False)  # FIFO order: 1 = first, 2 = second, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    bot = relationship("SellLadderBot")
    assignment = relationship("SellLadderBotAssignment", back_populates="fifo_queues")
    mandate = relationship("BrokerMandate")
    scheme = relationship("Scheme")


class SellLadderBotOrder(Base):
    __tablename__ = "sell_ladder_bot_orders"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("sell_ladder_bots.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    strategy_price = Column(Float, nullable=False)  # Price calculated by bot strategy
    price_level = Column(Integer, nullable=False)  # Price level (1 to N)
    fifo_queue_id = Column(Integer, ForeignKey("sell_ladder_fifo_credit_queues.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    bot = relationship("SellLadderBot", back_populates="bot_orders")
    order = relationship("Order")
    fifo_queue = relationship("SellLadderFIFOCreditQueue")
