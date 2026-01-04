"""
Fix broker and developer EVM addresses to use real Hardhat accounts.

This script:
1. Updates broker EVM address to Hardhat Account #2
2. Updates developer EVM address to Hardhat Account #5
3. Provides instructions for setting private keys in .env
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Account, AccountRole

# Hardhat default accounts
HARDHAT_ACCOUNTS = {
    2: {
        "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "private_key": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        "name": "Account #2"
    },
    5: {
        "address": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
        "private_key": "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
        "name": "Account #5"
    }
}


def fix_addresses():
    """Update broker and developer addresses to real Hardhat accounts"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("FIXING BROKER AND DEVELOPER EVM ADDRESSES")
        print("=" * 80)
        
        # Get accounts
        broker = db.query(Account).filter(Account.role == AccountRole.BROKER).first()
        developer = db.query(Account).filter(Account.role == AccountRole.DEVELOPER).first()
        
        if not broker:
            print("ERROR: Broker account not found")
            return
        if not developer:
            print("ERROR: Developer account not found")
            return
        
        print(f"\nCurrent addresses:")
        print(f"  Broker: {broker.evm_address}")
        print(f"  Developer: {developer.evm_address}")
        
        # Update broker to Account #2
        broker_old = broker.evm_address
        broker.evm_address = HARDHAT_ACCOUNTS[2]["address"]
        print(f"\nUpdating broker address:")
        print(f"  From: {broker_old}")
        print(f"  To: {broker.evm_address} ({HARDHAT_ACCOUNTS[2]['name']})")
        
        # Update developer to Account #5
        developer_old = developer.evm_address
        developer.evm_address = HARDHAT_ACCOUNTS[5]["address"]
        print(f"\nUpdating developer address:")
        print(f"  From: {developer_old}")
        print(f"  To: {developer.evm_address} ({HARDHAT_ACCOUNTS[5]['name']})")
        
        db.commit()
        
        print(f"\n[OK] Addresses updated successfully!")
        
        print(f"\n" + "=" * 80)
        print("NEXT STEPS - Update .env file:")
        print("=" * 80)
        print(f"\nAdd these lines to your backend/.env file:")
        print(f"\n# Broker Account #2")
        print(f"BROKER_PRIVATE_KEY={HARDHAT_ACCOUNTS[2]['private_key']}")
        print(f"\n# Developer Account #5")
        print(f"DEVELOPER_PRIVATE_KEY={HARDHAT_ACCOUNTS[5]['private_key']}")
        print(f"\n# Trading Account (Account #1)")
        print(f"TRADING_ACCOUNT_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
        print(f"TRADING_ACCOUNT_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d")
        print(f"\nAfter updating .env, restart the backend server.")
        print(f"\nThen run: python retroactive_transfer.py")
        print(f"to retry failed transfers.")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    skip_confirm = "--yes" in sys.argv or "-y" in sys.argv
    
    if not skip_confirm:
        response = input("\nThis will update broker and developer EVM addresses. Continue? (yes/no): ")
        if response.lower() not in ["yes", "y"]:
            print("Cancelled.")
            sys.exit(0)
    
    fix_addresses()

