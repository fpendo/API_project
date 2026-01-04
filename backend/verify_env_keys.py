"""
Verify that private keys in .env match the EVM addresses in the database.
"""
import sys
import os
from pathlib import Path
from web3 import Web3

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Account, AccountRole
from dotenv import load_dotenv

load_dotenv()

def verify_keys():
    """Verify private keys match addresses"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("VERIFYING PRIVATE KEYS MATCH ADDRESSES")
        print("=" * 80)
        
        # Check broker
        broker = db.query(Account).filter(Account.role == AccountRole.BROKER).first()
        if broker:
            broker_key = os.getenv("BROKER_PRIVATE_KEY")
            print(f"\nBroker: {broker.name}")
            print(f"  DB Address: {broker.evm_address}")
            if broker_key:
                w3 = Web3()
                key_account = w3.eth.account.from_key(broker_key)
                matches = key_account.address.lower() == broker.evm_address.lower()
                print(f"  Key Address: {key_account.address}")
                print(f"  Matches: {matches}")
                if not matches:
                    print(f"  ERROR: Private key doesn't match!")
            else:
                print(f"  ERROR: BROKER_PRIVATE_KEY not set")
        
        # Check developer
        developer = db.query(Account).filter(Account.role == AccountRole.DEVELOPER).first()
        if developer:
            developer_key = os.getenv("DEVELOPER_PRIVATE_KEY")
            print(f"\nDeveloper: {developer.name}")
            print(f"  DB Address: {developer.evm_address}")
            if developer_key:
                w3 = Web3()
                key_account = w3.eth.account.from_key(developer_key)
                matches = key_account.address.lower() == developer.evm_address.lower()
                print(f"  Key Address: {key_account.address}")
                print(f"  Matches: {matches}")
                if not matches:
                    print(f"  ERROR: Private key doesn't match!")
                    print(f"\n  CORRECT DEVELOPER_PRIVATE_KEY for Account #5:")
                    print(f"  0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6")
            else:
                print(f"  ERROR: DEVELOPER_PRIVATE_KEY not set")
        
        # Check trading account
        trading_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
        trading_key = os.getenv("TRADING_ACCOUNT_PRIVATE_KEY")
        print(f"\nTrading Account:")
        print(f"  Address: {trading_address}")
        if trading_key:
            w3 = Web3()
            key_account = w3.eth.account.from_key(trading_key)
            matches = key_account.address.lower() == trading_address.lower()
            print(f"  Key Address: {key_account.address}")
            print(f"  Matches: {matches}")
            if not matches:
                print(f"  ERROR: Private key doesn't match!")
        else:
            print(f"  ERROR: TRADING_ACCOUNT_PRIVATE_KEY not set")
        
    finally:
        db.close()

if __name__ == "__main__":
    verify_keys()

