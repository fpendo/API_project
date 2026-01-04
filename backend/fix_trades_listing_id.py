"""
Fix the trades table to make listing_id nullable.
This script alters the database schema to match the model definition.
"""
import sys
import sqlite3
from pathlib import Path

# Fix Unicode encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.db import engine
from sqlalchemy import text

def fix_trades_table():
    """Make listing_id nullable in trades table"""
    db_path = Path(__file__).parent / "offsetx.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    # Connect directly to SQLite to alter the table
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # SQLite doesn't support ALTER COLUMN, so we need to:
        # 1. Create a new table with the correct schema
        # 2. Copy data
        # 3. Drop old table
        # 4. Rename new table
        
        print("Checking current schema...")
        cursor.execute("PRAGMA table_info(trades)")
        columns = cursor.fetchall()
        print(f"Current columns: {columns}")
        
        # Check if listing_id is already nullable
        # In SQLite PRAGMA table_info, column[3] is notnull: 0 = nullable, 1 = NOT NULL
        listing_id_col = [col for col in columns if col[1] == 'listing_id']
        if listing_id_col and listing_id_col[0][3] == 1:  # 1 means NOT NULL, 0 means nullable
            print("listing_id is currently NOT NULL, fixing...")
            
            # Create new table with correct schema
            cursor.execute("""
                CREATE TABLE trades_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    listing_id INTEGER REFERENCES exchange_listings(id),
                    buyer_account_id INTEGER NOT NULL REFERENCES accounts(id),
                    seller_account_id INTEGER NOT NULL REFERENCES accounts(id),
                    scheme_id INTEGER NOT NULL REFERENCES schemes(id),
                    quantity_units INTEGER NOT NULL,
                    price_per_unit REAL NOT NULL,
                    total_price REAL NOT NULL,
                    transaction_hash TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Copy data
            cursor.execute("""
                INSERT INTO trades_new 
                (id, listing_id, buyer_account_id, seller_account_id, scheme_id, 
                 quantity_units, price_per_unit, total_price, transaction_hash, created_at)
                SELECT 
                    id, listing_id, buyer_account_id, seller_account_id, scheme_id,
                    quantity_units, price_per_unit, total_price, transaction_hash, created_at
                FROM trades
            """)
            
            # Drop old table
            cursor.execute("DROP TABLE trades")
            
            # Rename new table
            cursor.execute("ALTER TABLE trades_new RENAME TO trades")
            
            # Recreate indexes if any
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_trades_id ON trades(id)")
            
            conn.commit()
            print("[OK] Successfully made listing_id nullable in trades table")
        else:
            print("[OK] listing_id is already nullable, no changes needed")
            
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error fixing trades table: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_trades_table()

