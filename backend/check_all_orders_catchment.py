"""
Check all recent orders and their catchments to see if they're changing.
"""
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models import Order, SellLadderBotOrder, SellLadderBot

def check_all_orders():
    db = SessionLocal()
    try:
        # Get all recent orders
        from datetime import timezone
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        
        orders = db.query(Order).filter(
            Order.created_at >= one_hour_ago,
            Order.side == "SELL"
        ).order_by(Order.created_at.desc()).all()
        
        print(f"Found {len(orders)} recent SELL orders:\n")
        
        # Group by catchment
        by_catchment = {}
        for order in orders:
            catchment = order.catchment
            if catchment not in by_catchment:
                by_catchment[catchment] = []
            by_catchment[catchment].append(order)
        
        for catchment, order_list in by_catchment.items():
            print(f"Catchment: '{catchment}' - {len(order_list)} orders")
            for order in order_list[:5]:  # Show first 5
                bot_order = db.query(SellLadderBotOrder).filter(
                    SellLadderBotOrder.order_id == order.id
                ).first()
                
                if bot_order:
                    bot = db.query(SellLadderBot).filter(SellLadderBot.id == bot_order.bot_id).first()
                    print(f"  Order {order.id}: Bot='{bot.name if bot else 'N/A'}' (Bot catchment: '{bot.catchment if bot else 'N/A'}'), Order catchment='{order.catchment}', Price=£{order.price_per_unit:.6f}, Status={order.status}")
                else:
                    print(f"  Order {order.id}: Order catchment='{order.catchment}', Price=£{order.price_per_unit:.6f}, Status={order.status}")
            if len(order_list) > 5:
                print(f"  ... and {len(order_list) - 5} more")
            print()
        
        # Check for any orders where bot catchment != order catchment
        print("\nChecking for mismatches between bot catchment and order catchment:\n")
        mismatches = []
        for order in orders:
            bot_order = db.query(SellLadderBotOrder).filter(
                SellLadderBotOrder.order_id == order.id
            ).first()
            if bot_order:
                bot = db.query(SellLadderBot).filter(SellLadderBot.id == bot_order.bot_id).first()
                if bot and bot.catchment.upper() != order.catchment.upper():
                    mismatches.append((order, bot))
        
        if mismatches:
            print(f"Found {len(mismatches)} MISMATCHES:")
            for order, bot in mismatches:
                print(f"  Order {order.id}: Bot catchment='{bot.catchment}', Order catchment='{order.catchment}'")
        else:
            print("No mismatches found - all orders match their bot's catchment")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_all_orders()


