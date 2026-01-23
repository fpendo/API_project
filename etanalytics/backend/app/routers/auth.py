"""
Authentication router
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database import get_db
from app.models import User, UserRole
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


# Request/Response schemas
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = UserRole.ISSUER.value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True


class RefreshRequest(BaseModel):
    refresh_token: str


# Dependencies
async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user (from Bearer token OR cookie)"""
    token = None
    
    # First try Bearer token from Authorization header
    if credentials:
        token = credentials.credentials
    
    # Fallback to cookie if no Bearer token
    if not token:
        token = request.cookies.get("eta_token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user = await auth_service.validate_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_roles(*roles: str):
    """Dependency factory for role-based access"""
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in roles and current_user.role != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {current_user.role} not authorized. Required: {roles}"
            )
        return current_user
    return role_checker


# Routes
@router.post("/register", response_model=UserResponse)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user"""
    # Check if email already exists
    existing_user = await auth_service.get_user_by_email(db, request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    valid_roles = [r.value for r in UserRole]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )
    
    user = await auth_service.create_user(
        db,
        email=request.email,
        password=request.password,
        name=request.name,
        role=request.role
    )
    
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    response: Response,
    http_request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Login and get tokens"""
    user = await auth_service.authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Get client info
    user_agent = http_request.headers.get("user-agent")
    ip_address = http_request.client.host if http_request.client else None
    
    access_token, refresh_token = await auth_service.create_session(
        db, user, user_agent, ip_address
    )
    
    # Also set cookie for web clients
    response.set_cookie(
        key="eta_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24  # 24 hours
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: RefreshRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token"""
    tokens = await auth_service.refresh_tokens(db, request.refresh_token)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    access_token, refresh_token = tokens
    
    # Update cookie
    response.set_cookie(
        key="eta_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/logout")
async def logout(
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Logout and invalidate session"""
    if credentials:
        await auth_service.invalidate_session(db, credentials.credentials)
    
    response.delete_cookie("eta_token")
    
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user info"""
    return current_user


@router.get("/verify")
async def verify(
    current_user: User = Depends(get_current_user)
):
    """Verify token is valid"""
    return {
        "valid": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role
    }

