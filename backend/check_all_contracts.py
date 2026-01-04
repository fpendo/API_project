"""
Check all three contracts (SchemeNFT, SchemeCredits, PlanningLock) to verify deployment.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3

# Load .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def check_contract(name, address, rpc_url):
    """Check if a contract is deployed at the given address"""
    if not address:
        print(f"[MISSING] {name}: Address not set in .env")
        return False
    
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"[ERROR] Cannot connect to blockchain at {rpc_url}")
            return False
        
        address_checksum = Web3.to_checksum_address(address)
        code = w3.eth.get_code(address_checksum)
        
        if code == b'':
            print(f"[NOT DEPLOYED] {name}: No contract code at {address}")
            return False
        else:
            print(f"[OK] {name}: Deployed at {address} ({len(code)} bytes)")
            return True
    except Exception as e:
        print(f"[ERROR] {name}: {str(e)}")
        return False

def main():
    print("=" * 70)
    print("CONTRACT DEPLOYMENT CHECK - ALL CONTRACTS")
    print("=" * 70)
    print()
    
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    print(f"RPC URL: {rpc_url}")
    print()
    
    # Check connection first
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print("[ERROR] Cannot connect to Hardhat node!")
            print("Solution: Start Hardhat node with: npx hardhat node")
            return
        print("[OK] Connected to Hardhat node")
        print()
    except Exception as e:
        print(f"[ERROR] Cannot connect: {str(e)}")
        return
    
    # Check all three contracts
    contracts = {
        "SchemeNFT": os.getenv("SCHEME_NFT_CONTRACT_ADDRESS"),
        "SchemeCredits": os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS"),
        "PlanningLock": os.getenv("PLANNING_LOCK_CONTRACT_ADDRESS")
    }
    
    all_ok = True
    for name, address in contracts.items():
        if not check_contract(name, address, rpc_url):
            all_ok = False
    
    print()
    print("=" * 70)
    if all_ok:
        print("[SUCCESS] All contracts are deployed and match .env addresses")
    else:
        print("[ACTION REQUIRED] Some contracts are missing or not deployed")
        print()
        print("SOLUTION:")
        print("1. Make sure Hardhat node is running: npx hardhat node")
        print("2. Deploy contracts:")
        print("   npx hardhat run scripts/deploy.ts --network localhost")
        print("3. Copy the new addresses from the deployment output")
        print("4. Update backend/.env with the new addresses")
        print("5. Restart the backend server")
    print("=" * 70)

if __name__ == "__main__":
    main()


