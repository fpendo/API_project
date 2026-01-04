"""
Fix scheme token IDs in database to match newly minted SchemeNFT tokens.
This script updates the database after SchemeNFTs were re-minted with different token IDs.
"""
from pathlib import Path
from dotenv import load_dotenv
from app.db import SessionLocal
from app.models import Scheme
from web3 import Web3
import os

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def get_scheme_nft_abi():
    """Get ABI for SchemeNFT contract"""
    return [
        {
            "inputs": [{"name": "tokenId", "type": "uint256"}],
            "name": "ownerOf",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "tokenId", "type": "uint256"}],
            "name": "getSchemeCatchment",
            "outputs": [{"name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "tokenId", "type": "uint256"}],
            "name": "schemes",
            "outputs": [
                {"name": "name", "type": "string"},
                {"name": "catchment", "type": "string"},
                {"name": "location", "type": "string"},
                {"name": "originalTonnes", "type": "uint256"},
                {"name": "remainingTonnes", "type": "uint256"},
                {"name": "ipfsCid", "type": "string"},
                {"name": "sha256Hash", "type": "string"}
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]

def find_scheme_by_name_and_catchment(w3, scheme_nft_address, name, catchment):
    """Find a scheme NFT token ID by name and catchment"""
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(scheme_nft_address),
        abi=get_scheme_nft_abi()
    )
    
    # Try token IDs 1-100 (reasonable range)
    for token_id in range(1, 101):
        try:
            owner = contract.functions.ownerOf(token_id).call()
            scheme_info = contract.functions.schemes(token_id).call()
            on_chain_name = scheme_info[0]
            on_chain_catchment = scheme_info[1]
            
            # Check if this matches
            if (on_chain_name == name and 
                on_chain_catchment.upper() == catchment.upper()):
                return token_id
        except Exception:
            # Token doesn't exist, continue
            continue
    
    return None

def fix_scheme_token_ids():
    """Update database to match on-chain token IDs"""
    db = SessionLocal()
    try:
        # Get environment variables
        scheme_nft_address = os.getenv("SCHEME_NFT_CONTRACT_ADDRESS")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        if not scheme_nft_address:
            print("ERROR: SCHEME_NFT_CONTRACT_ADDRESS not set in environment")
            return
        
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
            return
        
        print("=" * 60)
        print("FIXING SCHEME TOKEN IDs")
        print("=" * 60)
        print("")
        
        # Get all schemes
        schemes = db.query(Scheme).order_by(Scheme.id).all()
        
        if not schemes:
            print("No schemes found in database")
            return
        
        print(f"Found {len(schemes)} schemes in database")
        print("")
        
        updates = []
        
        for scheme in schemes:
            print(f"Checking Scheme #{scheme.id}: {scheme.name}")
            print(f"  Database token ID: {scheme.nft_token_id}")
            print(f"  Catchment: {scheme.catchment}")
            
            # Find matching scheme on-chain
            on_chain_token_id = find_scheme_by_name_and_catchment(
                w3, scheme_nft_address, scheme.name, scheme.catchment
            )
            
            if on_chain_token_id:
                print(f"  Found on-chain token ID: {on_chain_token_id}")
                
                if on_chain_token_id != scheme.nft_token_id:
                    print(f"  [UPDATE] Changing token ID from {scheme.nft_token_id} to {on_chain_token_id}")
                    scheme.nft_token_id = on_chain_token_id
                    updates.append((scheme.id, scheme.nft_token_id, on_chain_token_id))
                else:
                    print(f"  [OK] Token ID matches")
            else:
                print(f"  [WARNING] Could not find matching scheme on-chain")
            
            print("")
        
        if updates:
            print("=" * 60)
            print("UPDATING DATABASE")
            print("=" * 60)
            print("")
            
            db.commit()
            
            print("Successfully updated token IDs:")
            for scheme_id, old_id, new_id in updates:
                print(f"  Scheme #{scheme_id}: {old_id} -> {new_id}")
            
            print("")
            print("NOTE: You may also need to update SchemeCredits balances.")
            print("The credits were minted to the old token IDs (14, 15, 16),")
            print("but the SchemeNFTs are now at token IDs 1, 2, 3.")
            print("You may need to re-mint credits to the new token IDs.")
        else:
            print("No updates needed.")
        
        print("")
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_scheme_token_ids()



