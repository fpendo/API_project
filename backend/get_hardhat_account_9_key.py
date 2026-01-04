"""
Get Hardhat account #9 private key.
Hardhat uses deterministic accounts. Account #9 address is 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
"""
from web3 import Web3

# Hardhat's deterministic accounts
# Account #9: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
# The private key for Hardhat account #9
HARDHAT_ACCOUNT_9_PRIVATE_KEY = "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b7e51d0e42b8b2087b0e0b"

w3 = Web3()
account = w3.eth.account.from_key(HARDHAT_ACCOUNT_9_PRIVATE_KEY)
print(f"Account #9 address: {account.address}")
print(f"Account #9 private key: {HARDHAT_ACCOUNT_9_PRIVATE_KEY}")
print(f"Matches expected: {account.address.lower() == '0xa0ee7a142d267c1f36714e4a8f75612f20a79720'}")


