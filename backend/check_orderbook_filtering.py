"""
Check if orders are being filtered correctly by catchment in the order book API.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models import Order

def check_orderbook():
    db = SessionLocal()
    try:
        # Get all pending sell orders
        all_orders = db.query(Order).filter(
            Order.side == "SELL",
            Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
        ).all()
        
        print(f"All pending SELL orders:\n")
        for order in all_orders:
            print(f"Order ID: {order.id}, Catchment: '{order.catchment}', Unit Type: '{order.unit_type}', Price: £{order.price_per_unit:.6f}")
        
        print("\n" + "="*60 + "\n")
        
        # Test filtering for THAMES
        thames_orders = db.query(Order).filter(
            Order.side == "SELL",
            Order.catchment == "THAMES",
            Order.unit_type == "nitrate",
            Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
        ).all()
        
        print(f"THAMES nitrate orders: {len(thames_orders)}")
        for order in thames_orders:
            print(f"  Order ID: {order.id}, Catchment: '{order.catchment}', Price: £{order.price_per_unit:.6f}")
        
        print("\n" + "="*60 + "\n")
        
        # Test filtering for HUMBER
        humber_orders = db.query(Order).filter(
            Order.side == "SELL",
            Order.catchment == "HUMBER",
            Order.unit_type == "nitrate",
            Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
        ).all()
        
        print(f"HUMBER nitrate orders: {len(humber_orders)}")
        for order in humber_orders:
            print(f"  Order ID: {order.id}, Catchment: '{order.catchment}', Price: £{order.price_per_unit:.6f}")
        
        print("\n" + "="*60 + "\n")
        
        # Test case-insensitive filtering
        from sqlalchemy import func
        thames_orders_ci = db.query(Order).filter(
            Order.side == "SELL",
            func.upper(Order.catchment) == "THAMES",
            func.lower(Order.unit_type) == "nitrate",
            Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
        ).all()
        
        print(f"THAMES nitrate orders (case-insensitive): {len(thames_orders_ci)}")
        for order in thames_orders_ci:
            print(f"  Order ID: {order.id}, Catchment: '{order.catchment}', Price: £{order.price_per_unit:.6f}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_orderbook()


