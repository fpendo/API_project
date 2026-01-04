from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional, Dict
from ..db import SessionLocal
from ..models import PlanningApplication, PlanningApplicationScheme, Scheme, Account
from ..services.planning_application import (
    approve_planning_application_on_chain,
    reject_planning_application_on_chain,
    submit_planning_application_on_chain
)
from web3 import Web3
import os
from ..services.credits_summary import get_scheme_credits_abi

def get_scheme_credits_abi_with_locked():
    """Get ABI for SchemeCredits contract including lockedBalance"""
    abi = get_scheme_credits_abi()
    # Add lockedBalance function
    abi.append({
        "constant": True,
        "inputs": [
            {"name": "id", "type": "uint256"},
            {"name": "account", "type": "address"}
        ],
        "name": "lockedBalance",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    })
    return abi

router = APIRouter()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ValidateQRRequest(BaseModel):
    application_token: str


class SchemeBreakdown(BaseModel):
    scheme_nft_id: int
    scheme_name: str
    location: str
    tonnes_from_scheme: float
    credits_from_scheme: int  # Credits allocated from this scheme
    available_credits: int  # Available credits remaining in this scheme for the developer
    scheme_remaining_tonnes: float
    catchment: str


class ValidateQRResponse(BaseModel):
    application_id: int
    developer_name: str
    developer_account_id: int
    planning_reference: Optional[str]
    catchment: str
    unit_type: str
    total_tonnage: float
    total_credits: int
    status: str
    schemes: List[SchemeBreakdown]


class SchemeCapacityInfo(BaseModel):
    scheme_id: int
    scheme_name: str
    scheme_nft_id: int
    original_tonnes: float
    remaining_tonnes: float
    capacity_percent: float
    locked_credits: int
    burned_credits: int
    catchment: str
    unit_type: str

class CatchmentCapacityInfo(BaseModel):
    catchment: str
    unit_type: str
    total_original_tonnes: float
    total_remaining_tonnes: float
    total_capacity_percent: float
    total_locked_credits: int
    total_burned_credits: int
    schemes: List[SchemeCapacityInfo]

class ArchiveApplicationItem(BaseModel):
    application_id: int
    application_token: str
    developer_name: str
    developer_account_id: int
    planning_reference: Optional[str]
    catchment: str
    unit_type: str
    total_tonnage: float
    total_credits: int
    status: str
    created_at: str
    on_chain_application_id: Optional[int]


