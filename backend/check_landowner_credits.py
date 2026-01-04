"""Check landowner's actual available credits"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, AccountRole, Scheme
from app.services.credits_summary import get_account_credits_summary

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Fix encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

db = SessionLocal()
try:
    print("=" * 70)
    print("LANDOWNER CREDITS CHECK")
    print("=" * 70)
    
    # Get landowner account
    landowner = db.query(Account).filter(Account.role == AccountRole.LANDOWNER).first()
    if not landowner:
        print("ERROR: No landowner account found")
        sys.exit(1)
    
    print(f"\nLandowner: {landowner.name} (ID: {landowner.id})")
    print(f"EVM Address: {landowner.evm_address}")
    
    # Get credits summary (should check trading account for landowners)
    trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
    holdings = get_account_credits_summary(landowner, db, trading_account_address=trading_account_address)
    
    print(f"\nTotal holdings entries: {len(holdings)}")
    print("\nHoldings by Catchment/Unit Type:")
    print("-" * 70)
    
    total_credits = 0
    total_locked = 0
    total_available = 0
    
    for holding in holdings:
        # For landowners, credits are in trading account
        personal_credits = holding.get("credits", 0)
        trading_credits = holding.get("trading_account_credits", 0)
        locked = holding.get("locked_credits", 0)
        
        # Available credits = trading account credits - locked (for landowners)
        available = max(0, trading_credits - locked)
        
        total_credits += trading_credits  # Use trading account credits for total
        total_locked += locked
        total_available += available
        
        print(f"\n{holding.get('scheme_name', 'Unknown')} (Scheme ID: {holding.get('scheme_id')})")
        print(f"  Catchment: {holding.get('catchment')}")
        print(f"  Unit Type: {holding.get('unit_type')}")
        print(f"  Personal Account Credits: {personal_credits:,}")
        print(f"  Trading Account Credits: {trading_credits:,}")
        print(f"  Locked Credits: {locked:,}")
        print(f"  Available Credits: {available:,}")
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total Credits: {total_credits:,}")
    print(f"Locked Credits: {total_locked:,}")
    print(f"Available Credits: {total_available:,}")
    
    # Check for existing orders
    from app.models import Order, ExchangeListing
    
    existing_orders = db.query(Order).filter(
        Order.account_id == landowner.id,
        Order.side == "SELL",
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
    ).all()
    
    existing_listings = db.query(ExchangeListing).filter(
        ExchangeListing.owner_account_id == landowner.id,
        ExchangeListing.status == "ACTIVE"
    ).all()
    
    reserved_from_orders = sum(o.remaining_quantity for o in existing_orders)
    reserved_from_listings = sum(l.quantity_units for l in existing_listings)
    total_reserved = reserved_from_orders + reserved_from_listings
    
    print(f"\nReserved Credits:")
    print(f"  From Orders: {reserved_from_orders:,}")
    print(f"  From Listings: {reserved_from_listings:,}")
    print(f"  Total Reserved: {total_reserved:,}")
    
    print(f"\nFree Credits (Available - Reserved): {total_available - total_reserved:,}")
    
    if total_available < 18000000:
        print(f"\n⚠️  WARNING: You only have {total_available:,} available credits, not 18M!")
    else:
        print(f"\n✓ You have {total_available:,} available credits (enough for 18M)")
    
finally:
    db.close()

