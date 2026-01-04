"""Fix bot catchment case to uppercase"""
from app.db import SessionLocal
from app.models import MarketMakingBot

db = SessionLocal()
try:
    bot = db.query(MarketMakingBot).filter(MarketMakingBot.id == 2).first()
    if not bot:
        print("Bot 2 not found")
        exit(1)
    
    print(f"Current catchment: '{bot.catchment}'")
    if bot.catchment != bot.catchment.upper():
        bot.catchment = bot.catchment.upper()
        db.commit()
        print(f"Updated to: '{bot.catchment}'")
    else:
        print("Catchment is already uppercase")
        
finally:
    db.close()


