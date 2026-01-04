"""
Set up ERC-1155 approval so regulator can transfer credits on behalf of house address.
This is REQUIRED for broker house account transfers to work.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3

# Load .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

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

def setup_house_address_approval():
    """Set up approval for house address"""
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    house_address = os.getenv("BROKER_HOUSE_ADDRESS")
    regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address:
        print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set in .env")
        return False
    
    if not house_address:
        print("ERROR: BROKER_HOUSE_ADDRESS not set in .env")
        return False
    
    # Hardhat account #9 private key
    # We'll derive it from Hardhat's deterministic accounts
    # Hardhat uses: "test test test test test test test test test test test junk"
    # Account #9 (index 9) address: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
    # We need to get the private key - for now, try to get it from Hardhat node
    # Or use a script that connects to Hardhat and gets signers
    
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
            return False
        
        # Try to get account #9's private key by checking Hardhat's accounts
        # Hardhat account #9 private key (derived from mnemonic)
        # This is the standard Hardhat test account #9
        # We'll use a workaround: try to import the account or use a known key
        # For now, let's try to get it from the node if possible
        
        # Actually, the simplest approach: use Hardhat's account derivation
        # Account #9 from Hardhat's default mnemonic
        # Let me try a different approach - use the node's accounts
        try:
            # Try to get accounts from the node (if it's Hardhat)
            accounts = w3.eth.accounts
            if len(accounts) > 9:
                print(f"Found {len(accounts)} accounts in node")
                # Account #9 should be at index 9
                if accounts[9].lower() == house_address.lower():
                    print("Account #9 matches house address")
                    # We still need the private key though
        except:
            pass
        
        # For now, we'll need to manually set the private key
        # Hardhat account #9 private key (this needs to be the actual key)
        # Since we can't easily derive it, let's use a workaround:
        # Set up the approval using a transaction that we sign with account #9
        # But we need the private key...
        
        print(f"WARNING: Need account #9's private key to set up approval")
        print(f"House address: {house_address}")
        print(f"Please run this from Hardhat console or provide account #9's private key")
        return False
        
        # Get regulator address
        regulator_account = w3.eth.account.from_key(regulator_private_key)
        regulator_address = regulator_account.address
        
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        print("=" * 70)
        print("SETTING UP HOUSE ADDRESS APPROVAL")
        print("=" * 70)
        print()
        print(f"House Address: {house_address}")
        print(f"Regulator Address: {regulator_address}")
        print(f"SchemeCredits Contract: {scheme_credits_address}")
        print()
        
        # Check current approval status
        try:
            is_approved = contract.functions.isApprovedForAll(
                Web3.to_checksum_address(house_address),
                Web3.to_checksum_address(regulator_address)
            ).call()
            
            if is_approved:
                print("[OK] Regulator already approved by house address")
                return True
        except Exception as e:
            print(f"[WARN] Could not check approval status: {str(e)}")
        
        print("[APPROVE] Setting approval from house address to regulator...")
        
        # Call setApprovalForAll from house address
        function_call = contract.functions.setApprovalForAll(
            Web3.to_checksum_address(regulator_address),
            True
        )
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(house_account.address)
        transaction = function_call.build_transaction({
            'from': house_account.address,
            'nonce': nonce,
            'gas': 100000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign with house address's private key
        signed_txn = w3.eth.account.sign_transaction(transaction, house_private_key)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status != 1:
            print("[ERROR] Transaction failed")
            return False
        
        print(f"[SUCCESS] Approval set! Transaction: {tx_hash.hex()}")
        
        # Verify approval
        try:
            is_approved_now = contract.functions.isApprovedForAll(
                Web3.to_checksum_address(house_address),
                Web3.to_checksum_address(regulator_address)
            ).call()
            
            if is_approved_now:
                print("[VERIFIED] Approval confirmed")
                return True
            else:
                print("[WARN] Approval may not have been set correctly")
                return False
        except Exception as e:
            print(f"[WARN] Could not verify approval: {str(e)}")
            return False
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    setup_house_address_approval()

