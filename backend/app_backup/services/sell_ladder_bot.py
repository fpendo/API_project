import json
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timezone
from ..models import (
    SellLadderBot, SellLadderBotAssignment, SellLadderFIFOCreditQueue, SellLadderBotOrder,
    Account, BrokerMandate, Scheme, Trade, Order, AccountRole
)
from .market_making_bot import (
    calculate_reference_price, is_market_new, get_best_bid_price, get_best_ask_price
)


# Bot Management Functions

def create_sell_ladder_bot(
    broker_id: int,
    catchment: str,
    unit_type: str,
    name: str,
    strategy_config: Dict,
    db: Session
) -> SellLadderBot:
    """Create a new sell ladder bot."""
    # Validate broker
    broker = db.query(Account).filter(Account.id == broker_id).first()
    if not broker or broker.role.value != "BROKER":
        raise ValueError("Invalid broker account")
    
    # Check if bot already exists for this catchment/unit_type
    existing = db.query(SellLadderBot).filter(
        SellLadderBot.broker_account_id == broker_id,
        SellLadderBot.catchment == catchment.upper(),
        SellLadderBot.unit_type == unit_type.lower(),
        SellLadderBot.is_active == 1
    ).first()
    
    if existing:
        raise ValueError(f"Active sell ladder bot already exists for {catchment} - {unit_type}")
    
    # Serialize strategy config to JSON string
    strategy_config_json = json.dumps(strategy_config)
    
    bot = SellLadderBot(
        broker_account_id=broker_id,
        catchment=catchment.upper(),  # Normalize to uppercase for consistency
        unit_type=unit_type.lower(),   # Normalize to lowercase for consistency
        name=name,
        is_active=0,  # Inactive by default
        strategy_config=strategy_config_json
    )
    
    db.add(bot)
    db.commit()
    db.refresh(bot)
    
    return bot


def get_sell_ladder_bot(bot_id: int, db: Session) -> Optional[SellLadderBot]:
    """Get sell ladder bot by ID."""
    return db.query(SellLadderBot).filter(SellLadderBot.id == bot_id).first()


def list_sell_ladder_bots(
    broker_id: int,
    catchment: Optional[str] = None,
    unit_type: Optional[str] = None,
    db: Session = None
) -> List[SellLadderBot]:
    """List sell ladder bots with optional filters."""
    query = db.query(SellLadderBot).filter(SellLadderBot.broker_account_id == broker_id)
    
    if catchment:
        query = query.filter(SellLadderBot.catchment == catchment.upper())
    if unit_type:
        query = query.filter(SellLadderBot.unit_type == unit_type.lower())
    
    return query.order_by(SellLadderBot.created_at.desc()).all()


def update_sell_ladder_bot_strategy(bot_id: int, strategy_config: Dict, db: Session) -> SellLadderBot:
    """Update sell ladder bot strategy configuration."""
    bot = get_sell_ladder_bot(bot_id, db)
    if not bot:
        raise ValueError("Sell ladder bot not found")
    
    bot.strategy_config = json.dumps(strategy_config)
    bot.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(bot)
    
    return bot


def activate_sell_ladder_bot(bot_id: int, db: Session) -> SellLadderBot:
    """Activate a sell ladder bot and automatically place orders."""
    bot = get_sell_ladder_bot(bot_id, db)
    if not bot:
        raise ValueError("Sell ladder bot not found")
    
    bot.is_active = 1
    bot.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(bot)
    
    # Automatically place orders when activated
    try:
        place_sell_ladder_orders(bot_id, db)
        print(f"[SELL_LADDER_BOT] Automatically placed orders for bot {bot_id} upon activation")
    except Exception as e:
        print(f"[SELL_LADDER_BOT] Error placing orders on activation: {str(e)}")
        # Don't fail activation if order placement fails
    
    return bot


