from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
from ..db import SessionLocal
from ..models import Account, Trade, BrokerMandate, AccountRole
from ..services.credits_summary import get_account_credits_summary, get_account_credits_summary_by_catchment
from ..services.balance_check import get_account_balance as get_account_balance_service

router = APIRouter()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class SchemeHolding(BaseModel):
    scheme_id: int
    scheme_name: str
    catchment: str
    unit_type: str
    credits: int  # Current on-chain balance
    original_credits: Optional[int] = None  # Original scheme capacity
    available_credits: Optional[int] = None  # Available = Original - Assigned - Trading Account
    tonnes: float
    assigned_credits: Optional[int] = 0
    remaining_credits: Optional[int] = 0
    trading_account_credits: Optional[int] = 0  # Credits in trading account
    sold_credits: Optional[int] = 0  # Credits sold from this scheme


class CreditsSummaryResponse(BaseModel):
    account_id: int
    account_name: str
    evm_address: Optional[str]
    holdings: List[SchemeHolding]
    total_credits: int
    total_tonnes: float


class CatchmentGroup(BaseModel):
    catchment: str
    schemes: List[SchemeHolding]
    total_credits: int
    total_tonnes: float


class CreditsSummaryByCatchmentResponse(BaseModel):
    account_id: int
    account_name: str
    evm_address: Optional[str]
    catchments: List[CatchmentGroup]
    grand_total_credits: int
    grand_total_tonnes: float


@router.get("/{account_id}/credits-summary", response_model=CreditsSummaryResponse)
def get_credits_summary(
    account_id: int = Path(..., description="Account ID to get credits summary for"),
    db: Session = Depends(get_db)
):
    """
    Get credit holdings summary for an account.
    Returns holdings per scheme, catchment, and unit type.
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if not account.evm_address:
        # Return empty summary if no EVM address
        return CreditsSummaryResponse(
            account_id=account.id,
            account_name=account.name,
            evm_address=account.evm_address,
            holdings=[],
            total_credits=0,
            total_tonnes=0.0
        )
    
    # Get summary from on-chain
    # For landowners, also query trading account to calculate original_credits correctly
    trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
    summary = get_account_credits_summary(account, db, trading_account_address=trading_account_address)
    
    total_credits = sum(item["credits"] for item in summary)
    total_tonnes = round(sum(item["tonnes"] for item in summary), 4)
    
    holdings = [
        SchemeHolding(
            scheme_id=item["scheme_id"],
            scheme_name=item["scheme_name"],
            catchment=item["catchment"],
            unit_type=item["unit_type"],
            credits=item["credits"],
            original_credits=item.get("original_credits"),
            available_credits=item.get("available_credits"),
            tonnes=item["tonnes"],
            assigned_credits=item.get("assigned_credits", 0),
            remaining_credits=item.get("remaining_credits", item["credits"]),
            locked_credits=item.get("locked_credits", 0),
            trading_account_credits=item.get("trading_account_credits", 0),
            sold_credits=item.get("sold_credits", 0)
        )
        for item in summary
    ]
    
    return CreditsSummaryResponse(
        account_id=account.id,
        account_name=account.name,
        evm_address=account.evm_address,
        holdings=holdings,
        total_credits=total_credits,
        total_tonnes=total_tonnes
    )


@router.get("/{account_id}/credits-summary/by-catchment", response_model=CreditsSummaryByCatchmentResponse)
def get_credits_summary_by_catchment(
    account_id: int = Path(..., description="Account ID to get credits summary for"),
    db: Session = Depends(get_db)
):
    """
    Get credit holdings summary grouped by catchment.
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if not account.evm_address:
        # Return empty summary if no EVM address
        return CreditsSummaryByCatchmentResponse(
            account_id=account.id,
            account_name=account.name,
            evm_address=account.evm_address,
            catchments=[],
            grand_total_credits=0,
            grand_total_tonnes=0.0
        )
    
    # Get summary grouped by catchment
    # For landowners, also query trading account to calculate original_credits correctly
    trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
    summary = get_account_credits_summary_by_catchment(account, db, trading_account_address=trading_account_address)
    
    # Convert to response model
    catchments = [
        CatchmentGroup(
            catchment=group["catchment"],
            schemes=[
                SchemeHolding(
                    scheme_id=item["scheme_id"],
                    scheme_name=item["scheme_name"],
                    catchment=item["catchment"],
                    unit_type=item["unit_type"],
                    credits=item["credits"],
                    tonnes=item["tonnes"]
                )
                for item in group["schemes"]
            ],
            total_credits=group["total_credits"],
            total_tonnes=group["total_tonnes"]
        )
        for group in summary["catchments"]
    ]
    
    return CreditsSummaryByCatchmentResponse(
        account_id=summary["account_id"],
        account_name=summary["account_name"],
        evm_address=summary["evm_address"],
        catchments=catchments,
        grand_total_credits=summary["grand_total_credits"],
        grand_total_tonnes=summary["grand_total_tonnes"]
    )


