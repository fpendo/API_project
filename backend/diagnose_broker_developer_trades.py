"""
Diagnose why broker client account sell orders and developer buy orders 
don't appear in accounts summary.

This script checks:
1. Account EVM addresses (must be real Hardhat accounts)
2. Private keys match addresses
3. On-chain balances vs database trades
4. Trade transaction hashes
"""
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Account, AccountRole, Trade, Scheme, Order, SellLadderBotOrder
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Hardhat default accounts
HARDHAT_ACCOUNTS = {
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": "Account #0",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": "Account #1",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": "Account #2",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906": "Account #3",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65": "Account #4",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc": "Account #5",
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9": "Account #6",
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955": "Account #7",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8": "Account #8",
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720": "Account #9",
}

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


def diagnose_trades():
    """Diagnose broker-developer trade issues"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("BROKER-DEVELOPER TRADE DIAGNOSTICS")
        print("=" * 80)
        
        # Get accounts
        broker = db.query(Account).filter(Account.role == AccountRole.BROKER).first()
        developer = db.query(Account).filter(Account.role == AccountRole.DEVELOPER).first()
        
        if not broker:
            print("ERROR: Broker account not found")
            return
        if not developer:
            print("ERROR: Developer account not found")
            return
        
        print(f"\n1. ACCOUNT ADDRESSES")
        print("-" * 80)
        print(f"Broker: {broker.name} (ID: {broker.id})")
        print(f"  EVM Address: {broker.evm_address}")
        broker_is_real = broker.evm_address in HARDHAT_ACCOUNTS
        print(f"  Is Real Hardhat Account: {broker_is_real}")
        if broker_is_real:
            print(f"  Hardhat Account: {HARDHAT_ACCOUNTS[broker.evm_address]}")
        else:
            print(f"  WARNING: Broker address is a PLACEHOLDER - credits cannot be transferred!")
        
        print(f"\nDeveloper: {developer.name} (ID: {developer.id})")
        print(f"  EVM Address: {developer.evm_address}")
        developer_is_real = developer.evm_address in HARDHAT_ACCOUNTS
        print(f"  Is Real Hardhat Account: {developer_is_real}")
        if developer_is_real:
            print(f"  Hardhat Account: {HARDHAT_ACCOUNTS[developer.evm_address]}")
        else:
            print(f"  WARNING: Developer address is a PLACEHOLDER - credits cannot be transferred!")
        
        # Check private keys
        print(f"\n2. PRIVATE KEYS")
        print("-" * 80)
        broker_key = os.getenv("BROKER_PRIVATE_KEY") or os.getenv("REGULATOR_PRIVATE_KEY")
        developer_key = os.getenv("DEVELOPER_PRIVATE_KEY")
        trading_key = os.getenv("TRADING_ACCOUNT_PRIVATE_KEY")
        
        print(f"BROKER_PRIVATE_KEY: {'SET' if broker_key else 'NOT SET'}")
        print(f"DEVELOPER_PRIVATE_KEY: {'SET' if developer_key else 'NOT SET'}")
        print(f"TRADING_ACCOUNT_PRIVATE_KEY: {'SET' if trading_key else 'NOT SET'}")
        
        # Verify private keys match addresses
        if broker_key and broker.evm_address:
            try:
                w3 = Web3()
                account = w3.eth.account.from_key(broker_key)
                matches = account.address.lower() == broker.evm_address.lower()
                print(f"  Broker key matches address: {matches}")
                if not matches:
                    print(f"  WARNING: Broker key address ({account.address}) != DB address ({broker.evm_address})")
            except:
                print(f"  ERROR: Invalid broker private key format")
        
        if developer_key and developer.evm_address:
            try:
                w3 = Web3()
                account = w3.eth.account.from_key(developer_key)
                matches = account.address.lower() == developer.evm_address.lower()
                print(f"  Developer key matches address: {matches}")
                if not matches:
                    print(f"  WARNING: Developer key address ({account.address}) != DB address ({developer.evm_address})")
            except:
                print(f"  ERROR: Invalid developer private key format")
        
        # Check recent trades
        print(f"\n3. RECENT TRADES (Broker -> Developer)")
        print("-" * 80)
        recent_trades = db.query(Trade).filter(
            Trade.seller_account_id == broker.id,
            Trade.buyer_account_id == developer.id
        ).order_by(Trade.id.desc()).limit(10).all()
        
        print(f"Found {len(recent_trades)} recent trades")
        
        if recent_trades:
            total_credits = 0
            trades_with_tx = 0
            trades_without_tx = 0
            
            for trade in recent_trades:
                scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
                total_credits += trade.quantity_units
                if trade.transaction_hash:
                    trades_with_tx += 1
                else:
                    trades_without_tx += 1
                
                print(f"\n  Trade #{trade.id}:")
                print(f"    Scheme: {scheme.name if scheme else 'N/A'} (ID: {scheme.id if scheme else 'N/A'})")
                print(f"    Quantity: {trade.quantity_units:,} credits")
                print(f"    Price: £{trade.price_per_unit:.6f}")
                print(f"    Transaction Hash: {trade.transaction_hash or 'NULL (FAILED)'}")
                print(f"    Created: {trade.created_at}")
            
            print(f"\n  Summary:")
            print(f"    Total Credits: {total_credits:,} ({total_credits / 100000.0:.2f} tonnes)")
            print(f"    Trades with TX: {trades_with_tx}")
            print(f"    Trades without TX: {trades_without_tx}")
        
        # Check on-chain balances
        print(f"\n4. ON-CHAIN BALANCES")
        print("-" * 80)
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        if not scheme_credits_address:
            print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set")
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
            schemes = db.query(Scheme).filter(Scheme.catchment == "SOLENT").all()
            
            print(f"Checking balances for {len(schemes)} SOLENT schemes:")
            
            if broker.evm_address and broker_is_real:
                broker_address = Web3.to_checksum_address(broker.evm_address)
                print(f"\n  Broker ({broker.evm_address}):")
                for scheme in schemes:
                    balance = contract.functions.balanceOf(broker_address, scheme.nft_token_id).call()
                    if balance > 0:
                        print(f"    Scheme {scheme.nft_token_id} ({scheme.name}): {balance:,} credits")
            
            if developer.evm_address and developer_is_real:
                developer_address = Web3.to_checksum_address(developer.evm_address)
                print(f"\n  Developer ({developer.evm_address}):")
                total_dev_credits = 0
                for scheme in schemes:
                    balance = contract.functions.balanceOf(developer_address, scheme.nft_token_id).call()
                    locked = contract.functions.lockedBalance(scheme.nft_token_id, developer_address).call()
                    if balance > 0 or locked > 0:
                        print(f"    Scheme {scheme.nft_token_id} ({scheme.name}): {balance:,} credits (locked: {locked:,})")
                        total_dev_credits += balance
                
                if total_dev_credits == 0:
                    print(f"    WARNING: Developer has NO credits on-chain!")
                    print(f"    This means transfers failed or developer address is wrong")
        
        except Exception as e:
            print(f"ERROR checking on-chain balances: {e}")
            import traceback
            traceback.print_exc()
        
        # Check sell ladder bot orders
        print(f"\n5. SELL LADDER BOT ORDERS")
        print("-" * 80)
        bot_orders = db.query(SellLadderBotOrder).join(Order).filter(
            Order.account_id == broker.id,
            Order.side == "SELL",
            Order.status.in_(["PENDING", "PARTIALLY_FILLED", "FILLED"])
        ).order_by(Order.created_at.desc()).limit(10).all()
        
        print(f"Found {len(bot_orders)} recent sell ladder bot orders")
        for bot_order in bot_orders:
            order = bot_order.order
            scheme = db.query(Scheme).filter(Scheme.id == order.scheme_id).first()
            print(f"  Order #{order.id}: {order.quantity_units:,} credits @ £{order.price_per_unit:.6f}")
            print(f"    Scheme: {scheme.name if scheme else 'N/A'}")
            print(f"    Status: {order.status}")
            print(f"    Filled: {order.filled_quantity:,} / {order.quantity_units:,}")
        
        # Summary and recommendations
        print(f"\n6. DIAGNOSIS & RECOMMENDATIONS")
        print("-" * 80)
        
        issues = []
        if not broker_is_real:
            issues.append("Broker EVM address is a placeholder - must use real Hardhat account")
        if not developer_is_real:
            issues.append("Developer EVM address is a placeholder - must use real Hardhat account")
        if not broker_key:
            issues.append("BROKER_PRIVATE_KEY not set - cannot transfer credits from broker")
        if not developer_key:
            issues.append("DEVELOPER_PRIVATE_KEY not set - cannot transfer credits to developer")
        if recent_trades and trades_without_tx > 0:
            issues.append(f"{trades_without_tx} trades have no transaction hash - transfers failed")
        
        if issues:
            print("ISSUES FOUND:")
            for i, issue in enumerate(issues, 1):
                print(f"  {i}. {issue}")
            
            print("\nRECOMMENDED FIXES:")
            print("  1. Update broker EVM address to a real Hardhat account (e.g., Account #2)")
            print("  2. Update developer EVM address to a real Hardhat account (e.g., Account #5)")
            print("  3. Set BROKER_PRIVATE_KEY to match broker's EVM address")
            print("  4. Set DEVELOPER_PRIVATE_KEY to match developer's EVM address")
            print("  5. Run retroactive_transfer.py to retry failed transfers")
        else:
            print("No obvious issues found. Check Hardhat node is running and contracts are deployed.")
        
    finally:
        db.close()


if __name__ == "__main__":
    diagnose_trades()

