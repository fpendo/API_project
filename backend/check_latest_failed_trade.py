"""
Check the most recent failed trade and why it failed.
"""
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Trade, Account, AccountRole, Scheme, Order, SellLadderBotOrder, SellLadderFIFOCreditQueue, SellLadderBotAssignment
from dotenv import load_dotenv

load_dotenv()

def check_latest_failed_trade():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("CHECKING LATEST FAILED TRADE")
        print("=" * 80)
        
        # Get the most recent trade without transaction hash
        failed_trade = db.query(Trade).filter(
            Trade.transaction_hash.is_(None)
        ).order_by(Trade.id.desc()).first()
        
        if not failed_trade:
            print("\n[OK] No failed trades found!")
            return
        
        print(f"\nMost Recent Failed Trade:")
        print(f"  Trade ID: {failed_trade.id}")
        print(f"  Quantity: {failed_trade.quantity_units:,} credits")
        print(f"  Created: {failed_trade.created_at}")
        
        seller = db.query(Account).filter(Account.id == failed_trade.seller_account_id).first()
        buyer = db.query(Account).filter(Account.id == failed_trade.buyer_account_id).first()
        scheme = db.query(Scheme).filter(Scheme.id == failed_trade.scheme_id).first()
        
        print(f"  Seller: {seller.name if seller else 'N/A'} ({seller.role.value if seller else 'N/A'})")
        print(f"  Buyer: {buyer.name if buyer else 'N/A'} ({buyer.role.value if buyer else 'N/A'})")
        print(f"  Scheme: {scheme.name if scheme else 'N/A'} (NFT Token ID: {scheme.nft_token_id if scheme else 'N/A'})")
        
        if seller and seller.role == AccountRole.BROKER:
            print(f"\n  Seller is BROKER - checking assignment...")
            
            # Find the order that generated this trade
            orders = db.query(Order).filter(
                Order.scheme_id == failed_trade.scheme_id,
                Order.side == "SELL",
                Order.account_id == seller.id,
                Order.created_at <= failed_trade.created_at,
                Order.updated_at >= failed_trade.created_at - timedelta(minutes=5)
            ).order_by(Order.id.desc()).limit(1).all()
            
            if orders:
                order = orders[0]
                print(f"  Related Order: #{order.id}")
                
                sell_ladder_order = db.query(SellLadderBotOrder).filter(
                    SellLadderBotOrder.order_id == order.id
                ).first()
                
                if sell_ladder_order:
                    print(f"  Is Sell Ladder Bot Order: YES")
                    print(f"  FIFO Queue ID: {sell_ladder_order.fifo_queue_id}")
                    
                    if sell_ladder_order.fifo_queue_id:
                        fifo_queue = db.query(SellLadderFIFOCreditQueue).filter(
                            SellLadderFIFOCreditQueue.id == sell_ladder_order.fifo_queue_id
                        ).first()
                        
                        if fifo_queue and fifo_queue.assignment_id:
                            assignment = db.query(SellLadderBotAssignment).filter(
                                SellLadderBotAssignment.id == fifo_queue.assignment_id
                            ).first()
                            
                            if assignment:
                                print(f"  Assignment:")
                                print(f"    Is House Account: {assignment.is_house_account == 1}")
                                print(f"    Mandate ID: {assignment.mandate_id}")
                                
                                if assignment.is_house_account == 0:
                                    print(f"\n  [PROBLEM] Assignment is marked as CLIENT account")
                                    print(f"    But broker client address has 0 credits!")
                                    print(f"    Credits are in HOUSE account (170,000 credits)")
                                    print(f"\n  [SOLUTION] Update assignment to mark as HOUSE account:")
                                    print(f"    Run: python fix_assignment_house_account.py")
                                else:
                                    print(f"\n  [OK] Assignment is marked as HOUSE account")
                                    print(f"    This should work - checking why transfer failed...")
        
        print(f"\n" + "=" * 80)
        print("DIAGNOSIS:")
        print("=" * 80)
        print("Check backend server logs for the actual error message.")
        print("The error should show why the transfer failed.")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_latest_failed_trade()

