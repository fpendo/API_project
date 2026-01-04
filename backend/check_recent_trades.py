"""
Check recent trades to see if any failed to transfer on-chain.
"""
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models import Trade, Account, Scheme

def check_recent_trades():
    db = SessionLocal()
    try:
        # Get trades from the last hour
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        trades = db.query(Trade).filter(
            Trade.created_at >= one_hour_ago
        ).order_by(Trade.created_at.desc()).all()
        
        print(f"Found {len(trades)} trades in the last hour:\n")
        
        for trade in trades:
            buyer = db.query(Account).filter(Account.id == trade.buyer_account_id).first()
            seller = db.query(Account).filter(Account.id == trade.seller_account_id).first()
            scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
            
            print(f"Trade ID: {trade.id}")
            print(f"  Buyer: {buyer.name if buyer else 'Unknown'} ({buyer.role.value if buyer else 'N/A'})")
            print(f"  Seller: {seller.name if seller else 'Unknown'} ({seller.role.value if seller else 'N/A'})")
            print(f"  Scheme: {scheme.name if scheme else 'Unknown'} ({scheme.catchment if scheme else 'N/A'} {scheme.unit_type if scheme else 'N/A'})")
            print(f"  Quantity: {trade.quantity_units:,} credits")
            print(f"  Price: £{trade.price_per_unit:.6f}")
            print(f"  Transaction Hash: {trade.transaction_hash if trade.transaction_hash else 'NULL (FAILED TO TRANSFER)'}")
            print(f"  Created: {trade.created_at}")
            print()
        
        # Count trades without transaction hash
        failed_trades = [t for t in trades if not t.transaction_hash]
        if failed_trades:
            print(f"\n⚠️  WARNING: {len(failed_trades)} trades failed to transfer on-chain!")
            print("These trades need to be retried using retroactive_transfer.py")
        else:
            print("\n✅ All trades have transaction hashes")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_recent_trades()


