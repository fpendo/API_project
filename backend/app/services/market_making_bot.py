import json
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timezone
from ..models import (
    MarketMakingBot, BotAssignment, FIFOCreditQueue, BotOrder,
    Account, BrokerMandate, Scheme, Trade, Order, AccountRole
)


# Bot Management Functions

def create_bot(
    broker_id: int,
    catchment: str,
    unit_type: str,
    name: str,
    strategy_config: Dict,
    db: Session
) -> MarketMakingBot:
    """Create a new market making bot."""
    # Validate broker
    broker = db.query(Account).filter(Account.id == broker_id).first()
    if not broker or broker.role.value != "BROKER":
        raise ValueError("Invalid broker account")
    
    # Check if bot already exists for this catchment/unit_type
    existing = db.query(MarketMakingBot).filter(
        MarketMakingBot.broker_account_id == broker_id,
        MarketMakingBot.catchment == catchment,
        MarketMakingBot.unit_type == unit_type,
        MarketMakingBot.is_active == 1
    ).first()
    
    if existing:
        raise ValueError(f"Active bot already exists for {catchment} - {unit_type}")
    
    # Serialize strategy config to JSON string
    strategy_config_json = json.dumps(strategy_config)
    
    bot = MarketMakingBot(
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


def get_bot(bot_id: int, db: Session) -> Optional[MarketMakingBot]:
    """Get bot by ID."""
    return db.query(MarketMakingBot).filter(MarketMakingBot.id == bot_id).first()


def list_bots(
    broker_id: int,
    catchment: Optional[str] = None,
    unit_type: Optional[str] = None,
    db: Session = None
) -> List[MarketMakingBot]:
    """List bots with optional filters."""
    query = db.query(MarketMakingBot).filter(MarketMakingBot.broker_account_id == broker_id)
    
    if catchment:
        query = query.filter(MarketMakingBot.catchment == catchment)
    if unit_type:
        query = query.filter(MarketMakingBot.unit_type == unit_type)
    
    return query.order_by(MarketMakingBot.created_at.desc()).all()


def update_bot_strategy(bot_id: int, strategy_config: Dict, db: Session) -> MarketMakingBot:
    """Update bot strategy configuration."""
    bot = get_bot(bot_id, db)
    if not bot:
        raise ValueError("Bot not found")
    
    bot.strategy_config = json.dumps(strategy_config)
    bot.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(bot)
    
    return bot


def activate_bot(bot_id: int, db: Session) -> MarketMakingBot:
    """Activate a bot."""
    bot = get_bot(bot_id, db)
    if not bot:
        raise ValueError("Bot not found")
    
    bot.is_active = 1
    bot.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(bot)
    
    return bot


def deactivate_bot(bot_id: int, db: Session) -> MarketMakingBot:
    """Deactivate a bot."""
    bot = get_bot(bot_id, db)
    if not bot:
        raise ValueError("Bot not found")
    
    bot.is_active = 0
    bot.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(bot)
    
    return bot


# Assignment Management Functions

def assign_client_to_bot(bot_id: int, mandate_id: int, db: Session) -> BotAssignment:
    """Assign a client mandate to a bot."""
    bot = get_bot(bot_id, db)
    if not bot:
        raise ValueError("Bot not found")
    
    mandate = db.query(BrokerMandate).filter(BrokerMandate.id == mandate_id).first()
    if not mandate:
        raise ValueError("Mandate not found")
    
    if mandate.broker_account_id != bot.broker_account_id:
        raise ValueError("Mandate does not belong to this broker")
    
    if mandate.is_recalled == 1:
        raise ValueError("Cannot assign recalled mandate")
    
    # Check if already assigned
    existing = db.query(BotAssignment).filter(
        BotAssignment.bot_id == bot_id,
        BotAssignment.mandate_id == mandate_id,
        BotAssignment.is_active == 1
    ).first()
    
    if existing:
        raise ValueError("Mandate already assigned to this bot")
    
    # Get max priority order for this bot
    max_priority = db.query(func.max(BotAssignment.priority_order)).filter(
        BotAssignment.bot_id == bot_id
    ).scalar() or 0
    
    assignment = BotAssignment(
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
    initialize_fifo_queue_for_assignment(bot_id, assignment.id, mandate_id, db)
    
    # Recalculate queue positions
    recalculate_queue_positions(bot_id, db)
    
    return assignment


def assign_house_to_bot(bot_id: int, db: Session) -> BotAssignment:
    """Assign house account to a bot."""
    bot = get_bot(bot_id, db)
    if not bot:
        raise ValueError("Bot not found")
    
    # Check if house already assigned
    existing = db.query(BotAssignment).filter(
        BotAssignment.bot_id == bot_id,
        BotAssignment.is_house_account == 1,
        BotAssignment.is_active == 1
    ).first()
    
    if existing:
        raise ValueError("House account already assigned to this bot")
    
    # Get max priority order
    max_priority = db.query(func.max(BotAssignment.priority_order)).filter(
        BotAssignment.bot_id == bot_id
    ).scalar() or 0
    
    assignment = BotAssignment(
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
    initialize_fifo_queue_for_house(bot_id, assignment.id, db)
    
    # Recalculate queue positions
    recalculate_queue_positions(bot_id, db)
    
    return assignment


def remove_assignment(assignment_id: int, db: Session):
    """Remove an assignment from a bot."""
    assignment = db.query(BotAssignment).filter(BotAssignment.id == assignment_id).first()
    if not assignment:
        raise ValueError("Assignment not found")
    
    assignment.is_active = 0
    db.commit()
    
    # Recalculate queue positions
    recalculate_queue_positions(assignment.bot_id, db)


def get_bot_assignments(bot_id: int, db: Session) -> List[BotAssignment]:
    """Get all active assignments for a bot."""
    return db.query(BotAssignment).filter(
        BotAssignment.bot_id == bot_id,
        BotAssignment.is_active == 1
    ).order_by(BotAssignment.assigned_at.asc(), BotAssignment.priority_order.asc()).all()


# FIFO Queue Management Functions

def initialize_fifo_queue_for_assignment(
    bot_id: int,
    assignment_id: int,
    mandate_id: int,
    db: Session
):
    """Initialize FIFO queue entries for a client assignment."""
    from ..services.broker import get_broker_client_holdings
    from ..services.credits_summary import get_account_credits_summary
    
    mandate = db.query(BrokerMandate).filter(BrokerMandate.id == mandate_id).first()
    if not mandate:
        return
    
    broker = db.query(Account).filter(Account.id == mandate.broker_account_id).first()
    if not broker:
        return
    
    # Get broker's client holdings for this mandate
    holdings = get_broker_client_holdings(broker, db)
    
    # Filter holdings for schemes from this mandate
    mandate_schemes = db.query(Scheme).filter(Scheme.id == mandate.scheme_id).all()
    
    for scheme in mandate_schemes:
        # Find holdings for this scheme
        scheme_holdings = [h for h in holdings if h.get('scheme_id') == scheme.id]
        
        if scheme_holdings:
            # Get available credits for this scheme
            available_credits = scheme_holdings[0].get('available_credits', 0)
            
            if available_credits > 0:
                queue_entry = FIFOCreditQueue(
                    bot_id=bot_id,
                    assignment_id=assignment_id,
                    mandate_id=mandate_id,
                    scheme_id=scheme.id,
                    credits_available=available_credits,
                    credits_traded=0,
                    queue_position=0  # Will be recalculated
                )
                db.add(queue_entry)
    
    db.commit()


def initialize_fifo_queue_for_house(bot_id: int, assignment_id: int, db: Session):
    """Initialize FIFO queue entries for house account."""
    import os
    from ..services.broker import get_broker_house_holdings
    
    house_address = os.getenv("BROKER_HOUSE_ADDRESS")
    if not house_address:
        return
    
    holdings = get_broker_house_holdings(house_address, db)
    
    for holding in holdings:
        scheme_id = holding.get('scheme_id')
        available_credits = holding.get('available_credits', 0)
        
        if available_credits > 0 and scheme_id:
            queue_entry = FIFOCreditQueue(
                bot_id=bot_id,
                assignment_id=assignment_id,
                mandate_id=None,
                scheme_id=scheme_id,
                credits_available=available_credits,
                credits_traded=0,
                queue_position=0  # Will be recalculated
            )
            db.add(queue_entry)
    
    db.commit()


def recalculate_queue_positions(bot_id: int, db: Session):
    """Recalculate FIFO queue positions based on assignment timestamps."""
    # Get all active assignments ordered by assigned_at and priority_order
    assignments = db.query(BotAssignment).filter(
        BotAssignment.bot_id == bot_id,
        BotAssignment.is_active == 1
    ).order_by(
        BotAssignment.assigned_at.asc(),
        BotAssignment.priority_order.asc()
    ).all()
    
    # Create a mapping of assignment_id to position
    position_map = {}
    for idx, assignment in enumerate(assignments, start=1):
        position_map[assignment.id] = idx
    
    # Update all queue entries
    queue_entries = db.query(FIFOCreditQueue).filter(
        FIFOCreditQueue.bot_id == bot_id
    ).all()
    
    for entry in queue_entries:
        if entry.assignment_id in position_map:
            entry.queue_position = position_map[entry.assignment_id]
    
    db.commit()


def get_next_credits_from_queue(bot_id: int, quantity: int, db: Session) -> Tuple[int, Optional[int]]:
    """
    Get credits from FIFO queue.
    Returns: (credits_available, queue_entry_id)
    """
    # Get queue entries ordered by position, then by scheme
    queue_entries = db.query(FIFOCreditQueue).filter(
        FIFOCreditQueue.bot_id == bot_id,
        FIFOCreditQueue.credits_available > 0
    ).order_by(
        FIFOCreditQueue.queue_position.asc(),
        FIFOCreditQueue.id.asc()
    ).all()
    
    if not queue_entries:
        return 0, None
    
    # Get credits from first available queue entry
    first_entry = queue_entries[0]
    available = min(first_entry.credits_available, quantity)
    
    return available, first_entry.id


def update_queue_after_trade(queue_entry_id: int, credits_traded: int, db: Session):
    """Update FIFO queue after a trade."""
    queue_entry = db.query(FIFOCreditQueue).filter(FIFOCreditQueue.id == queue_entry_id).first()
    if not queue_entry:
        return
    
    queue_entry.credits_traded += credits_traded
    queue_entry.credits_available -= credits_traded
    
    if queue_entry.credits_available < 0:
        queue_entry.credits_available = 0
    
    db.commit()


# Strategy Functions

def is_market_new(catchment: str, unit_type: str, db: Session) -> bool:
    """Check if market has any trades yet."""
    trade_count = db.query(Trade).join(Scheme).filter(
        Scheme.catchment == catchment,
        Scheme.unit_type == unit_type
    ).count()
    
    return trade_count == 0


def get_best_bid_price(catchment: str, unit_type: str, db: Session) -> Optional[float]:
    """Get best (highest) current bid price."""
    best_order = db.query(Order).join(Scheme).filter(
        Order.side == "BUY",
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"]),
        Scheme.catchment == catchment,
        Scheme.unit_type == unit_type,
        Order.price_per_unit.isnot(None)
    ).order_by(Order.price_per_unit.desc()).first()
    
    return best_order.price_per_unit if best_order else None


def get_best_ask_price(catchment: str, unit_type: str, db: Session) -> Optional[float]:
    """Get best (lowest) current ask price."""
    best_order = db.query(Order).join(Scheme).filter(
        Order.side == "SELL",
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"]),
        Scheme.catchment == catchment,
        Scheme.unit_type == unit_type,
        Order.price_per_unit.isnot(None)
    ).order_by(Order.price_per_unit.asc()).first()
    
    return best_order.price_per_unit if best_order else None


def calculate_reference_price(catchment: str, unit_type: str, db: Session, bot_config: Dict) -> float:
    """Calculate reference price with fallbacks for new markets."""
    # Priority 1: Recent trades
    recent_trades = db.query(Trade).join(Scheme).filter(
        Scheme.catchment == catchment,
        Scheme.unit_type == unit_type
    ).order_by(Trade.created_at.desc()).limit(10).all()
    
    if recent_trades:
        total_weight = 0
        weighted_sum = 0
        for i, trade in enumerate(recent_trades):
            weight = 10 - i
            weighted_sum += trade.price_per_unit * weight
            total_weight += weight
        return weighted_sum / total_weight
    
    # Priority 2: Best bid/ask
    best_bid = get_best_bid_price(catchment, unit_type, db)
    best_ask = get_best_ask_price(catchment, unit_type, db)
    
    if best_bid and best_ask:
        return (best_bid + best_ask) / 2.0
    elif best_bid:
        spread_pct = bot_config.get('spread_percentage', 4.0)
        return best_bid * (1 + spread_pct / 200.0)
    elif best_ask:
        spread_pct = bot_config.get('spread_percentage', 4.0)
        return best_ask * (1 - spread_pct / 200.0)
    
    # Priority 3: Base price (convert from per-tonne to per-credit)
    # 1 tonne = 100,000 credits, so price per credit = price per tonne / 100,000
    base_price_per_tonne = bot_config.get('base_price_per_tonne', 100.0)
    base_price_per_credit = base_price_per_tonne / 100000.0
    return base_price_per_credit


def calculate_bid_ask_prices(reference_price: float, spread_pct: float, inventory_ratio: float) -> Tuple[float, float]:
    """Calculate bid and ask prices based on reference price and spread."""
    base_spread = spread_pct / 100.0
    
    # Adjust spread based on inventory
    if inventory_ratio < 0.2:  # Low inventory
        spread_multiplier = 1.5
    elif inventory_ratio > 0.8:  # High inventory
        spread_multiplier = 0.7
    else:
        spread_multiplier = 1.0
    
    adjusted_spread = base_spread * spread_multiplier
    
    bid_price = reference_price * (1 - adjusted_spread / 2)
    ask_price = reference_price * (1 + adjusted_spread / 2)
    
    return bid_price, ask_price


def get_inventory_ratio(bot_id: int, db: Session) -> float:
    """Calculate current inventory ratio (0.0 to 1.0)."""
    # Get total assigned credits
    assignments = get_bot_assignments(bot_id, db)
    
    total_assigned = 0
    total_available = 0
    
    for assignment in assignments:
        if assignment.is_house_account == 1:
            # For house account, get from FIFO queues (already initialized)
            queues = db.query(FIFOCreditQueue).filter(
                FIFOCreditQueue.assignment_id == assignment.id
            ).all()
            for queue in queues:
                total_assigned += queue.credits_available + queue.credits_traded
                total_available += queue.credits_available
        else:
            # For client mandates, get from FIFO queues
            queues = db.query(FIFOCreditQueue).filter(
                FIFOCreditQueue.assignment_id == assignment.id
            ).all()
            for queue in queues:
                total_assigned += queue.credits_available + queue.credits_traded
                total_available += queue.credits_available
    
    if total_assigned == 0:
        return 0.5  # Default to middle if no inventory
    
    return total_available / total_assigned


def should_place_bid(inventory_ratio: float, threshold_low: float) -> bool:
    """Determine if bot should place bid order."""
    return inventory_ratio < threshold_low


def should_place_ask(inventory_ratio: float, threshold_high: float) -> bool:
    """Determine if bot should place ask order."""
    return inventory_ratio > threshold_high


def get_total_available_credits(bot_id: int, db: Session) -> int:
    """Get total available credits for a bot."""
    queues = db.query(FIFOCreditQueue).filter(
        FIFOCreditQueue.bot_id == bot_id
    ).all()
    
    return sum(queue.credits_available for queue in queues)


def calculate_order_size(bot: MarketMakingBot, order_type: str, db: Session) -> int:
    """Calculate order size based on bot configuration."""
    config = json.loads(bot.strategy_config)
    available = get_total_available_credits(bot.id, db)
    
    if order_type == 'BID':
        # For bids, use a percentage of available credits
        size_pct = config.get('bid_order_size_percentage', 0.1)
    else:  # ASK
        size_pct = config.get('ask_order_size_percentage', 0.1)
    
    order_size = int(available * size_pct)
    order_size = max(order_size, config.get('min_order_size_credits', 10000))
    order_size = min(order_size, config.get('max_order_size_credits', 1000000))
    
    return order_size


# Order Management Functions

def place_bot_orders(bot_id: int, db: Session):
    """Main function to place/update bot orders."""
    bot = get_bot(bot_id, db)
    if not bot:
        print(f"[BOT ERROR] Bot {bot_id} not found")
        return
    if bot.is_active == 0:
        print(f"[BOT SKIP] Bot {bot_id} is not active")
        return
    
    print(f"[BOT] Placing orders for bot {bot_id} ({bot.name}) - {bot.catchment} {bot.unit_type}")
    
    config = json.loads(bot.strategy_config)
    inventory_ratio = get_inventory_ratio(bot_id, db)
    print(f"[BOT] Inventory ratio: {inventory_ratio:.2f}")
    
    # Calculate reference price
    reference_price = calculate_reference_price(
        bot.catchment,
        bot.unit_type,
        db,
        config
    )
    print(f"[BOT] Reference price: £{reference_price:.2f}")
    
    # Check if new market
    is_new_market = is_market_new(bot.catchment, bot.unit_type, db)
    print(f"[BOT] New market: {is_new_market}")
    
    # Adjust spread for new markets
    effective_spread = config.get('spread_percentage', 4.0)
    if is_new_market:
        effective_spread *= config.get('new_market_spread_multiplier', 1.5)
    
    bid_price, ask_price = calculate_bid_ask_prices(
        reference_price,
        effective_spread,
        inventory_ratio
    )
    print(f"[BOT] Bid price: £{bid_price:.2f}, Ask price: £{ask_price:.2f}")
    
    # Cancel existing bot orders
    cancel_bot_orders(bot_id, db)
    
    # Place new orders
    if is_new_market:
        # New market: Place both orders
        initial_size_pct = config.get('initial_order_size_percentage', 0.1)
        available_credits = get_total_available_credits(bot_id, db)
        
        # Place ask order
        credits_to_sell = min(
            int(available_credits * initial_size_pct),
            config.get('max_order_size_credits', 1000000)
        )
        print(f"[BOT] New market: Available credits: {available_credits:,}, Credits to sell: {credits_to_sell:,}")
        if credits_to_sell >= config.get('min_order_size_credits', 10000):
            credits_from_queue, queue_id = get_next_credits_from_queue(bot_id, credits_to_sell, db)
            print(f"[BOT] Got {credits_from_queue:,} credits from queue (queue_id: {queue_id})")
            if credits_from_queue > 0:
                order_id = create_bot_limit_order(bot, 'SELL', ask_price, credits_from_queue, db)
                if order_id:
                    create_bot_order_record(bot_id, order_id, ask_price, 'ASK', db)
                else:
                    print(f"[BOT ERROR] Failed to create SELL order")
            else:
                print(f"[BOT ERROR] No credits available from queue")
        else:
            print(f"[BOT SKIP] Credits to sell ({credits_to_sell:,}) below minimum ({config.get('min_order_size_credits', 10000):,})")
        
        # Place bid order (smaller)
        credits_to_buy = min(
            int(available_credits * initial_size_pct * 0.5),
            config.get('max_order_size_credits', 1000000)
        )
        print(f"[BOT] Credits to buy: {credits_to_buy:,}")
        if credits_to_buy >= config.get('min_order_size_credits', 10000):
            order_id = create_bot_limit_order(bot, 'BUY', bid_price, credits_to_buy, db)
            if order_id:
                create_bot_order_record(bot_id, order_id, bid_price, 'BID', db)
            else:
                print(f"[BOT ERROR] Failed to create BUY order")
        else:
            print(f"[BOT SKIP] Credits to buy ({credits_to_buy:,}) below minimum ({config.get('min_order_size_credits', 10000):,})")
    else:
        # Established market: Use inventory-based logic
        if should_place_bid(inventory_ratio, config.get('inventory_threshold_low', 0.2)):
            credits_to_buy = calculate_order_size(bot, 'BID', db)
            if credits_to_buy > 0:
                order_id = create_bot_limit_order(bot, 'BUY', bid_price, credits_to_buy, db)
                if order_id:
                    create_bot_order_record(bot_id, order_id, bid_price, 'BID', db)
        
        if should_place_ask(inventory_ratio, config.get('inventory_threshold_high', 0.8)):
            credits_to_sell = calculate_order_size(bot, 'ASK', db)
            credits_from_queue, queue_id = get_next_credits_from_queue(bot_id, credits_to_sell, db)
            if credits_from_queue > 0:
                order_id = create_bot_limit_order(bot, 'SELL', ask_price, credits_from_queue, db)
                if order_id:
                    create_bot_order_record(bot_id, order_id, ask_price, 'ASK', db)


def create_bot_limit_order(bot: MarketMakingBot, side: str, price: float, quantity: int, db: Session) -> Optional[int]:
    """Create a limit order on behalf of the bot."""
    try:
        # Get a scheme for this catchment/unit_type (for order tracking)
        # Use case-insensitive matching for catchment
        scheme = db.query(Scheme).filter(
            func.upper(Scheme.catchment) == bot.catchment.upper(),
            Scheme.unit_type == bot.unit_type.lower()
        ).first()
        
        if not scheme:
            print(f"[BOT ERROR] No scheme found for catchment '{bot.catchment}' and unit_type '{bot.unit_type}'")
            # Try to find any scheme from the FIFO queue as fallback
            queue_entry = db.query(FIFOCreditQueue).filter(
                FIFOCreditQueue.bot_id == bot.id,
                FIFOCreditQueue.credits_available > 0
            ).first()
            if queue_entry:
                scheme = db.query(Scheme).filter(Scheme.id == queue_entry.scheme_id).first()
                if scheme:
                    print(f"[BOT FALLBACK] Using scheme {scheme.id} from FIFO queue")
        
        if not scheme:
            print(f"[BOT ERROR] Cannot create order: No scheme available")
            return None
        
        # Create order using broker's account
        # Normalize catchment to uppercase for consistency with order book
        order = Order(
            account_id=bot.broker_account_id,
            order_type="LIMIT",
            side=side,
            catchment=bot.catchment.upper(),  # Normalize to uppercase
            unit_type=bot.unit_type.lower(),   # Normalize to lowercase
            price_per_unit=price,
            quantity_units=quantity,
            remaining_quantity=quantity,
            filled_quantity=0,
            status="PENDING",
            scheme_id=scheme.id,
            nft_token_id=scheme.nft_token_id
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        print(f"[BOT SUCCESS] Created {side} order {order.id}: {quantity:,} credits at £{price:.2f} for {bot.catchment.upper()} {bot.unit_type.lower()}")
        
        # Try to match the order
        from ..services.order_matching import match_order
        match_order(order, db)
        
        return order.id
    except Exception as e:
        print(f"[BOT ERROR] Error creating bot order: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return None


def create_bot_order_record(bot_id: int, order_id: int, strategy_price: float, order_type: str, db: Session):
    """Create a BotOrder record to track bot-placed orders."""
    bot_order = BotOrder(
        bot_id=bot_id,
        order_id=order_id,
        strategy_price=strategy_price,
        order_type=order_type
    )
    db.add(bot_order)
    db.commit()


def cancel_bot_orders(bot_id: int, db: Session):
    """Cancel all active bot orders."""
    bot_orders = db.query(BotOrder).join(Order).filter(
        BotOrder.bot_id == bot_id,
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
    ).all()
    
    for bot_order in bot_orders:
        bot_order.order.status = "CANCELLED"
    
    db.commit()


def update_bot_orders(bot_id: int, db: Session):
    """Update existing bot orders based on new prices."""
    # Cancel old orders and place new ones
    cancel_bot_orders(bot_id, db)
    place_bot_orders(bot_id, db)

