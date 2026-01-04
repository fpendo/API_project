"""
Check all sell ladder bot assignments to see what's in the database.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models import SellLadderBotAssignment, SellLadderBot, BrokerMandate

def check_assignments():
    db = SessionLocal()
    try:
        # Get all assignments
        assignments = db.query(SellLadderBotAssignment).all()
        
        print(f"Found {len(assignments)} total assignments:\n")
        
        for assignment in assignments:
            bot = db.query(SellLadderBot).filter(SellLadderBot.id == assignment.bot_id).first()
            mandate = None
            if assignment.mandate_id:
                mandate = db.query(BrokerMandate).filter(BrokerMandate.id == assignment.mandate_id).first()
            
            print(f"Assignment ID: {assignment.id}")
            print(f"  Bot ID: {assignment.bot_id} (Bot name: '{bot.name if bot else 'NOT FOUND'}')")
            print(f"  Mandate ID: {assignment.mandate_id}")
            if mandate:
                print(f"  Mandate: Landowner {mandate.landowner_account_id} -> Broker {mandate.broker_account_id}")
            print(f"  Is House Account: {bool(assignment.is_house_account)}")
            print(f"  Is Active: {bool(assignment.is_active)}")
            print(f"  Priority Order: {assignment.priority_order}")
            print()
        
        # Check for mandate_id=1 specifically
        mandate_1_assignments = db.query(SellLadderBotAssignment).filter(
            SellLadderBotAssignment.mandate_id == 1
        ).all()
        
        print(f"\nAssignments for mandate_id=1: {len(mandate_1_assignments)}")
        for assignment in mandate_1_assignments:
            bot = db.query(SellLadderBot).filter(SellLadderBot.id == assignment.bot_id).first()
            print(f"  Assignment ID: {assignment.id}, Bot ID: {assignment.bot_id} (Bot: '{bot.name if bot else 'NOT FOUND'}'), Active: {bool(assignment.is_active)}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_assignments()


