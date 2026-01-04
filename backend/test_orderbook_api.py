"""
Test the order book API to see what catchment orders are returned for.
"""
import requests
import json

API_BASE_URL = "http://127.0.0.1:8000"

# Test different catchments
catchments = ["HUMBER", "THAMES", "SEVERN", "SOLENT"]

for catchment in catchments:
    print(f"\n{'='*60}")
    print(f"Testing catchment: {catchment}")
    print(f"{'='*60}")
    
    url = f"{API_BASE_URL}/exchange/orderbook?catchment={catchment}&unit_type=nitrate"
    print(f"URL: {url}")
    
    try:
        response = requests.get(url)
        if response.ok:
            data = response.json()
            bids = data.get('bids', [])
            asks = data.get('asks', [])
            
            print(f"Bids: {len(bids)}")
            print(f"Asks: {len(asks)}")
            
            if asks:
                print(f"\nFirst 3 ASK orders:")
                for i, ask in enumerate(asks[:3]):
                    print(f"  {i+1}. Price: £{ask.get('price', 0):.6f}, Quantity: {ask.get('quantity', 0):,}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

print(f"\n{'='*60}")
print("Test complete")
print(f"{'='*60}")


