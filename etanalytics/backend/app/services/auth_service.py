"""
Authentication service
"""
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models import User, Session, UserRole

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get user by email"""
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """Get user by ID"""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    email: str,
    password: str,
    name: str,
    role: str = UserRole.ISSUER.value
) -> User:
    """Create a new user"""
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        name=name,
        role=role
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    """Authenticate user with email and password"""
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user


async def create_session(
    db: AsyncSession,
    user: User,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None
) -> tuple[str, str]:
    """Create a new session with tokens"""
    access_token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    session = Session(
        user_id=user.id,
        token=access_token,
        refresh_token=refresh_token,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes),
        refresh_expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(session)
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    await db.commit()
    return access_token, refresh_token


async def invalidate_session(db: AsyncSession, token: str) -> bool:
    """Invalidate a session by token"""
    result = await db.execute(select(Session).where(Session.token == token))
    session = result.scalar_one_or_none()
    if session:
        session.is_valid = False
        await db.commit()
        return True
    return False


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> Optional[tuple[str, str]]:
    """Refresh access token using refresh token"""
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        return None
    
    # Get session
    result = await db.execute(
        select(Session).where(
            Session.refresh_token == refresh_token,
            Session.is_valid == True,
            Session.refresh_expires_at > datetime.utcnow()
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        return None
    
    # Get user
    user = await get_user_by_id(db, session.user_id)
    if not user or not user.is_active:
        return None
    
    # Create new tokens
    new_access_token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Update session
    session.token = new_access_token
    session.refresh_token = new_refresh_token
    session.expires_at = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    session.refresh_expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    
    await db.commit()
    return new_access_token, new_refresh_token


async def validate_token(db: AsyncSession, token: str) -> Optional[User]:
    """Validate access token and return user"""
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    # Check session is valid
    result = await db.execute(
        select(Session).where(
            Session.token == token,
            Session.is_valid == True,
            Session.expires_at > datetime.utcnow()
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        return None
    
    return await get_user_by_id(db, int(user_id))



