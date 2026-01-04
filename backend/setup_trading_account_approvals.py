"""
Set up ERC-1155 approvals so landowner/regulator can transfer credits on behalf of trading account.
This is REQUIRED for credit transfers to work.

The trading account (Hardhat account #1) needs to approve the landowner/regulator addresses
so they can transfer credits FROM the trading account TO buyers (developers).

This script should be run after deploying contracts.
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

def setup_trading_account_approvals():
    """Set up approvals for trading account"""
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    trading_account_address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"  # Hardhat account #1
    # Hardhat account #1 private key (standard Hardhat test account)
    trading_account_private_key = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address:
        print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set in .env")
        print("Please deploy contracts first using: npx hardhat run scripts/deploy-and-update-env.ts --network localhost")
        return False
    
    # Get operator addresses (landowner and regulator)
    operator_addresses = []
    
    # Landowner address (Hardhat account #0)
    landowner_private_key = os.getenv("LANDOWNER_PRIVATE_KEY")
    if landowner_private_key:
        try:
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            landowner_account = w3.eth.account.from_key(landowner_private_key)
            operator_addresses.append(("LANDOWNER", landowner_account.address))
        except:
            pass
    
    # Regulator address (also Hardhat account #0 typically)
    regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
    if regulator_private_key:
        try:
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            regulator_account = w3.eth.account.from_key(regulator_private_key)
            operator_addresses.append(("REGULATOR", regulator_account.address))
        except:
            pass
    
    # Default: Use Hardhat account #0 if no keys set
    if not operator_addresses:
        # Hardhat account #0 address
        operator_addresses.append(("DEFAULT", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"))
    
    # Remove duplicates
    seen = set()
    unique_operators = []
    for role, addr in operator_addresses:
        if addr.lower() not in seen:
            seen.add(addr.lower())
            unique_operators.append((role, addr))
    
    if not unique_operators:
        print("ERROR: No operator addresses found")
        return False
    
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
            print("Make sure Hardhat node is running!")
            return False
        
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        trading_account = w3.eth.account.from_key(trading_account_private_key)
        
        print("=" * 70)
        print("SETTING UP TRADING ACCOUNT APPROVALS")
        print("=" * 70)
        print()
        print(f"Trading Account: {trading_account_address}")
        print(f"SchemeCredits Contract: {scheme_credits_address}")
        print()
        
        all_approved = True
        
        for role, operator_address in unique_operators:
            operator_checksum = Web3.to_checksum_address(operator_address)
            
            # Check current approval status
            try:
                is_approved = contract.functions.isApprovedForAll(
                    Web3.to_checksum_address(trading_account_address),
                    operator_checksum
                ).call()
                
                if is_approved:
                    print(f"[OK] {role} ({operator_address[:10]}...) - Already approved")
                    continue
            except Exception as e:
                print(f"[WARN] Could not check approval status for {role}: {str(e)}")
            
            print(f"[APPROVE] {role} ({operator_address[:10]}...) - Setting approval...")
            
            # Call setApprovalForAll from trading account
            function_call = contract.functions.setApprovalForAll(
                operator_checksum,
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
                print(f"[ERROR] Transaction failed for {role}")
                all_approved = False
                continue
            
            print(f"[SUCCESS] {role} approved! Transaction: {tx_hash.hex()}")
            
            # Verify approval
            try:
                is_approved_now = contract.functions.isApprovedForAll(
                    Web3.to_checksum_address(trading_account_address),
                    operator_checksum
                ).call()
                
                if is_approved_now:
                    print(f"[VERIFIED] {role} approval confirmed")
                else:
                    print(f"[WARN] {role} approval may not have been set correctly")
                    all_approved = False
            except Exception as e:
                print(f"[WARN] Could not verify approval for {role}: {str(e)}")
        
        print()
        print("=" * 70)
        if all_approved:
            print("[SUCCESS] All trading account approvals set up!")
        else:
            print("[WARNING] Some approvals may have failed. Check the output above.")
        print("=" * 70)
        
        return all_approved
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    setup_trading_account_approvals()


