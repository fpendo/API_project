from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from .config import settings


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer()


class Token(BaseModel):
    token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenData(BaseModel):
    username: str
    exp: datetime


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def authenticate_user(username: str, password: str) -> bool:
    """Authenticate user with stored credentials."""
    # Check against environment variable credentials
    if username != settings.PORTAL_USERNAME:
        return False
    
    # For simple auth, we compare password directly
    # In production, you'd hash the stored password
    if password != settings.PORTAL_PASSWORD:
        return False
    
    return True


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Verify and decode a JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        exp: datetime = datetime.fromtimestamp(payload.get("exp"))
        
        if username is None:
            raise credentials_exception
        
        return TokenData(username=username, exp=exp)
    
    except JWTError:
        raise credentials_exception


def get_current_user(token_data: TokenData = Depends(verify_token)) -> str:
    """Get the current authenticated user."""
    if datetime.utcnow() > token_data.exp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token_data.username

