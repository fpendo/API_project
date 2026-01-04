import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.db import Base
from backend.app.models import Account, SchemeSubmission, AccountRole, SubmissionStatus
from backend.app.main import app


@pytest.fixture
def test_db():
    """Create a file-based SQLite database for testing"""
    engine = create_engine("sqlite:///./test_regulator.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Override the get_db dependency
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    from backend.app.routes import regulator
    app.dependency_overrides[regulator.get_db] = override_get_db
    
    try:
        yield TestingSessionLocal
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
        import time
        time.sleep(0.1)
        if os.path.exists("./test_regulator.db"):
            try:
                os.remove("./test_regulator.db")
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


def test_list_pending_submissions(client, test_db, test_account):
    """Test listing only pending submissions"""
    session = test_db()
    
    # Create 2 pending submissions
    pending1 = SchemeSubmission(
        submitter_account_id=test_account,
        scheme_name="Pending Scheme 1",
        catchment="SOLENT",
        location="Location 1",
        land_parcel_number="1a",
        unit_type="nitrate",
        total_tonnage=50.0,
        file_path="archive/test1.pdf",
        status=SubmissionStatus.PENDING_REVIEW
    )
    
    pending2 = SchemeSubmission(
        submitter_account_id=test_account,
        scheme_name="Pending Scheme 2",
        catchment="THAMES",
        location="Location 2",
        land_parcel_number="2b",
        unit_type="phosphate",
        total_tonnage=25.0,
        file_path="archive/test2.pdf",
        status=SubmissionStatus.PENDING_REVIEW
    )
    
    # Create 1 rejected submission
    rejected = SchemeSubmission(
        submitter_account_id=test_account,
        scheme_name="Rejected Scheme",
        catchment="SEVERN",
        location="Location 3",
        land_parcel_number="3c",
        unit_type="nitrate",
        total_tonnage=30.0,
        file_path="archive/test3.pdf",
        status=SubmissionStatus.REJECTED
    )
    
    session.add(pending1)
    session.add(pending2)
    session.add(rejected)
    session.commit()
    
    # Get IDs before closing session
    pending1_id = pending1.id
    pending2_id = pending2.id
    rejected_id = rejected.id
    
    session.close()
    
    # Call endpoint with status filter
    response = client.get("/regulator/submissions?status=PENDING_REVIEW")
    
    assert response.status_code == 200
    data = response.json()
    
    # Should only return 2 pending submissions
    assert len(data) == 2
    
    # Verify they are both pending
    returned_ids = [s["id"] for s in data]
    assert pending1_id in returned_ids
    assert pending2_id in returned_ids
    assert rejected_id not in returned_ids
    
    for submission in data:
        assert submission["status"] == "PENDING_REVIEW"
    
    # Verify details
    scheme_names = [s["scheme_name"] for s in data]
    assert "Pending Scheme 1" in scheme_names
    assert "Pending Scheme 2" in scheme_names
    assert "Rejected Scheme" not in scheme_names


def test_list_all_submissions(client, test_db, test_account):
    """Test listing all submissions without status filter"""
    session = test_db()
    
    # Create submissions with different statuses
    pending = SchemeSubmission(
        submitter_account_id=test_account,
        scheme_name="Pending",
        catchment="SOLENT",
        location="Loc 1",
        land_parcel_number="1a",
        unit_type="nitrate",
        total_tonnage=50.0,
        file_path="archive/test1.pdf",
        status=SubmissionStatus.PENDING_REVIEW
    )
    
    approved = SchemeSubmission(
        submitter_account_id=test_account,
        scheme_name="Approved",
        catchment="THAMES",
        location="Loc 2",
        land_parcel_number="2b",
        unit_type="phosphate",
        total_tonnage=25.0,
        file_path="archive/test2.pdf",
        status=SubmissionStatus.APPROVED
    )
    
    session.add(pending)
    session.add(approved)
    session.commit()
    session.close()
    
    # Call endpoint without status filter
    response = client.get("/regulator/submissions")
    
    assert response.status_code == 200
    data = response.json()
    
    # Should return both submissions
    assert len(data) == 2
    
    # Verify both are included
    scheme_names = [s["scheme_name"] for s in data]
    assert "Pending" in scheme_names
    assert "Approved" in scheme_names


def test_list_approved_submissions(client, test_db, test_account):
    """Test listing only approved submissions"""
    session = test_db()
    
    # Create submissions
    pending = SchemeSubmission(
            submitter_account_id=test_account,
            scheme_name="Pending",
            catchment="SOLENT",
            location="Loc 1",
            land_parcel_number="1a",
            unit_type="nitrate",
            total_tonnage=50.0,
            file_path="archive/test1.pdf",
            status=SubmissionStatus.PENDING_REVIEW
        )
        
        approved = SchemeSubmission(
            submitter_account_id=test_account,
            scheme_name="Approved",
            catchment="THAMES",
            location="Loc 2",
            land_parcel_number="2b",
            unit_type="phosphate",
            total_tonnage=25.0,
            file_path="archive/test2.pdf",
            status=SubmissionStatus.APPROVED
        )
    
    session.add(pending)
    session.add(approved)
    session.commit()
    session.close()
    
    # Call endpoint with APPROVED status filter
    response = client.get("/regulator/submissions?status=APPROVED")
    
    assert response.status_code == 200
    data = response.json()
    
    # Should only return 1 approved submission
    assert len(data) == 1
    assert data[0]["status"] == "APPROVED"
    assert data[0]["scheme_name"] == "Approved"


def test_list_submissions_invalid_status(client, test_db, test_account):
    """Test listing with invalid status returns empty list"""
    session = test_db()
    
    # Create a submission
        submission = SchemeSubmission(
            submitter_account_id=test_account,
            scheme_name="Test",
            catchment="SOLENT",
            location="Loc 1",
            land_parcel_number="1a",
            unit_type="nitrate",
            total_tonnage=50.0,
            file_path="archive/test.pdf",
            status=SubmissionStatus.PENDING_REVIEW
        )
    
    session.add(submission)
    session.commit()
    session.close()
    
    # Call endpoint with invalid status
    response = client.get("/regulator/submissions?status=INVALID_STATUS")
    
    assert response.status_code == 200
    data = response.json()
    
    # Should return empty list
    assert len(data) == 0


def test_approve_submission(client, test_db, test_account):
    """Test approving a pending submission"""
    session = test_db()
    
    # Create a pending submission
        submission = SchemeSubmission(
            submitter_account_id=test_account,
            scheme_name="Test Scheme",
            catchment="SOLENT",
            location="Test Location",
            land_parcel_number="1a",
            unit_type="nitrate",
            total_tonnage=50.0,
            file_path="archive/test.pdf",
            status=SubmissionStatus.PENDING_REVIEW
        )
    
    session.add(submission)
    session.commit()
    submission_id = submission.id
    session.close()
    
    # Approve the submission
    response = client.post(f"/regulator/submissions/{submission_id}/approve")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["id"] == submission_id
    assert data["status"] == "APPROVED"
    assert data["scheme_name"] == "Test Scheme"
    
    # Verify in database
    session = test_db()
    updated_submission = session.query(SchemeSubmission).filter(SchemeSubmission.id == submission_id).first()
    assert updated_submission.status == SubmissionStatus.APPROVED
    session.close()


def test_decline_submission(client, test_db, test_account):
    """Test declining a pending submission"""
    session = test_db()
    
    # Create a pending submission
        submission = SchemeSubmission(
            submitter_account_id=test_account,
            scheme_name="Test Scheme",
            catchment="SOLENT",
            location="Test Location",
            land_parcel_number="1a",
            unit_type="nitrate",
            total_tonnage=50.0,
            file_path="archive/test.pdf",
            status=SubmissionStatus.PENDING_REVIEW
        )
    
    session.add(submission)
    session.commit()
    submission_id = submission.id
    session.close()
    
    # Decline the submission
    response = client.post(f"/regulator/submissions/{submission_id}/decline")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["id"] == submission_id
    assert data["status"] == "REJECTED"
    assert data["scheme_name"] == "Test Scheme"
    
    # Verify in database
    session = test_db()
    updated_submission = session.query(SchemeSubmission).filter(SchemeSubmission.id == submission_id).first()
    assert updated_submission.status == SubmissionStatus.REJECTED
    session.close()


def test_approve_non_pending_submission(client, test_db, test_account):
    """Test that approving a non-pending submission fails"""
    session = test_db()
    
    # Create an already approved submission
        submission = SchemeSubmission(
            submitter_account_id=test_account,
            scheme_name="Already Approved",
            catchment="SOLENT",
            location="Test Location",
            land_parcel_number="1a",
            unit_type="nitrate",
            total_tonnage=50.0,
            file_path="archive/test.pdf",
            status=SubmissionStatus.APPROVED
        )
    
    session.add(submission)
    session.commit()
    submission_id = submission.id
    session.close()
    
    # Try to approve it again
    response = client.post(f"/regulator/submissions/{submission_id}/approve")
    
    assert response.status_code == 400
    assert "Cannot approve" in response.json()["detail"]


def test_decline_non_pending_submission(client, test_db, test_account):
    """Test that declining a non-pending submission fails"""
    session = test_db()
    
    # Create an already rejected submission
        submission = SchemeSubmission(
            submitter_account_id=test_account,
            scheme_name="Already Rejected",
            catchment="SOLENT",
            location="Test Location",
            land_parcel_number="1a",
            unit_type="nitrate",
            total_tonnage=50.0,
            file_path="archive/test.pdf",
            status=SubmissionStatus.REJECTED
        )
    
    session.add(submission)
    session.commit()
    submission_id = submission.id
    session.close()
    
    # Try to decline it again
    response = client.post(f"/regulator/submissions/{submission_id}/decline")
    
    assert response.status_code == 400
    assert "Cannot decline" in response.json()["detail"]


def test_approve_nonexistent_submission(client, test_db):
    """Test that approving a non-existent submission returns 404"""
    response = client.post("/regulator/submissions/999/approve")
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_decline_nonexistent_submission(client, test_db):
    """Test that declining a non-existent submission returns 404"""
    response = client.post("/regulator/submissions/999/decline")
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

