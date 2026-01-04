"""
Check if .env file is being read correctly by the backend.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).parent
env_file = backend_dir / ".env"

print("=" * 80)
print("CHECKING .ENV FILE")
print("=" * 80)
print(f"\n.env file path: {env_file}")
print(f"File exists: {env_file.exists()}")

if env_file.exists():
    print(f"\nReading .env file...")
    load_dotenv(env_file)
    
    print(f"\nEnvironment Variables:")
    print(f"  BROKER_PRIVATE_KEY: {'SET' if os.getenv('BROKER_PRIVATE_KEY') else 'NOT SET'}")
    if os.getenv('BROKER_PRIVATE_KEY'):
        key = os.getenv('BROKER_PRIVATE_KEY')
        print(f"    Value: {key[:20]}...{key[-10:]}")
    
    print(f"  DEVELOPER_PRIVATE_KEY: {'SET' if os.getenv('DEVELOPER_PRIVATE_KEY') else 'NOT SET'}")
    if os.getenv('DEVELOPER_PRIVATE_KEY'):
        key = os.getenv('DEVELOPER_PRIVATE_KEY')
        print(f"    Value: {key[:20]}...{key[-10:]}")
    
    print(f"  TRADING_ACCOUNT_ADDRESS: {'SET' if os.getenv('TRADING_ACCOUNT_ADDRESS') else 'NOT SET'}")
    if os.getenv('TRADING_ACCOUNT_ADDRESS'):
        print(f"    Value: {os.getenv('TRADING_ACCOUNT_ADDRESS')}")
    
    print(f"  TRADING_ACCOUNT_PRIVATE_KEY: {'SET' if os.getenv('TRADING_ACCOUNT_PRIVATE_KEY') else 'NOT SET'}")
    if os.getenv('TRADING_ACCOUNT_PRIVATE_KEY'):
        key = os.getenv('TRADING_ACCOUNT_PRIVATE_KEY')
        print(f"    Value: {key[:20]}...{key[-10:]}")
    
    # Verify developer key
    print(f"\n" + "=" * 80)
    print("VERIFYING DEVELOPER KEY")
    print("=" * 80)
    from web3 import Web3
    developer_key = os.getenv('DEVELOPER_PRIVATE_KEY')
    if developer_key:
        w3 = Web3()
        key_account = w3.eth.account.from_key(developer_key)
        expected_address = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
        actual_address = key_account.address
        print(f"  Expected Address (Account #5): {expected_address}")
        print(f"  Actual Address from Key: {actual_address}")
        print(f"  Matches: {actual_address.lower() == expected_address.lower()}")
        if not actual_address.lower() == expected_address.lower():
            print(f"\n  ERROR: Developer key is for Account #3, not Account #5!")
            print(f"  Correct key should be: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6")
else:
    print(f"\nERROR: .env file not found at {env_file}")

