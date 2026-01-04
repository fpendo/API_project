"""Check trading account balances for all schemes"""
import os
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Scheme

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

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
                {"name": "id", "type": "uint256"},
                {"name": "account", "type": "address"}
            ],
            "name": "lockedBalance",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ]

scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")

if not scheme_credits_address:
    print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set")
    exit(1)

w3 = Web3(Web3.HTTPProvider(rpc_url))
if not w3.is_connected():
    print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
    exit(1)

contract = w3.eth.contract(
    address=Web3.to_checksum_address(scheme_credits_address),
    abi=get_scheme_credits_abi()
)

db = SessionLocal()
try:
    schemes = db.query(Scheme).all()
    print("=" * 70)
    print("TRADING ACCOUNT BALANCES")
    print("=" * 70)
    print(f"Trading Account: {trading_account_address}")
    print(f"Contract: {scheme_credits_address}")
    print()
    
    total_credits = 0
    for scheme in schemes:
        if not scheme.nft_token_id:
            continue
            
        balance = contract.functions.balanceOf(
            Web3.to_checksum_address(trading_account_address),
            scheme.nft_token_id
        ).call()
        
        locked = contract.functions.lockedBalance(
            scheme.nft_token_id,
            Web3.to_checksum_address(trading_account_address)
        ).call()
        
        available = int(balance) - int(locked)
        total_credits += int(balance)
        
        print(f"Scheme: {scheme.name} (ID: {scheme.id}, NFT: {scheme.nft_token_id})")
        print(f"  Total Balance: {balance:,} credits ({int(balance)/100000:.2f} tonnes)")
        print(f"  Locked: {locked:,} credits")
        print(f"  Available: {available:,} credits ({available/100000:.2f} tonnes)")
        print()
    
    print("=" * 70)
    print(f"TOTAL CREDITS IN TRADING ACCOUNT: {total_credits:,} ({total_credits/100000:.2f} tonnes)")
    print("=" * 70)
    
finally:
    db.close()


