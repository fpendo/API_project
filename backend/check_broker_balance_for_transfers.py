"""
Check broker's on-chain balance to see if they have credits to transfer.
"""
import sys
import os
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Account, AccountRole, Scheme, SellLadderBotOrder, Order
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

def check_broker_balance():
    db = SessionLocal()
    try:
        broker = db.query(Account).filter(Account.role == AccountRole.BROKER).first()
        if not broker:
            print("ERROR: Broker not found")
            return
        
        print("=" * 80)
        print("BROKER BALANCE CHECK FOR TRANSFERS")
        print("=" * 80)
        print(f"Broker: {broker.name}")
        print(f"EVM Address: {broker.evm_address}")
        print()
        
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        if not scheme_credits_address:
            print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set")
            return
        
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print("ERROR: Cannot connect to Hardhat node")
            return
        
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        broker_address = Web3.to_checksum_address(broker.evm_address)
        
        # Get all schemes
        schemes = db.query(Scheme).all()
        
        print("On-Chain Balances:")
        total_balance = 0
        for scheme in schemes:
            balance = contract.functions.balanceOf(broker_address, scheme.nft_token_id).call()
            locked = contract.functions.lockedBalance(scheme.nft_token_id, broker_address).call()
            available = balance - locked
            
            if balance > 0 or locked > 0:
                print(f"  Scheme {scheme.nft_token_id} ({scheme.name}):")
                print(f"    Total: {balance:,} credits")
                print(f"    Locked: {locked:,} credits")
                print(f"    Available: {available:,} credits")
                total_balance += available
        
        print(f"\nTotal Available Credits: {total_balance:,} ({total_balance / 100000.0:.2f} tonnes)")
        
        # Check recent sell ladder bot orders
        print("\n" + "=" * 80)
        print("RECENT SELL LADDER BOT ORDERS")
        print("=" * 80)
        
        recent_orders = db.query(Order).join(SellLadderBotOrder).filter(
            Order.account_id == broker.id,
            Order.side == "SELL",
            Order.status.in_(["PENDING", "PARTIALLY_FILLED", "FILLED"])
        ).order_by(Order.created_at.desc()).limit(10).all()
        
        print(f"Found {len(recent_orders)} recent sell orders:")
        for order in recent_orders:
            scheme = db.query(Scheme).filter(Scheme.id == order.scheme_id).first()
            print(f"  Order #{order.id}: {order.quantity_units:,} credits @ £{order.price_per_unit:.6f}")
            print(f"    Scheme: {scheme.name if scheme else 'N/A'} (NFT Token ID: {scheme.nft_token_id if scheme else 'N/A'})")
            print(f"    Status: {order.status}, Filled: {order.filled_quantity:,}/{order.quantity_units:,}")
        
        # Check if broker has credits in client account vs house account
        print("\n" + "=" * 80)
        print("CHECKING CLIENT VS HOUSE ACCOUNT")
        print("=" * 80)
        
        # Check broker client account (broker.evm_address)
        print(f"\nBroker Client Account ({broker.evm_address}):")
        for scheme in schemes:
            balance = contract.functions.balanceOf(broker_address, scheme.nft_token_id).call()
            if balance > 0:
                print(f"  Scheme {scheme.nft_token_id}: {balance:,} credits")
        
        # Check house account
        house_address = os.getenv("BROKER_HOUSE_ADDRESS")
        if house_address:
            house_address_checksum = Web3.to_checksum_address(house_address)
            print(f"\nBroker House Account ({house_address}):")
            for scheme in schemes:
                balance = contract.functions.balanceOf(house_address_checksum, scheme.nft_token_id).call()
                if balance > 0:
                    print(f"  Scheme {scheme.nft_token_id}: {balance:,} credits")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_broker_balance()

