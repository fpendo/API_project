"""Check scheme remaining tonnes on-chain vs what's being requested"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import PlanningApplication, PlanningApplicationScheme, Scheme

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

def get_planning_lock_abi():
    return [
        {
            "constant": True,
            "inputs": [{"name": "appId", "type": "uint256"}],
            "name": "applications",
            "outputs": [
                {"name": "developer", "type": "address"},
                {"name": "catchmentHash", "type": "bytes32"},
                {"name": "status", "type": "uint8"}
            ],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [{"name": "appId", "type": "uint256"}],
            "name": "getApplicationSchemeIds",
            "outputs": [{"name": "", "type": "uint256[]"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [{"name": "appId", "type": "uint256"}],
            "name": "getApplicationAmounts",
            "outputs": [{"name": "", "type": "uint256[]"}],
            "type": "function"
        }
    ]

db = SessionLocal()
try:
    print("=" * 70)
    print("SCHEME REMAINING TONNES CHECK")
    print("=" * 70)
    
    scheme_nft_address = os.getenv("SCHEME_NFT_CONTRACT_ADDRESS")
    planning_lock_address = os.getenv("PLANNING_LOCK_CONTRACT_ADDRESS")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_nft_address or not planning_lock_address:
        print("ERROR: SCHEME_NFT_CONTRACT_ADDRESS or PLANNING_LOCK_CONTRACT_ADDRESS not set")
        sys.exit(1)
    
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print("ERROR: Not connected to blockchain")
        sys.exit(1)
    
    scheme_nft_contract = w3.eth.contract(
        address=Web3.to_checksum_address(scheme_nft_address),
        abi=get_scheme_nft_abi()
    )
    
    planning_lock_contract = w3.eth.contract(
        address=Web3.to_checksum_address(planning_lock_address),
        abi=get_planning_lock_abi()
    )
    
    # Get the most recent LOCKED application
    app = db.query(PlanningApplication).filter(
        PlanningApplication.status == "LOCKED"
    ).order_by(PlanningApplication.id.desc()).first()
    
    if not app:
        print("No LOCKED applications found")
        sys.exit(0)
    
    print(f"\nApplication ID: {app.id}")
    print(f"Status: {app.status}")
    print(f"On-chain Application ID: {app.on_chain_application_id}")
    print(f"Required Tonnage: {app.required_tonnage}")
    
    if not app.on_chain_application_id:
        print("\nERROR: Application has no on-chain ID - it was never submitted on-chain!")
        sys.exit(1)
    
    # Get scheme allocations
    allocations = db.query(PlanningApplicationScheme).filter(
        PlanningApplicationScheme.application_id == app.id
    ).all()
    
    print(f"\nScheme Allocations ({len(allocations)} schemes):")
    print("-" * 70)
    
    total_tonnes_requested = 0
    
    for allocation in allocations:
        scheme = db.query(Scheme).filter(Scheme.id == allocation.scheme_id).first()
        if not scheme:
            print(f"ERROR: Scheme {allocation.scheme_id} not found")
            continue
        
        tonnes_allocated = allocation.tonnes_allocated
        if tonnes_allocated is None or tonnes_allocated == 0:
            tonnes_allocated = float(allocation.credits_allocated) / 100000.0
        
        # Calculate whole tonnes (what will be reduced on-chain)
        whole_tonnes = int(allocation.credits_allocated / 100000)
        
        total_tonnes_requested += whole_tonnes
        
        print(f"\nScheme {scheme.id} ({scheme.name}):")
        print(f"  NFT Token ID: {scheme.nft_token_id}")
        print(f"  Credits Allocated: {allocation.credits_allocated:,}")
        print(f"  Tonnes Allocated: {tonnes_allocated:.4f}")
        print(f"  Whole Tonnes (will be reduced): {whole_tonnes}")
        
        # Check on-chain remaining tonnes
        try:
            scheme_info = scheme_nft_contract.functions.schemes(scheme.nft_token_id).call()
            on_chain_remaining = scheme_info[4]  # remainingTonnes is index 4
            on_chain_original = scheme_info[3]   # originalTonnes is index 3
            
            print(f"  On-chain Original Tonnes: {on_chain_original}")
            print(f"  On-chain Remaining Tonnes: {on_chain_remaining}")
            print(f"  Database Remaining Tonnes: {scheme.remaining_tonnage}")
            
            if on_chain_remaining < whole_tonnes:
                print(f"  ⚠️  ERROR: Insufficient remaining tonnes!")
                print(f"     Requested: {whole_tonnes} tonnes")
                print(f"     Available: {on_chain_remaining} tonnes")
                print(f"     Shortfall: {whole_tonnes - on_chain_remaining} tonnes")
            else:
                print(f"  ✓ Sufficient remaining tonnes")
        except Exception as e:
            print(f"  ERROR checking on-chain state: {str(e)}")
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total Whole Tonnes Requested: {total_tonnes_requested}")
    
    # Check on-chain application state
    try:
        on_chain_app = planning_lock_contract.functions.applications(app.on_chain_application_id).call()
        scheme_ids = planning_lock_contract.functions.getApplicationSchemeIds(app.on_chain_application_id).call()
        amounts = planning_lock_contract.functions.getApplicationAmounts(app.on_chain_application_id).call()
        
        print(f"\nOn-chain Application State:")
        print(f"  Developer: {on_chain_app[0]}")
        print(f"  Status: {on_chain_app[2]} (0=PENDING, 1=APPROVED, 2=REJECTED)")
        print(f"  Scheme IDs: {scheme_ids}")
        print(f"  Amounts (credits): {amounts}")
        
        if on_chain_app[2] != 0:
            print(f"\n⚠️  WARNING: On-chain application status is {on_chain_app[2]}, not PENDING!")
            print(f"   This means the application may have already been processed.")
    except Exception as e:
        print(f"\nERROR checking on-chain application: {str(e)}")
    
finally:
    db.close()

