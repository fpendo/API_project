import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.models import Account, AccountRole
from app.main import app


@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing"""
    # Use file-based SQLite for testing to ensure shared connection
    engine = create_engine("sqlite:///./test.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Override the get_db dependency
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    from backend.app.routes import auth
    app.dependency_overrides[auth.get_db] = override_get_db
    
    try:
        yield TestingSessionLocal
    finally:
        app.dependency_overrides.clear()
        # Clean up test database - close engine first
        engine.dispose()
        import os
        import time
        # Wait a bit for file handles to close
        time.sleep(0.1)
        if os.path.exists("./test.db"):
            try:
                os.remove("./test.db")
            except PermissionError:
                pass  # File might still be locked, ignore


@pytest.fixture
def client(test_db):
    """Create a test client"""
    return TestClient(app)


@pytest.fixture
def db_session(test_db):
    """Get a database session"""
    session = test_db()
    try:
        yield session
    finally:
        session.close()


def test_mock_login_success(client, test_db):
    """Test successful mock login"""
    # Create a session from the test_db factory and add account
    session = test_db()
    account = Account(
        name="Test Regulator",
        role=AccountRole.REGULATOR,
        evm_address="0x1234567890123456789012345678901234567890"
    )
    session.add(account)
    session.commit()
    account_id = account.id
    session.close()
    
    # Call mock-login endpoint (will use test_db via dependency override)
    response = client.post("/auth/mock-login", json={"account_id": account_id})
    
    assert response.status_code == 200
    data = response.json()
    assert data["account_id"] == account_id
    assert data["name"] == "Test Regulator"
    assert data["role"] == "REGULATOR"
    assert data["evm_address"] == "0x1234567890123456789012345678901234567890"


def test_mock_login_account_not_found(client, db_session):
    """Test mock login with non-existent account"""
    response = client.post("/auth/mock-login", json={"account_id": 999})
    
    assert response.status_code == 404
    assert "Account not found" in response.json()["detail"]


def test_mock_login_different_roles(client, test_db):
    """Test mock login with different account roles"""
    # Create accounts with different roles
    session = test_db()
    landowner = Account(name="Landowner", role=AccountRole.LANDOWNER)
    developer = Account(name="Developer", role=AccountRole.DEVELOPER)
    
    session.add(landowner)
    session.add(developer)
    session.commit()
    landowner_id = landowner.id
    developer_id = developer.id
    session.close()
    
    # Test landowner login
    response1 = client.post("/auth/mock-login", json={"account_id": landowner_id})
    assert response1.status_code == 200
    assert response1.json()["role"] == "LANDOWNER"
    
    # Test developer login
    response2 = client.post("/auth/mock-login", json={"account_id": developer_id})
    assert response2.status_code == 200
    assert response2.json()["role"] == "DEVELOPER"

