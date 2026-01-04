"""
Add Order and PriceHistory tables to existing database.
Run this to add the new exchange tables without resetting the database.
"""
from app.db import engine, Base, SessionLocal
from app.models import Order, PriceHistory

def migrate_database():
    """Add new tables to existing database"""
    print("Adding Order and PriceHistory tables...")
    
    # Create only the new tables
    Order.__table__.create(bind=engine, checkfirst=True)
    PriceHistory.__table__.create(bind=engine, checkfirst=True)
    
    print("Migration complete! Order and PriceHistory tables added.")

if __name__ == "__main__":
    migrate_database()

