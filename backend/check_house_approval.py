"""
Check if house address has approved regulator.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def check_approval():
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    house_address = os.getenv("BROKER_HOUSE_ADDRESS")
    regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    regulator_account = w3.eth.account.from_key(regulator_private_key)
    regulator_address = regulator_account.address
    
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(scheme_credits_address),
        abi=[{
            "constant": True,
            "inputs": [
                {"name": "account", "type": "address"},
                {"name": "operator", "type": "address"}
            ],
            "name": "isApprovedForAll",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        }]
    )
    
    is_approved = contract.functions.isApprovedForAll(
        Web3.to_checksum_address(house_address),
        Web3.to_checksum_address(regulator_address)
    ).call()
    
    print(f"House address: {house_address}")
    print(f"Regulator address: {regulator_address}")
    print(f"Approved: {is_approved}")
    
    return is_approved

if __name__ == "__main__":
    check_approval()


