"""Check trading account setup and balances"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, Scheme
from app.services.credits_summary import get_account_credits_summary, get_scheme_credits_abi

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Fix encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

def get_erc1155_abi():
    """Get ERC-1155 ABI for isApprovedForAll"""
    return [
        {
            "constant": True,
            "inputs": [
                {"name": "owner", "type": "address"},
                {"name": "operator", "type": "address"}
            ],
            "name": "isApprovedForAll",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        }
    ]

db = SessionLocal()
try:
    print("=" * 70)
    print("TRADING ACCOUNT DIAGNOSIS")
    print("=" * 70)
    
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
    landowner_private_key = os.getenv("LANDOWNER_PRIVATE_KEY")
    regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    print(f"\nTrading Account Address: {trading_account_address}")
    print(f"Scheme Credits Contract: {scheme_credits_address}")
    print(f"RPC URL: {rpc_url}")
    
    if not scheme_credits_address:
        print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set")
        sys.exit(1)
    
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print(f"ERROR: Not connected to blockchain")
        sys.exit(1)
    
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(scheme_credits_address),
        abi=get_scheme_credits_abi() + get_erc1155_abi()
    )
    
    # Check schemes
    schemes = db.query(Scheme).all()
    print(f"\nChecking {len(schemes)} scheme(s)...")
    
    for scheme in schemes:
        if not scheme.nft_token_id:
            print(f"\nScheme {scheme.id} ({scheme.name}): NO NFT TOKEN ID")
            continue
        
        print(f"\nScheme {scheme.id} ({scheme.name}):")
        print(f"  NFT Token ID: {scheme.nft_token_id}")
        
        # Check trading account balance
        try:
            trading_balance = contract.functions.balanceOf(
                Web3.to_checksum_address(trading_account_address),
                scheme.nft_token_id
            ).call()
            print(f"  Trading Account Balance: {trading_balance:,} credits")
        except Exception as e:
            print(f"  ERROR checking trading balance: {str(e)}")
            trading_balance = 0
        
        # Check landowner balance
        landowner = db.query(Account).filter(Account.id == scheme.created_by_account_id).first()
        if landowner and landowner.evm_address:
            try:
                landowner_balance = contract.functions.balanceOf(
                    Web3.to_checksum_address(landowner.evm_address),
                    scheme.nft_token_id
                ).call()
                print(f"  Landowner Balance ({landowner.name}): {landowner_balance:,} credits")
            except Exception as e:
                print(f"  ERROR checking landowner balance: {str(e)}")
                landowner_balance = 0
            
            # Check approval
            try:
                is_approved = contract.functions.isApprovedForAll(
                    Web3.to_checksum_address(landowner.evm_address),
                    Web3.to_checksum_address(trading_account_address)
                ).call()
                print(f"  ERC-1155 Approval: {'YES' if is_approved else 'NO'}")
                
                if not is_approved:
                    print(f"  WARNING: Trading account is NOT approved to transfer credits!")
            except Exception as e:
                print(f"  ERROR checking approval: {str(e)}")
        
        # Check regulator balance and approval
        regulator = db.query(Account).filter(Account.role == "REGULATOR").first()
        if regulator and regulator.evm_address:
            try:
                regulator_balance = contract.functions.balanceOf(
                    Web3.to_checksum_address(regulator.evm_address),
                    scheme.nft_token_id
                ).call()
                if regulator_balance > 0:
                    print(f"  Regulator Balance: {regulator_balance:,} credits")
                
                is_approved = contract.functions.isApprovedForAll(
                    Web3.to_checksum_address(regulator.evm_address),
                    Web3.to_checksum_address(trading_account_address)
                ).call()
                if regulator_balance > 0:
                    print(f"  Regulator ERC-1155 Approval: {'YES' if is_approved else 'NO'}")
            except:
                pass
    
    print("\n" + "=" * 70)
    print("DIAGNOSIS")
    print("=" * 70)
    
    # Check if trading account has any credits
    total_trading_credits = 0
    for scheme in schemes:
        if scheme.nft_token_id:
            try:
                balance = contract.functions.balanceOf(
                    Web3.to_checksum_address(trading_account_address),
                    scheme.nft_token_id
                ).call()
                total_trading_credits += balance
            except:
                pass
    
    if total_trading_credits == 0:
        print("ISSUE: Trading account has NO credits!")
        print("Solution: Transfer credits from landowner to trading account")
        print("  - Use Landowner dashboard → Transfer to Trading Account")
        print("  - Or run setup_after_redeploy.py to set up approvals")
    else:
        print(f"Trading account has {total_trading_credits:,} credits available")
    
    # Check approvals
    all_approved = True
    for scheme in schemes:
        if scheme.nft_token_id:
            landowner = db.query(Account).filter(Account.id == scheme.created_by_account_id).first()
            if landowner and landowner.evm_address:
                try:
                    is_approved = contract.functions.isApprovedForAll(
                        Web3.to_checksum_address(landowner.evm_address),
                        Web3.to_checksum_address(trading_account_address)
                    ).call()
                    if not is_approved:
                        all_approved = False
                        print(f"ISSUE: Landowner {landowner.name} has NOT approved trading account")
                except:
                    pass
    
    if all_approved and total_trading_credits > 0:
        print("Setup looks good! Trading account has credits and approvals.")
    
finally:
    db.close()



