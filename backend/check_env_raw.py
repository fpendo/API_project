"""
Check the raw content of .env file to see what's actually there.
"""
from pathlib import Path

backend_dir = Path(__file__).parent
env_file = backend_dir / ".env"

print("=" * 80)
print("RAW .ENV FILE CONTENT")
print("=" * 80)

if not env_file.exists():
    print("ERROR: .env file not found")
    exit(1)

with open(env_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"\nTotal lines: {len(lines)}\n")

for i, line in enumerate(lines, 1):
    line_stripped = line.rstrip('\n\r')
    if 'DEVELOPER_PRIVATE_KEY' in line or 'BROKER_PRIVATE_KEY' in line or 'TRADING_ACCOUNT' in line:
        if '=' in line:
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip()
            print(f"Line {i}: {key}")
            print(f"  Full value length: {len(value)}")
            print(f"  First 30 chars: {value[:30]}")
            print(f"  Last 30 chars: {value[-30:]}")
            print(f"  Full value: {value}")
            print()
            
            # Verify the key
            if 'DEVELOPER_PRIVATE_KEY' in key:
                from web3 import Web3
                w3 = Web3()
                try:
                    account = w3.eth.account.from_key(value)
                    print(f"  Derived address: {account.address}")
                    expected = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
                    if account.address.lower() == expected.lower():
                        print(f"  [OK] Matches Account #5")
                    else:
                        print(f"  [ERROR] Does NOT match Account #5")
                        print(f"  Expected: {expected}")
                except Exception as e:
                    print(f"  [ERROR] Could not derive address: {e}")

