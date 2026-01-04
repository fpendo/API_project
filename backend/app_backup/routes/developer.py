from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..db import SessionLocal
from ..models import Account, PlanningApplication, PlanningApplicationScheme
from ..services.planning_application import (
    select_schemes_for_application,
    generate_application_token,
    generate_qr_code_data_url
)
from ..services.credits_summary import get_account_credits_summary, get_developer_credit_balances_by_catchment
import os
from fastapi import Query

router = APIRouter()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CreatePlanningApplicationRequest(BaseModel):
    developer_account_id: int
    catchment: str
    unit_type: str
    required_tonnage: float
    planning_reference: Optional[str] = None


class SchemeAllocation(BaseModel):
    scheme_id: int
    tonnes_allocated: float
    credits_allocated: int


class PlanningApplicationResponse(BaseModel):
    id: int
    developer_account_id: int
    catchment: str
    unit_type: str
    required_tonnage: float
    planning_reference: Optional[str]
    application_token: str
    on_chain_application_id: Optional[int]
    status: str
    schemes: List[SchemeAllocation]
    qr_code_data_url: str
    created_at: str


@router.post("/planning-applications", response_model=PlanningApplicationResponse)
def create_planning_application(
    request: CreatePlanningApplicationRequest,
    db: Session = Depends(get_db)
):
    """
    Create a planning application and generate QR code.
    Credits will be locked when the planning officer validates the QR code.
    """
    # Get developer account
    developer = db.query(Account).filter(Account.id == request.developer_account_id).first()
    if not developer:
        raise HTTPException(status_code=404, detail="Developer account not found")
    
    if not developer.evm_address:
        raise HTTPException(status_code=400, detail="Developer account does not have an EVM address")
    
    # Validate inputs
    if request.required_tonnage <= 0:
        raise HTTPException(status_code=400, detail="Required tonnage must be greater than 0")
    
    # Select schemes to meet requirement
    try:
        # Get holdings first to pass to selection function
        holdings = get_account_credits_summary(developer, db)
        
        allocations = select_schemes_for_application(
            developer=developer,
            required_catchment=request.catchment,
            required_unit_type=request.unit_type,
            required_tonnage=request.required_tonnage,
            db=db,
            holdings_override=holdings
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Generate application token
    # Note: Credits will be locked when planning officer validates the QR code
    application_token = generate_application_token()
    
    # Create PlanningApplication record
    application = PlanningApplication(
        developer_account_id=request.developer_account_id,
        catchment=request.catchment.upper(),
        unit_type=request.unit_type.lower(),
        required_tonnage=request.required_tonnage,
        planning_reference=request.planning_reference,
        application_token=application_token,
        on_chain_application_id=None,  # Will be set when planning officer validates
        status="PENDING"
    )
    
    db.add(application)
    db.commit()
    db.refresh(application)
    
    # Create PlanningApplicationScheme records
    scheme_allocations = []
    for alloc in allocations:
        scheme_allocation = PlanningApplicationScheme(
            application_id=application.id,
            scheme_id=alloc["scheme_id"],
            tonnes_allocated=alloc["tonnes_allocated"],
            credits_allocated=alloc["credits_allocated"]
        )
        db.add(scheme_allocation)
        scheme_allocations.append(scheme_allocation)
    
    db.commit()
    
    # Generate QR code
    qr_code_data_url = generate_qr_code_data_url(application_token)
    
    return PlanningApplicationResponse(
        id=application.id,
        developer_account_id=application.developer_account_id,
        catchment=application.catchment,
        unit_type=application.unit_type,
        required_tonnage=application.required_tonnage,
        planning_reference=application.planning_reference,
        application_token=application.application_token,
        on_chain_application_id=application.on_chain_application_id,
        status=application.status,
        schemes=[
            SchemeAllocation(
                scheme_id=sa.scheme_id,
                tonnes_allocated=sa.tonnes_allocated,
                credits_allocated=sa.credits_allocated
            )
            for sa in scheme_allocations
        ],
        qr_code_data_url=qr_code_data_url,
        created_at=application.created_at.isoformat() if application.created_at else ""
    )


class CatchmentBalance(BaseModel):
    catchment: str
    unit_type: str
    available_credits: int
    locked_credits: int
    burned_credits: int
    total_credits: int
    available_tonnes: float
    locked_tonnes: float
    burned_tonnes: float
    total_tonnes: float


class CreditBalancesByCatchmentResponse(BaseModel):
    account_id: int
    balances: List[CatchmentBalance]


@router.get("/planning-applications", response_model=List[PlanningApplicationResponse])
def get_planning_applications(
    developer_account_id: int = Query(..., description="Developer account ID"),
    db: Session = Depends(get_db)
):
    """
    Get all planning applications for a developer (for notifications/history).
    """
    applications = db.query(PlanningApplication).filter(
        PlanningApplication.developer_account_id == developer_account_id
    ).order_by(PlanningApplication.created_at.desc()).all()
    
    result = []
    for app in applications:
        # Get scheme allocations
        scheme_allocations = db.query(PlanningApplicationScheme).filter(
            PlanningApplicationScheme.application_id == app.id
        ).all()
        
        # Generate QR code data URL
        qr_code_data_url = generate_qr_code_data_url(app.application_token)
        
        result.append(PlanningApplicationResponse(
            id=app.id,
            developer_account_id=app.developer_account_id,
            catchment=app.catchment,
            unit_type=app.unit_type,
            required_tonnage=app.required_tonnage,
            planning_reference=app.planning_reference,
            application_token=app.application_token,
            on_chain_application_id=app.on_chain_application_id,
            status=app.status,
            schemes=[
                SchemeAllocation(
                    scheme_id=sa.scheme_id,
                    tonnes_allocated=sa.tonnes_allocated,
                    credits_allocated=sa.credits_allocated
                )
                for sa in scheme_allocations
            ],
            qr_code_data_url=qr_code_data_url,
            created_at=app.created_at.isoformat() if app.created_at else ""
        ))
    
    return result


@router.get("/credit-balances-by-catchment", response_model=CreditBalancesByCatchmentResponse)
def get_credit_balances_by_catchment(
    account_id: int = Query(..., description="Developer account ID"),
    db: Session = Depends(get_db)
):
    """
    Get credit balances grouped by catchment and unit_type for configurator.
    Returns available, locked, and burned credits totals per catchment/unit_type.
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if not account.evm_address:
        # Return empty balances if no EVM address
        return CreditBalancesByCatchmentResponse(
            account_id=account.id,
            balances=[]
        )
    
    # Get balances from service
    balances = get_developer_credit_balances_by_catchment(account, db)
    
    return CreditBalancesByCatchmentResponse(
        account_id=account.id,
        balances=[
            CatchmentBalance(
                catchment=b["catchment"],
                unit_type=b["unit_type"],
                available_credits=b["available_credits"],
                locked_credits=b["locked_credits"],
                burned_credits=b["burned_credits"],
                total_credits=b["total_credits"],
                available_tonnes=b["available_tonnes"],
                locked_tonnes=b["locked_tonnes"],
                burned_tonnes=b["burned_tonnes"],
                total_tonnes=b["total_tonnes"]
            )
            for b in balances
        ]
    )
