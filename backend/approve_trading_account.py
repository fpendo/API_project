"""
Script to approve the landowner/regulator address to transfer credits
on behalf of the trading account. This is required for ERC-1155 transfers.
"""
import sys
import os
from dotenv import load_dotenv
from web3 import Web3

# Load environment variables
load_dotenv()

def get_scheme_credits_abi():
    """Get ABI for SchemeCredits contract"""
    return [
        {
            "constant": False,
            "inputs": [
                {"name": "operator", "type": "address"},
                {"name": "approved", "type": "bool"}
            ],
            "name": "setApprovalForAll",
            "outputs": [],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "account", "type": "address"},
                {"name": "operator", "type": "address"}
            ],
            "name": "isApprovedForAll",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        }
    ]

def approve_trading_account():
    """Approve landowner/regulator to transfer on behalf of trading account"""
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
    # Use regulator private key (or landowner if available)
    operator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
    if not operator_private_key:
        operator_private_key = os.getenv("LANDOWNER_PRIVATE_KEY")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address:
        print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set")
        return
    
    if not operator_private_key:
        print("ERROR: REGULATOR_PRIVATE_KEY or LANDOWNER_PRIVATE_KEY not set")
        return
    
    try:
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
            return
        
        # Get operator address from private key
        operator_account = w3.eth.account.from_key(operator_private_key)
        operator_address = operator_account.address
        
        print(f"Trading Account: {trading_account_address}")
        print(f"Operator (who will be approved): {operator_address}")
        print("")
        
        # Get contract
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        # Check if already approved
        is_approved = contract.functions.isApprovedForAll(
            Web3.to_checksum_address(trading_account_address),
            operator_address
        ).call()
        
        if is_approved:
            print("Already approved! No action needed.")
            return
        
        print("Approval needed. Setting approval...")
        
        # NOTE: This requires the trading account's private key to sign!
        # Since we don't have it, we need a different approach.
        # The trading account needs to call setApprovalForAll itself.
        print("")
        print("ERROR: Cannot approve without trading account's private key.")
        print("")
        print("SOLUTION: The trading account needs to be a contract or")
        print("we need to use the trading account's private key to sign.")
        print("")
        print("Alternative: Transfer credits directly from landowner's address")
        print("instead of using a trading account.")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    approve_trading_account()




