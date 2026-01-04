"""
Service to check account balances for order validation.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Tuple
from ..models import Account, Trade, AccountRole

# Developer opening balance constant (matches frontend)
DEVELOPER_OPENING_BALANCE_GBP = 5000000.00  # £5 million


def get_account_balance(account: Account, db: Session) -> float:
    """
    Get the current available balance for an account.
    
    For developers: Opening balance (£5M) minus purchases
    For landowners: Sum of all sales revenue
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
        # Landowners get balance from sales revenue
        total_sales = db.query(func.sum(Trade.total_price)).filter(
            Trade.seller_account_id == account.id
        ).scalar() or 0.0
        
        # TODO: Subtract withdrawals when withdrawal functionality is implemented
        total_withdrawals = 0.0
        
        return float(total_sales) - float(total_withdrawals)
    
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




