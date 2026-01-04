"""
Seed script to populate database with initial accounts and demo schemes.
Run with: python seed.py (from backend directory)
"""
from app.db import engine, Base, SessionLocal
from app.models import Account, AccountRole, Scheme


def seed_accounts():
    """Seed the database with initial accounts"""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if accounts already exist
        existing = db.query(Account).count()
        if existing > 0:
            print(f"Database already has {existing} accounts. Skipping seed.")
            return
        
        # Create accounts for each role
        accounts = [
            Account(
                name="John Landowner",
                role=AccountRole.LANDOWNER,
                evm_address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # Hardhat account #0 (matches LANDOWNER_PRIVATE_KEY)
            ),
            Account(
                name="Sarah Consultant",
                role=AccountRole.CONSULTANT,
                evm_address="0x2222222222222222222222222222222222222222"
            ),
            Account(
                name="Natural England Regulator",
                role=AccountRole.REGULATOR,
                evm_address="0x3333333333333333333333333333333333333333"
            ),
            Account(
                name="Mike Broker",
                role=AccountRole.BROKER,
                evm_address="0x4444444444444444444444444444444444444444"
            ),
            Account(
                name="DevCo Properties",
                role=AccountRole.DEVELOPER,
                evm_address="0x5555555555555555555555555555555555555555"
            ),
            Account(
                name="Planning Officer Smith",
                role=AccountRole.PLANNING_OFFICER,
                evm_address="0x6666666666666666666666666666666666666666"
            ),
            Account(
                name="Exchange Operator",
                role=AccountRole.OPERATOR,
                evm_address="0x7777777777777777777777777777777777777777"
            ),
        ]
        
        for account in accounts:
            db.add(account)
        
        db.commit()
        
        print(f"Seeded {len(accounts)} accounts:")
        for account in accounts:
            print(f"  - {account.name} ({account.role.value})")
        
        # Optionally seed some demo schemes (uncomment if needed)
        # Note: These should match the schemes minted in seed-dev.ts
        # schemes = [
        #     Scheme(
        #         nft_token_id=1,
        #         name="Solent Wetland A",
        #         catchment="SOLENT",
        #         location="Solent marshes – parcel 7",
        #         unit_type="nitrate",
        #         original_tonnage=50.0,
        #         remaining_tonnage=50.0,
        #         created_by_account_id=1  # Landowner
        #     ),
        #     Scheme(
        #         nft_token_id=2,
        #         name="Solent Wetland B",
        #         catchment="SOLENT",
        #         location="Solent floodplain",
        #         unit_type="nitrate",
        #         original_tonnage=30.0,
        #         remaining_tonnage=30.0,
        #         created_by_account_id=1
        #     ),
        # ]
        # for scheme in schemes:
        #     db.add(scheme)
        # db.commit()
        # print(f"\nSeeded {len(schemes)} demo schemes")
            
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_accounts()
