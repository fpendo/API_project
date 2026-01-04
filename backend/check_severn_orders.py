"""Check for SEVERN orders in the database."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal
from app.models import Order, SellLadderBot, SellLadderBotOrder

def check_severn_orders():
    db = SessionLocal()
    try:
        # Check bot status
        bot = db.query(SellLadderBot).filter(SellLadderBot.id == 3).first()
        if bot:
            print(f"\n=== Bot 3 Status ===")
            print(f"Name: {bot.name}")
            print(f"Catchment: {bot.catchment}")
            print(f"Unit Type: {bot.unit_type}")
            print(f"Active: {bot.is_active}")
        
        # Check for SEVERN orders
        print(f"\n=== SEVERN Orders ===")
        orders = db.query(Order).filter(
            Order.catchment == "SEVERN",
            Order.unit_type == "nitrate",
            Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
        ).all()
        
        print(f"Found {len(orders)} active SEVERN nitrate orders")
        for order in orders:
            print(f"  Order {order.id}: {order.side} {order.quantity_units:,} credits at £{order.price_per_unit}, status={order.status}, account_id={order.account_id}")
        
        # Check for sell ladder bot orders
        print(f"\n=== Sell Ladder Bot Orders ===")
        bot_orders = db.query(SellLadderBotOrder).filter(
            SellLadderBotOrder.bot_id == 3
        ).join(Order).all()
        
        print(f"Found {len(bot_orders)} bot order records")
        for bot_order in bot_orders:
            order = bot_order.order
            if order:
                print(f"  Bot Order {bot_order.id}: Order {order.id}, Level {bot_order.price_level}, Price £{bot_order.strategy_price}, Status={order.status}")
        
        # Check for any SEVERN orders (case variations)
        print(f"\n=== All SEVERN Orders (any case) ===")
        all_orders = db.query(Order).filter(
            Order.catchment.like("%SEVERN%"),
            Order.unit_type == "nitrate"
        ).all()
        print(f"Found {len(all_orders)} orders with SEVERN in catchment")
        for order in all_orders:
            print(f"  Order {order.id}: catchment='{order.catchment}', {order.side} {order.quantity_units:,} credits, status={order.status}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_severn_orders()


