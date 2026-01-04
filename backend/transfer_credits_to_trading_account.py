"""Transfer credits from landowner to trading account"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, Scheme, AccountRole
from app.services.exchange import transfer_credits_on_chain

# Fix encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def get_scheme_credits_abi():
    return [
        {
            "constant": True,
            "inputs": [
                {"name": "account", "type": "address"},
                {"name": "id", "type": "uint256"}
            ],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "id", "type": "uint256"},
                {"name": "account", "type": "address"}
            ],
            "name": "lockedBalance",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ]

print("=" * 70)
print("TRANSFERRING CREDITS TO TRADING ACCOUNT")
print("=" * 70)
print()

# Get environment variables
scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
landowner_key = os.getenv("LANDOWNER_PRIVATE_KEY")
regulator_key = os.getenv("REGULATOR_PRIVATE_KEY")
trading_account = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")

seller_private_key = landowner_key or regulator_key
if not seller_private_key:
    print("ERROR: Neither LANDOWNER_PRIVATE_KEY nor REGULATOR_PRIVATE_KEY is set!")
    sys.exit(1)

if not scheme_credits_address:
    print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS is not set!")
    sys.exit(1)

# Connect to blockchain
w3 = Web3(Web3.HTTPProvider(rpc_url))
if not w3.is_connected():
    print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
    sys.exit(1)

seller_account = w3.eth.account.from_key(seller_private_key)
seller_address = seller_account.address

print(f"Seller address (from private key): {seller_address}")
print(f"Trading account: {trading_account}")
print()

# Get contract
contract = w3.eth.contract(
    address=Web3.to_checksum_address(scheme_credits_address),
    abi=get_scheme_credits_abi()
)

# Get database info
db = SessionLocal()
try:
    # Get landowner
    landowner = db.query(Account).filter(Account.role == AccountRole.LANDOWNER).first()
    if not landowner:
        print("ERROR: No landowner found")
        sys.exit(1)
    
    print(f"Landowner: {landowner.name} (ID: {landowner.id})")
    print(f"Landowner EVM Address: {landowner.evm_address}")
    print()
    
    # Get all schemes
    schemes = db.query(Scheme).all()
    
    if not schemes:
        print("No schemes found")
        sys.exit(0)
    
    print("=" * 70)
    print("TRANSFERRING CREDITS")
    print("=" * 70)
    print()
    
    for scheme in schemes:
        if not scheme.nft_token_id:
            print(f"[SKIP] Scheme {scheme.id} ({scheme.name}) - No NFT token ID")
            continue
        
        # Check landowner balance
        try:
            # Check balance at landowner's DB address
            landowner_balance = contract.functions.balanceOf(
                Web3.to_checksum_address(landowner.evm_address),
                scheme.nft_token_id
            ).call()
            
            landowner_locked = contract.functions.lockedBalance(
                scheme.nft_token_id,
                Web3.to_checksum_address(landowner.evm_address)
            ).call()
            
            landowner_available = int(landowner_balance) - int(landowner_locked)
            
            # Check trading account balance
            trading_balance = contract.functions.balanceOf(
                Web3.to_checksum_address(trading_account),
                scheme.nft_token_id
            ).call()
            
            print(f"Scheme {scheme.id} ({scheme.name}):")
            print(f"  Landowner balance: {landowner_balance:,} credits (available: {landowner_available:,})")
            print(f"  Trading account balance: {trading_balance:,} credits")
            
            if landowner_available > 0:
                # Transfer all available credits to trading account
                credits_to_transfer = landowner_available
                print(f"  Transferring {credits_to_transfer:,} credits to trading account...")
                
                try:
                    # Determine which address to use for transfer
                    # If private key address matches landowner DB address, use DB address
                    # Otherwise, use the address from the private key
                    if seller_address.lower() == landowner.evm_address.lower():
                        transfer_from = landowner.evm_address
                    else:
                        # Check if seller address has credits
                        seller_balance = contract.functions.balanceOf(
                            Web3.to_checksum_address(seller_address),
                            scheme.nft_token_id
                        ).call()
                        if seller_balance > 0:
                            transfer_from = seller_address
                            credits_to_transfer = seller_balance
                        else:
                            transfer_from = landowner.evm_address
                    
                    tx_hash = transfer_credits_on_chain(
                        seller_address=transfer_from,
                        buyer_address=trading_account,
                        scheme_id=scheme.nft_token_id,
                        quantity_credits=credits_to_transfer,
                        seller_private_key=seller_private_key,
                        scheme_credits_address=scheme_credits_address,
                        rpc_url=rpc_url
                    )
                    print(f"  [OK] Transferred {credits_to_transfer:,} credits (tx: {tx_hash[:10]}...)")
                except Exception as e:
                    print(f"  ERROR: Failed to transfer: {str(e)}")
            else:
                print(f"  [SKIP] No available credits to transfer")
            
            print()
        
        except Exception as e:
            print(f"  ERROR: {str(e)}")
            print()
    
    print("=" * 70)
    print("TRANSFER COMPLETE")
    print("=" * 70)
    print()
    print("Credits should now be available in the trading account for selling.")
    
finally:
    db.close()



