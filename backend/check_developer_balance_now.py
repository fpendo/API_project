"""
Quick check of developer account balance and recent trades.
"""
import sys
import os
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Account, AccountRole, Trade, Scheme
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

def get_scheme_credits_abi():
    return [
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

def check_developer():
    db = SessionLocal()
    try:
        developer = db.query(Account).filter(Account.role == AccountRole.DEVELOPER).first()
        if not developer:
            print("ERROR: Developer not found")
            return
        
        print("=" * 80)
        print("DEVELOPER ACCOUNT CHECK")
        print("=" * 80)
        print(f"Name: {developer.name}")
        print(f"ID: {developer.id}")
        print(f"EVM Address: {developer.evm_address}")
        print()
        
        # Check recent trades
        recent_trades = db.query(Trade).filter(
            Trade.buyer_account_id == developer.id
        ).order_by(Trade.id.desc()).limit(5).all()
        
        print(f"Recent Trades (last 5):")
        total_credits = 0
        trades_with_tx = 0
        for trade in recent_trades:
            scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
            total_credits += trade.quantity_units
            has_tx = "YES" if trade.transaction_hash else "NO"
            if trade.transaction_hash:
                trades_with_tx += 1
            print(f"  Trade #{trade.id}: {trade.quantity_units:,} credits, Scheme: {scheme.name if scheme else 'N/A'}, TX: {has_tx}")
        
        print(f"\nTotal Credits Purchased: {total_credits:,} ({total_credits / 100000.0:.2f} tonnes)")
        print(f"Trades with TX Hash: {trades_with_tx}/{len(recent_trades)}")
        print()
        
        # Check on-chain balance
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        if not scheme_credits_address:
            print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set")
            return
        
        if not developer.evm_address:
            print("ERROR: Developer has no EVM address")
            return
        
        try:
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            if not w3.is_connected():
                print("ERROR: Cannot connect to Hardhat node")
                return
            
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(scheme_credits_address),
                abi=get_scheme_credits_abi()
            )
            
            # Get all schemes
            schemes = db.query(Scheme).all()
            developer_address = Web3.to_checksum_address(developer.evm_address)
            
            print("On-Chain Balances:")
            total_on_chain = 0
            for scheme in schemes:
                balance = contract.functions.balanceOf(developer_address, scheme.nft_token_id).call()
                if balance > 0:
                    print(f"  Scheme {scheme.nft_token_id} ({scheme.name}): {balance:,} credits")
                    total_on_chain += balance
            
            if total_on_chain == 0:
                print("  WARNING: Developer has NO credits on-chain!")
                print("  This means transfers are failing or haven't been executed.")
            else:
                print(f"\nTotal On-Chain Credits: {total_on_chain:,} ({total_on_chain / 100000.0:.2f} tonnes)")
            
            # Check accounts summary endpoint
            print("\n" + "=" * 80)
            print("TESTING ACCOUNTS SUMMARY ENDPOINT")
            print("=" * 80)
            from app.services.credits_summary import get_account_credits_summary
            trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
            summary = get_account_credits_summary(developer, db, trading_account_address=trading_account_address)
            
            print(f"Summary returned {len(summary)} holdings:")
            for item in summary:
                print(f"  {item['scheme_name']}: {item['credits']:,} credits ({item['tonnes']:.4f} tonnes)")
            
            if len(summary) == 0:
                print("  WARNING: Summary is empty - this is why nothing shows in the UI!")
            
        except Exception as e:
            print(f"ERROR checking on-chain: {e}")
            import traceback
            traceback.print_exc()
        
    finally:
        db.close()

if __name__ == "__main__":
    check_developer()

