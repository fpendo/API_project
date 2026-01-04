"""Verify setup for credit transfers"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Account, Scheme, Trade

# Fix encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

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
                {"name": "id", "type": "uint256"},
                {"name": "account", "type": "address"}
            ],
            "name": "lockedBalance",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ]

print("=" * 70)
print("VERIFYING TRANSFER SETUP")
print("=" * 70)
print()

# Check environment variables
scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
landowner_key = os.getenv("LANDOWNER_PRIVATE_KEY")
regulator_key = os.getenv("REGULATOR_PRIVATE_KEY")
trading_account = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")

print("Environment Variables:")
print(f"  SCHEME_CREDITS_CONTRACT_ADDRESS: {scheme_credits_address or 'NOT SET'}")
print(f"  LANDOWNER_PRIVATE_KEY: {'SET' if landowner_key else 'NOT SET'}")
print(f"  REGULATOR_PRIVATE_KEY: {'SET' if regulator_key else 'NOT SET'}")
print(f"  TRADING_ACCOUNT_ADDRESS: {trading_account}")
print(f"  RPC_URL: {rpc_url}")
print()

seller_private_key = landowner_key or regulator_key
if not seller_private_key:
    print("ERROR: Neither LANDOWNER_PRIVATE_KEY nor REGULATOR_PRIVATE_KEY is set!")
    print("This is why transfers are failing.")
    sys.exit(1)

if not scheme_credits_address:
    print("ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS is not set!")
    sys.exit(1)

# Connect to blockchain
w3 = Web3(Web3.HTTPProvider(rpc_url))
if not w3.is_connected():
    print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
    print("Make sure Hardhat node is running!")
    sys.exit(1)

print("Connected to blockchain")
print()

# Get seller account from private key
seller_account = w3.eth.account.from_key(seller_private_key)
seller_address = seller_account.address
print(f"Seller address (from private key): {seller_address}")

# Get contract
contract = w3.eth.contract(
    address=Web3.to_checksum_address(scheme_credits_address),
    abi=get_scheme_credits_abi()
)

# Check if contract is deployed
contract_code = w3.eth.get_code(Web3.to_checksum_address(scheme_credits_address))
if not contract_code or contract_code == b'':
    print(f"ERROR: Contract not deployed at {scheme_credits_address}")
    sys.exit(1)

print(f"Contract is deployed at {scheme_credits_address}")
print()

# Get database info
db = SessionLocal()
try:
    # Get developer
    developer = db.query(Account).filter(Account.id == 5).first()
    if not developer or not developer.evm_address:
        print("ERROR: Developer account (ID 5) not found or has no EVM address")
        sys.exit(1)
    
    print(f"Developer: {developer.name}")
    print(f"Developer EVM Address: {developer.evm_address}")
    print()
    
    # Get recent trade to check scheme
    recent_trade = db.query(Trade).filter(
        Trade.buyer_account_id == developer.id
    ).order_by(Trade.id.desc()).first()
    
    if not recent_trade:
        print("No trades found to check")
        sys.exit(0)
    
    scheme = db.query(Scheme).filter(Scheme.id == recent_trade.scheme_id).first()
    if not scheme:
        print(f"ERROR: Scheme {recent_trade.scheme_id} not found")
        sys.exit(1)
    
    print(f"Recent Trade: {recent_trade.id}")
    print(f"  Scheme: {scheme.name} (NFT Token ID: {scheme.nft_token_id})")
    print(f"  Quantity: {recent_trade.quantity_units} credits")
    print()
    
    # Check balances
    print("=" * 70)
    print("CHECKING BALANCES")
    print("=" * 70)
    
    # Check trading account balance (seller)
    trading_balance = contract.functions.balanceOf(
        Web3.to_checksum_address(trading_account),
        scheme.nft_token_id
    ).call()
    
    trading_locked = contract.functions.lockedBalance(
        scheme.nft_token_id,
        Web3.to_checksum_address(trading_account)
    ).call()
    
    trading_available = int(trading_balance) - int(trading_locked)
    
    print(f"Trading Account ({trading_account}):")
    print(f"  Total Balance: {trading_balance:,} credits")
    print(f"  Locked: {trading_locked:,} credits")
    print(f"  Available: {trading_available:,} credits")
    print()
    
    # Check developer balance (buyer)
    developer_balance = contract.functions.balanceOf(
        Web3.to_checksum_address(developer.evm_address),
        scheme.nft_token_id
    ).call()
    
    developer_locked = contract.functions.lockedBalance(
        scheme.nft_token_id,
        Web3.to_checksum_address(developer.evm_address)
    ).call()
    
    developer_available = int(developer_balance) - int(developer_locked)
    
    print(f"Developer ({developer.evm_address}):")
    print(f"  Total Balance: {developer_balance:,} credits")
    print(f"  Locked: {developer_locked:,} credits")
    print(f"  Available: {developer_available:,} credits")
    print()
    
    # Check seller address balance (if different from trading account)
    if seller_address.lower() != trading_account.lower():
        seller_balance = contract.functions.balanceOf(
            Web3.to_checksum_address(seller_address),
            scheme.nft_token_id
        ).call()
        print(f"Seller Address ({seller_address}):")
        print(f"  Balance: {seller_balance:,} credits")
        print()
    
    # Summary
    print("=" * 70)
    print("DIAGNOSIS")
    print("=" * 70)
    
    if trading_available < recent_trade.quantity_units:
        print(f"PROBLEM: Trading account has insufficient credits!")
        print(f"  Available: {trading_available:,} credits")
        print(f"  Needed: {recent_trade.quantity_units:,} credits")
        print()
        print("Solution: Transfer more credits to the trading account")
    elif developer_balance == 0:
        print("PROBLEM: Developer has no credits on-chain")
        print("  This confirms the transfers failed")
        print()
        print("Possible causes:")
        print("  1. Trading account doesn't have approval to transfer")
        print("  2. Transfer transaction failed (check backend logs)")
        print("  3. Wrong contract address in .env")
    else:
        print("Developer has credits on-chain - transfers are working!")
        print(f"  Current balance: {developer_balance:,} credits")
    
finally:
    db.close()