@router.post("/validate-qr", response_model=ValidateQRResponse)
def validate_qr(request: ValidateQRRequest, db: Session = Depends(get_db)):
    """
    Validate QR token, lock credits on-chain if not already locked, and return planning application details with scheme breakdown.
    """
    # Find application by token
    application = db.query(PlanningApplication).filter(
        PlanningApplication.application_token == request.application_token
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Planning application not found")
    
    # Get developer account
    developer = db.query(Account).filter(Account.id == application.developer_account_id).first()
    if not developer:
        raise HTTPException(status_code=404, detail="Developer account not found")
    
    if not developer.evm_address:
        raise HTTPException(status_code=400, detail="Developer account does not have an EVM address")
    
    # Get scheme allocations
    scheme_allocations = db.query(PlanningApplicationScheme).filter(
        PlanningApplicationScheme.application_id == application.id
    ).all()
    
    # Calculate total credits
    total_credits = sum(alloc.credits_allocated for alloc in scheme_allocations)
    
    # If application hasn't been submitted on-chain yet, submit it now to lock credits
    if not application.on_chain_application_id:
        # Get contract configuration
        planning_lock_address = os.getenv("PLANNING_LOCK_CONTRACT_ADDRESS")
        regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")  # Planning officer uses regulator key
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        if planning_lock_address and regulator_private_key:
            try:
                # Get scheme IDs and amounts from allocations
                scheme_ids = []
                amounts = []
                for allocation in scheme_allocations:
                    scheme = db.query(Scheme).filter(Scheme.id == allocation.scheme_id).first()
                    if scheme and scheme.nft_token_id:
                        scheme_ids.append(scheme.nft_token_id)
                        amounts.append(allocation.credits_allocated)
                
                if scheme_ids and amounts:
                    # Get SchemeNFT address for catchment verification
                    scheme_nft_address = os.getenv("SCHEME_NFT_CONTRACT_ADDRESS")
                    
                    # Submit to PlanningLock contract to lock credits
                    on_chain_application_id = submit_planning_application_on_chain(
                        developer_address=developer.evm_address,
                        scheme_ids=scheme_ids,
                        amounts=amounts,
                        required_catchment=application.catchment,
                        planning_lock_address=planning_lock_address,
                        developer_private_key=regulator_private_key,  # Planning officer signs the transaction
                        rpc_url=rpc_url,
                        scheme_nft_address=scheme_nft_address
                    )
                    
                    # Update application with on-chain ID and set status to LOCKED
                    application.on_chain_application_id = on_chain_application_id
                    application.status = "LOCKED"  # Status changes to LOCKED after credits are locked
                    db.commit()
                    db.refresh(application)
                else:
                    # No schemes found or no contract config
                    if not planning_lock_address or not regulator_private_key:
                        raise HTTPException(
                            status_code=500,
                            detail="PlanningLock contract configuration missing. Cannot lock credits."
                        )
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail="No valid schemes found for this application. Cannot lock credits."
                        )
            except HTTPException:
                # Re-raise HTTP exceptions
                raise
            except Exception as e:
                # Log error and raise HTTP exception so user knows what happened
                error_msg = str(e)
                print(f"Error: Failed to submit to PlanningLock contract during validation: {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to lock credits on-chain: {error_msg}. Please check contract configuration and try again."
                )
    
    # Get scheme details and on-chain data
    schemes_breakdown = []
    total_tonnage_allocated = 0.0  # Calculate from actual allocations
    
    # Get contract configuration for querying available credits
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    # Connect to blockchain to query available credits
    w3 = None
    credits_contract = None
    if scheme_credits_address:
        try:
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            if w3.is_connected():
                credits_contract = w3.eth.contract(
                    address=Web3.to_checksum_address(scheme_credits_address),
                    abi=get_scheme_credits_abi_with_locked()
                )
        except Exception as e:
            print(f"Warning: Could not connect to blockchain to query available credits: {e}")
    
    for allocation in scheme_allocations:
        scheme = db.query(Scheme).filter(Scheme.id == allocation.scheme_id).first()
        if not scheme:
            continue
        
        # Get on-chain remaining tonnes (from SchemeNFT)
        remaining_tonnes = scheme.remaining_tonnage  # Use DB value, could also query on-chain
        
        # Calculate tonnes allocated - use stored value or calculate from credits if missing
        tonnes_allocated = allocation.tonnes_allocated
        if tonnes_allocated is None or tonnes_allocated == 0:
            # Fallback: calculate from credits (1 tonne = 100,000 credits)
            if allocation.credits_allocated and allocation.credits_allocated > 0:
                tonnes_allocated = float(allocation.credits_allocated) / 100000.0
                print(f"Debug: Calculated {tonnes_allocated} tonnes from {allocation.credits_allocated} credits for scheme {scheme.id}")
            else:
                tonnes_allocated = 0.0
                print(f"Warning: No tonnes or credits allocated for scheme {scheme.id}")
        else:
            print(f"Debug: Using stored tonnes_allocated: {tonnes_allocated} for scheme {scheme.id}")
        
        # Sum up the actual tonnes allocated
        total_tonnage_allocated += tonnes_allocated
        print(f"Debug: Total tonnage so far: {total_tonnage_allocated}")
        
        # Query available credits for this scheme (developer's current balance minus locked)
        available_credits = 0
        if credits_contract and developer.evm_address:
            try:
                developer_address = Web3.to_checksum_address(developer.evm_address)
                # Get total balance for this scheme
                balance = credits_contract.functions.balanceOf(
                    developer_address,
                    scheme.nft_token_id
                ).call()
                
                # Get locked balance
                locked = credits_contract.functions.lockedBalance(
                    scheme.nft_token_id,
                    developer_address
                ).call()
                
                # Available = balance - locked
                available_credits = int(balance) - int(locked)
                if available_credits < 0:
                    available_credits = 0
            except Exception as e:
                print(f"Warning: Could not query available credits for scheme {scheme.nft_token_id}: {e}")
        
        schemes_breakdown.append(SchemeBreakdown(
            scheme_nft_id=scheme.nft_token_id,
            scheme_name=scheme.name,
            location=scheme.location,
            tonnes_from_scheme=tonnes_allocated,  # Use calculated tonnes_allocated
            credits_from_scheme=allocation.credits_allocated,  # Credits allocated from this scheme
            available_credits=available_credits,  # Available credits remaining in this scheme
            scheme_remaining_tonnes=remaining_tonnes,
            catchment=scheme.catchment
        ))
    
    # Use the calculated total tonnage (from actual allocations) instead of required_tonnage
    # This ensures consistency with what's shown in the scheme breakdown table
    return ValidateQRResponse(
        application_id=application.id,
        developer_name=developer.name,
        developer_account_id=application.developer_account_id,
        planning_reference=application.planning_reference,
        catchment=application.catchment,
        unit_type=application.unit_type,
        total_tonnage=total_tonnage_allocated,  # Use calculated total from allocations
        total_credits=total_credits,
        status=application.status,
        schemes=schemes_breakdown
    )


