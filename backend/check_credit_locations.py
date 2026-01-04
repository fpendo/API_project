"""
Check where credits actually are - landowner address vs trading account
"""
import os
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Scheme

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

def check_locations():
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    trading_account = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    landowner_address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # From REGULATOR_PRIVATE_KEY
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    db = SessionLocal()
    try:
        schemes = db.query(Scheme).all()
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        print("Checking credit locations:")
        print(f"Landowner: {landowner_address}")
        print(f"Trading Account: {trading_account}")
        print("")
        
        for scheme in schemes:
            landowner_balance = contract.functions.balanceOf(
                Web3.to_checksum_address(landowner_address),
                scheme.nft_token_id
            ).call()
            
            trading_balance = contract.functions.balanceOf(
                Web3.to_checksum_address(trading_account),
                scheme.nft_token_id
            ).call()
            
            if int(landowner_balance) > 0 or int(trading_balance) > 0:
                print(f"Scheme: {scheme.name} (NFT ID: {scheme.nft_token_id})")
                print(f"  Landowner balance: {landowner_balance:,}")
                print(f"  Trading account balance: {trading_balance:,}")
                print("")
    finally:
        db.close()

if __name__ == "__main__":
    check_locations()




