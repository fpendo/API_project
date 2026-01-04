"""
Debug script to check locked credits on-chain for a developer
"""
import os
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, Scheme
from app.services.credits_summary import get_scheme_credits_abi

load_dotenv()

# Get environment variables
SCHEME_CREDITS_CONTRACT_ADDRESS = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")

if not SCHEME_CREDITS_CONTRACT_ADDRESS:
    print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set in environment")
    exit(1)

# Connect to database
db = SessionLocal()

try:
    # Get developer account (assuming account ID 5 is the developer)
    developer = db.query(Account).filter(Account.id == 5).first()
    
    if not developer:
        print("ERROR: Developer account not found")
        exit(1)
    
    if not developer.evm_address:
        print("ERROR: Developer has no EVM address")
        exit(1)
    
    print(f"Developer: {developer.name} (ID: {developer.id})")
    print(f"EVM Address: {developer.evm_address}")
    print()
    
    # Connect to blockchain
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    
    if not w3.is_connected():
        print("ERROR: Cannot connect to blockchain")
        exit(1)
    
    # Get contract
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(SCHEME_CREDITS_CONTRACT_ADDRESS),
        abi=get_scheme_credits_abi()
    )
    
    # Get all schemes
    schemes = db.query(Scheme).all()
    
    developer_address = Web3.to_checksum_address(developer.evm_address)
    
    print("Checking locked credits for each scheme:")
    print("-" * 80)
    
    total_locked = 0
    total_balance = 0
    
    for scheme in schemes:
        scheme_id = scheme.nft_token_id
        
        try:
            # Get balance
            balance = contract.functions.balanceOf(developer_address, scheme_id).call()
            balance = int(balance)
            
            # Get locked balance
            locked = contract.functions.lockedBalance(scheme_id, developer_address).call()
            locked = int(locked)
            
            if balance > 0 or locked > 0:
                available = balance - locked
                print(f"Scheme {scheme.id} (NFT Token ID: {scheme_id}) - {scheme.name}")
                print(f"  Catchment: {scheme.catchment}, Unit Type: {scheme.unit_type}")
                print(f"  Total Balance: {balance:,} credits ({balance/100000:.4f} tonnes)")
                print(f"  Locked: {locked:,} credits ({locked/100000:.4f} tonnes)")
                print(f"  Available: {available:,} credits ({available/100000:.4f} tonnes)")
                print()
                
                total_balance += balance
                total_locked += locked
        
        except Exception as e:
            print(f"Error checking scheme {scheme.id} (NFT Token ID: {scheme_id}): {e}")
            print()
    
    print("-" * 80)
    print(f"TOTAL BALANCE: {total_balance:,} credits ({total_balance/100000:.4f} tonnes)")
    print(f"TOTAL LOCKED: {total_locked:,} credits ({total_locked/100000:.4f} tonnes)")
    print(f"TOTAL AVAILABLE: {total_balance - total_locked:,} credits ({(total_balance - total_locked)/100000:.4f} tonnes)")

finally:
    db.close()



