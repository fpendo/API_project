"""
Test the accounts summary API endpoint directly.
"""
import requests
import json

API_BASE_URL = "http://localhost:8000"
DEVELOPER_ACCOUNT_ID = 5

print("=" * 80)
print("TESTING ACCOUNTS SUMMARY API ENDPOINT")
print("=" * 80)

endpoint = f"{API_BASE_URL}/accounts/{DEVELOPER_ACCOUNT_ID}/credits-summary"
print(f"\nEndpoint: {endpoint}")

try:
    response = requests.get(endpoint)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nResponse:")
        print(json.dumps(data, indent=2))
        
        holdings = data.get('holdings', [])
        print(f"\nHoldings count: {len(holdings)}")
        for holding in holdings:
            print(f"  - {holding.get('scheme_name')}: {holding.get('credits', 0):,} credits ({holding.get('tonnes', 0):.4f} tonnes)")
        
        total_credits = sum(h.get('credits', 0) for h in holdings)
        print(f"\nTotal Credits: {total_credits:,}")
    else:
        print(f"\nError Response:")
        print(response.text)
        
except Exception as e:
    print(f"\nERROR: {e}")
    import traceback
    traceback.print_exc()

