"""
Migration script to add mandate_id column to trades table and backfill existing trades.

This links broker sales back to their originating client mandate so that
landowners can see proceeds from broker sales in their cash balance.
"""
import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'offsetx.db')
    
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Step 1: Check if mandate_id column already exists
    cursor.execute("PRAGMA table_info(trades)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'mandate_id' in columns:
        print("Column 'mandate_id' already exists in trades table")
    else:
        print("Adding 'mandate_id' column to trades table...")
        cursor.execute("ALTER TABLE trades ADD COLUMN mandate_id INTEGER REFERENCES broker_mandates(id)")
        conn.commit()
        print("Column added successfully!")
    
    # Step 2: Backfill existing trades from broker sales
    # Find trades where seller is a broker and link to the appropriate mandate
    print("\nBackfilling existing broker trades with mandate_id...")
    
    # Get all trades without mandate_id
    cursor.execute("""
        SELECT t.id, t.seller_account_id, t.scheme_id, a.role
        FROM trades t
        JOIN accounts a ON t.seller_account_id = a.id
        WHERE t.mandate_id IS NULL AND a.role = 'BROKER'
    """)
    broker_trades = cursor.fetchall()
    
    print(f"Found {len(broker_trades)} broker trades without mandate_id")
    
    updated_count = 0
    for trade_id, broker_id, scheme_id, role in broker_trades:
        # Find a matching client mandate for this broker + scheme
        cursor.execute("""
            SELECT id FROM broker_mandates
            WHERE broker_account_id = ? AND scheme_id = ? AND is_recalled = 0
            ORDER BY created_at DESC
            LIMIT 1
        """, (broker_id, scheme_id))
        mandate = cursor.fetchone()
        
        if mandate:
            mandate_id = mandate[0]
            cursor.execute("UPDATE trades SET mandate_id = ? WHERE id = ?", (mandate_id, trade_id))
            updated_count += 1
            print(f"  Trade #{trade_id}: linked to mandate #{mandate_id}")
        else:
            # This might be a house account sale (no client mandate)
            print(f"  Trade #{trade_id}: no matching mandate found (house account sale?)")
    
    conn.commit()
    print(f"\nUpdated {updated_count} trades with mandate_id")
    
    # Step 3: Show summary
    cursor.execute("SELECT COUNT(*) FROM trades WHERE mandate_id IS NOT NULL")
    linked_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM trades")
    total_count = cursor.fetchone()[0]
    
    print(f"\nSummary: {linked_count}/{total_count} trades are now linked to mandates")
    
    conn.close()
    print("\nMigration complete!")

if __name__ == "__main__":
    migrate()

