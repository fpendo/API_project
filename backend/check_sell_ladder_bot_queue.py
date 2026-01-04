"""Diagnostic script to check sell ladder bot FIFO queue status."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal
from app.models import SellLadderBot, SellLadderBotAssignment, SellLadderFIFOCreditQueue, BrokerMandate, Account
from app.services.broker import get_broker_client_holdings

def check_bot_queue(bot_id: int):
    db = SessionLocal()
    try:
        bot = db.query(SellLadderBot).filter(SellLadderBot.id == bot_id).first()
        if not bot:
            print(f"Bot {bot_id} not found")
            return
        
        print(f"\n=== Sell Ladder Bot {bot_id}: {bot.name} ===")
        print(f"Catchment: {bot.catchment}, Unit Type: {bot.unit_type}")
        print(f"Active: {bot.is_active}")
        
        # Get assignments
        assignments = db.query(SellLadderBotAssignment).filter(
            SellLadderBotAssignment.bot_id == bot_id,
            SellLadderBotAssignment.is_active == 1
        ).all()
        
        print(f"\nAssignments: {len(assignments)}")
        for assignment in assignments:
            print(f"  - Assignment {assignment.id}: mandate_id={assignment.mandate_id}, is_house={assignment.is_house_account}, priority={assignment.priority_order}")
            
            if not assignment.is_house_account and assignment.mandate_id:
                mandate = db.query(BrokerMandate).filter(BrokerMandate.id == assignment.mandate_id).first()
                if mandate:
                    print(f"    Mandate: scheme_id={mandate.scheme_id}, credits={mandate.credits_amount}")
        
        # Get FIFO queue entries
        queue_entries = db.query(SellLadderFIFOCreditQueue).filter(
            SellLadderFIFOCreditQueue.bot_id == bot_id
        ).order_by(SellLadderFIFOCreditQueue.queue_position).all()
        
        print(f"\nFIFO Queue Entries: {len(queue_entries)}")
        total_available = 0
        for entry in queue_entries:
            total_available += entry.credits_available
            print(f"  - Queue {entry.id}: scheme_id={entry.scheme_id}, available={entry.credits_available:,}, traded={entry.credits_traded:,}, position={entry.queue_position}")
        
        print(f"\nTotal Available Credits: {total_available:,}")
        
        # Check broker holdings
        broker = db.query(Account).filter(Account.id == bot.broker_account_id).first()
        if broker:
            print(f"\nBroker Holdings:")
            holdings = get_broker_client_holdings(broker, db)
            print(f"  Total holdings: {len(holdings)}")
            for holding in holdings:
                if holding.get('catchment') == bot.catchment and holding.get('unit_type') == bot.unit_type:
                    print(f"  - Scheme {holding.get('scheme_id')}: {holding.get('available_credits', 0):,} available credits")
                    print(f"    Mandates: {[m.get('mandate_id') for m in holding.get('mandates', [])]}")
        
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_sell_ladder_bot_queue.py <bot_id>")
        sys.exit(1)
    
    bot_id = int(sys.argv[1])
    check_bot_queue(bot_id)


