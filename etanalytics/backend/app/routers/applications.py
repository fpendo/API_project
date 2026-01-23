"""
Applications router for onboarding
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import shutil
from pathlib import Path

from app.database import get_db
from app.config import settings
from app.models import Application, Document, ApplicationStatus, PlanType, DocumentType, User, UserRole
from app.routers.auth import get_current_active_user, require_roles
from app.services.email_service import send_contract_with_welcome_email

router = APIRouter(prefix="/api/applications", tags=["Applications"])


# Request/Response schemas
class ApplicationCreate(BaseModel):
    company_name: str
    registration_number: str
    contact_name: str
    contact_email: EmailStr
    contact_phone: str
    country: str
    selected_plan: str = PlanType.PROFESSIONAL.value
    num_etfs: Optional[int] = None
    additional_notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    company_name: str
    registration_number: str
    contact_name: str
    contact_email: str
    contact_phone: str
    country: str
    selected_plan: str
    num_etfs: Optional[int]
    additional_notes: Optional[str]
    status: str
    access_token: Optional[str]
    created_at: datetime
    updated_at: datetime
    documents: List["DocumentResponse"] = []

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: int
    doc_type: str
    filename: str
    original_filename: str
    file_size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class PipelineStats(BaseModel):
    by_status: dict
    by_plan: dict
    total: int


# Background task for sending welcome email
async def send_welcome_email_task(
    to_email: str,
    contact_name: str,
    company_name: str,
    registration_number: str,
    country: str,
    contact_phone: str,
    selected_plan: str,
    application_id: str,
    access_token: str,
    num_etfs: Optional[int] = None
):
    """Background task to generate contract and send welcome email"""
    try:
        result = await send_contract_with_welcome_email(
            to_email=to_email,
            contact_name=contact_name,
            company_name=company_name,
            registration_number=registration_number,
            country=country,
            contact_phone=contact_phone,
            selected_plan=selected_plan,
            application_id=application_id,
            access_token=access_token,
            num_etfs=num_etfs
        )
        print(f"📧 Contract email result: {result}")
    except Exception as e:
        print(f"❌ Failed to send welcome email: {e}")


# Routes
@router.post("", response_model=ApplicationResponse)
async def create_application(
    app_data: ApplicationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Submit a new application - generates contract and sends welcome email"""
    # Validate plan
    valid_plans = [p.value for p in PlanType]
    if app_data.selected_plan not in valid_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan. Must be one of: {valid_plans}"
        )
    
    # Generate access token
    access_token = secrets.token_urlsafe(32)
    
    application = Application(
        company_name=app_data.company_name,
        registration_number=app_data.registration_number,
        contact_name=app_data.contact_name,
        contact_email=app_data.contact_email.lower(),
        contact_phone=app_data.contact_phone,
        country=app_data.country,
        selected_plan=app_data.selected_plan,
        num_etfs=app_data.num_etfs,
        additional_notes=app_data.additional_notes,
        access_token=access_token,
        status=ApplicationStatus.CONTRACT_SENT.value  # Set initial status to contract_sent
    )
    
    db.add(application)
    await db.commit()
    
    # Eagerly load the documents relationship to prevent lazy loading issues
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.documents))
        .where(Application.id == application.id)
    )
    application = result.scalar_one()
    
    # Generate contract and send welcome email in background
    background_tasks.add_task(
        send_welcome_email_task,
        to_email=app_data.contact_email.lower(),
        contact_name=app_data.contact_name,
        company_name=app_data.company_name,
        registration_number=app_data.registration_number,
        country=app_data.country,
        contact_phone=app_data.contact_phone,
        selected_plan=app_data.selected_plan,
        application_id=str(application.id),
        access_token=access_token,
        num_etfs=app_data.num_etfs
    )
    
    return application


