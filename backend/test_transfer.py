"""Test on-chain transfer to see what error occurs"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, Scheme, Trade
from app.services.exchange import transfer_credits_on_chain

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
    print("TESTING ON-CHAIN TRANSFER")
    print("=" * 70)
    
    # Get the most recent trade
    trade = db.query(Trade).filter(
        Trade.buyer_account_id == 5
    ).order_by(Trade.id.desc()).first()
    
    if not trade:
        print("No trades found")
        sys.exit(1)
    
    print(f"\nTesting transfer for Trade #{trade.id}:")
    print(f"  Quantity: {trade.quantity_units} credits")
    
    scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
    buyer = db.query(Account).filter(Account.id == trade.buyer_account_id).first()
    seller = db.query(Account).filter(Account.id == trade.seller_account_id).first()
    
    if not all([scheme, buyer, seller]):
        print("ERROR: Missing scheme, buyer, or seller")
        sys.exit(1)
    
    print(f"  Scheme: {scheme.name} (NFT Token ID: {scheme.nft_token_id})")
    print(f"  Buyer: {buyer.name} ({buyer.evm_address})")
    print(f"  Seller: {seller.name} ({seller.evm_address})")
    
    # Determine seller address (trading account for landowners)
    trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
    actual_seller_address = seller.evm_address
    if seller.role == "LANDOWNER":
        actual_seller_address = trading_account_address
        print(f"  Using trading account as seller: {actual_seller_address}")
    
    # Get environment variables
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    seller_private_key = os.getenv("LANDOWNER_PRIVATE_KEY")
    if not seller_private_key:
        seller_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    print(f"\nConfiguration:")
    print(f"  Contract: {scheme_credits_address}")
    print(f"  Private Key: {'SET' if seller_private_key else 'NOT SET'}")
    print(f"  RPC: {rpc_url}")
    
    if not all([scheme_credits_address, seller_private_key]):
        print("\nERROR: Missing configuration")
        sys.exit(1)
    
    # Test the transfer
    print(f"\nAttempting transfer...")
    try:
        tx_hash = transfer_credits_on_chain(
            seller_address=actual_seller_address,
            buyer_address=buyer.evm_address,
            scheme_id=scheme.nft_token_id,
            quantity_credits=trade.quantity_units,
            seller_private_key=seller_private_key,
            scheme_credits_address=scheme_credits_address,
            rpc_url=rpc_url
        )
        print(f"SUCCESS! Transaction hash: {tx_hash}")
        print(f"\nUpdating trade record...")
        trade.transaction_hash = tx_hash
        db.commit()
        print("Trade updated successfully!")
    except Exception as e:
        print(f"\nERROR: Transfer failed!")
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
    
finally:
    db.close()



