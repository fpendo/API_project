"""
Check which schemes exist in database but are missing from SchemeNFT on-chain.
Mint missing SchemeNFTs using data from the database.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Scheme, Account
from app.services.nft_integration import mint_scheme_nft

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
        }
    ]

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def check_scheme_exists_on_chain(w3, scheme_nft_address, token_id):
    """Check if a scheme NFT exists on-chain"""
    try:
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_nft_address),
            abi=get_scheme_nft_abi()
        )
        # Try to get owner - if it doesn't exist, this will throw
        owner = contract.functions.ownerOf(token_id).call()
        # Also check catchment - if empty, scheme wasn't minted properly
        catchment = contract.functions.getSchemeCatchment(token_id).call()
        return owner != '0x0000000000000000000000000000000000000000' and catchment and catchment.strip() != ''
    except Exception:
        return False

def check_and_mint_scheme_nfts():
    """Check and mint missing SchemeNFTs"""
    db = SessionLocal()
    try:
        # Get environment variables
        scheme_nft_address = os.getenv("SCHEME_NFT_CONTRACT_ADDRESS")
        regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        if not scheme_nft_address:
            print("ERROR: SCHEME_NFT_CONTRACT_ADDRESS not set in environment")
            return
        
        if not regulator_private_key:
            print("ERROR: REGULATOR_PRIVATE_KEY not set in environment")
            return
        
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
            return
        
        print("=" * 60)
        print("CHECKING SCHEME NFTS")
        print("=" * 60)
        print("")
        print(f"SchemeNFT Contract: {scheme_nft_address}")
        print(f"RPC URL: {rpc_url}")
        print("")
        
        # Get all schemes from database
        schemes = db.query(Scheme).order_by(Scheme.id).all()
        
        if not schemes:
            print("No schemes found in database")
            return
        
        print(f"Found {len(schemes)} schemes in database")
        print("")
        
        missing_schemes = []
        existing_schemes = []
        
        for scheme in schemes:
            print(f"Checking Scheme #{scheme.id}: {scheme.name} (NFT Token ID: {scheme.nft_token_id})")
            
            if not scheme.nft_token_id:
                print(f"  [SKIP] No NFT token ID set in database")
                print("")
                continue
            
            # Check if exists on-chain
            exists = check_scheme_exists_on_chain(w3, scheme_nft_address, scheme.nft_token_id)
            
            if exists:
                print(f"  [OK] Exists on-chain")
                existing_schemes.append(scheme)
            else:
                print(f"  [MISSING] Not found on-chain or has empty catchment")
                missing_schemes.append(scheme)
            
            print("")
        
        if not missing_schemes:
            print("=" * 60)
            print("SUMMARY")
            print("=" * 60)
            print("All schemes exist on-chain!")
            return
        
        print("=" * 60)
        print("MINTING MISSING SCHEME NFTS")
        print("=" * 60)
        print("")
        print(f"Found {len(missing_schemes)} schemes that need to be minted:")
        for scheme in missing_schemes:
            print(f"  - Scheme #{scheme.id}: {scheme.name} (Token ID: {scheme.nft_token_id})")
        print("")
        
        # Get landowner account for each scheme
        for scheme in missing_schemes:
            print(f"Minting Scheme #{scheme.id}: {scheme.name}...")
            
            # Get the landowner who created this scheme
            creator = db.query(Account).filter(Account.id == scheme.created_by_account_id).first()
            if not creator or not creator.evm_address:
                print(f"  [ERROR] Cannot find landowner account (ID: {scheme.created_by_account_id}) or missing EVM address")
                print("")
                continue
            
            landowner_address = creator.evm_address
            print(f"  Landowner: {creator.name} ({landowner_address})")
            print(f"  Catchment: {scheme.catchment}")
            print(f"  Location: {scheme.location}")
            print(f"  Tonnage: {scheme.original_tonnage}")
            print(f"  Unit Type: {scheme.unit_type}")
            print("")
            
            try:
                # Create a mock submission object for mint_scheme_nft
                # We need to create a minimal object with the required attributes
                class MockSubmission:
                    def __init__(self, scheme):
                        self.scheme_name = scheme.name
                        self.catchment = scheme.catchment
                        self.location = scheme.location
                        self.total_tonnage = scheme.original_tonnage
                
                mock_submission = MockSubmission(scheme)
                
                # Use placeholder IPFS CID and hash (these aren't critical for planning applications)
                ipfs_cid = f"QmPlaceholder{scheme.id}"
                sha256_hash = f"placeholder_hash_{scheme.id}"
                
                # Mint the NFT
                minted_token_id = mint_scheme_nft(
                    submission=mock_submission,
                    ipfs_cid=ipfs_cid,
                    sha256_hash=sha256_hash,
                    scheme_nft_address=scheme_nft_address,
                    private_key=regulator_private_key,
                    landowner_address=landowner_address,
                    rpc_url=rpc_url
                )
                
                print(f"  [OK] Successfully minted SchemeNFT!")
                print(f"  Minted Token ID: {minted_token_id}")
                
                # Verify the token ID matches what's in the database
                if minted_token_id != scheme.nft_token_id:
                    print(f"  [WARNING] Minted token ID ({minted_token_id}) does not match database ({scheme.nft_token_id})")
                    print(f"  You may need to update the database or use the correct token ID")
                
                print("")
                
            except Exception as e:
                print(f"  [ERROR] Failed to mint: {str(e)}")
                print("")
        
        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Checked {len(schemes)} schemes")
        print(f"  - {len(existing_schemes)} already exist on-chain")
        print(f"  - {len(missing_schemes)} were missing (attempted to mint)")
        print("")
        print("You can now try validating your QR code again.")
        print("")
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_and_mint_scheme_nfts()

