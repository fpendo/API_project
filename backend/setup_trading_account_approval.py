"""
Script to set up approval so the landowner/regulator can transfer credits
on behalf of the trading account. This is required for ERC-1155 transfers.

The trading account address (0x70997970C51812dc3A010C7d01b50e0d17dc79C8) 
is Hardhat account #1, so we can use its private key to set approval.
"""
import os
from dotenv import load_dotenv
from web3 import Web3

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

def setup_approval():
    """Set up approval for trading account"""
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    trading_account_address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"  # Hardhat account #1
    # Hardhat account #1 private key (standard Hardhat test account)
    trading_account_private_key = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    
    # Operator who will be approved (landowner/regulator)
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
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
            return
        
        # Get operator address
        operator_account = w3.eth.account.from_key(operator_private_key)
        operator_address = operator_account.address
        
        print(f"Trading Account: {trading_account_address}")
        print(f"Operator (to be approved): {operator_address}")
        print("")
        
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        # Check current approval status
        is_approved = contract.functions.isApprovedForAll(
            Web3.to_checksum_address(trading_account_address),
            operator_address
        ).call()
        
        if is_approved:
            print("Already approved! No action needed.")
            return
        
        print("Setting approval...")
        
        # Get trading account
        trading_account = w3.eth.account.from_key(trading_account_private_key)
        
        # Call setApprovalForAll from trading account
        function_call = contract.functions.setApprovalForAll(
            Web3.to_checksum_address(operator_address),
            True
        )
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(trading_account.address)
        transaction = function_call.build_transaction({
            'from': trading_account.address,
            'nonce': nonce,
            'gas': 100000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign with trading account's private key
        signed_txn = w3.eth.account.sign_transaction(transaction, trading_account_private_key)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status != 1:
            print("ERROR: Transaction failed")
            return
        
        print(f"SUCCESS: Approval set! Transaction hash: {tx_hash.hex()}")
        
        # Verify approval
        is_approved_now = contract.functions.isApprovedForAll(
            Web3.to_checksum_address(trading_account_address),
            operator_address
        ).call()
        
        if is_approved_now:
            print("Verification: Approval confirmed!")
        else:
            print("WARNING: Approval may not have been set correctly")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    setup_approval()




