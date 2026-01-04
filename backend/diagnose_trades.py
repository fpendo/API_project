"""Diagnose why credits aren't showing after trades"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Trade, Account, Scheme
from app.services.credits_summary import get_account_credits_summary, get_scheme_credits_abi

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
    print("TRADE DIAGNOSIS")
    print("=" * 70)
    
    # Get developer account
    developer = db.query(Account).filter(Account.id == 5).first()
    if not developer:
        print("ERROR: Developer account (ID 5) not found")
        sys.exit(1)
    
    print(f"\nDeveloper: {developer.name}")
    print(f"EVM Address: {developer.evm_address}")
    
    # Get recent trades
    recent_trades = db.query(Trade).filter(
        Trade.buyer_account_id == developer.id
    ).order_by(Trade.id.desc()).limit(10).all()
    
    print(f"\nRecent Trades: {len(recent_trades)}")
    print("-" * 70)
    
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address:
        print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set in .env")
        sys.exit(1)
    
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print(f"ERROR: Not connected to blockchain at {rpc_url}")
        sys.exit(1)
    
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(scheme_credits_address),
        abi=get_scheme_credits_abi()
    )
    
    # Check each trade
    for trade in recent_trades:
        print(f"\nTrade #{trade.id}:")
        print(f"  Quantity: {trade.quantity_units:,} credits")
        print(f"  Transaction Hash: {trade.transaction_hash or 'NONE'}")
        
        scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
        if not scheme:
            print(f"  ERROR: Scheme {trade.scheme_id} not found in database")
            continue
        
        print(f"  Scheme: {scheme.name} (ID: {scheme.id}, NFT Token ID: {scheme.nft_token_id or 'NOT SET'})")
        
        if not scheme.nft_token_id:
            print(f"  WARNING: Scheme has no NFT Token ID - credits cannot be queried!")
            continue
        
        # Check on-chain balance for this scheme
        try:
            balance = contract.functions.balanceOf(
                Web3.to_checksum_address(developer.evm_address),
                scheme.nft_token_id
            ).call()
            print(f"  On-chain Balance: {balance:,} credits")
            
            if balance == 0 and trade.transaction_hash:
                print(f"  WARNING: Trade has tx hash but balance is 0 - transfer may have failed!")
        except Exception as e:
            print(f"  ERROR checking balance: {str(e)}")
    
    # Check all schemes in database
    print("\n" + "=" * 70)
    print("SCHEMES IN DATABASE")
    print("=" * 70)
    all_schemes = db.query(Scheme).all()
    print(f"Total schemes: {len(all_schemes)}")
    for scheme in all_schemes:
        print(f"  Scheme {scheme.id}: {scheme.name}")
        print(f"    NFT Token ID: {scheme.nft_token_id or 'NOT SET'}")
        print(f"    Catchment: {scheme.catchment}")
        if scheme.nft_token_id:
            try:
                balance = contract.functions.balanceOf(
                    Web3.to_checksum_address(developer.evm_address),
                    scheme.nft_token_id
                ).call()
                if balance > 0:
                    print(f"    Developer Balance: {balance:,} credits")
            except:
                pass
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    trades_with_tx = sum(1 for t in recent_trades if t.transaction_hash)
    trades_without_tx = len(recent_trades) - trades_with_tx
    print(f"Trades with transaction hash: {trades_with_tx}")
    print(f"Trades without transaction hash: {trades_without_tx}")
    
    if trades_without_tx > 0:
        print("\nISSUE: Some trades don't have transaction hashes!")
        print("This means on-chain transfers failed. Check backend logs for errors.")
    
    schemes_without_nft = sum(1 for s in all_schemes if not s.nft_token_id)
    if schemes_without_nft > 0:
        print(f"\nISSUE: {schemes_without_nft} scheme(s) don't have NFT Token IDs!")
        print("Run setup_after_redeploy.py to mint NFTs and set token IDs.")
    
finally:
    db.close()



