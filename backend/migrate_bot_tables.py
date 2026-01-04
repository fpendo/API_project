"""
Migration script to create bot-related tables.
Run this after updating models.py with the new bot models.
"""
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
import os
import sys

# Adjust path to import from parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db import Base, engine, SessionLocal
from app.models import MarketMakingBot, BotAssignment, FIFOCreditQueue, BotOrder


def run_migration():
    """Create bot-related tables if they don't exist."""
    print(f"Connecting to database: {engine.url}")
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    tables_to_create = [
        ('market_making_bots', MarketMakingBot),
        ('bot_assignments', BotAssignment),
        ('fifo_credit_queues', FIFOCreditQueue),
        ('bot_orders', BotOrder)
    ]
    
    for table_name, model_class in tables_to_create:
        if table_name in existing_tables:
            print(f"[SKIP] Table {table_name} already exists")
        else:
            print(f"Creating table: {table_name}")
            try:
                model_class.__table__.create(engine, checkfirst=True)
                print(f"[OK] Created table: {table_name}")
            except Exception as e:
                print(f"[ERROR] Failed to create table {table_name}: {str(e)}")
    
    # Verify final tables
    final_tables = inspector.get_table_names()
    print(f"\nFinal tables: {final_tables}")
    
    # Check if bot tables exist
    bot_tables = ['market_making_bots', 'bot_assignments', 'fifo_credit_queues', 'bot_orders']
    missing_tables = [t for t in bot_tables if t not in final_tables]
    
    if missing_tables:
        print(f"\n[WARNING] Missing tables: {missing_tables}")
    else:
        print("\n[SUCCESS] All bot tables created successfully!")


if __name__ == "__main__":
    run_migration()


