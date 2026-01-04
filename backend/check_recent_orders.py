"""
Check recent orders to see what catchment they have.
"""
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models import Order, SellLadderBotOrder, SellLadderBot

def check_recent_orders():
    db = SessionLocal()
    try:
        # Get orders from the last hour
        from datetime import timezone
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        
        orders = db.query(Order).filter(
            Order.created_at >= one_hour_ago,
            Order.side == "SELL"
        ).order_by(Order.created_at.desc()).all()
        
        print(f"Found {len(orders)} recent SELL orders:\n")
        
        for order in orders:
            # Check if this is a sell ladder bot order
            bot_order = db.query(SellLadderBotOrder).filter(
                SellLadderBotOrder.order_id == order.id
            ).first()
            
            if bot_order:
                bot = db.query(SellLadderBot).filter(SellLadderBot.id == bot_order.bot_id).first()
                print(f"Order ID: {order.id}")
                print(f"  Order Catchment: '{order.catchment}'")
                print(f"  Order Unit Type: '{order.unit_type}'")
                print(f"  Bot ID: {bot_order.bot_id}")
                if bot:
                    print(f"  Bot Name: {bot.name}")
                    print(f"  Bot Catchment: '{bot.catchment}'")
                    print(f"  Bot Unit Type: '{bot.unit_type}'")
                    print(f"  MISMATCH: Order catchment '{order.catchment}' != Bot catchment '{bot.catchment}'" if order.catchment != bot.catchment else "  Match: Order catchment matches bot catchment")
                print(f"  Scheme ID: {order.scheme_id}")
                if order.scheme_id:
                    from app.models import Scheme
                    scheme = db.query(Scheme).filter(Scheme.id == order.scheme_id).first()
                    if scheme:
                        print(f"  Scheme Catchment: '{scheme.catchment}'")
                        print(f"  Scheme Unit Type: '{scheme.unit_type}'")
                print(f"  Price: £{order.price_per_unit}")
                print(f"  Quantity: {order.quantity_units:,}")
                print(f"  Status: {order.status}")
                print(f"  Created: {order.created_at}")
                print()
        
    finally:
        db.close()

if __name__ == "__main__":
    check_recent_orders()


