"""Check trade details"""
from app.db import SessionLocal
from app.models import Trade, Scheme

db = SessionLocal()
try:
    trade = db.query(Trade).filter(Trade.id == 2).first()
    if trade:
        scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
        print(f"Trade #2:")
        print(f"  Quantity: {trade.quantity_units:,} credits")
        print(f"  Scheme: {scheme.name if scheme else 'Unknown'} (ID: {scheme.id if scheme else 'N/A'}, NFT: {scheme.nft_token_id if scheme else 'N/A'})")
        print(f"  Price: £{trade.total_price:,.2f}")
        print(f"  Transaction Hash: {trade.transaction_hash or 'NONE'}")
    else:
        print("Trade #2 not found")
finally:
    db.close()


