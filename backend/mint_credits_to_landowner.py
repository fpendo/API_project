"""
Script to mint credits directly to the landowner's address.
This is useful for testing or when credits need to be minted to a new address.
"""
import sys
import os
from app.db import SessionLocal
from app.models import Account, AccountRole, Scheme
from app.services.credits_integration import mint_scheme_credits
from dotenv import load_dotenv
from pathlib import Path

# Load .env
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

def mint_credits_to_landowner():
    """Mint credits to the landowner's current address"""
    db = SessionLocal()
    try:
        # Find landowner account
        landowner = db.query(Account).filter(Account.role == AccountRole.LANDOWNER).first()
        if not landowner:
            landowner = db.query(Account).filter(Account.id == 1).first()
        
        if not landowner:
            print("ERROR: No landowner account found")
            return
        
        if not landowner.evm_address:
            print(f"ERROR: Landowner account {landowner.id} has no EVM address")
            return
        
        print(f"Found landowner: {landowner.name} (ID: {landowner.id})")
        print(f"Address: {landowner.evm_address}")
        
        # Get scheme (usually scheme ID 1)
        scheme = db.query(Scheme).filter(Scheme.id == 1).first()
        if not scheme:
            print("ERROR: No scheme found. Please create a scheme first.")
            return
        
        print(f"Found scheme: {scheme.name} (ID: {scheme.id}, NFT Token ID: {scheme.nft_token_id})")
        print(f"Original tonnage: {scheme.original_tonnage} tonnes")
        
        # Get environment variables
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        if not scheme_credits_address:
            print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set in .env")
            return
        
        if not regulator_private_key:
            print("ERROR: REGULATOR_PRIVATE_KEY not set in .env")
            return
        
        # Calculate credits (1 tonne = 100,000 credits)
        credits_amount = int(scheme.original_tonnage * 100000)
        print(f"\nMinting {credits_amount:,} credits to {landowner.evm_address}...")
        print(f"Scheme ID (NFT Token ID): {scheme.nft_token_id}")
        
        # Mint credits
        try:
            mint_scheme_credits(
                scheme_id=scheme.nft_token_id,
                landowner_address=landowner.evm_address,
                original_tonnage=scheme.original_tonnage,
                scheme_credits_address=scheme_credits_address,
                private_key=regulator_private_key,
                rpc_url=rpc_url
            )
            print(f"✓ Successfully minted {credits_amount:,} credits!")
            print(f"  Address: {landowner.evm_address}")
            print(f"  Scheme ID: {scheme.nft_token_id}")
            print(f"  Credits: {credits_amount:,}")
        except Exception as e:
            print(f"ERROR: Failed to mint credits: {str(e)}")
            raise
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    mint_credits_to_landowner()




