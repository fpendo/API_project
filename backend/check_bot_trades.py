"""Check bot trades and prices"""
import json
from app.db import SessionLocal
from app.models import Trade, BotOrder, Order, MarketMakingBot

db = SessionLocal()
try:
    # Get recent trades for broker account 4
    trades = db.query(Trade).filter(
        Trade.seller_account_id == 4
    ).order_by(Trade.created_at.desc()).limit(10).all()
    
    print(f"Recent trades for broker (account 4): {len(trades)}\n")
    for trade in trades:
        print(f"Trade {trade.id}:")
        print(f"  Quantity: {trade.quantity_units:,} credits")
        print(f"  Price per unit: £{trade.price_per_unit:.6f}")
        print(f"  Total price: £{trade.total_price:.6f}")
        print(f"  Buyer: {trade.buyer_account_id}")
        print()
    
    # Check bot orders
    bot = db.query(MarketMakingBot).filter(MarketMakingBot.id == 2).first()
    if bot:
        config = json.loads(bot.strategy_config)
        print(f"Bot strategy config:")
        print(f"  base_price_per_tonne: {config.get('base_price_per_tonne', 'N/A')}")
        print(f"  spread_percentage: {config.get('spread_percentage', 'N/A')}")
        
        # Get recent bot orders
        bot_orders = db.query(BotOrder).filter(BotOrder.bot_id == 2).order_by(BotOrder.created_at.desc()).limit(5).all()
        print(f"\nRecent bot orders: {len(bot_orders)}")
        for bo in bot_orders:
            order = db.query(Order).filter(Order.id == bo.order_id).first()
            if order:
                print(f"  Order {order.id}: {order.side} - Strategy price: £{bo.strategy_price:.6f}, Order price: £{order.price_per_unit:.6f if order.price_per_unit else 0:.6f}")
        
finally:
    db.close()

