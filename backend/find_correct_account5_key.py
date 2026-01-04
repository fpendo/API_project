"""
Find the correct private key for Hardhat Account #5.
"""
from web3 import Web3

# Standard Hardhat accounts (0-indexed)
# Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
# Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
# Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
# Account #3: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
# Account #4: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
# Account #5: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc

# Standard Hardhat private keys
HARDHAT_KEYS = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",  # Account #0
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",  # Account #1
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",  # Account #2
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",  # Account #3
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",  # Account #4
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",  # Account #5
]

w3 = Web3()

print("=" * 80)
print("FINDING CORRECT ACCOUNT #5 PRIVATE KEY")
print("=" * 80)

target_address = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"

print(f"\nTarget Address (Account #5): {target_address}\n")

for i, key in enumerate(HARDHAT_KEYS):
    account = w3.eth.account.from_key(key)
    address = account.address
    matches = address.lower() == target_address.lower()
    status = "[MATCH]" if matches else "[NO]"
    print(f"Account #{i}: {status}")
    print(f"  Key: {key}")
    print(f"  Address: {address}")
    if matches:
        print(f"\n[FOUND] Account #5 private key: {key}")
        break

