#!/usr/bin/env python3
"""Test script to verify .env file loading"""
from dotenv import load_dotenv
import os
from pathlib import Path

# Get the .env file path (same logic as main.py)
env_path = Path(__file__).parent / '.env'
env_path = env_path.resolve()

print(f"Loading .env from: {env_path}")
print(f".env file exists: {env_path.exists()}")

if env_path.exists():
    # Read raw file content
    with open(env_path, 'rb') as f:
        raw_content = f.read()
    print(f"File size: {len(raw_content)} bytes")
    print(f"Has BOM: {raw_content.startswith(b'\\xef\\xbb\\xbf')}")
    print(f"First 100 bytes: {raw_content[:100]}")
    
    # Read as text to see lines
    with open(env_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"\nFile has {len(lines)} lines:")
    for i, line in enumerate(lines, 1):
        print(f"  Line {i}: {repr(line)}")

# Try loading
result = load_dotenv(dotenv_path=env_path, override=True)
print(f"\nload_dotenv() returned: {result}")

# Check each variable
vars_to_check = [
    'SCHEME_NFT_CONTRACT_ADDRESS',
    'SCHEME_CREDITS_CONTRACT_ADDRESS',
    'PLANNING_LOCK_CONTRACT_ADDRESS',
    'REGULATOR_PRIVATE_KEY',
    'RPC_URL'
]

print("\n" + "="*60)
print("ENVIRONMENT VARIABLES CHECK")
print("="*60)
for var_name in vars_to_check:
    val = os.getenv(var_name)
    if val:
        # Mask private keys
        if 'PRIVATE_KEY' in var_name:
            display_val = f"{val[:10]}...{val[-10:]}" if len(val) > 20 else "***MASKED***"
        else:
            display_val = val
        print(f"[OK] {var_name}: {display_val}")
    else:
        print(f"[MISSING] {var_name}: NOT SET")
print("="*60)

