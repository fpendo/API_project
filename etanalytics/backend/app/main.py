"""
ETAnalytics API - Main Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from app.config import settings
from app.database import init_db, close_db
from app.routers import auth_router, applications_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    logger.info("Starting ETAnalytics API...")
    await init_db()
    logger.info("Database initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ETAnalytics API...")
    await close_db()
    logger.info("Database connection closed")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="""
## ETF Ownership Analytics Platform API

### Overview
ETAnalytics helps ETF issuers understand who owns their products by analyzing share registers,
matching entities, and tracing custody chains.

### Features
- **Authentication** - JWT-based auth with role-based access control
- **Applications** - Issuer onboarding workflow management
- **Registers** - Share register upload and analysis
- **Entities** - Known entity database for matching

### Roles
- `admin` - Full access to all features
- `analyst` - Access to analysis workflows
- `issuer` - Access to issuer portal
- `client_services` - Access to application management

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```
    """,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User authentication, registration, and token management"
        },
        {
            "name": "Applications",
            "description": "Issuer onboarding applications and documents"
        }
    ]
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Include routers
app.include_router(auth_router)
app.include_router(applications_router)


# Health check
@app.get("/")
async def root():
    """API root - health check"""
    return {
        "message": f"{settings.app_name} v{settings.app_version}",
        "status": "online",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.debug
    )

