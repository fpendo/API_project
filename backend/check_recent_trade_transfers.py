"""
Check why recent trades are failing to transfer on-chain.
"""
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Trade, Account, AccountRole, Scheme, Order
from dotenv import load_dotenv

load_dotenv()

def check_recent_trades():
    db = SessionLocal()
    try:
        developer = db.query(Account).filter(Account.role == AccountRole.DEVELOPER).first()
        if not developer:
            print("ERROR: Developer not found")
            return
        
        print("=" * 80)
        print("RECENT TRADE TRANSFER ANALYSIS")
        print("=" * 80)
        
        # Get trades from last hour
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        recent_trades = db.query(Trade).filter(
            Trade.buyer_account_id == developer.id,
            Trade.created_at >= one_hour_ago
        ).order_by(Trade.id.desc()).all()
        
        print(f"\nTrades in last hour: {len(recent_trades)}")
        
        failed_trades = []
        successful_trades = []
        
        for trade in recent_trades:
            scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
            seller = db.query(Account).filter(Account.id == trade.seller_account_id).first()
            
            if trade.transaction_hash:
                successful_trades.append(trade)
                print(f"\n  Trade #{trade.id}: SUCCESS")
                print(f"    TX Hash: {trade.transaction_hash}")
            else:
                failed_trades.append(trade)
                print(f"\n  Trade #{trade.id}: FAILED")
                print(f"    Seller: {seller.name if seller else 'N/A'} ({seller.role.value if seller else 'N/A'})")
                print(f"    Scheme: {scheme.name if scheme else 'N/A'} (NFT Token ID: {scheme.nft_token_id if scheme else 'N/A'})")
                print(f"    Quantity: {trade.quantity_units:,} credits")
                print(f"    Created: {trade.created_at}")
                
                # Check the order to see if it's a bot order
                orders = db.query(Order).filter(
                    Order.scheme_id == trade.scheme_id,
                    Order.side == "SELL",
                    Order.account_id == seller.id
                ).filter(
                    Order.created_at <= trade.created_at,
                    Order.updated_at >= trade.created_at - timedelta(minutes=5)
                ).all()
                
                if orders:
                    print(f"    Related Orders: {len(orders)}")
                    for order in orders:
                        print(f"      Order #{order.id}: Status={order.status}, Filled={order.filled_quantity}/{order.quantity_units}")
        
        print(f"\n" + "=" * 80)
        print(f"Summary:")
        print(f"  Successful: {len(successful_trades)}")
        print(f"  Failed: {len(failed_trades)}")
        
        if failed_trades:
            print(f"\n" + "=" * 80)
            print("DIAGNOSIS:")
            print("=" * 80)
            print("New trades are being created but on-chain transfers are failing.")
            print("\nPossible causes:")
            print("1. Backend server needs restart after .env update")
            print("2. Transfer function is throwing an error (check backend logs)")
            print("3. Contract approval issue")
            print("4. Insufficient balance in seller account")
            print("\nNext steps:")
            print("1. Check backend server logs for transfer errors")
            print("2. Verify seller has sufficient credits on-chain")
            print("3. Try running retroactive_transfer.py again for new trades")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_recent_trades()

