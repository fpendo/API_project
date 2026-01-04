"""
Check sell ladder bot order structure to see why house/client detection is failing.
"""
import sys
import os
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Order, SellLadderBotOrder, SellLadderFIFOCreditQueue, SellLadderBotAssignment, Trade
from dotenv import load_dotenv

load_dotenv()

def check_order_structure():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("SELL LADDER BOT ORDER STRUCTURE CHECK")
        print("=" * 80)
        
        # Get recent failed trades
        recent_trades = db.query(Trade).filter(
            Trade.transaction_hash.is_(None)
        ).order_by(Trade.id.desc()).limit(5).all()
        
        print(f"\nRecent Failed Trades: {len(recent_trades)}")
        
        for trade in recent_trades:
            print(f"\n" + "-" * 80)
            print(f"Trade #{trade.id}: {trade.quantity_units:,} credits")
            print(f"  Seller Account ID: {trade.seller_account_id}")
            print(f"  Scheme ID: {trade.scheme_id}")
            print(f"  Created: {trade.created_at}")
            
            # Find the order that generated this trade
            # Look for orders around the trade time
            from datetime import timedelta
            orders = db.query(Order).filter(
                Order.scheme_id == trade.scheme_id,
                Order.side == "SELL",
                Order.account_id == trade.seller_account_id,
                Order.created_at <= trade.created_at,
                Order.updated_at >= trade.created_at - timedelta(minutes=5)
            ).all()
            
            print(f"  Related Orders: {len(orders)}")
            
            for order in orders:
                print(f"\n    Order #{order.id}:")
                print(f"      Status: {order.status}")
                print(f"      Filled: {order.filled_quantity:,}/{order.quantity_units:,}")
                
                # Check if it's a sell ladder bot order
                sell_ladder_order = db.query(SellLadderBotOrder).filter(
                    SellLadderBotOrder.order_id == order.id
                ).first()
                
                if sell_ladder_order:
                    print(f"      Is Sell Ladder Bot Order: YES")
                    print(f"      Bot ID: {sell_ladder_order.bot_id}")
                    print(f"      FIFO Queue ID: {sell_ladder_order.fifo_queue_id}")
                    print(f"      Price Level: {sell_ladder_order.price_level}")
                    
                    if sell_ladder_order.fifo_queue_id:
                        fifo_queue = db.query(SellLadderFIFOCreditQueue).filter(
                            SellLadderFIFOCreditQueue.id == sell_ladder_order.fifo_queue_id
                        ).first()
                        
                        if fifo_queue:
                            print(f"      FIFO Queue Entry:")
                            print(f"        Assignment ID: {fifo_queue.assignment_id}")
                            print(f"        Scheme ID: {fifo_queue.scheme_id}")
                            print(f"        Credits Available: {fifo_queue.credits_available:,}")
                            
                            if fifo_queue.assignment_id:
                                assignment = db.query(SellLadderBotAssignment).filter(
                                    SellLadderBotAssignment.id == fifo_queue.assignment_id
                                ).first()
                                
                                if assignment:
                                    print(f"      Assignment:")
                                    print(f"        Is House Account: {assignment.is_house_account == 1}")
                                    print(f"        Mandate ID: {assignment.mandate_id}")
                                    print(f"        Is Active: {assignment.is_active == 1}")
                                    
                                    if assignment.is_house_account == 1:
                                        print(f"      [OK] This is a HOUSE account order - should use house address")
                                    else:
                                        print(f"      [CLIENT] This is a CLIENT account order - should use broker address")
                                else:
                                    print(f"      ✗ ERROR: Assignment {fifo_queue.assignment_id} not found!")
                            else:
                                print(f"      ✗ ERROR: FIFO queue entry has no assignment_id!")
                        else:
                            print(f"      ✗ ERROR: FIFO queue entry {sell_ladder_order.fifo_queue_id} not found!")
                    else:
                        print(f"      ✗ ERROR: Sell ladder bot order has no fifo_queue_id!")
                        print(f"      This means order matching can't determine if it's house or client!")
                else:
                    print(f"      Is Sell Ladder Bot Order: NO")
        
        print("\n" + "=" * 80)
        print("DIAGNOSIS:")
        print("=" * 80)
        print("If sell ladder bot orders have no fifo_queue_id, order matching")
        print("can't determine if credits are in house or client account.")
        print("This causes it to default to broker address (which has 0 credits).")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_order_structure()

