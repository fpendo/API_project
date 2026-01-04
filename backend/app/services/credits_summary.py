from web3 import Web3
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import os
from ..models import Scheme, Account, BrokerMandate, Trade, AccountRole, PlanningApplication, PlanningApplicationScheme


def get_scheme_credits_abi() -> list:
    """
    Get the ABI for SchemeCredits contract.
    In production, this should be loaded from the compiled contract artifacts.
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


def get_account_credits_summary(
    account: Account,
    db: Session,
    scheme_credits_address: Optional[str] = None,
    rpc_url: str = "http://127.0.0.1:8545",
    trading_account_address: Optional[str] = None
) -> List[Dict]:
    """
    Get credit holdings summary for an account by querying on-chain balances.
    
    Args:
        account: The Account to get credits for
        db: Database session to query schemes
        scheme_credits_address: Address of SchemeCredits contract (from env if not provided)
        rpc_url: RPC URL of blockchain node (default: localhost:8545)
    
    Returns:
        List of dicts with holdings per scheme, catchment, and unit type
    """
    if not account.evm_address:
        return []
    
    # Get contract address from environment if not provided
    if not scheme_credits_address:
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    
    if not scheme_credits_address:
        # Return empty list if contract not configured
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
        
        # Prepare batch query
        account_address = Web3.to_checksum_address(account.evm_address)
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        # Debug logging
        print(f"Credits summary: Checking balances for account {account.id} at address {account_address}")
        print(f"Credits summary: Contract address {scheme_credits_address}")
        
        # Query balances for all schemes
        scheme_ids = [scheme.nft_token_id for scheme in schemes]
        accounts_array = [account_address] * len(scheme_ids)
        
        print(f"Credits summary: Querying {len(scheme_ids)} schemes: {scheme_ids}")
        
        # Use balanceOfBatch for efficiency
        balances = contract.functions.balanceOfBatch(accounts_array, scheme_ids).call()
        
        print(f"Credits summary: Raw balances returned: {balances}")
        
        # Query locked balances for all schemes
        locked_balances = []
        for scheme_id in scheme_ids:
            try:
                locked = contract.functions.lockedBalance(scheme_id, account_address).call()
                locked_balances.append(int(locked))
            except:
                locked_balances.append(0)
        
        # Get assigned credits per scheme from broker mandates
        # Sum up all active, non-recalled mandates for this landowner, grouped by scheme_id
        assigned_credits_query = db.query(
            BrokerMandate.scheme_id,
            func.sum(BrokerMandate.credits_amount).label('assigned_total')
        ).filter(
            BrokerMandate.landowner_account_id == account.id,
            BrokerMandate.is_active == 1,
            (BrokerMandate.is_recalled == 0) | (BrokerMandate.is_recalled.is_(None))
        ).group_by(BrokerMandate.scheme_id).all()
        
        # Create a dict mapping scheme_id to assigned credits
        assigned_dict = {row.scheme_id: int(row.assigned_total) for row in assigned_credits_query}
        
        # Get sold credits per scheme from trades
        # Sum up all trades where this account was the seller, grouped by scheme_id
        sold_credits_query = db.query(
            Trade.scheme_id,
            func.sum(Trade.quantity_units).label('sold_total')
        ).filter(
            Trade.seller_account_id == account.id
        ).group_by(Trade.scheme_id).all()
        
        # Create a dict mapping scheme_id to sold credits
        sold_dict = {row.scheme_id: int(row.sold_total) for row in sold_credits_query}
        
        # Query trading account balances if trading_account_address is provided
        trading_account_balances = {}
        if trading_account_address:
            try:
                trading_address = Web3.to_checksum_address(trading_account_address)
                trading_balances = contract.functions.balanceOfBatch(
                    [trading_address] * len(scheme_ids),
                    scheme_ids
                ).call()
                # Create a dict mapping nft_token_id to trading account balance
                for scheme, trading_balance in zip(schemes, trading_balances):
                    trading_account_balances[scheme.nft_token_id] = int(trading_balance)
            except Exception as e:
                print(f"Warning: Could not query trading account balances: {e}")
        
        # Build summary - one row per scheme
        # Include ALL schemes owned by this account, even if balance is 0
        # This ensures we show the original capacity even after all credits are transferred
        summary = []
        for scheme, balance, locked in zip(schemes, balances, locked_balances):
            # Get assigned credits for this scheme (0 if none)
            assigned_credits = assigned_dict.get(scheme.id, 0)
            
            # Get sold credits for this scheme (0 if none)
            sold_credits = sold_dict.get(scheme.id, 0)
            
            # Get trading account balance for this scheme (0 if none)
            trading_account_credits = trading_account_balances.get(scheme.nft_token_id, 0)
            
            # Calculate original credits as the maximum of:
            # 1. The sum of all credits (current balance + trading account + assigned + locked)
            # 2. The scheme's original_tonnage * 100000 (from database)
            # This ensures we capture the true maximum capacity even if credits have been moved around
            reconstructed_total = int(balance) + trading_account_credits + assigned_credits + locked
            original_credits_from_db = int(scheme.original_tonnage * 100000)
            original_credits = max(reconstructed_total, original_credits_from_db)
            
            # Include schemes if:
            # 1. Account created the scheme (landowners), OR
            # 2. Account has a balance > 0 (anyone who purchased credits), OR
            # 3. Account has credits in trading account (for landowners only)
            # For developers, they only show schemes where they have purchased credits (balance > 0)
            # For landowners, they show schemes they created OR have credits in trading account
            has_trading_account_balance = trading_account_credits > 0
            is_landowner = account.role == AccountRole.LANDOWNER
            
            # Developers: only show schemes where they have balance > 0 (purchased credits)
            # Landowners: show schemes they created OR have balance OR have trading account balance
            if is_landowner:
                # Landowners see schemes they created or have credits in
                should_include = scheme.created_by_account_id == account.id or balance > 0 or has_trading_account_balance
            else:
                # Developers (and others) only see schemes where they have purchased credits
                should_include = balance > 0
            
            if should_include:
                # Convert credits to tonnes (1 tonne = 100,000 credits)
                # Use original_tonnage if balance is 0
                if balance > 0:
                    tonnes = float(balance) / 100000.0
                else:
                    tonnes = scheme.original_tonnage
                
                # Calculate available (unlocked) credits
                # Available = Original Credits - Assigned - Trading Account
                # Note: This represents what's truly available for new actions
                available_credits = original_credits - assigned_credits - trading_account_credits
                if available_credits < 0:
                    available_credits = 0
                
                # Remaining credits for transfer (current balance - locked)
                # NOTE: Assigned credits are already transferred on-chain, so they're already
                # deducted from the balance. We don't need to subtract them again.
                unlocked_credits = int(balance) - locked
                remaining_credits = unlocked_credits  # Don't subtract assigned_credits - they're already gone from balance
                if remaining_credits < 0:
                    remaining_credits = 0
                
                summary.append({
                    "scheme_id": scheme.id,  # Use database ID for uniqueness
                    "nft_token_id": scheme.nft_token_id,  # Also include NFT token ID for reference
                    "scheme_name": scheme.name,
                    "catchment": scheme.catchment,
                    "unit_type": scheme.unit_type,
                    "credits": int(balance),  # Current on-chain balance
                    "original_credits": original_credits,  # Original scheme capacity
                    "available_credits": available_credits,  # Available = Original - Assigned - Trading Account
                    "tonnes": round(tonnes, 4),
                    "locked_credits": locked,  # Credits locked by planning applications
                    "assigned_credits": assigned_credits,  # Credits assigned to broker
                    "remaining_credits": remaining_credits,  # Available for transfer (unlocked - assigned)
                    "trading_account_credits": trading_account_credits,  # Credits in trading account
                    "sold_credits": sold_credits  # Credits sold from this scheme
                })
        
        return summary
    
    except Exception as e:
        # Log error but return empty list
        print(f"Error querying credit balances: {str(e)}")
        return []


def get_account_credits_summary_by_catchment(
    account: Account,
    db: Session,
    scheme_credits_address: Optional[str] = None,
    rpc_url: str = "http://127.0.0.1:8545",
    trading_account_address: Optional[str] = None
) -> Dict:
    """
    Get credit holdings summary grouped by catchment.
    
    Returns:
        Dict with catchment as key, containing list of schemes and totals
    """
    summary = get_account_credits_summary(account, db, scheme_credits_address, rpc_url, trading_account_address)
    
    # Group by catchment
    catchment_groups: Dict[str, Dict] = {}
    
    for item in summary:
        catchment = item["catchment"]
        if catchment not in catchment_groups:
            catchment_groups[catchment] = {
                "catchment": catchment,
                "schemes": [],
                "total_credits": 0,
                "total_tonnes": 0.0
            }
        
        catchment_groups[catchment]["schemes"].append(item)
        catchment_groups[catchment]["total_credits"] += item["credits"]
        catchment_groups[catchment]["total_tonnes"] += item["tonnes"]
    
    # Round totals
    for group in catchment_groups.values():
        group["total_tonnes"] = round(group["total_tonnes"], 4)
    
    return {
        "account_id": account.id,
        "account_name": account.name,
        "evm_address": account.evm_address,
        "catchments": list(catchment_groups.values()),
        "grand_total_credits": sum(item["credits"] for item in summary),
        "grand_total_tonnes": round(sum(item["tonnes"] for item in summary), 4)
    }


def get_developer_credit_balances_by_catchment(
    account: Account,
    db: Session,
    scheme_credits_address: Optional[str] = None,
    rpc_url: str = "http://127.0.0.1:8545",
    trading_account_address: Optional[str] = None
) -> List[Dict]:
    """
    Get credit balances grouped by catchment and unit_type for configurator.
    Returns available, locked, and burned credits totals per catchment/unit_type.
    
    Args:
        account: The Account (developer) to get credits for
        db: Database session
        scheme_credits_address: Address of SchemeCredits contract
        rpc_url: RPC URL of blockchain node
        trading_account_address: Trading account address (for landowners)
    
    Returns:
        List of dicts with catchment, unit_type, and aggregated credit totals
    """
    # Get account credits summary (includes balances and locked credits per scheme)
    summary = get_account_credits_summary(account, db, scheme_credits_address, rpc_url, trading_account_address)
    
    # Query approved planning applications to calculate burned credits
    approved_applications = db.query(PlanningApplication).filter(
        PlanningApplication.developer_account_id == account.id,
        PlanningApplication.status == "APPROVED"
    ).all()
    
    # Get all scheme allocations for approved applications
    approved_application_ids = [app.id for app in approved_applications]
    
    # Query burned credits: sum of credits_allocated from approved applications, grouped by scheme_id
    burned_credits_query = db.query(
        PlanningApplicationScheme.scheme_id,
        func.sum(PlanningApplicationScheme.credits_allocated).label('burned_total')
    ).filter(
        PlanningApplicationScheme.application_id.in_(approved_application_ids)
    ).group_by(PlanningApplicationScheme.scheme_id).all()
    
    # Create a dict mapping scheme_id to burned credits
    burned_dict = {row.scheme_id: int(row.burned_total) for row in burned_credits_query}
    
    # Aggregate by catchment and unit_type
    catchment_aggregates: Dict[str, Dict] = {}
    
    for item in summary:
        catchment = item["catchment"]
        unit_type = item["unit_type"]
        key = f"{catchment}_{unit_type}"
        
        if key not in catchment_aggregates:
            catchment_aggregates[key] = {
                "catchment": catchment,
                "unit_type": unit_type,
                "available_credits": 0,
                "locked_credits": 0,
                "burned_credits": 0,
                "total_credits": 0
            }
        
        # Available credits = balance - locked (unlocked credits)
        available = max(0, item["credits"] - item["locked_credits"])
        locked = item["locked_credits"]
        burned = burned_dict.get(item["scheme_id"], 0)
        
        catchment_aggregates[key]["available_credits"] += available
        catchment_aggregates[key]["locked_credits"] += locked
        catchment_aggregates[key]["burned_credits"] += burned
        catchment_aggregates[key]["total_credits"] += (available + locked + burned)
    
    # Convert to list and add tonnes
    result = []
    for agg in catchment_aggregates.values():
        result.append({
            "catchment": agg["catchment"],
            "unit_type": agg["unit_type"],
            "available_credits": agg["available_credits"],
            "locked_credits": agg["locked_credits"],
            "burned_credits": agg["burned_credits"],
            "total_credits": agg["total_credits"],
            "available_tonnes": round(agg["available_credits"] / 100000.0, 4),
            "locked_tonnes": round(agg["locked_credits"] / 100000.0, 4),
            "burned_tonnes": round(agg["burned_credits"] / 100000.0, 4),
            "total_tonnes": round(agg["total_credits"] / 100000.0, 4)
        })
    
    return result
