"""
Migration script to add new columns to broker_mandates table.
Run this script to update the database schema for broker mandate recall functionality.
"""
import sqlite3
import os
from pathlib import Path

# Get database path
db_path = Path(__file__).parent / 'offsetx.db'

if not db_path.exists():
    print(f"Database not found at {db_path}")
    exit(1)

print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Check if columns already exist
cursor.execute("PRAGMA table_info(broker_mandates)")
columns = [row[1] for row in cursor.fetchall()]

print(f"Existing columns: {columns}")

# Add new columns if they don't exist
new_columns = [
    ("fee_transaction_hash", "TEXT"),
    ("client_transaction_hash", "TEXT"),
    ("house_address", "TEXT"),
    ("recalled_at", "DATETIME"),
    ("recall_transaction_hash", "TEXT"),
    ("is_recalled", "INTEGER DEFAULT 0")
]

for col_name, col_type in new_columns:
    if col_name not in columns:
        try:
            alter_sql = f"ALTER TABLE broker_mandates ADD COLUMN {col_name} {col_type}"
            print(f"Adding column: {col_name}")
            cursor.execute(alter_sql)
            print(f"[OK] Added column: {col_name}")
        except sqlite3.OperationalError as e:
            print(f"[ERROR] Error adding column {col_name}: {e}")
    else:
        print(f"[SKIP] Column {col_name} already exists")

# Commit changes
conn.commit()

# Verify columns were added
cursor.execute("PRAGMA table_info(broker_mandates)")
final_columns = [row[1] for row in cursor.fetchall()]
print(f"\nFinal columns: {final_columns}")

conn.close()
print("\n[SUCCESS] Migration complete!")

