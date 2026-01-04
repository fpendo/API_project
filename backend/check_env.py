"""
Quick script to check if required environment variables are set.
"""
import os
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

required_vars = [
    "SCHEME_CREDITS_CONTRACT_ADDRESS",
    "LANDOWNER_PRIVATE_KEY",
    "REGULATOR_PRIVATE_KEY",
    "RPC_URL",
    "TRADING_ACCOUNT_ADDRESS"
]

print("Checking environment variables:")
print("")
for var in required_vars:
    value = os.getenv(var)
    if value:
        # Mask private keys
        if "PRIVATE_KEY" in var:
            masked = value[:10] + "..." + value[-10:] if len(value) > 20 else "***"
            print(f"  [OK] {var}: {masked}")
        else:
            print(f"  [OK] {var}: {value}")
    else:
        print(f"  [MISSING] {var}: NOT SET")

print("")
print("Note: Either LANDOWNER_PRIVATE_KEY or REGULATOR_PRIVATE_KEY must be set for on-chain transfers.")

