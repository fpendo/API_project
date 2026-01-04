"""
Script to retroactively transfer credits for trades that were recorded
but didn't have on-chain transfers (transaction_hash is NULL).
"""
import sys
import os
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Trade, Account, AccountRole, Scheme
from app.services.exchange import transfer_credits_on_chain, get_scheme_credits_abi

# Load environment variables
load_dotenv()

def retroactive_transfer():
    """Transfer credits for trades that don't have transaction hashes"""
    db = SessionLocal()
    try:
        # Get all trades where developer was buyer and transaction_hash is NULL
        developer = db.query(Account).filter(Account.role == AccountRole.DEVELOPER).first()
        if not developer:
            print("ERROR: No developer account found")
            return
        
        trades = db.query(Trade).filter(
            Trade.buyer_account_id == developer.id,
            Trade.transaction_hash == None
        ).all()
        
        if not trades:
            print("No trades found without transaction hashes")
            return
        
        print(f"Found {len(trades)} trades without transaction hashes")
        print("")
        
        # Get environment variables
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        landowner_private_key = os.getenv("LANDOWNER_PRIVATE_KEY")
        regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
        trading_account_private_key = os.getenv("TRADING_ACCOUNT_PRIVATE_KEY")
        # Hardhat account #1 private key (default trading account)
        HARDHAT_TRADING_ACCOUNT_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
        
        if not scheme_credits_address:
            print("ERROR: Missing required environment variables")
            print(f"  SCHEME_CREDITS_CONTRACT_ADDRESS: {'set' if scheme_credits_address else 'NOT SET'}")
            return
        
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
            print("Make sure Hardhat node is running!")
            return
        
        print(f"Connected to blockchain at {rpc_url}")
        print("")
        
        # Process each trade
        for trade in trades:
            try:
                seller = db.query(Account).filter(Account.id == trade.seller_account_id).first()
                buyer = db.query(Account).filter(Account.id == trade.buyer_account_id).first()
                scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
                
                if not seller or not buyer or not scheme:
                    print(f"Trade #{trade.id}: Missing account or scheme data, skipping")
                    continue
                
                # Determine seller address (trading account for landowners, broker/house for brokers)
                if seller.role == AccountRole.LANDOWNER:
                    actual_seller_address = trading_account_address
                    # Use trading account's private key when transferring FROM trading account
                    seller_private_key = trading_account_private_key or HARDHAT_TRADING_ACCOUNT_PRIVATE_KEY
                    print(f"[INFO] Transferring FROM trading account - using trading account private key")
                elif seller.role == AccountRole.BROKER:
                    # Broker credits are stored in the house address (BROKER_HOUSE_ADDRESS)
                    # The broker's EVM address in the database is just a placeholder
                    house_address = os.getenv("BROKER_HOUSE_ADDRESS")
                    
                    if not house_address:
                        print(f"  ERROR: BROKER_HOUSE_ADDRESS not set")
                        continue
                    
                    # Check house address for credits
                    contract = w3.eth.contract(
                        address=Web3.to_checksum_address(scheme_credits_address),
                        abi=get_scheme_credits_abi()
                    )
                    house_addr = Web3.to_checksum_address(house_address)
                    house_balance = contract.functions.balanceOf(house_addr, scheme.nft_token_id).call()
                    
                    # Always use house address for broker credits
                    actual_seller_address = house_address
                    
                    # Use house address's private key directly (no approval needed)
                    # Hardhat account #9 private key (0xa0Ee7A142d267C1f36714E4a8F75612F20a79720)
                    HARDHAT_ACCOUNT_9_PRIVATE_KEY = "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356"
                    seller_private_key = os.getenv("BROKER_HOUSE_PRIVATE_KEY") or HARDHAT_ACCOUNT_9_PRIVATE_KEY
                    
                    print(f"[INFO] Transferring FROM house address (balance: {house_balance:,}, needed: {trade.quantity_units:,})")
                    print(f"[INFO] Using house address private key directly")
                    
                    if house_balance < trade.quantity_units:
                        print(f"  WARNING: House address has insufficient credits ({house_balance:,} < {trade.quantity_units:,})")
                        # Continue anyway - might be a timing issue
                else:
                    actual_seller_address = seller.evm_address
                    # Use landowner/regulator private key for other sellers
                    seller_private_key = landowner_private_key or regulator_private_key
                
                if not seller_private_key:
                    print(f"  ERROR: No private key available for seller address {actual_seller_address}")
                    print(f"    For trading account: Set TRADING_ACCOUNT_PRIVATE_KEY in .env")
                    print(f"    For others: Set LANDOWNER_PRIVATE_KEY or REGULATOR_PRIVATE_KEY in .env")
                    continue
                
                print(f"Trade #{trade.id}: Transferring {trade.quantity_units} credits")
                print(f"  From: {actual_seller_address} (seller: {seller.name})")
                print(f"  To: {buyer.evm_address} (buyer: {buyer.name})")
                print(f"  Scheme: {scheme.name} (NFT ID: {scheme.nft_token_id})")
                
                # Execute transfer
                tx_hash = transfer_credits_on_chain(
                    seller_address=actual_seller_address,
                    buyer_address=buyer.evm_address,
                    scheme_id=scheme.nft_token_id,
                    quantity_credits=trade.quantity_units,
                    seller_private_key=seller_private_key,
                    scheme_credits_address=scheme_credits_address,
                    rpc_url=rpc_url
                )
                
                # Update trade with transaction hash
                trade.transaction_hash = tx_hash
                db.commit()
                
                print(f"  SUCCESS: Transaction hash: {tx_hash}")
                print("")
                
            except Exception as e:
                print(f"  ERROR: {str(e)}")
                import traceback
                traceback.print_exc()
                print("")
                db.rollback()
                continue
        
        print("Done!")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    retroactive_transfer()



