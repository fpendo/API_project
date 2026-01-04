"""Fix bot minimum order size if credits are too low"""
from app.db import SessionLocal
from app.models import MarketMakingBot
import json

db = SessionLocal()
try:
    bot = db.query(MarketMakingBot).filter(MarketMakingBot.id == 2).first()
    if not bot:
        print("Bot 2 not found")
        exit(1)
    
    config = json.loads(bot.strategy_config)
    min_order = config.get('min_order_size_credits', 10000)
    print(f"Current min order size: {min_order:,}")
    print(f"Available credits in queue: 4,500")
    
    if min_order > 4500:
        print(f"\nAdjusting min order size to 1,000 to allow orders with available credits...")
        config['min_order_size_credits'] = 1000
        bot.strategy_config = json.dumps(config)
        db.commit()
        print("Updated!")
    else:
        print("Min order size is OK")
        
finally:
    db.close()