@router.get("/by-address/{evm_address}/credits-summary", response_model=CreditsSummaryResponse)
def get_credits_summary_by_address(
    evm_address: str = Path(..., description="EVM address to get credits summary for"),
    db: Session = Depends(get_db)
):
    """
    Get credit holdings summary for a specific EVM address.
    This is useful for querying trading accounts or other addresses that may not have a database account.
    """
    # Create a temporary account object with the address
    from ..models import Account
    temp_account = Account(
        id=0,  # Temporary ID
        name="Trading Account",
        role=None,  # No role needed
        evm_address=evm_address
    )
    
    # Get summary from on-chain
    summary = get_account_credits_summary(temp_account, db)
    
    total_credits = sum(item["credits"] for item in summary)
    total_tonnes = round(sum(item["tonnes"] for item in summary), 4)
    
    holdings = [
        SchemeHolding(
            scheme_id=item["scheme_id"],
            scheme_name=item["scheme_name"],
            catchment=item["catchment"],
            unit_type=item["unit_type"],
            credits=item["credits"],
            original_credits=item.get("original_credits"),
            available_credits=item.get("available_credits"),
            tonnes=item["tonnes"],
            assigned_credits=item.get("assigned_credits", 0),
            remaining_credits=item.get("remaining_credits", item["credits"]),
            locked_credits=item.get("locked_credits", 0),
            trading_account_credits=item.get("trading_account_credits", 0),
            sold_credits=item.get("sold_credits", 0)
        )
        for item in summary
    ]
    
    return CreditsSummaryResponse(
        account_id=0,
        account_name="Trading Account",
        evm_address=evm_address,
        holdings=holdings,
        total_credits=total_credits,
        total_tonnes=total_tonnes
    )


class AccountBalanceResponse(BaseModel):
    account_id: int
    account_name: str
    balance_gbp: float
    total_sales: float
    total_withdrawals: float = 0.0  # For future use


@router.get("/{account_id}/balance", response_model=AccountBalanceResponse)
def get_account_balance(
    account_id: int = Path(..., description="Account ID to get balance for"),
    db: Session = Depends(get_db)
):
    """
    Get account balance.
    For developers: Opening balance (£5M) minus purchases
    For landowners: Sum of all sales revenue
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Use the balance check service which handles all account types
    balance_gbp = get_account_balance_service(account, db)
    
    # Calculate total sales for response
    # For landowners: includes direct sales + broker sales via mandates
    direct_sales = db.query(func.sum(Trade.total_price)).filter(
        Trade.seller_account_id == account_id
    ).scalar() or 0.0
    
    broker_sales = 0.0
    if account.role == AccountRole.LANDOWNER:
        # Add broker sales (trades linked to mandates where this landowner is beneficiary)
        broker_sales = db.query(func.sum(Trade.total_price)).join(
            BrokerMandate, Trade.mandate_id == BrokerMandate.id
        ).filter(
            BrokerMandate.landowner_account_id == account_id
        ).scalar() or 0.0
    
    total_sales = float(direct_sales) + float(broker_sales)
    
    # For now, assume no withdrawals (all sales revenue is available)
    # In the future, we'll subtract withdrawals from a withdrawals table
    total_withdrawals = 0.0
    
    return AccountBalanceResponse(
        account_id=account.id,
        account_name=account.name,
        balance_gbp=round(balance_gbp, 2),
        total_sales=round(total_sales, 2),
        total_withdrawals=round(float(total_withdrawals), 2)
    )
