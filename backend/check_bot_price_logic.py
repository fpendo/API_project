"""Check why sell ladder bot is using low prices."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal
from app.models import SellLadderBot, Trade, Scheme
import json

def check_bot_price_logic(bot_id: int):
    db = SessionLocal()
    try:
        bot = db.query(SellLadderBot).filter(SellLadderBot.id == bot_id).first()
        if not bot:
            print(f"Bot {bot_id} not found")
            return
        
        print(f"\n=== Bot {bot_id}: {bot.name} ===")
        print(f"Catchment: {bot.catchment}, Unit Type: {bot.unit_type}")
        
        config = json.loads(bot.strategy_config)
        print(f"\nStrategy Config:")
        print(json.dumps(config, indent=2))
        
        # Check for trades
        trade_count = db.query(Trade).join(Scheme).filter(
            Scheme.catchment == bot.catchment,
            Scheme.unit_type == bot.unit_type
        ).count()
        
        print(f"\nTrade Count: {trade_count}")
        print(f"Is New Market: {trade_count == 0}")
        
        # Check what price would be used
        starting_price_per_credit = config.get('starting_price_per_credit', None)
        starting_price_per_tonne = config.get('starting_price_per_tonne', None)
        base_price_per_tonne = config.get('base_price_per_tonne', 100.0)
        
        print(f"\nPrice Configuration:")
        print(f"  starting_price_per_credit: {starting_price_per_credit}")
        print(f"  starting_price_per_tonne: {starting_price_per_tonne}")
        print(f"  base_price_per_tonne: {base_price_per_tonne}")
        
        if trade_count == 0:
            # New market logic
            if starting_price_per_credit is not None:
                ref_price = starting_price_per_credit
                print(f"\nWould use: starting_price_per_credit = £{ref_price:.6f} per credit")
            elif starting_price_per_tonne is not None:
                ref_price = starting_price_per_tonne / 100000.0
                print(f"\nWould use: starting_price_per_tonne = £{starting_price_per_tonne:.2f} per tonne = £{ref_price:.6f} per credit")
            else:
                ref_price = base_price_per_tonne / 100000.0
                print(f"\nWould use: base_price_per_tonne = £{base_price_per_tonne:.2f} per tonne = £{ref_price:.6f} per credit")
        else:
            print(f"\nMarket has {trade_count} trades - would use market reference price")
            # Show recent trades
            recent_trades = db.query(Trade).join(Scheme).filter(
                Scheme.catchment == bot.catchment,
                Scheme.unit_type == bot.unit_type
            ).order_by(Trade.created_at.desc()).limit(5).all()
            
            print(f"\nRecent trades:")
            for trade in recent_trades:
                print(f"  Trade {trade.id}: £{trade.price_per_unit:.6f} per credit at {trade.created_at}")
        
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_bot_price_logic.py <bot_id>")
        sys.exit(1)
    
    bot_id = int(sys.argv[1])
    check_bot_price_logic(bot_id)


