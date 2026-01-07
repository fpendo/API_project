from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
from .config import settings
from .auth import (
    Token,
    LoginRequest,
    authenticate_user,
    create_access_token,
    get_current_user,
    verify_token,
)

app = FastAPI(
    title="Portal API",
    description="Authentication gateway for project portal",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],  # Allow all in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "portal"}


@app.post("/api/auth/login", response_model=Token)
async def login(request: LoginRequest):
    """Authenticate user and return JWT token."""
    if not authenticate_user(request.username, request.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )
    
    access_token = create_access_token(
        data={"sub": request.username},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    
    return Token(token=access_token)


@app.get("/api/auth/verify")
async def verify(username: str = Depends(get_current_user)):
    """Verify the current token is valid."""
    return {"valid": True, "username": username}


@app.get("/api/auth/me")
async def get_me(username: str = Depends(get_current_user)):
    """Get current user info."""
    return {"username": username}


# Health check for load balancers
@app.get("/health")
async def health():
    return {"status": "healthy"}