@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.CLIENT_SERVICES.value)),
    db: AsyncSession = Depends(get_db)
):
    """List all applications (admin/analyst/client_services only)"""
    query = select(Application).order_by(Application.created_at.desc())
    
    if status_filter:
        query = query.where(Application.status == status_filter)
    
    result = await db.execute(query)
    applications = result.scalars().all()
    
    # Remove access tokens from list view
    for app in applications:
        app.access_token = None
    
    return applications


@router.get("/pipeline/stats", response_model=PipelineStats)
async def get_pipeline_stats(
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.CLIENT_SERVICES.value)),
    db: AsyncSession = Depends(get_db)
):
    """Get application pipeline statistics"""
    # Count by status
    status_query = select(
        Application.status, func.count(Application.id)
    ).group_by(Application.status)
    
    result = await db.execute(status_query)
    by_status = dict(result.all())
    
    # Count by plan
    plan_query = select(
        Application.selected_plan, func.count(Application.id)
    ).group_by(Application.selected_plan)
    
    result = await db.execute(plan_query)
    by_plan = dict(result.all())
    
    # Total count
    total_query = select(func.count(Application.id))
    result = await db.execute(total_query)
    total = result.scalar() or 0
    
    return PipelineStats(
        by_status=by_status,
        by_plan=by_plan,
        total=total
    )


@router.get("/status/{token}", response_model=ApplicationResponse)
async def get_application_by_token(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Get application by access token (for applicants)"""
    result = await db.execute(
        select(Application).where(Application.access_token == token)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Load documents
    await db.refresh(application, ["documents"])
    
    return application


@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(
    app_id: int,
    token: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get application by ID"""
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check authorization
    is_admin = current_user and current_user.role in [UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.CLIENT_SERVICES.value]
    is_owner = token and application.access_token == token
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Load documents
    await db.refresh(application, ["documents"])
    
    # Hide access token from admin view
    if is_admin and not is_owner:
        application.access_token = None
    
    return application


@router.patch("/{app_id}", response_model=ApplicationResponse)
async def update_application_status(
    app_id: int,
    update: ApplicationStatusUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.CLIENT_SERVICES.value)),
    db: AsyncSession = Depends(get_db)
):
    """Update application status"""
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Validate status
    valid_statuses = [s.value for s in ApplicationStatus]
    if update.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    application.status = update.status
    application.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(application, ["documents"])
    
    return application


@router.post("/{app_id}/documents")
async def upload_document(
    app_id: int,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    token: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a document for an application"""
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check authorization
    is_admin = current_user and current_user.role in [UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.CLIENT_SERVICES.value]
    is_owner = token and application.access_token == token
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate doc_type
    valid_types = [d.value for d in DocumentType]
    if doc_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid doc_type. Must be one of: {valid_types}")
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {settings.allowed_extensions}")
    
    # Read file
    content = await file.read()
    if len(content) > settings.max_upload_size:
        raise HTTPException(status_code=400, detail=f"File too large. Max: {settings.max_upload_size // 1024 // 1024}MB")
    
    # Create directory
    app_dir = Path(settings.upload_dir) / str(app_id)
    app_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    stored_filename = f"{doc_type}_{secrets.token_hex(8)}{file_ext}"
    file_path = app_dir / stored_filename
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create document record
    document = Document(
        application_id=app_id,
        doc_type=doc_type,
        filename=stored_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=len(content),
        mime_type=file.content_type
    )
    
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    return {
        "success": True,
        "document_id": document.id,
        "filename": file.filename,
        "doc_type": doc_type,
        "size": len(content)
    }


@router.get("/{app_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    app_id: int,
    token: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List documents for an application"""
    result = await db.execute(
        select(Application).where(Application.id == app_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check authorization
    is_admin = current_user and current_user.role in [UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.CLIENT_SERVICES.value]
    is_owner = token and application.access_token == token
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Load documents
    await db.refresh(application, ["documents"])
    
    return application.documents


# Need to update forward refs
ApplicationResponse.model_rebuild()

