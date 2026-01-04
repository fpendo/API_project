from web3 import Web3
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import os
from ..models import Scheme, Account, BrokerMandate


def get_scheme_credits_abi() -> list:
    """
    Get the ABI for SchemeCredits contract.
    """
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


def get_broker_client_holdings(broker: Account, db: Session) -> List[Dict]:
    """
    Get client holdings for a broker (credits assigned from landowners).
    Queries on-chain balances and matches with BrokerMandate records.
    """
    if not broker.evm_address:
        return []
    
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address:
        return []
    
    try:
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            return []
        
        # Get all schemes from database
        schemes = db.query(Scheme).all()
        
        if not schemes:
            return []
        
        # Get active mandates for this broker (not recalled)
        active_mandates = db.query(BrokerMandate).filter(
            BrokerMandate.broker_account_id == broker.id,
            BrokerMandate.is_recalled == 0
        ).all()
        
        # Create a mapping of scheme_id to mandate info
        mandate_map = {}
        for mandate in active_mandates:
            if mandate.scheme_id not in mandate_map:
                mandate_map[mandate.scheme_id] = []
            fee_amount = int(mandate.credits_amount * (mandate.fee_percentage / 100.0))
            client_credits = mandate.credits_amount - fee_amount
            mandate_map[mandate.scheme_id].append({
                "mandate_id": mandate.id,
                "landowner_id": mandate.landowner_account_id,
                "landowner_name": mandate.landowner.name if mandate.landowner else "Unknown",
                "assigned_date": mandate.created_at.isoformat() if mandate.created_at else "",
                "total_assigned": mandate.credits_amount,
                "client_credits": client_credits,
                "fee_credits": fee_amount
            })
        
        # Prepare batch query for on-chain balances
        broker_address = Web3.to_checksum_address(broker.evm_address)
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        scheme_ids = [scheme.nft_token_id for scheme in schemes]
        accounts_array = [broker_address] * len(scheme_ids)
        
        # Query balances for all schemes
        balances = contract.functions.balanceOfBatch(accounts_array, scheme_ids).call()
        
        # Query locked balances
        locked_balances = []
        for scheme_id in scheme_ids:
            try:
                locked = contract.functions.lockedBalance(scheme_id, broker_address).call()
                locked_balances.append(int(locked))
            except:
                locked_balances.append(0)
        
        # Build summary - only include schemes where broker has balance and has active mandates
        summary = []
        for scheme, balance, locked in zip(schemes, balances, locked_balances):
            if int(balance) > 0 and scheme.id in mandate_map:
                # Get mandate info for this scheme
                mandates = mandate_map[scheme.id]
                
                # Convert credits to tonnes
                tonnes = float(balance) / 100000.0
                
                # Aggregate mandate info
                total_assigned = sum(m["total_assigned"] for m in mandates)
                landowner_names = ", ".join(set(m["landowner_name"] for m in mandates))
                earliest_date = min(m["assigned_date"] for m in mandates if m["assigned_date"])
                
                summary.append({
                    "scheme_id": scheme.id,
                    "nft_token_id": scheme.nft_token_id,
                    "scheme_name": scheme.name,
                    "catchment": scheme.catchment,
                    "unit_type": scheme.unit_type,
                    "credits": int(balance),
                    "tonnes": round(tonnes, 4),
                    "locked_credits": locked,
                    "available_credits": int(balance) - locked,
                    "landowner_names": landowner_names,
                    "assigned_date": earliest_date,
                    "total_assigned": total_assigned,
                    "mandates": mandates
                })
        
        return summary
    
    except Exception as e:
        print(f"Error querying broker client holdings: {str(e)}")
        return []


