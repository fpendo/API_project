"""
Migration script to add land_parcel_number column to scheme_submissions table.
This ensures scheme creators can't submit more than 1 application for the same unit type on the same land ID number.
"""
import sys
import sqlite3
from pathlib import Path

# Fix encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

# Get the database path
db_path = Path(__file__).parent / "offsetx.db"

if not db_path.exists():
    print(f"❌ Database not found at {db_path}")
    sys.exit(1)

print(f"📦 Database found at {db_path}")
print("🔄 Adding land_parcel_number column to scheme_submissions table...")

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("PRAGMA table_info(scheme_submissions)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'land_parcel_number' in columns:
        print("✅ Column 'land_parcel_number' already exists. Skipping migration.")
    else:
        # Add the column
        cursor.execute("""
            ALTER TABLE scheme_submissions
            ADD COLUMN land_parcel_number TEXT NOT NULL DEFAULT ''
        """)
        
        # Update existing rows with a placeholder (if any exist)
        cursor.execute("""
            UPDATE scheme_submissions
            SET land_parcel_number = 'UNKNOWN'
            WHERE land_parcel_number = ''
        """)
        
        conn.commit()
        print("✅ Successfully added 'land_parcel_number' column to scheme_submissions table")
        print("   Note: Existing submissions have been set to 'UNKNOWN'. Please update them manually if needed.")
    
    # Verify the column was added
    cursor.execute("PRAGMA table_info(scheme_submissions)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"📋 Current columns in scheme_submissions: {', '.join(columns)}")
    
    conn.close()
    print("✅ Migration completed successfully!")
    
except sqlite3.Error as e:
    print(f"❌ SQLite error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)




