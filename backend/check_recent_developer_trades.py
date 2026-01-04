"""
Check recent developer trades and their transaction status.
"""
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models import Trade, Account, Scheme, AccountRole

def check_recent_trades():
    db = SessionLocal()
    try:
        # Get developer account
        developer = db.query(Account).filter(Account.role == AccountRole.DEVELOPER).first()
        if not developer:
            print("ERROR: No developer account found")
            return
        
        print(f"Developer: {developer.name} (ID: {developer.id}, EVM: {developer.evm_address})\n")
        
        # Get trades from the last 2 hours
        from datetime import timezone
        two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
        
        trades = db.query(Trade).filter(
            Trade.buyer_account_id == developer.id,
            Trade.created_at >= two_hours_ago
        ).order_by(Trade.created_at.desc()).all()
        
        print(f"Found {len(trades)} developer trades in the last 2 hours:\n")
        
        failed_count = 0
        for trade in trades:
            seller = db.query(Account).filter(Account.id == trade.seller_account_id).first()
            scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
            
            has_tx = trade.transaction_hash is not None
            status = "[OK] TRANSFERRED" if has_tx else "[FAILED] NO TX HASH"
            
            if not has_tx:
                failed_count += 1
            
            print(f"Trade ID: {trade.id} - {status}")
            print(f"  Seller: {seller.name if seller else 'Unknown'} ({seller.role.value if seller else 'N/A'})")
            print(f"  Scheme: {scheme.name if scheme else 'Unknown'} ({scheme.catchment if scheme else 'N/A'} {scheme.unit_type if scheme else 'N/A'})")
            print(f"  Quantity: {trade.quantity_units:,} credits")
            print(f"  Price: £{trade.price_per_unit:.6f}")
            print(f"  Total: £{trade.total_price:.6f}")
            print(f"  Transaction Hash: {trade.transaction_hash if trade.transaction_hash else 'NULL'}")
            print(f"  Created: {trade.created_at}")
            print()
        
        if failed_count > 0:
            print(f"\n[WARNING] {failed_count} trades failed to transfer on-chain!")
            print("These credits won't appear in your holdings until the transfer succeeds.")
            print("\nTo fix:")
            print("1. Make sure the backend has been restarted (to pick up new broker handling code)")
            print("2. Run: python backend/retroactive_transfer.py")
        else:
            print("\n[OK] All trades have transaction hashes")
            print("If credits still don't appear, check:")
            print("1. Refresh the page")
            print("2. Check the credits_summary API endpoint")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_recent_trades()

