"""
Service to check account balances for order validation.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Tuple
from ..models import Account, Trade, AccountRole, BrokerMandate

# Developer opening balance constant (matches frontend)
DEVELOPER_OPENING_BALANCE_GBP = 5000000.00  # £5 million


def get_account_balance(account: Account, db: Session) -> float:
    """
    Get the current available balance for an account.
    
    For developers: Opening balance (£5M) minus purchases
    For landowners: Sum of direct sales + broker sales (via mandates)
    For brokers: Sum of house account sales (sales without mandate_id)
    For others: 0 (not applicable)
    
    Returns:
        Current balance in GBP
    """
    if account.role == AccountRole.DEVELOPER:
        # Developers start with £5M and subtract purchases
        opening_balance = DEVELOPER_OPENING_BALANCE_GBP
        
        # Sum all purchases (where developer was buyer)
        total_purchases = db.query(func.sum(Trade.total_price)).filter(
            Trade.buyer_account_id == account.id
        ).scalar() or 0.0
        
        # Sum all sales (where developer was seller) - unlikely but possible
        total_sales = db.query(func.sum(Trade.total_price)).filter(
            Trade.seller_account_id == account.id
        ).scalar() or 0.0
        
        balance = opening_balance - float(total_purchases) + float(total_sales)
        return max(0.0, balance)  # Don't allow negative balance
    
    elif account.role == AccountRole.LANDOWNER:
        # Landowners get balance from:
        # 1. Direct sales (where landowner was the seller)
        direct_sales = db.query(func.sum(Trade.total_price)).filter(
            Trade.seller_account_id == account.id
        ).scalar() or 0.0
        
        # 2. Broker sales (trades linked to mandates where this landowner is the beneficiary)
        broker_sales = db.query(func.sum(Trade.total_price)).join(
            BrokerMandate, Trade.mandate_id == BrokerMandate.id
        ).filter(
            BrokerMandate.landowner_account_id == account.id
        ).scalar() or 0.0
        
        # TODO: Subtract withdrawals when withdrawal functionality is implemented
        total_withdrawals = 0.0
        
        return float(direct_sales) + float(broker_sales) - float(total_withdrawals)
    
    elif account.role == AccountRole.BROKER:
        # Brokers get balance from house account sales
        # House account sales are broker trades WITHOUT a mandate_id (fee credits, not client credits)
        house_sales = db.query(func.sum(Trade.total_price)).filter(
            and_(
                Trade.seller_account_id == account.id,
                Trade.mandate_id == None  # House account sales have no mandate
            )
        ).scalar() or 0.0
        
        return float(house_sales)
    
    else:
        # Other roles don't have trading balances
        return 0.0


def check_buyer_has_sufficient_balance(
    buyer: Account,
    required_amount_gbp: float,
    db: Session
) -> Tuple[bool, float]:
    """
    Check if buyer has sufficient balance to make a purchase.
    
    Args:
        buyer: The buyer account
        required_amount_gbp: The amount required in GBP
        db: Database session
    
    Returns:
        (has_sufficient, available_balance)
    """
    available_balance = get_account_balance(buyer, db)
    has_sufficient = available_balance >= required_amount_gbp
    
    return has_sufficient, available_balance




