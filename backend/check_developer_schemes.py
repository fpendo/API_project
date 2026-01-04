"""Check developer's available schemes and their capacities"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, AccountRole, Scheme, PlanningApplicationScheme, PlanningApplication
from app.services.credits_summary import get_account_credits_summary

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Fix encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

def get_scheme_nft_abi():
    return [
        {
            "constant": True,
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
            "type": "function"
        }
    ]

db = SessionLocal()
try:
    print("=" * 70)
    print("DEVELOPER SCHEMES AND CAPACITIES")
    print("=" * 70)
    
    developer = db.query(Account).filter(Account.id == 5).first()
    if not developer:
        print("ERROR: Developer not found")
        sys.exit(1)
    
    print(f"\nDeveloper: {developer.name}")
    
    # Get holdings
    holdings = get_account_credits_summary(developer, db)
    
    scheme_nft_address = os.getenv("SCHEME_NFT_CONTRACT_ADDRESS")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if scheme_nft_address:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if w3.is_connected():
            scheme_nft_contract = w3.eth.contract(
                address=Web3.to_checksum_address(scheme_nft_address),
                abi=get_scheme_nft_abi()
            )
        else:
            scheme_nft_contract = None
    else:
        scheme_nft_contract = None
    
    print(f"\nHoldings by Scheme:")
    print("-" * 70)
    
    for holding in holdings:
        scheme = db.query(Scheme).filter(Scheme.id == holding["scheme_id"]).first()
        if not scheme:
            continue
        
        credits = holding.get("credits", 0)
        locked = holding.get("locked_credits", 0)
        available = credits - locked
        
        print(f"\nScheme {scheme.id} ({scheme.name}):")
        print(f"  Catchment: {scheme.catchment}, Unit Type: {scheme.unit_type}")
        print(f"  Developer Credits: {credits:,}")
        print(f"  Locked Credits: {locked:,}")
        print(f"  Available Credits: {available:,}")
        print(f"  Database Remaining Tonnage: {scheme.remaining_tonnage}")
        
        if scheme_nft_contract:
            try:
                scheme_info = scheme_nft_contract.functions.schemes(scheme.nft_token_id).call()
                on_chain_remaining = scheme_info[4]
                on_chain_original = scheme_info[3]
                print(f"  On-chain Original Tonnes: {on_chain_original}")
                print(f"  On-chain Remaining Tonnes: {on_chain_remaining}")
                print(f"  Max Burnable (whole tonnes): {on_chain_remaining}")
            except Exception as e:
                print(f"  ERROR checking on-chain: {str(e)}")
    
    # Check locked application
    locked_app = db.query(PlanningApplication).filter(
        PlanningApplication.developer_account_id == developer.id,
        PlanningApplication.status == "LOCKED"
    ).order_by(PlanningApplication.id.desc()).first()
    
    if locked_app:
        print(f"\n" + "=" * 70)
        print("LOCKED APPLICATION")
        print("=" * 70)
        print(f"Application ID: {locked_app.id}")
        print(f"Required Tonnage: {locked_app.required_tonnage}")
        
        allocations = db.query(PlanningApplicationScheme).filter(
            PlanningApplicationScheme.application_id == locked_app.id
        ).all()
        
        for allocation in allocations:
            scheme = db.query(Scheme).filter(Scheme.id == allocation.scheme_id).first()
            tonnes = allocation.tonnes_allocated or (allocation.credits_allocated / 100000.0)
            whole_tonnes = int(allocation.credits_allocated / 100000)
            
            print(f"\n  Scheme {scheme.id}:")
            print(f"    Credits: {allocation.credits_allocated:,}")
            print(f"    Tonnes: {tonnes:.4f}")
            print(f"    Whole Tonnes: {whole_tonnes}")
            
            if scheme_nft_contract:
                try:
                    scheme_info = scheme_nft_contract.functions.schemes(scheme.nft_token_id).call()
                    on_chain_remaining = scheme_info[4]
                    if on_chain_remaining < whole_tonnes:
                        print(f"    ⚠️  PROBLEM: Scheme only has {on_chain_remaining} remaining tonnes!")
                        print(f"       Cannot burn {whole_tonnes} tonnes from this scheme.")
                except:
                    pass
    
finally:
    db.close()