# IMPORTANT: Archive route must come BEFORE the parameterized route
# FastAPI matches routes in order, so specific routes must come first
@router.get("/applications/archive/test")
def test_archive_endpoint(db: Session = Depends(get_db)):
    """Test endpoint to check if archive query works"""
    try:
        apps = db.query(PlanningApplication).all()
        return {
            "total_applications": len(apps),
            "applications": [
                {
                    "id": app.id,
                    "status": app.status,
                    "catchment": app.catchment,
                    "developer_account_id": app.developer_account_id
                }
                for app in apps
            ]
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}


@router.get("/schemes/capacity", response_model=List[CatchmentCapacityInfo])
def get_schemes_capacity_info(
    catchment: Optional[str] = Query(None, description="Filter by catchment"),
    db: Session = Depends(get_db)
):
    """
    Get capacity information for all schemes, grouped by catchment and unit_type.
    Shows locked credits, burned credits, and % capacity remaining.
    """
    try:
        # Get all schemes
        schemes_query = db.query(Scheme)
        if catchment:
            schemes_query = schemes_query.filter(Scheme.catchment == catchment.upper())
        schemes = schemes_query.all()
        
        # Get all LOCKED applications to calculate locked credits
        locked_apps = db.query(PlanningApplication).filter(
            PlanningApplication.status == "LOCKED"
        ).all()
        locked_app_ids = [app.id for app in locked_apps]
        
        # Get all APPROVED applications to calculate burned credits
        approved_apps = db.query(PlanningApplication).filter(
            PlanningApplication.status == "APPROVED"
        ).all()
        approved_app_ids = [app.id for app in approved_apps]
        
        # Calculate locked credits per scheme
        locked_credits_query = db.query(
            PlanningApplicationScheme.scheme_id,
            func.sum(PlanningApplicationScheme.credits_allocated).label('locked_total')
        ).filter(
            PlanningApplicationScheme.application_id.in_(locked_app_ids)
        ).group_by(PlanningApplicationScheme.scheme_id).all()
        locked_dict = {row.scheme_id: int(row.locked_total) for row in locked_credits_query}
        
        # Calculate burned credits per scheme
        burned_credits_query = db.query(
            PlanningApplicationScheme.scheme_id,
            func.sum(PlanningApplicationScheme.credits_allocated).label('burned_total')
        ).filter(
            PlanningApplicationScheme.application_id.in_(approved_app_ids)
        ).group_by(PlanningApplicationScheme.scheme_id).all()
        burned_dict = {row.scheme_id: int(row.burned_total) for row in burned_credits_query}
        
        # Group schemes by catchment and unit_type
        catchment_groups: Dict[str, Dict] = {}
        
        for scheme in schemes:
            key = f"{scheme.catchment}_{scheme.unit_type}"
            if key not in catchment_groups:
                catchment_groups[key] = {
                    "catchment": scheme.catchment,
                    "unit_type": scheme.unit_type,
                    "schemes": [],
                    "total_original_tonnes": 0.0,
                    "total_remaining_tonnes": 0.0,
                    "total_locked_credits": 0,
                    "total_burned_credits": 0
                }
            
            locked = locked_dict.get(scheme.id, 0)
            burned = burned_dict.get(scheme.id, 0)
            
            # Calculate capacity remaining
            original_tonnes = scheme.original_tonnage
            remaining_tonnes = scheme.remaining_tonnage
            capacity_percent = (remaining_tonnes / original_tonnes * 100) if original_tonnes > 0 else 0.0
            
            scheme_info = SchemeCapacityInfo(
                scheme_id=scheme.id,
                scheme_name=scheme.name,
                scheme_nft_id=scheme.nft_token_id,
                original_tonnes=original_tonnes,
                remaining_tonnes=remaining_tonnes,
                capacity_percent=round(capacity_percent, 2),
                locked_credits=locked,
                burned_credits=burned,
                catchment=scheme.catchment,
                unit_type=scheme.unit_type
            )
            
            catchment_groups[key]["schemes"].append(scheme_info)
            catchment_groups[key]["total_original_tonnes"] += original_tonnes
            catchment_groups[key]["total_remaining_tonnes"] += remaining_tonnes
            catchment_groups[key]["total_locked_credits"] += locked
            catchment_groups[key]["total_burned_credits"] += burned
        
        # Convert to response format
        result = []
        for group in catchment_groups.values():
            total_capacity_percent = (group["total_remaining_tonnes"] / group["total_original_tonnes"] * 100) if group["total_original_tonnes"] > 0 else 0.0
            
            result.append(CatchmentCapacityInfo(
                catchment=group["catchment"],
                unit_type=group["unit_type"],
                total_original_tonnes=round(group["total_original_tonnes"], 4),
                total_remaining_tonnes=round(group["total_remaining_tonnes"], 4),
                total_capacity_percent=round(total_capacity_percent, 2),
                total_locked_credits=group["total_locked_credits"],
                total_burned_credits=group["total_burned_credits"],
                schemes=group["schemes"]
            ))
        
        return result
    except Exception as e:
        print(f"Error in get_schemes_capacity_info: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get capacity info: {str(e)}")


