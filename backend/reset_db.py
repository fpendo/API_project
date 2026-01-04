"""
Reset database script - drops all tables and recreates them.
Optionally seeds with initial data.

Usage:
    python reset_db.py              # Reset and recreate tables only
    python reset_db.py --seed       # Reset, recreate, and seed initial data
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import engine, Base, SessionLocal
from app.models import (
    Account, AccountRole, SchemeSubmission, SubmissionStatus,
    AgreementArchive, Scheme, Notification, BrokerMandate,
    ExchangeListing, Trade, PlanningApplication, PlanningApplicationScheme,
    Order, PriceHistory, MarketMakingBot, BotAssignment,
    FIFOCreditQueue, BotOrder, SellLadderBot, SellLadderBotAssignment,
    SellLadderFIFOCreditQueue, SellLadderBotOrder
)


def reset_database(seed=False):
    """Drop all tables and recreate them. Optionally seed with initial data."""
    print("=" * 60)
    print("RESETTING DATABASE")
    print("=" * 60)
    
    # Drop all tables
    print("\n1. Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("   [OK] All tables dropped")
    
    # Create all tables
    print("\n2. Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("   [OK] All tables created")
    
    # Seed initial data if requested
    if seed:
        print("\n3. Seeding initial data...")
        seed_accounts()
        print("   [OK] Initial data seeded")
    
    print("\n" + "=" * 60)
    print("DATABASE RESET COMPLETE")
    print("=" * 60)


def seed_accounts():
    """Seed the database with initial accounts"""
    db = SessionLocal()
    
    try:
        # Create accounts for each role
        accounts = [
            Account(
                name="John Landowner",
                role=AccountRole.LANDOWNER,
                evm_address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # Hardhat account #0
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
                name="Planning Officer",
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
        print(f"   [OK] Created {len(accounts)} accounts")
        
    except Exception as e:
        db.rollback()
        print(f"   [ERROR] Error seeding accounts: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # Check for flags
    seed = "--seed" in sys.argv or "-s" in sys.argv
    skip_confirm = "--yes" in sys.argv or "-y" in sys.argv
    
    # Confirm before proceeding (unless --yes flag is provided)
    if not skip_confirm:
        print("\nWARNING: This will DELETE ALL DATA in the database!")
        if seed:
            print("   The database will be reset and seeded with initial accounts.")
        else:
            print("   The database will be reset (tables recreated, no seed data).")
        
        response = input("\nAre you sure you want to continue? (yes/no): ")
        
        if response.lower() not in ["yes", "y"]:
            print("\nDatabase reset cancelled.")
            sys.exit(0)
    
    reset_database(seed=seed)
