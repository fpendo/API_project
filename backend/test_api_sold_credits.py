"""
Test the API endpoint to see if sold_credits is returned
"""
import requests
import json

try:
    r = requests.get('http://localhost:8000/accounts/1/credits-summary')
    print(f'Status: {r.status_code}')
    
    if r.status_code == 200:
        data = r.json()
        print(f'\nHoldings count: {len(data.get("holdings", []))}')
        print('\nHoldings:')
        for h in data.get('holdings', []):
            sold = h.get('sold_credits', 'MISSING')
            print(f"  {h['scheme_name']} (ID: {h['scheme_id']}): sold_credits={sold}")
            print(f"    All fields: {list(h.keys())}")
    else:
        print(f'Error: {r.text}')
except Exception as e:
    print(f'Error: {str(e)}')




