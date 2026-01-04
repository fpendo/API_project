"""
Script to add BROKER_HOUSE_ADDRESS to .env file.
Uses Hardhat account #10 (index 9) as the house address.
"""
import os
from pathlib import Path

# Hardhat deterministic accounts (account #10, index 9)
# These are the standard Hardhat accounts
HARDHAT_ACCOUNTS = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",  # Account #0
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  # Account #1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  # Account #2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",  # Account #3
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",  # Account #4
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",  # Account #5
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9",  # Account #6
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",  # Account #7
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",  # Account #8
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",  # Account #9
    "0xBcd4042DE499D14e55001Ccbb24A551F3b954096b",  # Account #10 (index 9)
]

# Use account #10 (index 9) as the broker house address
BROKER_HOUSE_ADDRESS = HARDHAT_ACCOUNTS[9]  # Account #10

env_path = Path(__file__).parent / '.env'

if not env_path.exists():
    print(f"ERROR: .env file not found at {env_path}")
    exit(1)

print(f"Reading .env file: {env_path}")

# Read existing .env file
with open(env_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Check if BROKER_HOUSE_ADDRESS already exists
has_broker_house = False
for i, line in enumerate(lines):
    if line.strip().startswith('BROKER_HOUSE_ADDRESS='):
        has_broker_house = True
        # Update existing line
        lines[i] = f'BROKER_HOUSE_ADDRESS={BROKER_HOUSE_ADDRESS}\n'
        print(f"Updated existing BROKER_HOUSE_ADDRESS on line {i+1}")
        break

if not has_broker_house:
    # Add new line at the end
    lines.append(f'\nBROKER_HOUSE_ADDRESS={BROKER_HOUSE_ADDRESS}\n')
    print("Added new BROKER_HOUSE_ADDRESS to .env file")

# Write back to file
with open(env_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n[SUCCESS] BROKER_HOUSE_ADDRESS set to: {BROKER_HOUSE_ADDRESS}")
print("This is Hardhat account #10 (index 9)")
print("\nPlease restart your backend server for the changes to take effect.")


