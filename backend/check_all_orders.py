"""Check all orders to understand the matching issue"""
from app.db import SessionLocal
from app.models import Order, Account, AccountRole, Scheme, Trade

db = SessionLocal()
try:
    print("=" * 70)
    print("ALL ORDERS")
    print("=" * 70)
    
    all_orders = db.query(Order).order_by(Order.id.asc()).all()
    print(f"\nTotal orders: {len(all_orders)}\n")
    
    for order in all_orders:
        account = db.query(Account).filter(Account.id == order.account_id).first()
        scheme = db.query(Scheme).filter(Scheme.id == order.scheme_id).first() if order.scheme_id else None
        print(f"Order #{order.id}:")
        print(f"  Account: {account.name if account else 'Unknown'} (ID: {account.id if account else 'N/A'})")
        print(f"  Side: {order.side}")
        print(f"  Quantity: {order.quantity_units:,} credits (Remaining: {order.remaining_quantity:,})")
        print(f"  Scheme: {scheme.name if scheme else 'None'} (ID: {order.scheme_id})")
        print(f"  Price: £{order.price_per_unit if order.price_per_unit else 'MARKET'}")
        print(f"  Status: {order.status}")
        print(f"  Catchment: {order.catchment}, Unit: {order.unit_type}")
        print()
    
    print("=" * 70)
    print("ALL TRADES")
    print("=" * 70)
    
    all_trades = db.query(Trade).order_by(Trade.id.asc()).all()
    print(f"\nTotal trades: {len(all_trades)}\n")
    
    for trade in all_trades:
        scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
        print(f"Trade #{trade.id}:")
        print(f"  Quantity: {trade.quantity_units:,} credits")
        print(f"  Scheme: {scheme.name if scheme else 'Unknown'} (ID: {trade.scheme_id})")
        print(f"  Price: £{trade.price_per_unit}")
        print(f"  Total: £{trade.total_price:,.2f}")
        print(f"  TX Hash: {trade.transaction_hash[:20] if trade.transaction_hash else 'NONE'}...")
        print()
    
finally:
    db.close()

