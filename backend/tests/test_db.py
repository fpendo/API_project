import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.models import Account, SchemeSubmission, AccountRole, SubmissionStatus


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_create_account(db_session):
    """Test creating and reading an Account"""
    account = Account(
        name="Test Landowner",
        role=AccountRole.LANDOWNER,
        evm_address="0x1234567890123456789012345678901234567890"
    )
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)

    assert account.id is not None
    assert account.name == "Test Landowner"
    assert account.role == AccountRole.LANDOWNER
    assert account.evm_address == "0x1234567890123456789012345678901234567890"


def test_create_scheme_submission(db_session):
    """Test creating and reading a SchemeSubmission"""
    # First create an account
    account = Account(
        name="Test Landowner",
        role=AccountRole.LANDOWNER,
        evm_address="0x1234567890123456789012345678901234567890"
    )
    db_session.add(account)
    db_session.commit()

    # Create a submission
    submission = SchemeSubmission(
        submitter_account_id=account.id,
        scheme_name="Solent Wetland Scheme A",
        catchment="SOLENT",
        location="Solent marshes - parcel 7",
        land_parcel_number="7a",
        unit_type="nitrate",
        total_tonnage=50.0,
        file_path="/archive/raw_submissions/submission_1.pdf",
        status=SubmissionStatus.PENDING_REVIEW
    )
    db_session.add(submission)
    db_session.commit()
    db_session.refresh(submission)

    assert submission.id is not None
    assert submission.scheme_name == "Solent Wetland Scheme A"
    assert submission.catchment == "SOLENT"
    assert submission.unit_type == "nitrate"
    assert submission.total_tonnage == 50.0
    assert submission.status == SubmissionStatus.PENDING_REVIEW
    assert submission.submitter_account_id == account.id


def test_read_back_account_and_submission(db_session):
    """Test inserting and reading back Account and SchemeSubmission"""
    # Create account
    account = Account(
        name="Test Developer",
        role=AccountRole.DEVELOPER,
        evm_address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    )
    db_session.add(account)
    db_session.commit()

    # Create submission
    submission = SchemeSubmission(
        submitter_account_id=account.id,
        scheme_name="Test Scheme",
        catchment="THAMES",
        location="Test Location",
        land_parcel_number="1b",
        unit_type="phosphate",
        total_tonnage=25.5,
        file_path="/archive/test.pdf"
    )
    db_session.add(submission)
    db_session.commit()

    # Read back
    retrieved_account = db_session.query(Account).filter(Account.id == account.id).first()
    retrieved_submission = db_session.query(SchemeSubmission).filter(
        SchemeSubmission.id == submission.id
    ).first()

    assert retrieved_account is not None
    assert retrieved_account.name == "Test Developer"
    assert retrieved_account.role == AccountRole.DEVELOPER

    assert retrieved_submission is not None
    assert retrieved_submission.scheme_name == "Test Scheme"
    assert retrieved_submission.catchment == "THAMES"
    assert retrieved_submission.unit_type == "phosphate"
    assert retrieved_submission.total_tonnage == 25.5
    assert retrieved_submission.submitter_account_id == account.id

