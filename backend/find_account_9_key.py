"""
Find the correct private key for Hardhat account #9.
Uses Hardhat's deterministic account derivation.
"""
from web3 import Web3
from eth_account import Account
from mnemonic import Mnemonic
from hdwallet import HDWallet
from hdwallet.symbols import ETH

# Hardhat's default mnemonic
mnemonic = "test test test test test test test test test test test junk"

# Initialize HDWallet
hdwallet = HDWallet(symbol=ETH)
hdwallet.from_mnemonic(mnemonic)

# Derive account #9 (index 9)
hdwallet.from_index(9)
private_key = hdwallet.private_key()
address = hdwallet.address()

print(f"Account #9:")
print(f"  Address: {address}")
print(f"  Private Key: {private_key}")
print(f"  Expected: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720")
print(f"  Match: {address.lower() == '0xa0ee7a142d267c1f36714e4a8f75612f20a79720'}")


