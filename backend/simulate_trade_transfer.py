"""
Simulate what happens when a trade is attempted to see why it fails.
"""
import sys
import os
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db import SessionLocal
from app.models import Account, AccountRole, Scheme, Order, SellLadderBotOrder, SellLadderFIFOCreditQueue, SellLadderBotAssignment
from app.services.order_matching import match_order
from dotenv import load_dotenv

load_dotenv()

def simulate_transfer():
    db = SessionLocal()
    try:
        print("=" * 80)
        print("SIMULATING TRADE TRANSFER LOGIC")
        print("=" * 80)
        
        broker = db.query(Account).filter(Account.role == AccountRole.BROKER).first()
        developer = db.query(Account).filter(Account.role == AccountRole.DEVELOPER).first()
        scheme = db.query(Scheme).filter(Scheme.name == "Fred").first()
        
        print(f"\nBroker: {broker.name} ({broker.evm_address})")
        print(f"Developer: {developer.name} ({developer.evm_address})")
        print(f"Scheme: {scheme.name} (NFT Token ID: {scheme.nft_token_id})")
        
        # Get a recent sell order
        sell_order = db.query(Order).filter(
            Order.account_id == broker.id,
            Order.side == "SELL",
            Order.status == "PENDING"
        ).order_by(Order.id.desc()).first()
        
        if not sell_order:
            print("\nNo pending sell orders found")
            return
        
        print(f"\nTesting with Order #{sell_order.id}:")
        print(f"  Quantity: {sell_order.quantity_units:,} credits")
        print(f"  Price: £{sell_order.price_per_unit:.6f}")
        
        # Check if it's a sell ladder bot order
        sell_ladder_order = db.query(SellLadderBotOrder).filter(
            SellLadderBotOrder.order_id == sell_order.id
        ).first()
        
        if sell_ladder_order:
            print(f"  Is Sell Ladder Bot Order: YES")
            print(f"  FIFO Queue ID: {sell_ladder_order.fifo_queue_id}")
            
            if sell_ladder_order.fifo_queue_id:
                fifo_queue = db.query(SellLadderFIFOCreditQueue).filter(
                    SellLadderFIFOCreditQueue.id == sell_ladder_order.fifo_queue_id
                ).first()
                
                if fifo_queue and fifo_queue.assignment_id:
                    assignment = db.query(SellLadderBotAssignment).filter(
                        SellLadderBotAssignment.id == fifo_queue.assignment_id
                    ).first()
                    
                    if assignment:
                        print(f"\n  Assignment Details:")
                        print(f"    Is House Account: {assignment.is_house_account} (0=client, 1=house)")
                        print(f"    Mandate ID: {assignment.mandate_id}")
                        
                        # Simulate what order_matching.py would do
                        from app.services.order_matching import match_order
                        import os
                        
                        house_address = os.getenv("BROKER_HOUSE_ADDRESS", "")
                        broker_address = broker.evm_address
                        
                        if assignment.is_house_account == 1:
                            expected_address = house_address
                            print(f"\n  [EXPECTED] Order matching will use HOUSE address:")
                            print(f"    Address: {expected_address}")
                            print(f"    Key: BROKER_HOUSE_PRIVATE_KEY")
                        else:
                            expected_address = broker_address
                            print(f"\n  [EXPECTED] Order matching will use CLIENT address:")
                            print(f"    Address: {expected_address}")
                            print(f"    Key: BROKER_PRIVATE_KEY")
                        
                        # Check balances
                        from web3 import Web3
                        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
                        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
                        
                        if scheme_credits_address:
                            w3 = Web3(Web3.HTTPProvider(rpc_url))
                            if w3.is_connected():
                                from app.services.exchange import get_scheme_credits_abi
                                contract = w3.eth.contract(
                                    address=Web3.to_checksum_address(scheme_credits_address),
                                    abi=get_scheme_credits_abi()
                                )
                                
                                expected_checksum = Web3.to_checksum_address(expected_address)
                                balance = contract.functions.balanceOf(expected_checksum, scheme.nft_token_id).call()
                                locked = contract.functions.lockedBalance(scheme.nft_token_id, expected_checksum).call()
                                available = balance - locked
                                
                                print(f"\n  Balance Check:")
                                print(f"    Total: {balance:,} credits")
                                print(f"    Locked: {locked:,} credits")
                                print(f"    Available: {available:,} credits")
                                print(f"    Needed: {sell_order.quantity_units:,} credits")
                                
                                if available < sell_order.quantity_units:
                                    print(f"\n  [ERROR] Insufficient credits at {expected_address}!")
                                    print(f"    This is why transfers are failing.")
                                    
                                    # Check the other address
                                    other_address = house_address if assignment.is_house_account == 0 else broker_address
                                    other_checksum = Web3.to_checksum_address(other_address)
                                    other_balance = contract.functions.balanceOf(other_checksum, scheme.nft_token_id).call()
                                    other_locked = contract.functions.lockedBalance(scheme.nft_token_id, other_checksum).call()
                                    other_available = other_balance - other_locked
                                    
                                    print(f"\n  [INFO] Credits are actually at:")
                                    print(f"    Address: {other_address}")
                                    print(f"    Available: {other_available:,} credits")
                                    
                                    if other_available >= sell_order.quantity_units:
                                        print(f"\n  [SOLUTION] Update assignment to use the address with credits:")
                                        if assignment.is_house_account == 0:
                                            print(f"    Run: python fix_assignment_house_account.py")
                                        else:
                                            print(f"    Run: python fix_assignment_client_account.py")
                                else:
                                    print(f"\n  [OK] Sufficient credits available")
                                    print(f"    Transfer should work!")
        
    finally:
        db.close()

if __name__ == "__main__":
    simulate_transfer()

