"""Check bot orders and FIFO queue status"""
from app.db import SessionLocal
from app.models import MarketMakingBot, BotAssignment, FIFOCreditQueue, Order, Scheme

db = SessionLocal()
try:
    bot = db.query(MarketMakingBot).filter(MarketMakingBot.id == 2).first()
    if not bot:
        print("Bot 2 not found")
        exit(1)
    
    print(f"Bot: {bot.name}")
    print(f"  Catchment: '{bot.catchment}'")
    print(f"  Unit Type: '{bot.unit_type}'")
    print(f"  Active: {bot.is_active}")
    print(f"  Broker Account ID: {bot.broker_account_id}")
    
    # Check assignments
    assignments = db.query(BotAssignment).filter(BotAssignment.bot_id == 2).all()
    print(f"\nAssignments: {len(assignments)}")
    for a in assignments:
        print(f"  Assignment {a.id}: House={a.is_house_account}, Active={a.is_active}, Priority={a.priority_order}")
    
    # Check FIFO queues
    queues = db.query(FIFOCreditQueue).filter(FIFOCreditQueue.bot_id == 2).all()
    print(f"\nFIFO Queues: {len(queues)}")
    total_available = 0
    for q in queues:
        scheme = db.query(Scheme).filter(Scheme.id == q.scheme_id).first()
        print(f"  Queue {q.id}: Scheme {q.scheme_id} ({scheme.name if scheme else 'Unknown'})")
        print(f"    Available: {q.credits_available:,}")
        print(f"    Traded: {q.credits_traded:,}")
        print(f"    Position: {q.queue_position}")
        total_available += q.credits_available
    
    print(f"\nTotal Available Credits: {total_available:,}")
    
    # Check if there's a scheme for this catchment/unit_type
    schemes = db.query(Scheme).filter(
        Scheme.catchment == bot.catchment,
        Scheme.unit_type == bot.unit_type
    ).all()
    print(f"\nSchemes matching bot catchment/unit_type: {len(schemes)}")
    for s in schemes:
        print(f"  Scheme {s.id}: {s.name} - Catchment: '{s.catchment}'")
    
    # Check orders
    orders = db.query(Order).filter(Order.account_id == bot.broker_account_id).all()
    print(f"\nAll orders for broker account {bot.broker_account_id}: {len(orders)}")
    for o in orders:
        print(f"  Order {o.id}: {o.side} - Catchment: '{o.catchment}' - Unit: '{o.unit_type}' - Status: {o.status}")
        print(f"    Price: {o.price_per_unit}, Qty: {o.quantity_units}, Remaining: {o.remaining_quantity}")
    
    # Check orders matching bot's catchment/unit_type
    matching_orders = db.query(Order).filter(
        Order.account_id == bot.broker_account_id,
        Order.catchment == bot.catchment.upper(),
        Order.unit_type == bot.unit_type.lower()
    ).all()
    print(f"\nOrders matching bot's catchment/unit_type (case-normalized): {len(matching_orders)}")
    
finally:
    db.close()


