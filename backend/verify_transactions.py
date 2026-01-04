"""
Verify if transaction hashes from trades actually succeeded on-chain.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, AccountRole, Trade

# Load .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def verify_transactions():
    """Verify transaction hashes from recent trades"""
    db = SessionLocal()
    try:
        # Get developer account
        developer = db.query(Account).filter(Account.id == 5).first()
        if not developer:
            print("ERROR: Developer account not found")
            return
        
        print("=" * 60)
        print("VERIFYING TRANSACTION HAShes")
        print("=" * 60)
        print(f"Developer: {developer.name}")
        print(f"EVM Address: {developer.evm_address}")
        print("")
        
        # Get recent trades
        trades = db.query(Trade).filter(
            Trade.buyer_account_id == developer.id
        ).order_by(Trade.id.desc()).limit(5).all()
        
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        try:
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            if not w3.is_connected():
                print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
                return
            
            print(f"Connected to blockchain at {rpc_url}")
            print("")
            
            for trade in trades:
                if trade.transaction_hash:
                    try:
                        tx_hash = trade.transaction_hash
                        if not tx_hash.startswith('0x'):
                            tx_hash = '0x' + tx_hash
                        
                        receipt = w3.eth.get_transaction_receipt(tx_hash)
                        status = "SUCCESS" if receipt.status == 1 else "FAILED"
                        
                        print(f"Trade #{trade.id}: {trade.quantity_units} credits")
                        print(f"  TX Hash: {tx_hash}")
                        print(f"  Status: {status}")
                        print(f"  Block: {receipt.blockNumber}")
                        
                        if receipt.status == 1:
                            # Check if transfer actually happened
                            # Look at logs to see TransferSingle event
                            print(f"  [OK] Transaction succeeded")
                        else:
                            print(f"  [FAILED] Transaction reverted!")
                        print("")
                    except Exception as e:
                        print(f"Trade #{trade.id}: Error verifying TX {trade.transaction_hash}")
                        print(f"  Error: {str(e)}")
                        print("")
                else:
                    print(f"Trade #{trade.id}: No transaction hash")
                    print("")
        
        except Exception as e:
            print(f"ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    verify_transactions()



