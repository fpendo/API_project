"""
Get the correct private key for Hardhat account #9.
Hardhat uses deterministic accounts from mnemonic: "test test test test test test test test test test test junk"
"""
from mnemonic import Mnemonic
from eth_account import Account
from eth_utils import to_checksum_address
import hashlib
import hmac

def derive_hardhat_account(index):
    """Derive Hardhat account from mnemonic"""
    mnemonic = "test test test test test test test test test test test junk"
    mnemo = Mnemonic("english")
    seed = mnemo.to_seed(mnemonic)
    
    # Derive using BIP44 path: m/44'/60'/0'/0/{index}
    # Simplified version for Hardhat
    hmac_obj = hmac.new(b"ed25519 seed", seed, hashlib.sha512).digest()
    
    # Hardhat uses a simpler derivation
    # Actually, Hardhat uses @ethersproject/hdnode which uses a different method
    # Let's try a different approach - use the known Hardhat accounts
    
    # For now, let's just try to get it from the node or use a known method
    pass

# Hardhat's deterministic accounts - let's try to get account #9's key
# Actually, the easiest way is to use Hardhat's account derivation
# Or we can query the Hardhat node for the private key

if __name__ == "__main__":
    # Try to connect to Hardhat and get account #9
    from web3 import Web3
    w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
    
    if w3.is_connected():
        # Hardhat exposes accounts via eth_accounts
        accounts = w3.eth.accounts
        print(f"Found {len(accounts)} accounts")
        if len(accounts) > 9:
            print(f"Account #9: {accounts[9]}")
            print(f"Expected: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720")
            print(f"Match: {accounts[9].lower() == '0xa0ee7a142d267c1f36714e4a8f75612f20a79720'}")
    else:
        print("Cannot connect to Hardhat node")


