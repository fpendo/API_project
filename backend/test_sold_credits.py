"""
Test script to check if sold credits are being calculated correctly
"""
from app.db import SessionLocal
from app.models import Account, AccountRole
from app.services.credits_summary import get_account_credits_summary
import os
from dotenv import load_dotenv

load_dotenv()

db = SessionLocal()
try:
    landowner = db.query(Account).filter(Account.role == AccountRole.LANDOWNER).first()
    if not landowner:
        print("ERROR: No landowner found")
        exit(1)
    
    print(f"Landowner: {landowner.name} (ID: {landowner.id})")
    print("")
    
    trading_account = os.getenv('TRADING_ACCOUNT_ADDRESS', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8')
    summary = get_account_credits_summary(landowner, db, trading_account_address=trading_account)
    
    print(f"Summary returned {len(summary)} schemes:")
    print("")
    for s in summary:
        sold = s.get("sold_credits", 0)
        print(f"Scheme: {s['scheme_name']} (ID: {s['scheme_id']})")
        print(f"  Sold credits: {sold:,}")
        print(f"  Original credits: {s.get('original_credits', 0):,}")
        print(f"  Trading account: {s.get('trading_account_credits', 0):,}")
        print("")
finally:
    db.close()




