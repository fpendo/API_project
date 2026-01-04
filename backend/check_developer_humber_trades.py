"""
Check recent trades for developer and verify on-chain balances.
"""
import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models import Trade, Order, Account, AccountRole, Scheme
from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()

def check_developer_trades():
    db = SessionLocal()
    try:
        # Get developer account
        developer = db.query(Account).filter(Account.role == AccountRole.DEVELOPER).first()
        if not developer:
            print("Developer account not found")
            return
        
        print(f"Developer: {developer.name} (ID: {developer.id}, EVM: {developer.evm_address})")
        print()
        
        # Get recent trades (last hour)
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        trades = db.query(Trade).filter(
            Trade.buyer_account_id == developer.id,
            Trade.created_at >= one_hour_ago
        ).order_by(Trade.created_at.desc()).all()
        
        print(f"Recent trades (last hour): {len(trades)}\n")
        
        for trade in trades:
            scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first() if trade.scheme_id else None
            
            print(f"Trade ID: {trade.id}")
            print(f"  Listing ID: {trade.listing_id}")
            print(f"  Scheme: {scheme.name if scheme else 'N/A'} (ID: {scheme.id if scheme else 'N/A'})")
            if scheme:
                print(f"  Catchment: {scheme.catchment}, Unit Type: {scheme.unit_type}")
            print(f"  Quantity: {trade.quantity_units:,} credits")
            print(f"  Price: £{trade.price_per_unit:.6f}")
            print(f"  Total: £{trade.total_price:.6f}")
            print(f"  Transaction Hash: {trade.transaction_hash or 'NULL (NEEDS TRANSFER)'}")
            print(f"  Created: {trade.created_at}")
            print()
        
        # Check on-chain balance for HUMBER nitrate
        if trades:
            rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
            credits_contract_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
            
            if credits_contract_address:
                w3 = Web3(Web3.HTTPProvider(rpc_url))
                
                # Get HUMBER nitrate scheme
                humber_scheme = db.query(Scheme).filter(
                    Scheme.catchment == "HUMBER",
                    Scheme.unit_type == "nitrate"
                ).first()
                
                if humber_scheme:
                    print(f"Checking on-chain balance for HUMBER nitrate scheme {humber_scheme.id} (NFT ID: {humber_scheme.nft_token_id})")
                    print(f"Developer address: {developer.evm_address}")
                    
                    # ERC-1155 balanceOf(address account, uint256 id)
                    # id = (nft_token_id << 128) | (0) for nitrate
                    token_id = (humber_scheme.nft_token_id << 128) | 0
                    
                    try:
                        # Simple balance check using web3
                        contract_abi = [{
                            "constant": True,
                            "inputs": [{"name": "account", "type": "address"}, {"name": "id", "type": "uint256"}],
                            "name": "balanceOf",
                            "outputs": [{"name": "", "type": "uint256"}],
                            "type": "function"
                        }]
                        
                        contract = w3.eth.contract(address=Web3.to_checksum_address(credits_contract_address), abi=contract_abi)
                        balance = contract.functions.balanceOf(
                            Web3.to_checksum_address(developer.evm_address),
                            token_id
                        ).call()
                        
                        print(f"On-chain balance: {balance:,} credits ({balance / 100000:.2f} tonnes)")
                    except Exception as e:
                        print(f"Error checking on-chain balance: {e}")
                else:
                    print("HUMBER nitrate scheme not found")
            else:
                print("SCHEME_CREDITS_CONTRACT_ADDRESS not set")
                
    finally:
        db.close()

if __name__ == "__main__":
    check_developer_trades()

