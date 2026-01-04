"""
Check sell ladder bot catchment and FIFO queue entries.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models import SellLadderBot, SellLadderFIFOCreditQueue, Scheme

def check_bot_catchment():
    db = SessionLocal()
    try:
        # Get all sell ladder bots
        bots = db.query(SellLadderBot).all()
        
        print(f"Found {len(bots)} sell ladder bots:\n")
        
        for bot in bots:
            print(f"Bot ID: {bot.id}")
            print(f"  Name: {bot.name}")
            print(f"  Catchment: '{bot.catchment}' (type: {type(bot.catchment)})")
            print(f"  Unit Type: '{bot.unit_type}'")
            print(f"  Is Active: {bot.is_active}")
            print(f"  Broker Account ID: {bot.broker_account_id}")
            
            # Get FIFO queue entries
            queue_entries = db.query(SellLadderFIFOCreditQueue).filter(
                SellLadderFIFOCreditQueue.bot_id == bot.id
            ).all()
            
            print(f"  FIFO Queue Entries: {len(queue_entries)}")
            
            for queue_entry in queue_entries:
                scheme = db.query(Scheme).filter(Scheme.id == queue_entry.scheme_id).first()
                if scheme:
                    print(f"    Queue Entry {queue_entry.id}:")
                    print(f"      Scheme ID: {scheme.id}")
                    print(f"      Scheme Name: {scheme.name}")
                    print(f"      Scheme Catchment: '{scheme.catchment}' (type: {type(scheme.catchment)})")
                    print(f"      Scheme Unit Type: '{scheme.unit_type}'")
                    print(f"      Credits Available: {queue_entry.credits_available:,}")
                    print(f"      Match Check: bot.catchment='{bot.catchment}' vs scheme.catchment='{scheme.catchment}'")
                    print(f"        Uppercase: '{bot.catchment.upper()}' vs '{scheme.catchment.upper()}'")
                    print(f"        Match: {bot.catchment.upper() == scheme.catchment.upper()}")
                else:
                    print(f"    Queue Entry {queue_entry.id}: Scheme {queue_entry.scheme_id} not found!")
            
            print()
            
    finally:
        db.close()

if __name__ == "__main__":
    check_bot_catchment()


