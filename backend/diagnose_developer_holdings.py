"""
Diagnostic script to investigate why developer holdings aren't showing up.
Checks:
1. Developer account EVM address
2. Recent trades where developer was buyer
3. On-chain balances at developer's address
4. Whether transaction hashes exist for trades
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, AccountRole, Trade, Scheme

# Load .env file from backend directory
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

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
        },
        {
            "constant": True,
            "inputs": [
                {"name": "schemeId", "type": "uint256"},
                {"name": "user", "type": "address"}
            ],
            "name": "lockedBalance",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ]

def diagnose_developer_holdings():
    """Diagnose why developer holdings aren't showing"""
    db = SessionLocal()
    try:
        # Get developer account (ID 5)
        developer = db.query(Account).filter(
            Account.id == 5
        ).first()
        
        if not developer:
            print("ERROR: Developer account (ID 5) not found")
            return
        
        print("=" * 60)
        print("DEVELOPER ACCOUNT DIAGNOSTICS")
        print("=" * 60)
        print(f"Account ID: {developer.id}")
        print(f"Name: {developer.name}")
        print(f"EVM Address: {developer.evm_address}")
        print(f"Role: {developer.role.value}")
        print("")
        
        # Check recent trades
        recent_trades = db.query(Trade).filter(
            Trade.buyer_account_id == developer.id
        ).order_by(Trade.id.desc()).limit(20).all()
        
        print(f"Recent Trades (Developer as Buyer): {len(recent_trades)}")
        total_spent = 0
        total_credits_purchased = 0
        trades_without_tx = []
        
        for trade in recent_trades:
            total_spent += trade.total_price
            total_credits_purchased += trade.quantity_units
            tx_status = "[HAS TX]" if trade.transaction_hash else "[NO TX HASH]"
            if not trade.transaction_hash:
                trades_without_tx.append(trade.id)
            print(f"  Trade #{trade.id}: {trade.quantity_units:,} credits, Scheme ID: {trade.scheme_id}, Price: £{trade.total_price:,.2f} - {tx_status}")
        
        print("")
        print(f"Total Spent: £{total_spent:,.2f}")
        print(f"Total Credits Purchased: {total_credits_purchased:,} ({total_credits_purchased / 100000.0:.2f} tonnes)")
        print(f"Expected Balance: £{5000000.00 - total_spent:,.2f}")
        
        if trades_without_tx:
            print(f"\nWARNING: {len(trades_without_tx)} trades have NO transaction hash!")
            print(f"   Trade IDs: {trades_without_tx}")
            print("   These trades were recorded in DB but credits may not have been transferred on-chain.")
            print("   Run: python retroactive_transfer.py to fix these")
        
        print("")
        
        # Check on-chain balances
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        if not scheme_credits_address:
            print("WARNING: SCHEME_CREDITS_CONTRACT_ADDRESS not set in environment")
            print("   Cannot check on-chain balances")
            return
        
        if not developer.evm_address:
            print("ERROR: Developer account has no EVM address")
            return
        
        # Connect to blockchain
        try:
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            if not w3.is_connected():
                print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
                print("   Make sure Hardhat node is running: npx hardhat node")
                return
            
            print(f"[OK] Connected to blockchain at {rpc_url}")
            print(f"[OK] Contract address: {scheme_credits_address}")
            print("")
            
            # Get contract
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(scheme_credits_address),
                abi=get_scheme_credits_abi()
            )
            
            # Get all schemes from database
            schemes = db.query(Scheme).all()
            
            print(f"Checking on-chain balances for {len(schemes)} schemes:")
            print("")
            
            developer_address = Web3.to_checksum_address(developer.evm_address)
            total_on_chain_credits = 0
            schemes_with_balance = []
            
            for scheme in schemes:
                try:
                    balance = contract.functions.balanceOf(
                        developer_address,
                        scheme.nft_token_id
                    ).call()
                    
                    locked = contract.functions.lockedBalance(
                        scheme.nft_token_id,
                        developer_address
                    ).call()
                    
                    available = int(balance) - int(locked)
                    
                    if int(balance) > 0:
                        tonnes = float(balance) / 100000.0
                        schemes_with_balance.append({
                            'scheme': scheme,
                            'balance': int(balance),
                            'locked': int(locked),
                            'available': available,
                            'tonnes': tonnes
                        })
                        total_on_chain_credits += int(balance)
                        print(f"  [FOUND] Scheme: {scheme.name} (ID: {scheme.id}, NFT: {scheme.nft_token_id})")
                        print(f"    Catchment: {scheme.catchment}, Unit Type: {scheme.unit_type}")
                        print(f"    Balance: {balance:,} credits ({tonnes:.2f} tonnes)")
                        print(f"    Locked: {locked:,} credits")
                        print(f"    Available: {available:,} credits")
                        print("")
                except Exception as e:
                    print(f"  [ERROR] Error checking scheme {scheme.id}: {str(e)}")
            
            print("=" * 60)
            print("SUMMARY")
            print("=" * 60)
            print(f"Total Credits Purchased (from DB): {total_credits_purchased:,} ({total_credits_purchased / 100000.0:.2f} tonnes)")
            print(f"Total Credits On-Chain: {total_on_chain_credits:,} ({total_on_chain_credits / 100000.0:.2f} tonnes)")
            print(f"Schemes with Balance: {len(schemes_with_balance)}")
            print("")
            
            if total_on_chain_credits == 0:
                print("[PROBLEM] No credits found on-chain!")
                print("")
                print("Possible causes:")
                print("  1. On-chain transfers failed (check transaction hashes)")
                print("  2. Developer's EVM address is a placeholder (0x5555...)")
                print("  3. Credits were sent to a different address")
                print("")
                print("Solutions:")
                if trades_without_tx:
                    print("  -> Run: python retroactive_transfer.py")
                    print("     This will retry on-chain transfers for trades without TX hashes")
                print("  -> Check if developer's EVM address matches a real Hardhat account")
                print("  -> Verify SCHEME_CREDITS_CONTRACT_ADDRESS is correct")
                print("  -> Check Hardhat node is running and contracts are deployed")
            elif total_on_chain_credits < total_credits_purchased:
                print(f"[WARNING] On-chain credits ({total_on_chain_credits:,}) < Purchased credits ({total_credits_purchased:,})")
                print("   Some transfers may have failed")
                if trades_without_tx:
                    print("   Run: python retroactive_transfer.py to fix missing transfers")
            else:
                print("[OK] Credits are on-chain correctly!")
                print("   If holdings still don't show in dashboard, check:")
                print("   - SCHEME_CREDITS_CONTRACT_ADDRESS environment variable")
                print("   - RPC_URL is correct")
                print("   - Backend can connect to Hardhat node")
        
        except Exception as e:
            print(f"[ERROR] Error checking on-chain balances: {str(e)}")
            import traceback
            traceback.print_exc()
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    diagnose_developer_holdings()

