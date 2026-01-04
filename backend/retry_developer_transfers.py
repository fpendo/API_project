"""
Retry on-chain transfers for all developer trades.
This is needed when Hardhat node was restarted and on-chain state was lost.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Trade, Account, AccountRole, Scheme
from app.services.exchange import transfer_credits_on_chain

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def retry_developer_transfers():
    """Retry on-chain transfers for all developer trades"""
    db = SessionLocal()
    try:
        # Get developer account
        developer = db.query(Account).filter(Account.id == 5).first()
        if not developer:
            print("ERROR: Developer account (ID 5) not found")
            return
        
        print("=" * 60)
        print("RETRYING DEVELOPER TRANSFERS")
        print("=" * 60)
        print(f"Developer: {developer.name}")
        print(f"EVM Address: {developer.evm_address}")
        print("")
        
        # Get ALL trades where developer was buyer
        trades = db.query(Trade).filter(
            Trade.buyer_account_id == developer.id
        ).order_by(Trade.id.asc()).all()
        
        if not trades:
            print("No trades found for developer")
            return
        
        print(f"Found {len(trades)} trades to retry")
        print("")
        
        # Get environment variables
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        landowner_private_key = os.getenv("LANDOWNER_PRIVATE_KEY")
        regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
        trading_account_private_key = os.getenv("TRADING_ACCOUNT_PRIVATE_KEY")
        # Hardhat account #1 private key (default trading account)
        HARDHAT_TRADING_ACCOUNT_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
        
        if not scheme_credits_address:
            print("ERROR: Missing required environment variables")
            print(f"  SCHEME_CREDITS_CONTRACT_ADDRESS: {'set' if scheme_credits_address else 'NOT SET'}")
            return
        
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
            print("Make sure Hardhat node is running!")
            return
        
        print(f"[OK] Connected to blockchain at {rpc_url}")
        print(f"[OK] Contract address: {scheme_credits_address}")
        print("")
        
        success_count = 0
        fail_count = 0
        
        # Process each trade
        for trade in trades:
            try:
                seller = db.query(Account).filter(Account.id == trade.seller_account_id).first()
                scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
                
                if not seller or not scheme:
                    print(f"Trade #{trade.id}: Missing account or scheme data, skipping")
                    fail_count += 1
                    continue
                
                # Determine seller address (trading account for landowners)
                if seller.role == AccountRole.LANDOWNER:
                    actual_seller_address = trading_account_address
                    # Use trading account's private key when transferring FROM trading account
                    seller_private_key = trading_account_private_key or HARDHAT_TRADING_ACCOUNT_PRIVATE_KEY
                    print(f"[INFO] Transferring FROM trading account - using trading account private key")
                else:
                    actual_seller_address = seller.evm_address
                    # Use landowner/regulator private key for other sellers
                    seller_private_key = landowner_private_key or regulator_private_key
                
                if not seller_private_key:
                    print(f"  ERROR: No private key available for seller address {actual_seller_address}")
                    print(f"    For trading account: Set TRADING_ACCOUNT_PRIVATE_KEY in .env")
                    print(f"    For others: Set LANDOWNER_PRIVATE_KEY or REGULATOR_PRIVATE_KEY in .env")
                    fail_count += 1
                    continue
                
                print(f"Trade #{trade.id}: Retrying transfer of {trade.quantity_units:,} credits")
                print(f"  From: {actual_seller_address} ({seller.name})")
                print(f"  To: {developer.evm_address} ({developer.name})")
                print(f"  Scheme: {scheme.name} (NFT ID: {scheme.nft_token_id})")
                
                # Execute transfer
                tx_hash = transfer_credits_on_chain(
                    seller_address=actual_seller_address,
                    buyer_address=developer.evm_address,
                    scheme_id=scheme.nft_token_id,
                    quantity_credits=trade.quantity_units,
                    seller_private_key=seller_private_key,
                    scheme_credits_address=scheme_credits_address,
                    rpc_url=rpc_url
                )
                
                # Update trade with new transaction hash
                trade.transaction_hash = tx_hash
                db.commit()
                
                print(f"  [SUCCESS] New transaction hash: {tx_hash}")
                print("")
                success_count += 1
                
            except Exception as e:
                print(f"  [FAILED] Error: {str(e)}")
                print("")
                fail_count += 1
                db.rollback()
                continue
        
        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total trades: {len(trades)}")
        print(f"Successful: {success_count}")
        print(f"Failed: {fail_count}")
        print("")
        
        if success_count > 0:
            print("[OK] Some transfers completed. Run diagnose_developer_holdings.py to verify balances.")
        if fail_count > 0:
            print("[WARNING] Some transfers failed. Check errors above.")
            print("  Common causes:")
            print("  - Seller doesn't have enough credits (may need to re-mint)")
            print("  - Contract not deployed")
            print("  - Hardhat node not running")
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    retry_developer_transfers()


