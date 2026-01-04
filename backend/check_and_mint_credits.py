"""
Check credit balances and mint credits if needed for retry script.
This ensures the seller (landowner) has credits before retrying transfers.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Trade, Account, AccountRole, Scheme

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def get_scheme_credits_abi():
    """Get ABI for SchemeCredits contract"""
    return [
        {
            "constant": False,
            "inputs": [
                {"name": "schemeId", "type": "uint256"},
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "mintCredits",
            "outputs": [],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "account", "type": "address"},
                {"name": "id", "type": "uint256"}
            ],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ]

def check_and_mint():
    """Check balances and mint credits if needed"""
    db = SessionLocal()
    try:
        # Get developer and their trades
        developer = db.query(Account).filter(Account.id == 5).first()
        if not developer:
            print("ERROR: Developer account (ID 5) not found")
            return
        
        trades = db.query(Trade).filter(
            Trade.buyer_account_id == developer.id
        ).all()
        
        if not trades:
            print("No trades found for developer")
            return
        
        print("=" * 60)
        print("CHECKING CREDIT BALANCES")
        print("=" * 60)
        print("")
        
        # Get environment variables
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        minter_private_key = os.getenv("REGULATOR_PRIVATE_KEY") or os.getenv("LANDOWNER_PRIVATE_KEY")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
        
        if not scheme_credits_address or not minter_private_key:
            print("ERROR: Missing required environment variables")
            return
        
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
            return
        
        # Get contract
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        # Get minter account
        minter_account = w3.eth.account.from_key(minter_private_key)
        minter_address = minter_account.address
        
        print(f"Minter address: {minter_address}")
        print(f"Trading account (seller): {trading_account_address}")
        print("")
        
        # Group trades by scheme
        scheme_totals = {}
        for trade in trades:
            scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
            if not scheme or not scheme.nft_token_id:
                print(f"WARNING: Trade #{trade.id} has invalid scheme (ID: {trade.scheme_id})")
                continue
            
            scheme_id = scheme.nft_token_id
            if scheme_id not in scheme_totals:
                scheme_totals[scheme_id] = {
                    'scheme': scheme,
                    'total_credits': 0
                }
            scheme_totals[scheme_id]['total_credits'] += trade.quantity_units
        
        # Check balances and mint if needed
        print("Checking balances and minting if needed:")
        print("")
        
        for scheme_id, data in scheme_totals.items():
            scheme = data['scheme']
            required_credits = data['total_credits']
            
            # Check current balance
            current_balance = contract.functions.balanceOf(
                Web3.to_checksum_address(trading_account_address),
                scheme_id
            ).call()
            
            print(f"Scheme: {scheme.name} (NFT ID: {scheme_id})")
            print(f"  Required: {required_credits:,} credits")
            print(f"  Current balance: {current_balance:,} credits")
            
            if current_balance < required_credits:
                credits_to_mint = required_credits - current_balance
                print(f"  [MINTING] {credits_to_mint:,} credits...")
                
                try:
                    # Build transaction
                    nonce = w3.eth.get_transaction_count(minter_address)
                    tx = contract.functions.mintCredits(
                        scheme_id,
                        Web3.to_checksum_address(trading_account_address),
                        credits_to_mint
                    ).build_transaction({
                        'from': minter_address,
                        'nonce': nonce,
                        'gas': 200000,
                        'gasPrice': w3.eth.gas_price
                    })
                    
                    # Sign and send
                    signed_tx = w3.eth.account.sign_transaction(tx, minter_private_key)
                    # Handle both old and new web3.py versions
                    raw_tx = getattr(signed_tx, 'rawTransaction', getattr(signed_tx, 'raw_transaction', None))
                    if raw_tx is None:
                        raise ValueError("Could not get raw transaction from signed transaction")
                    tx_hash = w3.eth.send_raw_transaction(raw_tx)
                    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
                    
                    if receipt.status == 1:
                        print(f"  [OK] Minted {credits_to_mint:,} credits")
                        print(f"  Transaction: {tx_hash.hex()}")
                    else:
                        print(f"  [FAILED] Transaction reverted")
                except Exception as e:
                    print(f"  [ERROR] Failed to mint: {str(e)}")
            else:
                print(f"  [OK] Sufficient balance")
            
            print("")
        
        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print("Credits are now available. You can run:")
        print("  python retry_developer_transfers.py")
        print("")
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_and_mint()

