"""
Fix sell ladder bot assignment to mark it as house account since credits are there.
"""
import sys
import os
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import SellLadderBotAssignment
from dotenv import load_dotenv

load_dotenv()

def fix_assignment():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("FIXING SELL LADDER BOT ASSIGNMENT")
        print("=" * 80)
        
        # Find assignment #1 (the one being used)
        assignment = db.query(SellLadderBotAssignment).filter(
            SellLadderBotAssignment.id == 1
        ).first()
        
        if not assignment:
            print("ERROR: Assignment #1 not found")
            return
        
        print(f"\nCurrent Assignment #1:")
        print(f"  Bot ID: {assignment.bot_id}")
        print(f"  Mandate ID: {assignment.mandate_id}")
        print(f"  Is House Account: {assignment.is_house_account} (0=client, 1=house)")
        print(f"  Is Active: {assignment.is_active}")
        
        if assignment.is_house_account == 1:
            print("\n[OK] Assignment is already marked as house account. No fix needed.")
            return
        
        print(f"\n[FIX] Updating assignment to mark as house account...")
        assignment.is_house_account = 1
        db.commit()
        
        print(f"[OK] Assignment updated successfully!")
        print(f"  New Is House Account: {assignment.is_house_account}")
        print(f"\nNow order matching will use house address for transfers.")
        print(f"Restart backend server and try buying again.")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    fix_assignment()