@router.get("/applications/archive", response_model=List[ArchiveApplicationItem])
def get_planning_applications_archive(
    status: Optional[str] = Query(None, description="Filter by status (PENDING, LOCKED, APPROVED, REJECTED)"),
    db: Session = Depends(get_db)
):
    """
    Get archive of all planning applications.
    Can optionally filter by status (PENDING, APPROVED, REJECTED).
    """
    print(f"DEBUG: get_planning_applications_archive called with status={status}")
    try:
        query = db.query(PlanningApplication)
        
        if status and status.upper() != 'ALL':
            query = query.filter(PlanningApplication.status == status.upper())
        
        # Order by most recent first
        applications = query.order_by(PlanningApplication.created_at.desc()).all()
        
        result = []
        for app in applications:
            try:
                # Get developer name
                developer = db.query(Account).filter(Account.id == app.developer_account_id).first()
                developer_name = developer.name if developer else f"Account {app.developer_account_id}"
                
                # Calculate total credits and tonnage from scheme allocations
                scheme_allocations = db.query(PlanningApplicationScheme).filter(
                    PlanningApplicationScheme.application_id == app.id
                ).all()
                total_credits = sum(alloc.credits_allocated for alloc in scheme_allocations)
                
                # Calculate total tonnage from allocations (same as detail view)
                total_tonnage_allocated = 0.0
                for alloc in scheme_allocations:
                    tonnes_allocated = alloc.tonnes_allocated
                    if tonnes_allocated is None or tonnes_allocated == 0:
                        # Fallback: calculate from credits (1 tonne = 100,000 credits)
                        if alloc.credits_allocated and alloc.credits_allocated > 0:
                            tonnes_allocated = float(alloc.credits_allocated) / 100000.0
                    total_tonnage_allocated += tonnes_allocated
                
                # Handle created_at - must be a valid ISO string, not empty
                created_at_str = ""
                if app.created_at:
                    if hasattr(app.created_at, 'isoformat'):
                        created_at_str = app.created_at.isoformat()
                    else:
                        created_at_str = str(app.created_at)
                else:
                    # Use a default date if None
                    from datetime import datetime
                    created_at_str = datetime.now().isoformat()
                
                # Ensure all values are properly typed - explicitly convert to correct types
                try:
                    application_id = int(app.id) if app.id is not None else 0
                    developer_account_id = int(app.developer_account_id) if app.developer_account_id is not None else 0
                    
                    on_chain_id = None
                    if app.on_chain_application_id is not None:
                        try:
                            on_chain_id = int(app.on_chain_application_id)
                        except (ValueError, TypeError):
                            on_chain_id = None
                    
                    item_data = {
                        "application_id": application_id,
                        "application_token": str(app.application_token) if app.application_token else "",
                        "developer_name": str(developer_name),
                        "developer_account_id": developer_account_id,
                        "planning_reference": app.planning_reference if app.planning_reference else None,
                        "catchment": str(app.catchment) if app.catchment else "",
                        "unit_type": str(app.unit_type) if app.unit_type else "",
                        "total_tonnage": float(total_tonnage_allocated),
                        "total_credits": int(total_credits) if total_credits is not None else 0,
                        "status": str(app.status) if app.status else "PENDING",
                        "created_at": created_at_str,
                        "on_chain_application_id": on_chain_id
                    }
                    
                    # Debug: verify types
                    print(f"DEBUG: App {app.id} - application_id={item_data['application_id']} (type: {type(item_data['application_id']).__name__})")
                    
                except Exception as type_error:
                    print(f"Type conversion error for app {app.id}: {type_error}")
                    print(f"  app.id = {app.id} (type: {type(app.id).__name__})")
                    print(f"  app.developer_account_id = {app.developer_account_id} (type: {type(app.developer_account_id).__name__})")
                    raise
                
                # Validate the item before adding
                try:
                    item = ArchiveApplicationItem(**item_data)
                    result.append(item)  # Return Pydantic model for response_model validation
                except Exception as validation_error:
                    print(f"Validation error for application {app.id}: {validation_error}")
                    print(f"Item data: {item_data}")
                    import traceback
                    traceback.print_exc()
                    # Skip this application if validation fails
                    continue
                    
            except Exception as e:
                print(f"Error processing application {app.id}: {e}")
                import traceback
                traceback.print_exc()
                # Skip this application if there's an error
                continue
        
        print(f"Returning {len(result)} applications from archive")
        return result
    except Exception as e:
        print(f"Error in get_planning_applications_archive: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to load archive: {str(e)}")


