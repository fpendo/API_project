"""
Script to check developer's on-chain credit balances.
This helps debug why purchased credits aren't showing up.
"""
import sys
import os
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, AccountRole, Trade

def get_scheme_credits_abi():
    """Get ABI for SchemeCredits contract"""
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
        },
        {
            "constant": True,
            "inputs": [
                {"name": "accounts", "type": "address[]"},
                {"name": "ids", "type": "uint256[]"}
            ],
            "name": "balanceOfBatch",
            "outputs": [{"name": "", "type": "uint256[]"}],
            "type": "function"
        }
    ]

def check_developer_balances():
    """Check developer's on-chain balances and recent trades"""
    db = SessionLocal()
    try:
        # Get developer account
        developer = db.query(Account).filter(
            Account.role == AccountRole.DEVELOPER
        ).first()
        
        if not developer:
            print("ERROR: No developer account found")
            return
        
        print(f"Developer Account:")
        print(f"  ID: {developer.id}")
        print(f"  Name: {developer.name}")
        print(f"  EVM Address: {developer.evm_address}")
        print("")
        
        # Get recent trades where developer was buyer
        recent_trades = db.query(Trade).filter(
            Trade.buyer_account_id == developer.id
        ).order_by(Trade.id.desc()).limit(10).all()
        
        print(f"Recent Trades (Developer as Buyer): {len(recent_trades)}")
        for trade in recent_trades:
            print(f"  Trade #{trade.id}: {trade.quantity_units} credits, Scheme ID: {trade.scheme_id}, Price: £{trade.total_price:,.2f}")
            if trade.transaction_hash:
                print(f"    TX Hash: {trade.transaction_hash}")
            else:
                print(f"    WARNING: No transaction hash (on-chain transfer may have failed)")
        print("")
        
        # Check on-chain balances
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        if not scheme_credits_address:
            print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set in environment")
            return
        
        if not developer.evm_address:
            print("ERROR: Developer account has no EVM address")
            return
        
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
            return
        
        print(f"Connected to blockchain at {rpc_url}")
        print(f"Contract address: {scheme_credits_address}")
        print("")
        
        # Get contract
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        # Get all schemes from database
        from app.models import Scheme
        schemes = db.query(Scheme).all()
        
        print(f"Checking balances for {len(schemes)} schemes:")
        print("")
        
        developer_address = Web3.to_checksum_address(developer.evm_address)
        total_credits = 0
        
        for scheme in schemes:
            try:
                balance = contract.functions.balanceOf(
                    developer_address,
                    scheme.nft_token_id
                ).call()
                
                if int(balance) > 0:
                    tonnes = float(balance) / 100000.0
                    print(f"  Scheme: {scheme.name} (ID: {scheme.id}, NFT: {scheme.nft_token_id})")
                    print(f"    Catchment: {scheme.catchment}, Unit Type: {scheme.unit_type}")
                    print(f"    Balance: {balance:,} credits ({tonnes:.2f} tonnes)")
                    total_credits += int(balance)
                    print("")
            except Exception as e:
                print(f"  Error checking scheme {scheme.id}: {str(e)}")
        
        if total_credits == 0:
            print("  No credits found at developer's address!")
            print("")
            print("Possible issues:")
            print("  1. On-chain transfers may have failed (check transaction hashes)")
            print("  2. Developer's EVM address may be incorrect")
            print("  3. Credits may have been sent to a different address")
        else:
            print(f"Total Credits: {total_credits:,} ({total_credits / 100000.0:.2f} tonnes)")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_developer_balances()




