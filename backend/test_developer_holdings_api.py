"""Test the developer holdings API endpoint"""
import requests
import json

try:
    response = requests.get('http://localhost:8000/accounts/5/credits-summary')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nAccount: {data.get('account_name')}")
        print(f"EVM Address: {data.get('evm_address')}")
        print(f"Total Credits: {data.get('total_credits', 0):,}")
        print(f"Total Tonnes: {data.get('total_tonnes', 0):.2f}")
        print(f"\nHoldings ({len(data.get('holdings', []))} schemes):")
        for holding in data.get('holdings', []):
            print(f"  - {holding.get('scheme_name')}: {holding.get('credits', 0):,} credits ({holding.get('tonnes', 0):.2f} tonnes)")
            print(f"    Catchment: {holding.get('catchment')}, Unit Type: {holding.get('unit_type')}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error connecting to API: {e}")
    print("Make sure the backend server is running on http://localhost:8000")