@router.get("/applications/{application_id}", response_model=ValidateQRResponse)
def get_application_details(
    application_id: int,
    db: Session = Depends(get_db)
):
    """
    Get planning application details by ID (without locking credits).
    Returns the same structure as validate_qr but doesn't perform locking.
    """
    # Find application by ID
    application = db.query(PlanningApplication).filter(
        PlanningApplication.id == application_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Planning application not found")
    
    # Get developer account
    developer = db.query(Account).filter(Account.id == application.developer_account_id).first()
    if not developer:
        raise HTTPException(status_code=404, detail="Developer account not found")
    
    if not developer.evm_address:
        raise HTTPException(status_code=400, detail="Developer account does not have an EVM address")
    
    # Get scheme allocations
    scheme_allocations = db.query(PlanningApplicationScheme).filter(
        PlanningApplicationScheme.application_id == application.id
    ).all()
    
    # Calculate total credits
    total_credits = sum(alloc.credits_allocated for alloc in scheme_allocations)
    
    # Get scheme details and on-chain data (same logic as validate_qr but without locking)
    schemes_breakdown = []
    total_tonnage_allocated = 0.0  # Calculate from actual allocations
    
    # Get contract configuration for querying available credits
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    # Connect to blockchain to query available credits
    w3 = None
    credits_contract = None
    if scheme_credits_address:
        try:
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            if w3.is_connected():
                credits_contract = w3.eth.contract(
                    address=Web3.to_checksum_address(scheme_credits_address),
                    abi=get_scheme_credits_abi_with_locked()
                )
        except Exception as e:
            print(f"Warning: Could not connect to blockchain to query available credits: {e}")
    
    for allocation in scheme_allocations:
        scheme = db.query(Scheme).filter(Scheme.id == allocation.scheme_id).first()
        if not scheme:
            continue
        
        # Get on-chain remaining tonnes (from SchemeNFT)
        remaining_tonnes = scheme.remaining_tonnage  # Use DB value, could also query on-chain
        
        # Calculate tonnes allocated - use stored value or calculate from credits if missing
        tonnes_allocated = allocation.tonnes_allocated
        if tonnes_allocated is None or tonnes_allocated == 0:
            # Fallback: calculate from credits (1 tonne = 100,000 credits)
            if allocation.credits_allocated and allocation.credits_allocated > 0:
                tonnes_allocated = float(allocation.credits_allocated) / 100000.0
                print(f"Debug: Calculated {tonnes_allocated} tonnes from {allocation.credits_allocated} credits for scheme {scheme.id}")
            else:
                tonnes_allocated = 0.0
                print(f"Warning: No tonnes or credits allocated for scheme {scheme.id}")
        else:
            print(f"Debug: Using stored tonnes_allocated: {tonnes_allocated} for scheme {scheme.id}")
        
        # Sum up the actual tonnes allocated
        total_tonnage_allocated += tonnes_allocated
        print(f"Debug: Total tonnage so far: {total_tonnage_allocated}")
        
        # Query available credits for this scheme (developer's current balance minus locked)
        available_credits = 0
        if credits_contract and developer.evm_address:
            try:
                developer_address = Web3.to_checksum_address(developer.evm_address)
                # Get total balance for this scheme
                balance = credits_contract.functions.balanceOf(
                    developer_address,
                    scheme.nft_token_id
                ).call()
                
                # Get locked balance
                locked = credits_contract.functions.lockedBalance(
                    scheme.nft_token_id,
                    developer_address
                ).call()
                
                # Available = balance - locked
                available_credits = int(balance) - int(locked)
                if available_credits < 0:
                    available_credits = 0
            except Exception as e:
                print(f"Warning: Could not query available credits for scheme {scheme.nft_token_id}: {e}")
        
        schemes_breakdown.append(SchemeBreakdown(
            scheme_nft_id=scheme.nft_token_id,
            scheme_name=scheme.name,
            location=scheme.location,
            tonnes_from_scheme=tonnes_allocated,  # Use calculated tonnes_allocated
            credits_from_scheme=allocation.credits_allocated,  # Credits allocated from this scheme
            available_credits=available_credits,  # Available credits remaining in this scheme
            scheme_remaining_tonnes=remaining_tonnes,
            catchment=scheme.catchment
        ))
    
    # Use the calculated total tonnage (from actual allocations) instead of required_tonnage
    # This ensures consistency with what's shown in the scheme breakdown table
    return ValidateQRResponse(
        application_id=application.id,
        developer_name=developer.name,
        developer_account_id=application.developer_account_id,
        planning_reference=application.planning_reference,
        catchment=application.catchment,
        unit_type=application.unit_type,
        total_tonnage=total_tonnage_allocated,  # Use calculated total from allocations
        total_credits=total_credits,
        status=application.status,
        schemes=schemes_breakdown
    )


class DecisionRequest(BaseModel):
    decision: str  # "APPROVE" or "REJECT"


@router.post("/applications/{application_id}/decision")
def make_decision(
    application_id: int,
    request: DecisionRequest,
    db: Session = Depends(get_db)
):
    """
    Approve or reject a planning application.
    Calls PlanningLock contract on-chain.
    """
    # Get application
    application = db.query(PlanningApplication).filter(
        PlanningApplication.id == application_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Planning application not found")
    
    if application.status not in ["PENDING", "LOCKED"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Application is already {application.status}, cannot change decision"
        )
    
    if request.decision not in ["APPROVE", "REJECT"]:
        raise HTTPException(
            status_code=400,
            detail="Decision must be either 'APPROVE' or 'REJECT'"
        )
    
    # Get contract configuration
    planning_lock_address = os.getenv("PLANNING_LOCK_CONTRACT_ADDRESS")
    regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")  # Planning officer uses regulator key
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not planning_lock_address or not regulator_private_key:
        raise HTTPException(
            status_code=500,
            detail="PlanningLock contract configuration missing"
        )
    
    if not application.on_chain_application_id:
        raise HTTPException(
            status_code=400,
            detail="Application was not submitted on-chain, cannot make decision"
        )
    
    try:
        if request.decision == "APPROVE":
            # Call PlanningLock.approveApplication on-chain
            approve_planning_application_on_chain(
                application_id=application.on_chain_application_id,
                planning_lock_address=planning_lock_address,
                regulator_private_key=regulator_private_key,
                rpc_url=rpc_url
            )
            application.status = "APPROVED"
        else:  # REJECT
            # Call PlanningLock.rejectApplication on-chain
            reject_planning_application_on_chain(
                application_id=application.on_chain_application_id,
                planning_lock_address=planning_lock_address,
                regulator_private_key=regulator_private_key,
                rpc_url=rpc_url
            )
            application.status = "REJECTED"
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Application {request.decision.lower()}d successfully",
            "application_id": application.id,
            "status": application.status
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to {request.decision.lower()} application on-chain: {str(e)}"
        )


@router.post("/applications/{application_id}/burn")
def burn_application(
    application_id: int,
    db: Session = Depends(get_db)
):
    """
    Burn credits for a LOCKED planning application (approve and permanently remove credits).
    """
    # Get application
    application = db.query(PlanningApplication).filter(
        PlanningApplication.id == application_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Planning application not found")
    
    if application.status != "LOCKED":
        raise HTTPException(
            status_code=400, 
            detail=f"Application status is {application.status}. Only LOCKED applications can be burned."
        )
    
    if not application.on_chain_application_id:
        raise HTTPException(
            status_code=400,
            detail="Application was not submitted on-chain, cannot burn credits"
        )
    
    # Get contract configuration
    planning_lock_address = os.getenv("PLANNING_LOCK_CONTRACT_ADDRESS")
    regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not planning_lock_address or not regulator_private_key:
        raise HTTPException(
            status_code=500,
            detail="PlanningLock contract configuration missing"
        )
    
    try:
        # Note: The deployed contract may still require whole tonnes
        # If burning fails due to partial tonnes, we'll provide a clear error
        # The contract code has been updated to allow partial tonnes, but it needs to be redeployed
        approve_planning_application_on_chain(
            application_id=application.on_chain_application_id,
            planning_lock_address=planning_lock_address,
            regulator_private_key=regulator_private_key,
            rpc_url=rpc_url
        )
        # Update status to APPROVED (which indicates credits are burned)
        application.status = "APPROVED"
        db.commit()
        
        return {
            "success": True,
            "message": "Credits have been burned successfully",
            "application_id": application.id,
            "status": application.status
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions (like the one we just created)
        raise
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        # Check if it's the "whole tonnes" error from the contract
        if "Amount must be whole tonnes" in error_msg or "whole tonnes" in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail=f"Cannot burn credits: Application contains partial tonnes. Amounts must be whole tonnes (divisible by 100,000 credits). "
                       f"Please unlock this application and recreate it with whole tonnes. Original error: {error_msg}"
            )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to burn credits on-chain: {error_msg}"
        )


@router.post("/applications/{application_id}/unlock")
def unlock_application(
    application_id: int,
    db: Session = Depends(get_db)
):
    """
    Unlock credits for a LOCKED planning application (reject and release credits back to developer).
    """
    # Get application
    application = db.query(PlanningApplication).filter(
        PlanningApplication.id == application_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Planning application not found")
    
    if application.status != "LOCKED":
        raise HTTPException(
            status_code=400, 
            detail=f"Application status is {application.status}. Only LOCKED applications can be unlocked."
        )
    
    if not application.on_chain_application_id:
        raise HTTPException(
            status_code=400,
            detail="Application was not submitted on-chain, cannot unlock credits"
        )
    
    # Get contract configuration
    planning_lock_address = os.getenv("PLANNING_LOCK_CONTRACT_ADDRESS")
    regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not planning_lock_address or not regulator_private_key:
        raise HTTPException(
            status_code=500,
            detail="PlanningLock contract configuration missing"
        )
    
    try:
        # Call PlanningLock.rejectApplication on-chain (which unlocks the credits)
        reject_planning_application_on_chain(
            application_id=application.on_chain_application_id,
            planning_lock_address=planning_lock_address,
            regulator_private_key=regulator_private_key,
            rpc_url=rpc_url
        )
        # Update status to REJECTED (which indicates credits are unlocked)
        application.status = "REJECTED"
        db.commit()
        
        return {
            "success": True,
            "message": "Credits have been unlocked successfully",
            "application_id": application.id,
            "status": application.status
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to unlock credits on-chain: {str(e)}"
        )
