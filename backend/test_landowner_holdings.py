"""
Test what the landowner holdings API returns to see why transfer is disabled.
"""
import sys
import os
from pathlib import Path
import requests
import json

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Account, AccountRole
from dotenv import load_dotenv

load_dotenv()

def test_holdings():
    db = SessionLocal()
    try:
        landowner = db.query(Account).filter(Account.role == AccountRole.LANDOWNER).first()
        if not landowner:
            print("ERROR: Landowner not found")
            return
        
        print("=" * 80)
        print("TESTING LANDOWNER HOLDINGS API")
        print("=" * 80)
        print(f"\nLandowner: {landowner.name} (ID: {landowner.id})")
        print(f"EVM Address: {landowner.evm_address}")
        
        API_BASE_URL = "http://localhost:8000"
        endpoint = f"{API_BASE_URL}/accounts/{landowner.id}/credits-summary"
        
        print(f"\nCalling: {endpoint}")
        
        response = requests.get(endpoint)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            holdings = data.get('holdings', [])
            
            print(f"\nHoldings returned: {len(holdings)}")
            
            for h in holdings:
                print(f"\n" + "-" * 80)
                print(f"Scheme: {h.get('scheme_name')} (ID: {h.get('scheme_id')})")
                print(f"  Original Credits: {h.get('original_credits', 0):,}")
                print(f"  Current Credits (on-chain): {h.get('credits', 0):,}")
                print(f"  Locked Credits: {h.get('locked_credits', 0):,}")
                print(f"  Assigned Credits: {h.get('assigned_credits', 0):,}")
                print(f"  Trading Account Credits: {h.get('trading_account_credits', 0):,}")
                print(f"  Sold Credits: {h.get('sold_credits', 0):,}")
                print(f"  Available Credits: {h.get('available_credits', 0):,}")
                print(f"  Remaining Credits: {h.get('remaining_credits', 'NOT SET'):,}")
                
                # Calculate what frontend would use
                remainingCreditsForTransfer = h.get('remaining_credits')
                if remainingCreditsForTransfer is None:
                    remainingCreditsForTransfer = h.get('credits', 0) - h.get('locked_credits', 0) - h.get('assigned_credits', 0)
                
                print(f"\n  Frontend Calculation:")
                print(f"    remainingCreditsForTransfer = {remainingCreditsForTransfer:,}")
                print(f"    Transfer button disabled: {remainingCreditsForTransfer <= 0}")
                
                if remainingCreditsForTransfer <= 0:
                    print(f"\n  [PROBLEM] Transfer button is disabled!")
                    print(f"    Current credits: {h.get('credits', 0):,}")
                    print(f"    Locked: {h.get('locked_credits', 0):,}")
                    print(f"    Assigned: {h.get('assigned_credits', 0):,}")
                    print(f"    Calculation: {h.get('credits', 0):,} - {h.get('locked_credits', 0):,} - {h.get('assigned_credits', 0):,} = {remainingCreditsForTransfer:,}")
                    
                    # Check if assigned credits are already deducted from balance
                    if h.get('assigned_credits', 0) > 0:
                        print(f"\n  [ANALYSIS] Assigned credits ({h.get('assigned_credits', 0):,}) are being subtracted,")
                        print(f"    but they may already be deducted from the on-chain balance.")
                        print(f"    This would cause remaining_credits to be too low.")
        else:
            print(f"\nError: {response.text}")
        
    finally:
        db.close()

if __name__ == "__main__":
    test_holdings()

