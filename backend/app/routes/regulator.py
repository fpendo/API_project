from fastapi import APIRouter, Depends, Query, HTTPException, Path
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path as PathLib
import os
from ..db import SessionLocal
from ..models import SchemeSubmission, SubmissionStatus, Scheme
from ..services import submissions as submission_service

router = APIRouter()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class SubmissionSummary(BaseModel):
    id: int
    submitter_account_id: int
    scheme_name: str
    catchment: str
    location: str
    land_parcel_number: str
    unit_type: str
    total_tonnage: float
    file_path: str
    status: str
    created_at: str

    model_config = {"from_attributes": True}


@router.get("/submissions", response_model=List[SubmissionSummary])
def list_submissions(
    status: Optional[str] = Query(None, description="Filter by submission status"),
    db: Session = Depends(get_db)
):
    """List submissions, optionally filtered by status"""
    query = db.query(SchemeSubmission)
    
    if status:
        try:
            status_enum = SubmissionStatus[status.upper()]
            query = query.filter(SchemeSubmission.status == status_enum)
        except KeyError:
            # Invalid status - return empty list or could raise 400
            return []
    
    submissions = query.order_by(SchemeSubmission.created_at.desc()).all()
    
    return [
        SubmissionSummary(
            id=sub.id,
            submitter_account_id=sub.submitter_account_id,
            scheme_name=sub.scheme_name,
            catchment=sub.catchment,
            location=sub.location,
            land_parcel_number=getattr(sub, 'land_parcel_number', 'UNKNOWN') or 'UNKNOWN',
            unit_type=sub.unit_type,
            total_tonnage=sub.total_tonnage,
            file_path=sub.file_path,
            status=sub.status.value,
            created_at=sub.created_at.isoformat() if sub.created_at else ""
        )
        for sub in submissions
    ]


@router.post("/submissions/{submission_id}/approve", response_model=SubmissionSummary)
def approve_submission(
    submission_id: int = Path(..., description="ID of the submission to approve"),
    db: Session = Depends(get_db)
):
    """Approve a pending submission"""
    import os
    
    try:
        # Get NFT contract address and private key from environment (optional)
        # Use the same env var name as README and deploy script: SCHEME_NFT_CONTRACT_ADDRESS
        scheme_nft_address = os.getenv("SCHEME_NFT_CONTRACT_ADDRESS")
        regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        submission = submission_service.approve_submission(
            db=db,
            submission_id=submission_id,
            scheme_nft_address=scheme_nft_address,
            regulator_private_key=regulator_private_key,
            rpc_url=rpc_url
        )
        return SubmissionSummary(
            id=submission.id,
            submitter_account_id=submission.submitter_account_id,
            scheme_name=submission.scheme_name,
            catchment=submission.catchment,
            location=submission.location,
            land_parcel_number=getattr(submission, 'land_parcel_number', 'UNKNOWN') or 'UNKNOWN',
            unit_type=submission.unit_type,
            total_tonnage=submission.total_tonnage,
            file_path=submission.file_path,
            status=submission.status.value,
            created_at=submission.created_at.isoformat() if submission.created_at else ""
        )
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/submissions/{submission_id}/decline", response_model=SubmissionSummary)
def decline_submission(
    submission_id: int = Path(..., description="ID of the submission to decline"),
    db: Session = Depends(get_db)
):
    """Decline a pending submission"""
    try:
        submission = submission_service.decline_submission(db, submission_id)
        return SubmissionSummary(
            id=submission.id,
            submitter_account_id=submission.submitter_account_id,
            scheme_name=submission.scheme_name,
            catchment=submission.catchment,
            location=submission.location,
            land_parcel_number=getattr(submission, 'land_parcel_number', 'UNKNOWN') or 'UNKNOWN',
            unit_type=submission.unit_type,
            total_tonnage=submission.total_tonnage,
            file_path=submission.file_path,
            status=submission.status.value,
            created_at=submission.created_at.isoformat() if submission.created_at else ""
        )
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


class CatchmentGroup(BaseModel):
    catchment: str
    schemes: List[dict]
    total_original: float
    total_remaining: float
    total_capacity_percent: float
    total_locked_credits: int
    total_burned_credits: int


