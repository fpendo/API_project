from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Optional
from ..db import SessionLocal
from ..models import Account, Scheme
from ..services.credits_summary import get_account_credits_summary
from collections import defaultdict

router = APIRouter()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class HoldingsSummaryResponse(BaseModel):
    accounts: List[Dict]
    total_credits: int
    total_tonnes: float


@router.get("/holdings-summary", response_model=HoldingsSummaryResponse)
def get_holdings_summary(db: Session = Depends(get_db)):
    """
    Get aggregated holdings summary across all accounts.
    Groups by catchment and unit type.
    """
    # Get all accounts with EVM addresses
    accounts = db.query(Account).filter(Account.evm_address.isnot(None)).all()
    
    all_holdings = []
    for account in accounts:
        summary = get_account_credits_summary(account, db)
        for holding in summary:
            holding["account_id"] = account.id
            holding["account_name"] = account.name
            holding["evm_address"] = account.evm_address
            all_holdings.append(holding)
    
    # Calculate totals
    total_credits = sum(h["credits"] for h in all_holdings)
    total_tonnes = round(sum(h["tonnes"] for h in all_holdings), 4)
    
    return HoldingsSummaryResponse(
        accounts=all_holdings,
        total_credits=total_credits,
        total_tonnes=total_tonnes
    )


class SimulateBlockTradeRequest(BaseModel):
    buyer_account_id: int
    required_catchment: str
    required_unit_type: str
    required_tonnes: float


class AllocationSuggestion(BaseModel):
    account_id: int
    account_name: str
    scheme_id: int
    scheme_name: str
    available_tonnes: float
    suggested_tonnes: float
    credits: int


class SimulateBlockTradeResponse(BaseModel):
    suggestions: List[AllocationSuggestion]
    total_suggested_tonnes: float
    total_required_tonnes: float
    can_fulfill: bool


@router.post("/simulate-block-trade", response_model=SimulateBlockTradeResponse)
def simulate_block_trade(request: SimulateBlockTradeRequest, db: Session = Depends(get_db)):
    """
    Simulate a block trade and return suggested allocations from multiple accounts.
    """
    # Get buyer account
    buyer = db.query(Account).filter(Account.id == request.buyer_account_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer account not found")
    
    # Get all accounts with holdings in the required catchment and unit type
    accounts = db.query(Account).filter(Account.evm_address.isnot(None)).all()
    
    suggestions = []
    total_available = 0.0
    
    for account in accounts:
        if account.id == request.buyer_account_id:
            continue  # Skip buyer's own account
        
        summary = get_account_credits_summary(account, db)
        
        # Filter by catchment and unit type
        matching_holdings = [
            h for h in summary
            if h["catchment"] == request.required_catchment.upper()
            and h["unit_type"] == request.required_unit_type.lower()
        ]
        
        for holding in matching_holdings:
            available_tonnes = holding["tonnes"]
            total_available += available_tonnes
            
            suggestions.append({
                "account_id": account.id,
                "account_name": account.name,
                "scheme_id": holding["scheme_id"],
                "scheme_name": holding["scheme_name"],
                "available_tonnes": available_tonnes,
                "suggested_tonnes": 0.0,  # Will be calculated below
                "credits": holding["credits"]
            })
    
    # Sort by available tonnes (descending) and allocate
    suggestions.sort(key=lambda x: x["available_tonnes"], reverse=True)
    
    remaining_required = request.required_tonnes
    total_suggested = 0.0
    
    for suggestion in suggestions:
        if remaining_required <= 0:
            break
        
        # Allocate up to available, but not more than required
        suggested = min(suggestion["available_tonnes"], remaining_required)
        suggestion["suggested_tonnes"] = suggested
        suggestion["credits"] = int(suggested * 100000)  # Convert tonnes to credits
        
        total_suggested += suggested
        remaining_required -= suggested
    
    # Filter out suggestions with 0 tonnes
    suggestions = [s for s in suggestions if s["suggested_tonnes"] > 0]
    
    return SimulateBlockTradeResponse(
        suggestions=[
            AllocationSuggestion(**s) for s in suggestions
        ],
        total_suggested_tonnes=round(total_suggested, 4),
        total_required_tonnes=request.required_tonnes,
        can_fulfill=total_suggested >= request.required_tonnes
    )


class ExecuteOTCDealRequest(BaseModel):
    buyer_account_id: int
    allocations: List[Dict]  # List of {account_id, scheme_id, credits}


@router.post("/execute-otc-deal")
def execute_otc_deal(request: ExecuteOTCDealRequest, db: Session = Depends(get_db)):
    """
    Execute an OTC deal by transferring credits from multiple accounts to buyer.
    """
    # Get buyer account
    buyer = db.query(Account).filter(Account.id == request.buyer_account_id).first()
    if not buyer or not buyer.evm_address:
        raise HTTPException(status_code=404, detail="Buyer account not found or has no EVM address")
    
    # This would perform on-chain transfers from multiple sellers to buyer
    # For now, return a placeholder response
    # In a full implementation, this would:
    # 1. Validate each allocation
    # 2. Transfer credits on-chain from each seller to buyer
    # 3. Record trades
    
    return {
        "success": True,
        "message": "OTC deal execution (placeholder - full implementation would perform on-chain transfers)",
        "allocations": request.allocations
    }

