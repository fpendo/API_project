"""
Post-Reset Fix Script
Run this after resetting the database to update addresses and keys.

This script:
1. Updates Broker and Developer addresses in the database to real Hardhat accounts
2. Updates the .env file with corresponding private keys
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Account, AccountRole
from dotenv import load_dotenv, set_key

# Hardhat default accounts
HARDHAT_ACCOUNTS = {
    2: {
        "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "private_key": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        "name": "Account #2 (Broker)"
    },
    5: {
        "address": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
        "private_key": "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
        "name": "Account #5 (Developer)"
    },
    1: {
        "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "private_key": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "name": "Account #1 (Trading Account)"
    }
}

def post_reset_fix():
    """Fix addresses and keys after database reset"""
    print("=" * 80)
    print("POST-RESET FIX: Updating Addresses and Keys")
    print("=" * 80)
    
    db = SessionLocal()
    skip_confirm = "--yes" in sys.argv or "-y" in sys.argv
    
    try:
        # Get accounts
        broker = db.query(Account).filter(Account.role == AccountRole.BROKER).first()
        developer = db.query(Account).filter(Account.role == AccountRole.DEVELOPER).first()
        
        if not broker:
            print("ERROR: Broker account not found. Did you seed the database?")
            return
        if not developer:
            print("ERROR: Developer account not found. Did you seed the database?")
            return
        
        print(f"\nCurrent database addresses:")
        print(f"  Broker: {broker.evm_address}")
        print(f"  Developer: {developer.evm_address}")
        
        # Check if addresses need updating
        needs_update = (
            broker.evm_address != HARDHAT_ACCOUNTS[2]["address"] or
            developer.evm_address != HARDHAT_ACCOUNTS[5]["address"]
        )
        
        if not needs_update:
            print("\n[INFO] Addresses are already correct. Checking .env file...")
        else:
            if not skip_confirm:
                print("\nThis will update:")
                print(f"  Broker: {broker.evm_address} → {HARDHAT_ACCOUNTS[2]['address']}")
                print(f"  Developer: {developer.evm_address} → {HARDHAT_ACCOUNTS[5]['address']}")
                response = input("\nContinue? (yes/no): ")
                if response.lower() not in ["yes", "y"]:
                    print("Cancelled.")
                    return
            
            # Update database addresses
            broker.evm_address = HARDHAT_ACCOUNTS[2]["address"]
            developer.evm_address = HARDHAT_ACCOUNTS[5]["address"]
            db.commit()
            print("\n[OK] Database addresses updated")
        
        # Update .env file
        env_file_path = 'backend/.env'
        if not os.path.exists(env_file_path):
            print(f"\n[WARNING] .env file not found at {env_file_path}")
            print("Creating .env file with required keys...")
        
        load_dotenv(dotenv_path=env_file_path)
        
        updated_keys = []
        
        # Update BROKER_PRIVATE_KEY
        current_broker_key = os.getenv("BROKER_PRIVATE_KEY")
        if current_broker_key != HARDHAT_ACCOUNTS[2]["private_key"]:
            set_key(env_file_path, "BROKER_PRIVATE_KEY", HARDHAT_ACCOUNTS[2]["private_key"])
            updated_keys.append("BROKER_PRIVATE_KEY")
        
        # Update DEVELOPER_PRIVATE_KEY
        current_dev_key = os.getenv("DEVELOPER_PRIVATE_KEY")
        if current_dev_key != HARDHAT_ACCOUNTS[5]["private_key"]:
            set_key(env_file_path, "DEVELOPER_PRIVATE_KEY", HARDHAT_ACCOUNTS[5]["private_key"])
            updated_keys.append("DEVELOPER_PRIVATE_KEY")
        
        # Update TRADING_ACCOUNT_ADDRESS and PRIVATE_KEY
        current_trading_addr = os.getenv("TRADING_ACCOUNT_ADDRESS")
        if current_trading_addr != HARDHAT_ACCOUNTS[1]["address"]:
            set_key(env_file_path, "TRADING_ACCOUNT_ADDRESS", HARDHAT_ACCOUNTS[1]["address"])
            updated_keys.append("TRADING_ACCOUNT_ADDRESS")
        
        current_trading_key = os.getenv("TRADING_ACCOUNT_PRIVATE_KEY")
        if current_trading_key != HARDHAT_ACCOUNTS[1]["private_key"]:
            set_key(env_file_path, "TRADING_ACCOUNT_PRIVATE_KEY", HARDHAT_ACCOUNTS[1]["private_key"])
            updated_keys.append("TRADING_ACCOUNT_PRIVATE_KEY")
        
        print("\n" + "=" * 80)
        print("FIX COMPLETE")
        print("=" * 80)
        
        if updated_keys:
            print(f"\n[OK] Updated {len(updated_keys)} keys in .env file:")
            for key in updated_keys:
                print(f"  - {key}")
        else:
            print("\n[INFO] All keys in .env file are already correct")
        
        print("\nFinal addresses:")
        print(f"  Broker: {broker.evm_address} ({HARDHAT_ACCOUNTS[2]['name']})")
        print(f"  Developer: {developer.evm_address} ({HARDHAT_ACCOUNTS[5]['name']})")
        print(f"  Trading Account: {HARDHAT_ACCOUNTS[1]['address']} ({HARDHAT_ACCOUNTS[1]['name']})")
        
        print("\n" + "=" * 80)
        print("NEXT STEPS:")
        print("=" * 80)
        print("1. Restart your backend server to load the new keys")
        print("2. If you had existing trades, run: python retroactive_transfer.py")
        print("=" * 80)
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    post_reset_fix()