class ArchiveResponse(BaseModel):
    catchments: List[CatchmentGroup]
    grand_total_original: float
    grand_total_remaining: float
    grand_total_capacity_percent: float
    grand_total_locked_credits: int
    grand_total_burned_credits: int

    model_config = {"from_attributes": True}


@router.get("/archive", response_model=ArchiveResponse)
def get_archive(db: Session = Depends(get_db)):
    """Get all schemes grouped by catchment with totals, including locked/burned credits and capacity %"""
    from ..models import Scheme, PlanningApplication, PlanningApplicationScheme
    from collections import defaultdict
    from sqlalchemy import func
    
    # Get all schemes
    schemes = db.query(Scheme).all()
    
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
    
    # Group by catchment
    catchment_groups = defaultdict(lambda: {
        "schemes": [], 
        "total_original": 0.0, 
        "total_remaining": 0.0,
        "total_locked_credits": 0,
        "total_burned_credits": 0
    })
    
    for scheme in schemes:
        catchment = scheme.catchment
        locked = locked_dict.get(scheme.id, 0)
        burned = burned_dict.get(scheme.id, 0)
        
        # Calculate remaining tonnage: original - (burned credits converted to tonnes) - (locked credits converted to tonnes)
        # 1 tonne = 100,000 credits
        burned_tonnes = burned / 100000.0
        locked_tonnes = locked / 100000.0
        remaining_tonnage = scheme.original_tonnage - burned_tonnes - locked_tonnes
        # Ensure remaining doesn't go below 0
        if remaining_tonnage < 0:
            remaining_tonnage = 0.0
        
        # Calculate capacity % based on actual remaining (after burned and locked)
        capacity_percent = (remaining_tonnage / scheme.original_tonnage * 100) if scheme.original_tonnage > 0 else 0.0
        
        catchment_groups[catchment]["schemes"].append({
            "id": scheme.id,
            "nft_token_id": scheme.nft_token_id,
            "name": scheme.name,
            "location": scheme.location,
            "unit_type": scheme.unit_type,
            "original_tonnage": scheme.original_tonnage,
            "remaining_tonnage": round(remaining_tonnage, 4),
            "capacity_percent": round(capacity_percent, 2),
            "locked_credits": locked,
            "burned_credits": burned,
            "status": "active" if remaining_tonnage > 0 else "depleted"
        })
        catchment_groups[catchment]["total_original"] += scheme.original_tonnage
        catchment_groups[catchment]["total_remaining"] += remaining_tonnage
        catchment_groups[catchment]["total_locked_credits"] += locked
        catchment_groups[catchment]["total_burned_credits"] += burned
    
    # Convert to list format
    catchment_list = []
    grand_total_original = 0.0
    grand_total_remaining = 0.0
    grand_total_locked = 0
    grand_total_burned = 0
    
    for catchment, data in sorted(catchment_groups.items()):
        # Calculate catchment-level capacity %
        catchment_capacity_percent = (data["total_remaining"] / data["total_original"] * 100) if data["total_original"] > 0 else 0.0
        
        catchment_list.append({
            "catchment": catchment,
            "schemes": data["schemes"],
            "total_original": data["total_original"],
            "total_remaining": data["total_remaining"],
            "total_capacity_percent": round(catchment_capacity_percent, 2),
            "total_locked_credits": data["total_locked_credits"],
            "total_burned_credits": data["total_burned_credits"]
        })
        grand_total_original += data["total_original"]
        grand_total_remaining += data["total_remaining"]
        grand_total_locked += data["total_locked_credits"]
        grand_total_burned += data["total_burned_credits"]
    
    # Calculate grand total capacity %
    grand_capacity_percent = (grand_total_remaining / grand_total_original * 100) if grand_total_original > 0 else 0.0
    
    return ArchiveResponse(
        catchments=catchment_list,
        grand_total_original=grand_total_original,
        grand_total_remaining=grand_total_remaining,
        grand_total_capacity_percent=round(grand_capacity_percent, 2),
        grand_total_locked_credits=grand_total_locked,
        grand_total_burned_credits=grand_total_burned
    )


class SchemeListItem(BaseModel):
    id: int
    nft_token_id: int
    name: str
    catchment: str
    location: str
    unit_type: str
    original_tonnage: float
    remaining_tonnage: float
    created_at: str

    model_config = {"from_attributes": True}


