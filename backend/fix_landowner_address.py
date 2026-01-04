"""
Quick script to update landowner's evm_address in the database.
This fixes the address mismatch issue where credits are at one address
but the private key is for a different address.
"""
import sys
from app.db import SessionLocal
from app.models import Account, AccountRole

# Hardhat account #0 address (matches LANDOWNER_PRIVATE_KEY)
NEW_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

def fix_landowner_address():
    db = SessionLocal()
    try:
        # Find landowner account (usually ID 1, but let's find by role)
        landowner = db.query(Account).filter(Account.role == AccountRole.LANDOWNER).first()
        
        # If not found by role, try by ID (usually 1)
        if not landowner:
            landowner = db.query(Account).filter(Account.id == 1).first()
        
        if not landowner:
            print("ERROR: No landowner account found in database")
            print("Available accounts:")
            all_accounts = db.query(Account).all()
            for acc in all_accounts:
                print(f"  ID: {acc.id}, Name: {acc.name}, Role: {acc.role}, Address: {acc.evm_address}")
            return
        
        old_address = landowner.evm_address
        print(f"Found landowner account ID: {landowner.id}, Name: {landowner.name}")
        print(f"Current address: {old_address}")
        print(f"Updating to: {NEW_ADDRESS}")
        
        landowner.evm_address = NEW_ADDRESS
        db.commit()
        
        print(f"✓ Successfully updated landowner address!")
        print(f"  Old: {old_address}")
        print(f"  New: {NEW_ADDRESS}")
        print("")
        print("NOTE: Existing credits at the old address won't be accessible.")
        print("You'll need to mint new credits to the new address.")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    fix_landowner_address()

