import threading
import time
from typing import Optional
from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import MarketMakingBot, SellLadderBot
from .market_making_bot import place_bot_orders
from .sell_ladder_bot import place_sell_ladder_orders


class BotWorker:
    """Background worker for executing market making bots."""
    
    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = interval_seconds
        self.thread: Optional[threading.Thread] = None
        self.running = False
        self._stop_event = threading.Event()
    
    def start(self):
        """Start the bot worker thread."""
        if self.running:
            return
        
        self.running = True
        self._stop_event.clear()
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        print(f"Bot worker started (interval: {self.interval_seconds}s)")
    
    def stop(self):
        """Stop the bot worker thread."""
        if not self.running:
            return
        
        self.running = False
        self._stop_event.set()
        
        if self.thread:
            self.thread.join(timeout=5.0)
        
        print("Bot worker stopped")
    
    def _run(self):
        """Main worker loop."""
        while self.running and not self._stop_event.is_set():
            try:
                self._run_bot_cycle()
            except Exception as e:
                print(f"Error in bot worker cycle: {str(e)}")
            
            # Wait for interval or stop event
            self._stop_event.wait(self.interval_seconds)
    
    def _run_bot_cycle(self):
        """Execute one cycle for all active bots."""
        db: Session = SessionLocal()
        try:
            # Get all active market-making bots
            active_mm_bots = db.query(MarketMakingBot).filter(
                MarketMakingBot.is_active == 1
            ).all()
            
            for bot in active_mm_bots:
                try:
                    place_bot_orders(bot.id, db)
                except Exception as e:
                    print(f"Error placing orders for market-making bot {bot.id}: {str(e)}")
            
            # Get all active sell ladder bots
            active_sl_bots = db.query(SellLadderBot).filter(
                SellLadderBot.is_active == 1
            ).all()
            
            for bot in active_sl_bots:
                try:
                    place_sell_ladder_orders(bot.id, db)
                except Exception as e:
                    print(f"Error placing orders for sell ladder bot {bot.id}: {str(e)}")
        finally:
            db.close()
    
    def run_cycle_once(self):
        """Manually run one cycle (for testing)."""
        self._run_bot_cycle()


# Global worker instance
_worker: Optional[BotWorker] = None


def get_worker(interval_seconds: int = 60) -> BotWorker:
    """Get or create the global bot worker instance."""
    global _worker
    if _worker is None:
        _worker = BotWorker(interval_seconds=interval_seconds)
    return _worker


def start_bot_worker(interval_seconds: int = 60):
    """Start the global bot worker."""
    worker = get_worker(interval_seconds)
    worker.start()


def stop_bot_worker():
    """Stop the global bot worker."""
    global _worker
    if _worker:
        _worker.stop()
        _worker = None

