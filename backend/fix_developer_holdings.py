"""
Complete fix for developer holdings issue.
This script will:
1. Check if contracts are deployed
2. If not, provide instructions to redeploy
3. Update developer's EVM address to a real Hardhat account (optional)
4. Retry transfers after contracts are deployed
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, AccountRole

# Load .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def check_and_fix():
    """Check contract deployment and provide fix instructions"""
    print("=" * 60)
    print("DEVELOPER HOLDINGS FIX")
    print("=" * 60)
    print("")
    
    # Check contract deployment
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address:
        print("[ERROR] SCHEME_CREDITS_CONTRACT_ADDRESS not set in .env file")
        print("")
        print("Solution:")
        print("1. Deploy contracts: npx hardhat run scripts/deploy.ts --network localhost")
        print("2. Copy addresses to backend/.env file")
        return
    
    print(f"Checking contract at: {scheme_credits_address}")
    
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"[ERROR] Cannot connect to Hardhat node at {rpc_url}")
            print("")
            print("Solution: Start Hardhat node in a separate terminal:")
            print("  npx hardhat node")
            return
        
        # Check if contract has code
        address_checksum = Web3.to_checksum_address(scheme_credits_address)
        code = w3.eth.get_code(address_checksum)
        
        if code == b'':
            print("[PROBLEM] Contract is NOT deployed at this address!")
            print("")
            print("The Hardhat node was restarted, so contracts need to be redeployed.")
            print("")
            print("SOLUTION:")
            print("1. Make sure Hardhat node is running: npx hardhat node")
            print("2. Deploy contracts:")
            print("   npx hardhat run scripts/deploy.ts --network localhost")
            print("3. Copy the new contract addresses to backend/.env file")
            print("4. Then run this script again to retry transfers")
            return
        
        print("[OK] Contract is deployed")
        print("")
        
        # Check developer account
        db = SessionLocal()
        try:
            developer = db.query(Account).filter(Account.id == 5).first()
            if developer:
                print(f"Developer Account:")
                print(f"  ID: {developer.id}")
                print(f"  Name: {developer.name}")
                print(f"  EVM Address: {developer.evm_address}")
                print("")
                
                # Check if address is placeholder
                if developer.evm_address == "0x5555555555555555555555555555555555555555":
                    print("[WARNING] Developer is using a placeholder address!")
                    print("")
                    print("This address doesn't exist on Hardhat. Options:")
                    print("")
                    print("Option 1: Update to a real Hardhat account (recommended)")
                    print("  Hardhat account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
                    print("  Hardhat account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")
                    print("")
                    print("Option 2: Keep placeholder (credits will be sent there)")
                    print("")
                    
                    response = input("Update developer to Hardhat account #1? (y/n): ").strip().lower()
                    if response == 'y':
                        developer.evm_address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                        db.commit()
                        print("[OK] Developer address updated to Hardhat account #1")
                        print("")
                    else:
                        print("Keeping placeholder address")
                        print("")
                
                # Now retry transfers
                print("Ready to retry transfers. Run:")
                print("  python retry_developer_transfers.py")
                print("")
                
        finally:
            db.close()
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_and_fix()



