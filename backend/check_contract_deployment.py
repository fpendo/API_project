"""
Check if contracts are properly deployed and verify ABI compatibility.
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
            "constant": True,
            "inputs": [
                {"name": "account", "type": "address"},
                {"name": "id", "type": "uint256"}
            ],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "schemeId", "type": "uint256"},
                {"name": "user", "type": "address"}
            ],
            "name": "lockedBalance",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ]

def check_contract():
    """Check if contract is deployed and accessible"""
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address:
        print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set")
        return
    
    print("=" * 60)
    print("CONTRACT DEPLOYMENT CHECK")
    print("=" * 60)
    print(f"Contract Address: {scheme_credits_address}")
    print(f"RPC URL: {rpc_url}")
    print("")
    
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print("ERROR: Cannot connect to blockchain")
            return
        
        print("[OK] Connected to blockchain")
        
        # Check if address has code (contract deployed)
        address_checksum = Web3.to_checksum_address(scheme_credits_address)
        code = w3.eth.get_code(address_checksum)
        
        if code == b'':
            print("[ERROR] No contract code at this address!")
            print("  The contract is NOT deployed at this address.")
            print("  Solution: Deploy contracts with: npx hardhat run scripts/deploy.ts --network localhost")
            return
        
        print(f"[OK] Contract has code ({len(code)} bytes)")
        print("")
        
        # Try to call a simple view function
        try:
            contract = w3.eth.contract(
                address=address_checksum,
                abi=get_scheme_credits_abi()
            )
            
            # Try calling balanceOf with a test address
            test_address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
            test_scheme_id = 14
            
            print(f"Testing contract call:")
            print(f"  Address: {test_address}")
            print(f"  Scheme ID: {test_scheme_id}")
            print("")
            
            try:
                balance = contract.functions.balanceOf(
                    Web3.to_checksum_address(test_address),
                    test_scheme_id
                ).call()
                print(f"[OK] balanceOf() call succeeded: {balance}")
            except Exception as e:
                print(f"[ERROR] balanceOf() call failed: {str(e)}")
                print("  This suggests the ABI might be incomplete or function signature is wrong")
            
            try:
                locked = contract.functions.lockedBalance(
                    test_scheme_id,
                    Web3.to_checksum_address(test_address)
                ).call()
                print(f"[OK] lockedBalance() call succeeded: {locked}")
            except Exception as e:
                print(f"[ERROR] lockedBalance() call failed: {str(e)}")
                print("  Note: Parameter order might be wrong (schemeId, user) vs (user, schemeId)")
            
        except Exception as e:
            print(f"[ERROR] Failed to create contract instance: {str(e)}")
            import traceback
            traceback.print_exc()
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_contract()



