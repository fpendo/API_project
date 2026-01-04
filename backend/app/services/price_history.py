"""
Price history aggregation service for candlestick charts.
Aggregates trades into OHLCV (Open, High, Low, Close, Volume) data by timeframe.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict
from ..models import Trade, PriceHistory


TIMEFRAME_MINUTES = {
    "1min": 1,
    "5min": 5,
    "15min": 15,
    "1hr": 60,
    "4hr": 240,
    "1day": 1440
}


def round_timestamp_to_timeframe(timestamp: datetime, timeframe: str) -> datetime:
    """
    Round a timestamp to the start of its timeframe period.
    
    Examples:
    - 1min: round to minute
    - 5min: round to 5-minute boundary
    - 1hr: round to hour
    - 1day: round to day
    """
    minutes = TIMEFRAME_MINUTES.get(timeframe, 60)
    
    if timeframe == "1day":
        # Round to start of day (midnight)
        return timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
    elif timeframe == "1hr":
        # Round to start of hour
        return timestamp.replace(minute=0, second=0, microsecond=0)
    else:
        # Round to minute boundary
        total_minutes = (timestamp.hour * 60) + timestamp.minute
        rounded_minutes = (total_minutes // minutes) * minutes
        hours = rounded_minutes // 60
        mins = rounded_minutes % 60
        return timestamp.replace(hour=hours, minute=mins, second=0, microsecond=0)


def update_price_history(trade: Trade, db: Session) -> None:
    """
    Update price history for all timeframes after a trade executes.
    Creates or updates OHLCV candles for the trade's catchment + unit_type.
    """
    # Get scheme to determine catchment and unit_type
    from ..models import Scheme
    scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
    if not scheme:
        return
    
    catchment = scheme.catchment
    unit_type = scheme.unit_type
    price = trade.price_per_unit
    volume = trade.quantity_units
    trade_time = trade.created_at if trade.created_at else datetime.utcnow()
    
    # Update all timeframes
    for timeframe in TIMEFRAME_MINUTES.keys():
        period_start = round_timestamp_to_timeframe(trade_time, timeframe)
        
        # Find or create price history record
        price_history = db.query(PriceHistory).filter(
            PriceHistory.catchment == catchment,
            PriceHistory.unit_type == unit_type,
            PriceHistory.timeframe == timeframe,
            PriceHistory.timestamp == period_start
        ).first()
        
        if price_history:
            # Update existing candle
            # High: max of current high and new price
            price_history.high_price = max(price_history.high_price, price)
            # Low: min of current low and new price
            price_history.low_price = min(price_history.low_price, price)
            # Close: always the latest price
            price_history.close_price = price
            # Volume: add to existing volume
            price_history.volume += volume
            price_history.updated_at = datetime.utcnow()
        else:
            # Create new candle
            price_history = PriceHistory(
                catchment=catchment,
                unit_type=unit_type,
                timeframe=timeframe,
                timestamp=period_start,
                open_price=price,
                high_price=price,
                low_price=price,
                close_price=price,
                volume=volume
            )
            db.add(price_history)
    
    db.commit()


def get_price_history(
    catchment: str,
    unit_type: str,
    timeframe: str,
    limit: int = 100,
    db: Session = None
) -> List[Dict]:
    """
    Get price history (candlestick data) for a catchment + unit_type + timeframe.
    
    Returns:
        List of OHLCV candles sorted by timestamp ASC
    """
    if timeframe not in TIMEFRAME_MINUTES:
        return []
    
    query = db.query(PriceHistory).filter(
        PriceHistory.catchment == catchment.upper(),
        PriceHistory.unit_type == unit_type.lower(),
        PriceHistory.timeframe == timeframe
    ).order_by(PriceHistory.timestamp.asc()).limit(limit)
    
    candles = query.all()
    
    return [
        {
            "timestamp": candle.timestamp.isoformat() if candle.timestamp else "",
            "open": candle.open_price,
            "high": candle.high_price,
            "low": candle.low_price,
            "close": candle.close_price,
            "volume": candle.volume
        }
        for candle in candles
    ]




