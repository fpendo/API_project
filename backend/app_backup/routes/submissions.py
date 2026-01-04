from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db import SessionLocal
from ..models import Account
from ..services import submissions as submission_service

router = APIRouter()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class SubmissionResponse(BaseModel):
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


@router.post("/", response_model=SubmissionResponse)
async def create_submission(
    scheme_name: str = Form(...),
    catchment: str = Form(...),
    location: str = Form(...),
    land_parcel_number: str = Form(...),
    unit_type: str = Form(...),
    total_tonnage: float = Form(...),
    submitter_account_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Create a new scheme submission with file upload"""
    try:
        # Validate submitter account exists
        account = db.query(Account).filter(Account.id == submitter_account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Submitter account not found")
        
        # Validate unit_type
        if unit_type not in ["nitrate", "phosphate"]:
            raise HTTPException(status_code=400, detail="unit_type must be 'nitrate' or 'phosphate'")
        
        # Validate catchment (basic check - can be enhanced)
        valid_catchments = ["SOLENT", "THAMES", "SEVERN", "HUMBER", "MERSEY", "TEES", "TYNE", "WESSEX"]
        if catchment.upper() not in valid_catchments:
            raise HTTPException(status_code=400, detail=f"Invalid catchment. Must be one of: {', '.join(valid_catchments)}")
        
        # Validate total_tonnage
        if total_tonnage <= 0:
            raise HTTPException(status_code=400, detail="total_tonnage must be greater than 0")
        
        # Validate land_parcel_number
        if not land_parcel_number or not land_parcel_number.strip():
            raise HTTPException(status_code=400, detail="land_parcel_number is required")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="File is required")
        
        # Read file content
        file_content = await file.read()
        if not file_content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Save file to disk
        try:
            file_path = submission_service.save_uploaded_file(file_content, file.filename)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
        # Create submission in database
        try:
            submission = submission_service.create_submission(
                db=db,
                submitter_account_id=submitter_account_id,
                scheme_name=scheme_name,
                catchment=catchment.upper(),  # Store as uppercase
                location=location,
                land_parcel_number=land_parcel_number.strip(),
                unit_type=unit_type,
                total_tonnage=total_tonnage,
                file_path=file_path
            )
        except ValueError as e:
            # ValueError from create_submission indicates a validation error (e.g., duplicate submission)
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create submission: {str(e)}")
        
        return SubmissionResponse(
            id=submission.id,
            submitter_account_id=submission.submitter_account_id,
            scheme_name=submission.scheme_name,
            catchment=submission.catchment,
            location=submission.location,
            land_parcel_number=submission.land_parcel_number,
            unit_type=submission.unit_type,
            total_tonnage=submission.total_tonnage,
            file_path=submission.file_path,
            status=submission.status.value,
            created_at=submission.created_at.isoformat() if submission.created_at else ""
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Catch any unexpected errors and return a proper error response
        import traceback
        error_details = str(e)
        print(f"Unexpected error in create_submission: {error_details}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {error_details}")
