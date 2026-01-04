"""Retry the failed transfer using the correct private key"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Trade
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
    # Get the most recent trade without a transaction hash
    trade = db.query(Trade).filter(
        Trade.buyer_account_id == 5,
        Trade.transaction_hash == None
    ).order_by(Trade.id.desc()).first()
    
    if not trade:
        print("No failed trades found")
        sys.exit(0)
    
    print(f"Retrying transfer for Trade #{trade.id}...")
    print(f"  Quantity: {trade.quantity_units} credits")
    
    from app.models import Account, Scheme
    scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
    buyer = db.query(Account).filter(Account.id == trade.buyer_account_id).first()
    seller = db.query(Account).filter(Account.id == trade.seller_account_id).first()
    
    trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
    actual_seller_address = trading_account_address  # Landowner trades use trading account
    
    # Use trading account's private key (Hardhat account #1)
    trading_account_key = os.getenv("TRADING_ACCOUNT_PRIVATE_KEY")
    if not trading_account_key:
        trading_account_key = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    print(f"  From: {actual_seller_address} (trading account)")
    print(f"  To: {buyer.evm_address} ({buyer.name})")
    print(f"  Scheme: {scheme.name} (NFT Token ID: {scheme.nft_token_id})")
    
    tx_hash = transfer_credits_on_chain(
        seller_address=actual_seller_address,
        buyer_address=buyer.evm_address,
        scheme_id=scheme.nft_token_id,
        quantity_credits=trade.quantity_units,
        seller_private_key=trading_account_key,
        scheme_credits_address=scheme_credits_address,
        rpc_url=rpc_url
    )
    
    print(f"SUCCESS! Transaction hash: {tx_hash}")
    
    # Update trade record
    trade.transaction_hash = tx_hash
    db.commit()
    print("Trade record updated!")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
finally:
    db.close()



