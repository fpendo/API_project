"""
Pytest configuration and fixtures
"""
import asyncio
import pytest
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)

# Import app and models
import sys
sys.path.insert(0, '/opt/app/etanalytics/backend')

from app.main import app
from app.database import Base, get_db
from app.config import settings
from app.services.auth_service import hash_password, create_access_token
from app.models import User, UserRole

# Test database URL (use SQLite for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_db.sqlite"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    echo=False
)

test_session_maker = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """Create test database tables and provide session"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with test_session_maker() as session:
        yield session
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database override"""
    
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(test_db: AsyncSession) -> User:
    """Create a test user"""
    user = User(
        email="test@example.com",
        password_hash=hash_password("Test123!"),
        name="Test User",
        role=UserRole.ISSUER.value,
        is_active=True,
        is_verified=True
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest.fixture
async def test_admin(test_db: AsyncSession) -> User:
    """Create a test admin user"""
    admin = User(
        email="admin@example.com",
        password_hash=hash_password("Admin123!"),
        name="Admin User",
        role=UserRole.ADMIN.value,
        is_active=True,
        is_verified=True
    )
    test_db.add(admin)
    await test_db.commit()
    await test_db.refresh(admin)
    return admin


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Get auth headers for test user"""
    token = create_access_token({"sub": str(test_user.id), "email": test_user.email, "role": test_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(test_admin: User) -> dict:
    """Get auth headers for admin user"""
    token = create_access_token({"sub": str(test_admin.id), "email": test_admin.email, "role": test_admin.role})
    return {"Authorization": f"Bearer {token}"}