def get_broker_house_holdings(house_address: str, db: Session) -> List[Dict]:
    """
    Get house holdings (5% fee payments) for the broker house account.
    Queries on-chain balances and matches with BrokerMandate records.
    """
    if not house_address:
        return []
    
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address:
        return []
    
    try:
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            return []
        
        # Get all schemes from database
        schemes = db.query(Scheme).all()
        
        if not schemes:
            return []
        
        # Get all mandates (including recalled ones, as house keeps the fee)
        all_mandates = db.query(BrokerMandate).filter(
            BrokerMandate.house_address == house_address
        ).all()
        
        # Create a mapping of scheme_id to fee info
        fee_map = {}
        for mandate in all_mandates:
            if mandate.scheme_id not in fee_map:
                fee_map[mandate.scheme_id] = []
            fee_amount = int(mandate.credits_amount * (mandate.fee_percentage / 100.0))
            fee_map[mandate.scheme_id].append({
                "mandate_id": mandate.id,
                "landowner_id": mandate.landowner_account_id,
                "landowner_name": mandate.landowner.name if mandate.landowner else "Unknown",
                "received_date": mandate.created_at.isoformat() if mandate.created_at else "",
                "fee_credits": fee_amount,
                "is_recalled": mandate.is_recalled == 1
            })
        
        # Prepare batch query for on-chain balances
        house_address_checksum = Web3.to_checksum_address(house_address)
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        scheme_ids = [scheme.nft_token_id for scheme in schemes]
        accounts_array = [house_address_checksum] * len(scheme_ids)
        
        # Query balances for all schemes
        balances = contract.functions.balanceOfBatch(accounts_array, scheme_ids).call()
        
        # Query locked balances
        locked_balances = []
        for scheme_id in scheme_ids:
            try:
                locked = contract.functions.lockedBalance(scheme_id, house_address_checksum).call()
                locked_balances.append(int(locked))
            except:
                locked_balances.append(0)
        
        # Build summary - only include schemes where house has balance
        summary = []
        for scheme, balance, locked in zip(schemes, balances, locked_balances):
            if int(balance) > 0:
                # Get fee info for this scheme
                fees = fee_map.get(scheme.id, [])
                
                # Convert credits to tonnes
                tonnes = float(balance) / 100000.0
                
                # Aggregate fee info
                total_fees = sum(f["fee_credits"] for f in fees)
                landowner_names = ", ".join(set(f["landowner_name"] for f in fees))
                earliest_date = min(f["received_date"] for f in fees if f["received_date"]) if fees else ""
                
                summary.append({
                    "scheme_id": scheme.id,
                    "nft_token_id": scheme.nft_token_id,
                    "scheme_name": scheme.name,
                    "catchment": scheme.catchment,
                    "unit_type": scheme.unit_type,
                    "credits": int(balance),
                    "tonnes": round(tonnes, 4),
                    "locked_credits": locked,
                    "available_credits": int(balance) - locked,
                    "landowner_names": landowner_names,
                    "received_date": earliest_date,
                    "total_fees": total_fees,
                    "fees": fees
                })
        
        return summary
    
    except Exception as e:
        print(f"Error querying broker house holdings: {str(e)}")
        return []


def get_broker_mandates(broker: Account, db: Session) -> List[Dict]:
    """
    Get all mandates (active and recalled) for a broker.
    """
    mandates = db.query(BrokerMandate).filter(
        BrokerMandate.broker_account_id == broker.id
    ).order_by(BrokerMandate.created_at.desc()).all()
    
    result = []
    for mandate in mandates:
        fee_amount = int(mandate.credits_amount * (mandate.fee_percentage / 100.0))
        client_credits = mandate.credits_amount - fee_amount
        
        result.append({
            "mandate_id": mandate.id,
            "landowner_id": mandate.landowner_account_id,
            "landowner_name": mandate.landowner.name if mandate.landowner else "Unknown",
            "scheme_id": mandate.scheme_id,
            "scheme_name": mandate.scheme.name if mandate.scheme else "Unknown",
            "catchment": mandate.scheme.catchment if mandate.scheme else "",
            "unit_type": mandate.scheme.unit_type if mandate.scheme else "",
            "total_credits": mandate.credits_amount,
            "client_credits": client_credits,
            "fee_credits": fee_amount,
            "fee_percentage": mandate.fee_percentage,
            "is_active": mandate.is_active == 1,
            "is_recalled": mandate.is_recalled == 1,
            "created_at": mandate.created_at.isoformat() if mandate.created_at else "",
            "recalled_at": mandate.recalled_at.isoformat() if mandate.recalled_at else "",
            "fee_transaction_hash": mandate.fee_transaction_hash,
            "client_transaction_hash": mandate.client_transaction_hash,
            "recall_transaction_hash": mandate.recall_transaction_hash
        })
    
    return result