@router.get("/schemes", response_model=List[SchemeListItem])
def list_all_schemes(db: Session = Depends(get_db)):
    """Get all schemes for the archive list"""
    schemes = db.query(Scheme).order_by(Scheme.created_at.desc()).all()
    
    return [
        SchemeListItem(
            id=scheme.id,
            nft_token_id=scheme.nft_token_id,
            name=scheme.name,
            catchment=scheme.catchment,
            location=scheme.location,
            unit_type=scheme.unit_type,
            original_tonnage=scheme.original_tonnage,
            remaining_tonnage=scheme.remaining_tonnage,
            created_at=scheme.created_at.isoformat() if scheme.created_at else ""
        )
        for scheme in schemes
    ]


class SchemeDetailResponse(BaseModel):
    id: int
    nft_token_id: int
    name: str
    catchment: str
    location: str
    unit_type: str
    original_tonnage: float
    remaining_tonnage: float
    created_at: str
    submission_id: Optional[int] = None
    submission_file_path: Optional[str] = None
    land_parcel_number: Optional[str] = None
    ipfs_cid: Optional[str] = None
    sha256_hash: Optional[str] = None

    model_config = {"from_attributes": True}


@router.get("/schemes/{scheme_id}", response_model=SchemeDetailResponse)
def get_scheme_details(
    scheme_id: int = Path(..., description="ID of the scheme"),
    db: Session = Depends(get_db)
):
    """Get detailed information about a scheme, including submission file path, CID and hash"""
    from ..models import AgreementArchive
    
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    # Find the submission that created this scheme
    # We match by scheme name, catchment, location, and unit_type
    submission = db.query(SchemeSubmission).filter(
        and_(
            SchemeSubmission.scheme_name == scheme.name,
            SchemeSubmission.catchment == scheme.catchment,
            SchemeSubmission.location == scheme.location,
            SchemeSubmission.unit_type == scheme.unit_type,
            SchemeSubmission.status == SubmissionStatus.APPROVED
        )
    ).order_by(SchemeSubmission.created_at.desc()).first()
    
    # Get the agreement archive for CID and hash
    ipfs_cid = None
    sha256_hash = None
    if submission:
        archive = db.query(AgreementArchive).filter(
            AgreementArchive.submission_id == submission.id
        ).first()
        if archive:
            ipfs_cid = archive.ipfs_cid
            sha256_hash = archive.sha256_hash
    
    return SchemeDetailResponse(
        id=scheme.id,
        nft_token_id=scheme.nft_token_id,
        name=scheme.name,
        catchment=scheme.catchment,
        location=scheme.location,
        unit_type=scheme.unit_type,
        original_tonnage=scheme.original_tonnage,
        remaining_tonnage=scheme.remaining_tonnage,
        created_at=scheme.created_at.isoformat() if scheme.created_at else "",
        submission_id=submission.id if submission else None,
        submission_file_path=submission.file_path if submission else None,
        land_parcel_number=submission.land_parcel_number if submission else None,
        ipfs_cid=ipfs_cid,
        sha256_hash=sha256_hash
    )


@router.get("/schemes/{scheme_id}/download")
def download_scheme_submission(
    scheme_id: int = Path(..., description="ID of the scheme"),
    db: Session = Depends(get_db)
):
    """Download the submission PDF file for a scheme"""
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    # Find the submission that created this scheme
    submission = db.query(SchemeSubmission).filter(
        and_(
            SchemeSubmission.scheme_name == scheme.name,
            SchemeSubmission.catchment == scheme.catchment,
            SchemeSubmission.location == scheme.location,
            SchemeSubmission.unit_type == scheme.unit_type,
            SchemeSubmission.status == SubmissionStatus.APPROVED
        )
    ).order_by(SchemeSubmission.created_at.desc()).first()
    
    if not submission or not submission.file_path:
        raise HTTPException(status_code=404, detail="Submission file not found for this scheme")
    
    # Get the backend directory (parent of 'app' directory)
    backend_dir = PathLib(__file__).parent.parent.parent
    file_path = backend_dir / submission.file_path
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Generate a safe filename for download
    filename = f"{scheme.name}_{scheme.catchment}_{scheme.id}.pdf"
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type='application/pdf'
    )
