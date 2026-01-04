"""
Assign credits from landowner to broker's new client account.
This fixes the issue where broker address was changed and old credits are orphaned.
"""
import sys
import os
from pathlib import Path
import requests

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Account, AccountRole, Scheme
from dotenv import load_dotenv

load_dotenv()

def assign_credits_to_broker():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("ASSIGN CREDITS TO BROKER CLIENT ACCOUNT")
        print("=" * 80)
        
        # Find landowner
        landowner = db.query(Account).filter(Account.role == AccountRole.LANDOWNER).first()
        if not landowner:
            print("ERROR: No landowner found")
            return
        
        print(f"\nLandowner: {landowner.name} (ID: {landowner.id})")
        print(f"  EVM Address: {landowner.evm_address}")
        
        # Find broker
        broker = db.query(Account).filter(Account.role == AccountRole.BROKER).first()
        if not broker:
            print("ERROR: No broker found")
            return
        
        print(f"\nBroker: {broker.name} (ID: {broker.id})")
        print(f"  EVM Address: {broker.evm_address}")
        print(f"  (This is the NEW address that needs credits)")
        
        # Find a scheme (use Fred scheme)
        scheme = db.query(Scheme).filter(Scheme.name == "Fred").first()
        if not scheme:
            print("ERROR: Fred scheme not found")
            return
        
        print(f"\nScheme: {scheme.name} (ID: {scheme.id})")
        print(f"  NFT Token ID: {scheme.nft_token_id}")
        
        # Check landowner balance
        from web3 import Web3
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        if not scheme_credits_address:
            print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set")
            return
        
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print("ERROR: Cannot connect to Hardhat node")
            return
        
        from app.services.exchange import get_scheme_credits_abi
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        landowner_address = Web3.to_checksum_address(landowner.evm_address)
        total_balance = contract.functions.balanceOf(landowner_address, scheme.nft_token_id).call()
        locked_balance = contract.functions.lockedBalance(scheme.nft_token_id, landowner_address).call()
        available_credits = int(total_balance) - int(locked_balance)
        
        print(f"\nLandowner Balance:")
        print(f"  Total: {total_balance:,} credits")
        print(f"  Locked: {locked_balance:,} credits")
        print(f"  Available: {available_credits:,} credits")
        
        if available_credits < 100000:
            print(f"\nWARNING: Landowner has less than 100,000 credits available")
            print(f"  We'll assign what's available: {available_credits:,} credits")
            credits_to_assign = available_credits
        else:
            credits_to_assign = 100000  # Assign 100,000 credits (1 tonne)
        
        print(f"\n" + "=" * 80)
        print(f"READY TO ASSIGN CREDITS")
        print("=" * 80)
        print(f"  From: {landowner.name} ({landowner.evm_address})")
        print(f"  To: {broker.name} ({broker.evm_address})")
        print(f"  Scheme: {scheme.name} (NFT Token ID: {scheme.nft_token_id})")
        print(f"  Amount: {credits_to_assign:,} credits ({credits_to_assign / 100000.0:.2f} tonnes)")
        print(f"  Fee: 5% ({int(credits_to_assign * 0.05):,} credits to house)")
        print(f"  Client: 95% ({int(credits_to_assign * 0.95):,} credits to broker)")
        
        # Get API base URL
        api_base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        
        print(f"\nCalling API: {api_base_url}/landowner/assign-to-broker")
        
        response = requests.post(
            f"{api_base_url}/landowner/assign-to-broker",
            json={
                "landowner_account_id": landowner.id,
                "broker_account_id": broker.id,
                "scheme_id": scheme.id,
                "credits_amount": credits_to_assign,
                "fee_percentage": 5.0
            },
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n[SUCCESS] Credits assigned!")
            print(f"  Mandate ID: {data.get('mandate_id')}")
            print(f"  Message: {data.get('message')}")
            print(f"\nNow update the sell ladder bot assignment to use CLIENT account:")
            print(f"  Run: python fix_assignment_client_account.py")
        else:
            print(f"\n[ERROR] Assignment failed:")
            print(f"  Status: {response.status_code}")
            try:
                error_data = response.json()
                print(f"  Detail: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"  Response: {response.text}")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    assign_credits_to_broker()

