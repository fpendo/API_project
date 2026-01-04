"""
Migration script to create sell ladder bot tables.
Run this after updating models.py with SellLadderBot, SellLadderBotAssignment, SellLadderFIFOCreditQueue, and SellLadderBotOrder models.
"""
import sqlite3
import os
from pathlib import Path

# Get database path
db_path = Path(__file__).parent / "offsetx.db"
if not db_path.exists():
    print(f"Database not found at {db_path}")
    exit(1)

print(f"Connecting to database: {db_path}")
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

try:
    # Create sell_ladder_bots table
    print("Creating sell_ladder_bots table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sell_ladder_bots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            broker_account_id INTEGER NOT NULL,
            catchment VARCHAR NOT NULL,
            unit_type VARCHAR NOT NULL,
            name VARCHAR NOT NULL,
            is_active INTEGER DEFAULT 0,
            strategy_config TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (broker_account_id) REFERENCES accounts(id)
        )
    """)
    print("[OK] sell_ladder_bots table created")
    
    # Create sell_ladder_bot_assignments table
    print("Creating sell_ladder_bot_assignments table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sell_ladder_bot_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id INTEGER NOT NULL,
            mandate_id INTEGER,
            is_house_account INTEGER DEFAULT 0,
            priority_order INTEGER NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (bot_id) REFERENCES sell_ladder_bots(id),
            FOREIGN KEY (mandate_id) REFERENCES broker_mandates(id)
        )
    """)
    print("[OK] sell_ladder_bot_assignments table created")
    
    # Create sell_ladder_fifo_credit_queues table
    print("Creating sell_ladder_fifo_credit_queues table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sell_ladder_fifo_credit_queues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id INTEGER NOT NULL,
            assignment_id INTEGER NOT NULL,
            mandate_id INTEGER,
            scheme_id INTEGER NOT NULL,
            credits_available INTEGER NOT NULL,
            credits_traded INTEGER DEFAULT 0,
            queue_position INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES sell_ladder_bots(id),
            FOREIGN KEY (assignment_id) REFERENCES sell_ladder_bot_assignments(id),
            FOREIGN KEY (mandate_id) REFERENCES broker_mandates(id),
            FOREIGN KEY (scheme_id) REFERENCES schemes(id)
        )
    """)
    print("[OK] sell_ladder_fifo_credit_queues table created")
    
    # Create sell_ladder_bot_orders table
    print("Creating sell_ladder_bot_orders table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sell_ladder_bot_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id INTEGER NOT NULL,
            order_id INTEGER NOT NULL,
            strategy_price REAL NOT NULL,
            price_level INTEGER NOT NULL,
            fifo_queue_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES sell_ladder_bots(id),
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (fifo_queue_id) REFERENCES sell_ladder_fifo_credit_queues(id)
        )
    """)
    print("[OK] sell_ladder_bot_orders table created")
    
    # Create indexes
    print("Creating indexes...")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sell_ladder_bots_broker ON sell_ladder_bots(broker_account_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sell_ladder_bots_active ON sell_ladder_bots(is_active)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sell_ladder_assignments_bot ON sell_ladder_bot_assignments(bot_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sell_ladder_assignments_active ON sell_ladder_bot_assignments(is_active)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sell_ladder_fifo_bot ON sell_ladder_fifo_credit_queues(bot_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sell_ladder_fifo_assignment ON sell_ladder_fifo_credit_queues(assignment_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sell_ladder_fifo_position ON sell_ladder_fifo_credit_queues(queue_position)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sell_ladder_orders_bot ON sell_ladder_bot_orders(bot_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sell_ladder_orders_order ON sell_ladder_bot_orders(order_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sell_ladder_orders_level ON sell_ladder_bot_orders(price_level)")
    print("[OK] Indexes created")
    
    conn.commit()
    print("\n[SUCCESS] All sell ladder bot tables created successfully!")
    
except Exception as e:
    conn.rollback()
    print(f"\n[ERROR] Migration failed: {str(e)}")
    raise
finally:
    conn.close()