def deactivate_sell_ladder_bot(bot_id: int, db: Session) -> SellLadderBot:
    """Deactivate a sell ladder bot."""
    bot = get_sell_ladder_bot(bot_id, db)
    if not bot:
        raise ValueError("Sell ladder bot not found")
    
    bot.is_active = 0
    bot.updated_at = datetime.now(timezone.utc)
    
    # Cancel all active orders
    cancel_sell_ladder_orders(bot_id, db)
    
    db.commit()
    db.refresh(bot)
    
    return bot


# Assignment Functions

def assign_client_to_sell_ladder_bot(
    bot_id: int,
    mandate_id: int,
    db: Session
) -> SellLadderBotAssignment:
    """Assign a client mandate to a sell ladder bot."""
    bot = get_sell_ladder_bot(bot_id, db)
    if not bot:
        raise ValueError("Sell ladder bot not found")
    
    mandate = db.query(BrokerMandate).filter(BrokerMandate.id == mandate_id).first()
    if not mandate:
        raise ValueError("Mandate not found")
    
    if mandate.broker_account_id != bot.broker_account_id:
        raise ValueError("Mandate does not belong to this broker")
    
    if mandate.is_recalled:
        raise ValueError("Cannot assign recalled mandate")
    
    # Clean up any orphaned assignments (where bot doesn't exist)
    orphaned_assignments = db.query(SellLadderBotAssignment).filter(
        SellLadderBotAssignment.mandate_id == mandate_id,
        SellLadderBotAssignment.is_active == 1
    ).all()
    
    for assignment in orphaned_assignments:
        bot_exists = db.query(SellLadderBot).filter(SellLadderBot.id == assignment.bot_id).first()
        if not bot_exists:
            # Bot was deleted but assignment wasn't cleaned up - mark it inactive
            assignment.is_active = 0
    
    # Check if already assigned to THIS bot (active)
    existing = db.query(SellLadderBotAssignment).filter(
        SellLadderBotAssignment.bot_id == bot_id,
        SellLadderBotAssignment.mandate_id == mandate_id,
        SellLadderBotAssignment.is_active == 1
    ).first()
    
    if existing:
        raise ValueError("Client already assigned to this bot")
    
    # Check if assigned to ANY other bot (active)
    existing_other_bot = db.query(SellLadderBotAssignment).filter(
        SellLadderBotAssignment.mandate_id == mandate_id,
        SellLadderBotAssignment.is_active == 1,
        SellLadderBotAssignment.bot_id != bot_id
    ).first()
    
    if existing_other_bot:
        # Check if the other bot still exists
        other_bot = db.query(SellLadderBot).filter(SellLadderBot.id == existing_other_bot.bot_id).first()
        if other_bot:
            raise ValueError(f"Client already assigned to another bot: {other_bot.name}")
        else:
            # This shouldn't happen after cleanup, but just in case
            existing_other_bot.is_active = 0
    
    db.commit()
    
    # Get next priority order
    max_priority = db.query(func.max(SellLadderBotAssignment.priority_order)).filter(
        SellLadderBotAssignment.bot_id == bot_id
    ).scalar() or 0
    
    assignment = SellLadderBotAssignment(
        bot_id=bot_id,
        mandate_id=mandate_id,
        is_house_account=0,
        priority_order=max_priority + 1,
        is_active=1
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    # Initialize FIFO queue for this assignment
    initialize_fifo_queue_for_assignment(bot_id, assignment.id, db)
    
    return assignment


def assign_house_to_sell_ladder_bot(
    bot_id: int,
    db: Session
) -> SellLadderBotAssignment:
    """Assign house account to a sell ladder bot."""
    bot = get_sell_ladder_bot(bot_id, db)
    if not bot:
        raise ValueError("Sell ladder bot not found")
    
    # Check if house already assigned
    existing = db.query(SellLadderBotAssignment).filter(
        SellLadderBotAssignment.bot_id == bot_id,
        SellLadderBotAssignment.is_house_account == 1,
        SellLadderBotAssignment.is_active == 1
    ).first()
    
    if existing:
        raise ValueError("House account already assigned to this bot")
    
    # Get next priority order
    max_priority = db.query(func.max(SellLadderBotAssignment.priority_order)).filter(
        SellLadderBotAssignment.bot_id == bot_id
    ).scalar() or 0
    
    assignment = SellLadderBotAssignment(
        bot_id=bot_id,
        mandate_id=None,
        is_house_account=1,
        priority_order=max_priority + 1,
        is_active=1
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    # Initialize FIFO queue for house account
    initialize_fifo_queue_for_assignment(bot_id, assignment.id, db)
    
    return assignment


def remove_sell_ladder_assignment(assignment_id: int, db: Session):
    """Remove an assignment from a sell ladder bot."""
    assignment = db.query(SellLadderBotAssignment).filter(
        SellLadderBotAssignment.id == assignment_id
    ).first()
    
    if not assignment:
        raise ValueError("Assignment not found")
    
    if assignment.is_active == 0:
        raise ValueError("Assignment is already inactive")
    
    # Cancel any orders using credits from this assignment's FIFO queues
    # Find all FIFO queues for this assignment
    fifo_queues = db.query(SellLadderFIFOCreditQueue).filter(
        SellLadderFIFOCreditQueue.assignment_id == assignment_id
    ).all()
    
    # Cancel orders that use these FIFO queues
    for fifo_queue in fifo_queues:
        bot_orders = db.query(SellLadderBotOrder).filter(
            SellLadderBotOrder.fifo_queue_id == fifo_queue.id
        ).all()
        
        for bot_order in bot_orders:
            order = bot_order.order
            if order and order.status in ["PENDING", "PARTIALLY_FILLED"]:
                order.status = "CANCELLED"
                order.updated_at = datetime.now(timezone.utc)
    
    # Mark assignment as inactive
    assignment.is_active = 0
    
    db.commit()


def get_sell_ladder_bot_assignments(bot_id: int, db: Session) -> List[SellLadderBotAssignment]:
    """Get all assignments for a sell ladder bot."""
    return db.query(SellLadderBotAssignment).filter(
        SellLadderBotAssignment.bot_id == bot_id,
        SellLadderBotAssignment.is_active == 1
    ).order_by(SellLadderBotAssignment.priority_order).all()


# FIFO Queue Functions

def initialize_fifo_queue_for_assignment(bot_id: int, assignment_id: int, db: Session):
    """Initialize FIFO queue entries for a new assignment."""
    assignment = db.query(SellLadderBotAssignment).filter(
        SellLadderBotAssignment.id == assignment_id
    ).first()
    
    if not assignment:
        raise ValueError("Assignment not found")
    
    bot = get_sell_ladder_bot(bot_id, db)
    if not bot:
        raise ValueError("Sell ladder bot not found")
    
    # Get broker account
    broker = db.query(Account).filter(Account.id == bot.broker_account_id).first()
    if not broker:
        raise ValueError("Broker account not found")
    
    # Get holdings for this assignment
    if assignment.is_house_account:
        # Get house holdings
        import os
        house_address = os.getenv("BROKER_HOUSE_ADDRESS")
        if not house_address:
            print(f"[SELL_LADDER_BOT] ERROR: BROKER_HOUSE_ADDRESS not set")
            return
        from ..services.broker import get_broker_house_holdings
        holdings = get_broker_house_holdings(house_address, db)
        print(f"[SELL_LADDER_BOT] House holdings fetched: {len(holdings)} entries")
    else:
        # Get client holdings from mandate
        broker = db.query(Account).filter(Account.id == bot.broker_account_id).first()
        if not broker:
            print(f"[SELL_LADDER_BOT] ERROR: Broker account {bot.broker_account_id} not found")
            return
        
        # Get the mandate to find its scheme_id
        mandate = db.query(BrokerMandate).filter(BrokerMandate.id == assignment.mandate_id).first()
        if not mandate:
            print(f"[SELL_LADDER_BOT] ERROR: Mandate {assignment.mandate_id} not found")
            return
        
        from ..services.broker import get_broker_client_holdings
        holdings = get_broker_client_holdings(broker, db)
        print(f"[SELL_LADDER_BOT] Client holdings fetched: {len(holdings)} entries (before mandate filter)")
        
        # Filter to this mandate - check if mandate_id is in the mandates array
        holdings_before_mandate_filter = len(holdings)
        holdings = [h for h in holdings if any(m.get('mandate_id') == assignment.mandate_id for m in h.get('mandates', []))]
        print(f"[SELL_LADDER_BOT] After mandate filter (mandate_id={assignment.mandate_id}): {len(holdings)} entries (was {holdings_before_mandate_filter})")
        
        # Also filter by scheme_id from the mandate to ensure we get the right scheme
        if mandate.scheme_id:
            holdings = [h for h in holdings if h.get('scheme_id') == mandate.scheme_id]
            print(f"[SELL_LADDER_BOT] After scheme_id filter (scheme_id={mandate.scheme_id}): {len(holdings)} entries")
        
        if len(holdings) == 0 and holdings_before_mandate_filter > 0:
            print(f"[SELL_LADDER_BOT] DEBUG: Sample holding structure: {holdings_before_mandate_filter and get_broker_client_holdings(broker, db)[0] if get_broker_client_holdings(broker, db) else 'N/A'}")
            print(f"[SELL_LADDER_BOT] DEBUG: Looking for mandate_id={assignment.mandate_id}, scheme_id={mandate.scheme_id if mandate else 'N/A'}")
    
    # Filter by catchment and unit_type (case-insensitive comparison)
    holdings_before_catchment_filter = len(holdings)
    holdings = [h for h in holdings if h.get('catchment', '').upper() == bot.catchment.upper() and h.get('unit_type', '').lower() == bot.unit_type.lower()]
    print(f"[SELL_LADDER_BOT] After catchment/unit_type filter (bot.catchment={bot.catchment}, bot.unit_type={bot.unit_type}): {len(holdings)} entries (was {holdings_before_catchment_filter})")
    if len(holdings) > 0:
        print(f"[SELL_LADDER_BOT] First holding: catchment={holdings[0].get('catchment')}, unit_type={holdings[0].get('unit_type')}, scheme_id={holdings[0].get('scheme_id')}")
    
    # Get current max queue position for this bot
    max_position = db.query(func.max(SellLadderFIFOCreditQueue.queue_position)).filter(
        SellLadderFIFOCreditQueue.bot_id == bot_id
    ).scalar() or 0
    
    queue_position = max_position + 1
    
    # Create FIFO queue entries for each scheme
    for holding in holdings:
        scheme_id = holding.get('scheme_id')
        # Use available_credits (unlocked credits that can be traded)
        credits_available = holding.get('available_credits', 0) or holding.get('credits', 0)
        
        if credits_available > 0 and scheme_id:
            queue_entry = SellLadderFIFOCreditQueue(
                bot_id=bot_id,
                assignment_id=assignment_id,
                mandate_id=assignment.mandate_id,
                scheme_id=scheme_id,
                credits_available=credits_available,
                credits_traded=0,
                queue_position=queue_position
            )
            db.add(queue_entry)
            queue_position += 1
            print(f"[SELL_LADDER_BOT] Initialized FIFO queue: scheme {scheme_id}, {credits_available:,} credits")
    
    entries_created = queue_position - max_position - 1
    if entries_created == 0:
        print(f"[SELL_LADDER_BOT] WARNING: No FIFO queue entries created for assignment {assignment_id}. Holdings: {len(holdings)}")
        if len(holdings) > 0:
            print(f"[SELL_LADDER_BOT] DEBUG: Holdings had {len(holdings)} entries but none were added. First holding: {holdings[0]}")
    
    db.commit()
    print(f"[SELL_LADDER_BOT] FIFO queue initialization complete for assignment {assignment_id}. Created {entries_created} entries.")


def get_next_credits_from_queue(bot_id: int, quantity: int, db: Session) -> Tuple[int, Optional[int]]:
    """Get credits from FIFO queue for sell ladder bot."""
    # Get queue entries in FIFO order
    queue_entries = db.query(SellLadderFIFOCreditQueue).filter(
        SellLadderFIFOCreditQueue.bot_id == bot_id,
        SellLadderFIFOCreditQueue.credits_available > 0
    ).order_by(
        SellLadderFIFOCreditQueue.queue_position
    ).all()
    
    if not queue_entries:
        return 0, None
    
    # Get credits from first queue entry
    queue_entry = queue_entries[0]
    credits_to_use = min(quantity, queue_entry.credits_available)
    
    return credits_to_use, queue_entry.id


def update_queue_after_trade(queue_entry_id: int, credits_traded: int, db: Session):
    """Update FIFO queue after a trade."""
    queue_entry = db.query(SellLadderFIFOCreditQueue).filter(
        SellLadderFIFOCreditQueue.id == queue_entry_id
    ).first()
    if not queue_entry:
        return
    
    queue_entry.credits_traded += credits_traded
    queue_entry.credits_available -= credits_traded
    
    if queue_entry.credits_available < 0:
        queue_entry.credits_available = 0
    
    db.commit()


def get_total_available_credits(bot_id: int, db: Session) -> int:
    """Get total available credits for a sell ladder bot."""
    # Get all queue entries for debugging
    all_entries = db.query(SellLadderFIFOCreditQueue).filter(
        SellLadderFIFOCreditQueue.bot_id == bot_id
    ).all()
    
    print(f"[SELL_LADDER_BOT] get_total_available_credits: Found {len(all_entries)} queue entries for bot {bot_id}")
    for entry in all_entries:
        print(f"[SELL_LADDER_BOT]   Entry {entry.id}: scheme_id={entry.scheme_id}, credits_available={entry.credits_available:,}")
    
    total = db.query(func.sum(SellLadderFIFOCreditQueue.credits_available)).filter(
        SellLadderFIFOCreditQueue.bot_id == bot_id,
        SellLadderFIFOCreditQueue.credits_available > 0
    ).scalar()
    
    result = total or 0
    print(f"[SELL_LADDER_BOT] get_total_available_credits: Total = {result:,}")
    return result


# Order Management Functions

def place_sell_ladder_orders(bot_id: int, db: Session):
    """Main function to place/update sell ladder bot orders."""
    bot = get_sell_ladder_bot(bot_id, db)
    if not bot:
        print(f"[SELL_LADDER_BOT ERROR] Bot {bot_id} not found")
        return
    if bot.is_active == 0:
        print(f"[SELL_LADDER_BOT SKIP] Bot {bot_id} is not active")
        return
    
    print(f"[SELL_LADDER_BOT] Placing orders for bot {bot_id} ({bot.name}) - {bot.catchment} {bot.unit_type}")
    
    config = json.loads(bot.strategy_config)
    num_levels = config.get('num_price_levels', 5)
    price_increment_pct = config.get('price_increment_percentage', 1.0)
    order_size_per_level = config.get('order_size_per_level', 10000)
    min_order_size = config.get('min_order_size_credits', 1000)
    starting_price_per_credit = config.get('starting_price_per_credit', None)  # Optional: override reference price (per credit)
    starting_price_per_tonne = config.get('starting_price_per_tonne', None)  # Optional: override reference price (per tonne, legacy)
    base_price_per_tonne = config.get('base_price_per_tonne', 100.0)  # Default fallback price
    
    # Check if this is a new market (no trades yet)
    from ..models import Trade, Scheme
    trade_count = db.query(Trade).join(Scheme).filter(
        Scheme.catchment == bot.catchment,
        Scheme.unit_type == bot.unit_type
    ).count()
    
    is_new_market = trade_count == 0
    
    # Calculate reference price
    # Priority: If preset price is configured, use it (for first trades)
    # Otherwise, use market reference price if market exists
    if starting_price_per_credit is not None:
        # Preset price configured - use it (for setting up first trades)
        reference_price = starting_price_per_credit
        print(f"[SELL_LADDER_BOT] Using preset starting_price_per_credit: £{reference_price:.6f} per credit (market has {trade_count} trades)")
    elif starting_price_per_tonne is not None:
        # Preset price configured (per tonne) - use it
        reference_price = starting_price_per_tonne / 100000.0  # 1 tonne = 100,000 credits
        print(f"[SELL_LADDER_BOT] Using preset starting_price_per_tonne: £{starting_price_per_tonne:.2f} per tonne = £{reference_price:.6f} per credit (market has {trade_count} trades)")
    elif is_new_market:
        # New market and no preset: Use base_price_per_tonne
        reference_price = base_price_per_tonne / 100000.0
        print(f"[SELL_LADDER_BOT] New market - Using base_price_per_tonne: £{base_price_per_tonne:.2f} per tonne = £{reference_price:.6f} per credit")
    else:
        # Established market: Use market reference price
        reference_price = calculate_reference_price(
            bot.catchment,
            bot.unit_type,
            db,
            config
        )
        print(f"[SELL_LADDER_BOT] Established market ({trade_count} trades) - Using market reference price: £{reference_price:.6f}")
    
    # Calculate price levels
    price_levels = []
    for level in range(1, num_levels + 1):
        price = reference_price * (1 + (price_increment_pct / 100.0) * level)
        price_levels.append((level, price))
        print(f"[SELL_LADDER_BOT] Level {level}: £{price:.6f}")
    
    # Cancel existing orders that are no longer needed or at wrong prices
    cancel_sell_ladder_orders(bot_id, db)
    
    # Place orders for each price level
    for level, price in price_levels:
        # Check if order already exists at this level
        existing_order = db.query(SellLadderBotOrder).join(Order).filter(
            SellLadderBotOrder.bot_id == bot_id,
            SellLadderBotOrder.price_level == level,
            Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
        ).first()
        
        if existing_order:
            # Order already exists at this level, skip
            print(f"[SELL_LADDER_BOT] Order already exists at level {level}")
            continue
        
        # Get credits from FIFO queue
        total_available = get_total_available_credits(bot_id, db)
        credits_to_sell = min(order_size_per_level, total_available)
        
        if credits_to_sell < min_order_size:
            if total_available == 0:
                print(f"[SELL_LADDER_BOT] No credits in FIFO queue for level {level}. Bot needs assignments with credits.")
            else:
                print(f"[SELL_LADDER_BOT] Insufficient credits for level {level} ({credits_to_sell:,} < {min_order_size:,}, total available: {total_available:,})")
            continue
        
        credits_from_queue, queue_id = get_next_credits_from_queue(bot_id, credits_to_sell, db)
        
        if credits_from_queue == 0:
            print(f"[SELL_LADDER_BOT] No credits available from queue for level {level}")
            continue
        
        print(f"[SELL_LADDER_BOT] Placing order at level {level}: {credits_from_queue:,} credits at £{price:.6f}")
        
        # Create sell order
        order_id = create_sell_ladder_limit_order(bot, price, credits_from_queue, db)
        
        if order_id:
            # Create bot order record
            create_sell_ladder_bot_order_record(bot_id, order_id, price, level, queue_id, db)
            print(f"[SELL_LADDER_BOT] Order {order_id} created at level {level}")
        else:
            print(f"[SELL_LADDER_BOT ERROR] Failed to create order at level {level}")


def create_sell_ladder_limit_order(bot: SellLadderBot, price: float, quantity: int, db: Session) -> Optional[int]:
    """Create a limit sell order for sell ladder bot."""
    # Find matching scheme from FIFO queue
    queue_entry = db.query(SellLadderFIFOCreditQueue).filter(
        SellLadderFIFOCreditQueue.bot_id == bot.id,
        SellLadderFIFOCreditQueue.credits_available > 0
    ).order_by(SellLadderFIFOCreditQueue.queue_position).first()
    
    if not queue_entry:
        print(f"[SELL_LADDER_BOT ERROR] No queue entry found for bot {bot.id}")
        return None
    
    scheme = db.query(Scheme).filter(Scheme.id == queue_entry.scheme_id).first()
    if not scheme:
        print(f"[SELL_LADDER_BOT ERROR] Scheme {queue_entry.scheme_id} not found")
        return None
    
    # Verify catchment and unit_type match
    if scheme.catchment.upper() != bot.catchment.upper() or scheme.unit_type.lower() != bot.unit_type.lower():
        print(f"[SELL_LADDER_BOT ERROR] Scheme catchment/unit_type mismatch!")
        print(f"  Bot catchment: {bot.catchment}, Scheme catchment: {scheme.catchment}")
        print(f"  Bot unit_type: {bot.unit_type}, Scheme unit_type: {scheme.unit_type}")
        return None
    
    # Get broker account
    broker = db.query(Account).filter(Account.id == bot.broker_account_id).first()
    if not broker or not broker.evm_address:
        print(f"[SELL_LADDER_BOT ERROR] Broker account {bot.broker_account_id} not found or missing EVM address")
        return None
    
    # Create order - ALWAYS use bot.catchment (not scheme.catchment) to ensure consistency
    # The scheme's catchment should match, but we use bot.catchment as the source of truth
    print(f"[SELL_LADDER_BOT] Creating order: bot.catchment={bot.catchment}, scheme.catchment={scheme.catchment}, scheme_id={scheme.id}")
    order = Order(
        account_id=bot.broker_account_id,
        order_type="LIMIT",
        side="SELL",
        catchment=bot.catchment.upper(),  # Ensure uppercase for consistency
        unit_type=bot.unit_type.lower(),  # Ensure lowercase for consistency
        price_per_unit=price,
        quantity_units=quantity,
        filled_quantity=0,
        remaining_quantity=quantity,
        status="PENDING",
        scheme_id=scheme.id,
        nft_token_id=scheme.nft_token_id
    )
    
    db.add(order)
    db.commit()
    db.refresh(order)
    
    return order.id


def create_sell_ladder_bot_order_record(
    bot_id: int,
    order_id: int,
    strategy_price: float,
    price_level: int,
    fifo_queue_id: Optional[int],
    db: Session
):
    """Create a record linking sell ladder bot to order."""
    bot_order = SellLadderBotOrder(
        bot_id=bot_id,
        order_id=order_id,
        strategy_price=strategy_price,
        price_level=price_level,
        fifo_queue_id=fifo_queue_id
    )
    
    db.add(bot_order)
    db.commit()


def cancel_sell_ladder_orders(bot_id: int, db: Session):
    """Cancel all active orders for a sell ladder bot."""
    bot_orders = db.query(SellLadderBotOrder).join(Order).filter(
        SellLadderBotOrder.bot_id == bot_id,
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
    ).all()
    
    for bot_order in bot_orders:
        order = bot_order.order
        if order:
            order.status = "CANCELLED"
            order.updated_at = datetime.now(timezone.utc)
    
    db.commit()


def replenish_filled_level(bot_id: int, price_level: int, db: Session):
    """
    After a level is filled, add a NEW order at a HIGHER price level instead of replacing the filled one.
    This allows the ladder to shift up as the market moves up.
    """
    bot = get_sell_ladder_bot(bot_id, db)
    if not bot or bot.is_active == 0:
        return
    
    config = json.loads(bot.strategy_config)
    price_increment_pct = config.get('price_increment_percentage', 1.0)
    order_size_per_level = config.get('order_size_per_level', 10000)
    min_order_size = config.get('min_order_size_credits', 1000)
    num_levels = config.get('num_price_levels', 5)
    starting_price_per_credit = config.get('starting_price_per_credit', None)
    starting_price_per_tonne = config.get('starting_price_per_tonne', None)
    base_price_per_tonne = config.get('base_price_per_tonne', 100.0)
    
    # Check if this is a new market (same logic as place_sell_ladder_orders)
    from ..models import Trade, Scheme
    trade_count = db.query(Trade).join(Scheme).filter(
        Scheme.catchment == bot.catchment,
        Scheme.unit_type == bot.unit_type
    ).count()
    
    is_new_market = trade_count == 0
    
    # Calculate reference price (should reflect new market price after trades)
    if is_new_market:
        # New market: Use preset starting price
        if starting_price_per_credit is not None:
            reference_price = starting_price_per_credit
        elif starting_price_per_tonne is not None:
            reference_price = starting_price_per_tonne / 100000.0
        else:
            reference_price = base_price_per_tonne / 100000.0
    else:
        # Established market: Use market reference price (should be higher after trades)
        reference_price = calculate_reference_price(
            bot.catchment,
            bot.unit_type,
            db,
            config
        )
    
    # Find the highest current price level for this bot
    max_level_result = db.query(func.max(SellLadderBotOrder.price_level)).join(Order).filter(
        SellLadderBotOrder.bot_id == bot_id,
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
    ).scalar()
    
    current_max_level = max_level_result if max_level_result else 0
    
    # Add a NEW level at the top (above current max level)
    # This allows the ladder to shift up as the market moves up
    new_level = current_max_level + 1
    
    # Limit to reasonable number of levels (don't let it grow indefinitely)
    max_allowed_levels = num_levels * 2  # Allow up to 2x the configured levels
    if new_level > max_allowed_levels:
        print(f"[SELL_LADDER_BOT] Max levels reached ({max_allowed_levels}), not adding new level")
        return
    
    # Calculate price for the new higher level
    price = reference_price * (1 + (price_increment_pct / 100.0) * new_level)
    
    # Check if order already exists at this new level (shouldn't happen, but check anyway)
    existing_order = db.query(SellLadderBotOrder).join(Order).filter(
        SellLadderBotOrder.bot_id == bot_id,
        SellLadderBotOrder.price_level == new_level,
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
    ).first()
    
    if existing_order:
        # Order already exists at this level, don't add another
        print(f"[SELL_LADDER_BOT] Order already exists at new level {new_level}, skipping")
        return
    
    # Get credits from FIFO queue
    credits_to_sell = min(order_size_per_level, get_total_available_credits(bot_id, db))
    
    if credits_to_sell < min_order_size:
        print(f"[SELL_LADDER_BOT] Insufficient credits to add new level ({credits_to_sell} < {min_order_size})")
        return
    
    credits_from_queue, queue_id = get_next_credits_from_queue(bot_id, credits_to_sell, db)
    
    if credits_from_queue == 0:
        print(f"[SELL_LADDER_BOT] No credits available from queue for new level")
        return
    
    # Create sell order at the new higher level
    order_id = create_sell_ladder_limit_order(bot, price, credits_from_queue, db)
    
    if order_id:
        # Create bot order record at the new level
        create_sell_ladder_bot_order_record(bot_id, order_id, price, new_level, queue_id, db)
        print(f"[SELL_LADDER_BOT] Added NEW order at level {new_level} (after level {price_level} was filled): {credits_from_queue:,} credits at £{price:.6f} per credit")
        print(f"[SELL_LADDER_BOT] Reference price: £{reference_price:.6f}, Level increment: {price_increment_pct}%")


def get_sell_ladder_bot_order_by_order_id(order_id: int, db: Session) -> Optional[SellLadderBotOrder]:
    """Get sell ladder bot order by order ID."""
    return db.query(SellLadderBotOrder).filter(
        SellLadderBotOrder.order_id == order_id
    ).first()
