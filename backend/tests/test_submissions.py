import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.models import Account, AccountRole
from app.main import app


@pytest.fixture
def test_db():
    """Create a file-based SQLite database for testing"""
    engine = create_engine("sqlite:///./test_submissions.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Override the get_db dependency
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    from backend.app.routes import submissions
    app.dependency_overrides[submissions.get_db] = override_get_db
    
    try:
        yield TestingSessionLocal
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
        import time
        time.sleep(0.1)
        if os.path.exists("./test_submissions.db"):
            try:
                os.remove("./test_submissions.db")
            except PermissionError:
                pass


@pytest.fixture
def client(test_db):
    """Create a test client"""
    return TestClient(app)


@pytest.fixture
def test_account(test_db):
    """Create a test account"""
    session = test_db()
    account = Account(
        name="Test Landowner",
        role=AccountRole.LANDOWNER,
        evm_address="0x1234567890123456789012345678901234567890"
    )
    session.add(account)
    session.commit()
    account_id = account.id
    session.close()
    return account_id


def test_create_submission_success(client, test_db, test_account):
    """Test successful submission creation"""
    # Create a test file
    test_file_content = b"This is a test PDF content"
    
    # Make request
    response = client.post(
        "/submissions/",
        data={
            "scheme_name": "Test Scheme",
            "catchment": "SOLENT",
            "location": "Test Location",
            "land_parcel_number": "1a",
            "unit_type": "nitrate",
            "total_tonnage": 50.0,
            "submitter_account_id": test_account
        },
        files={"file": ("test.pdf", test_file_content, "application/pdf")}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["scheme_name"] == "Test Scheme"
    assert data["catchment"] == "SOLENT"
    assert data["location"] == "Test Location"
    assert data["unit_type"] == "nitrate"
    assert data["total_tonnage"] == 50.0
    assert data["status"] == "PENDING_REVIEW"
    assert data["file_path"] is not None
    # Handle both Windows and Unix path separators
    assert "archive" in data["file_path"] and "raw_submissions" in data["file_path"]
    
    # Verify file was written to disk
    assert os.path.exists(data["file_path"])
    
    # Verify file content
    with open(data["file_path"], "rb") as f:
        assert f.read() == test_file_content
    
    # Clean up test file
    if os.path.exists(data["file_path"]):
        os.remove(data["file_path"])


def test_create_submission_invalid_account(client, test_db):
    """Test submission with invalid account ID"""
    test_file_content = b"Test content"
    
    response = client.post(
        "/submissions/",
        data={
            "scheme_name": "Test Scheme",
            "catchment": "SOLENT",
            "location": "Test Location",
            "unit_type": "nitrate",
            "total_tonnage": 50.0,
            "submitter_account_id": 999  # Non-existent account
        },
        files={"file": ("test.pdf", test_file_content, "application/pdf")}
    )
    
    assert response.status_code == 404
    assert "Submitter account not found" in response.json()["detail"]


def test_create_submission_invalid_unit_type(client, test_db, test_account):
    """Test submission with invalid unit_type"""
    test_file_content = b"Test content"
    
    response = client.post(
        "/submissions/",
        data={
            "scheme_name": "Test Scheme",
            "catchment": "SOLENT",
            "location": "Test Location",
            "unit_type": "invalid",  # Invalid unit type
            "total_tonnage": 50.0,
            "submitter_account_id": test_account
        },
        files={"file": ("test.pdf", test_file_content, "application/pdf")}
    )
    
    assert response.status_code == 400
    assert "unit_type must be 'nitrate' or 'phosphate'" in response.json()["detail"]


def test_create_submission_invalid_catchment(client, test_db, test_account):
    """Test submission with invalid catchment"""
    test_file_content = b"Test content"
    
    response = client.post(
        "/submissions/",
        data={
            "scheme_name": "Test Scheme",
            "catchment": "INVALID",  # Invalid catchment
            "location": "Test Location",
            "unit_type": "nitrate",
            "total_tonnage": 50.0,
            "submitter_account_id": test_account
        },
        files={"file": ("test.pdf", test_file_content, "application/pdf")}
    )
    
    assert response.status_code == 400
    assert "Invalid catchment" in response.json()["detail"]


def test_create_submission_negative_tonnage(client, test_db, test_account):
    """Test submission with negative tonnage"""
    test_file_content = b"Test content"
    
    response = client.post(
        "/submissions/",
        data={
            "scheme_name": "Test Scheme",
            "catchment": "SOLENT",
            "location": "Test Location",
            "unit_type": "nitrate",
            "total_tonnage": -10.0,  # Negative tonnage
            "submitter_account_id": test_account
        },
        files={"file": ("test.pdf", test_file_content, "application/pdf")}
    )
    
    assert response.status_code == 400
    assert "total_tonnage must be greater than 0" in response.json()["detail"]

