import pytest
import os
from unittest.mock import patch, MagicMock
import os as os_module
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.db import Base
from backend.app.models import Account, SchemeSubmission, Scheme, AccountRole, SubmissionStatus
from backend.app.main import app
from backend.app.services.nft_integration import mint_scheme_nft


@pytest.fixture
def test_db():
    """Create a file-based SQLite database for testing"""
    engine = create_engine("sqlite:///./test_nft.db", connect_args={"check_same_thread": False})
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
        if os.path.exists("./test_nft.db"):
            try:
                os.remove("./test_nft.db")
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


def test_mint_scheme_nft_mock():
    """Test mint_scheme_nft with mocked web3"""
    from backend.app.models import SchemeSubmission, SubmissionStatus
    
    # Create a mock submission
    submission = MagicMock(spec=SchemeSubmission)
    submission.scheme_name = "Test Scheme"
    submission.catchment = "SOLENT"
    submission.location = "Test Location"
    submission.total_tonnage = 50.0
    
    mock_token_id = 1
    mock_ipfs_cid = "QmTest123"
    mock_contract_address = "0x1234567890123456789012345678901234567890"
    mock_private_key = "0x" + "1" * 64
    
    # Mock web3 components
    with patch('backend.app.services.nft_integration.Web3') as mock_web3_class:
        mock_w3 = MagicMock()
        mock_w3.is_connected.return_value = True
        mock_w3.eth.account.from_key.return_value.address = "0xRegulatorAddress"
        mock_w3.eth.get_transaction_count.return_value = 0
        mock_w3.eth.gas_price = 1000000000
        mock_w3.eth.send_raw_transaction.return_value = b"tx_hash"
        
        # Mock transaction receipt
        mock_receipt = MagicMock()
        mock_receipt.status = 1
        
        # Mock Transfer event
        mock_event = MagicMock()
        mock_event.args = {
            'from': '0x0000000000000000000000000000000000000000',
            'to': '0xRegulatorAddress',
            'tokenId': mock_token_id
        }
        
        mock_contract = MagicMock()
        mock_contract.events.Transfer.return_value.process_receipt.return_value = [mock_event]
        mock_contract.functions.mintScheme.return_value.build_transaction.return_value = {}
        
        mock_w3.eth.contract.return_value = mock_contract
        mock_w3.eth.wait_for_transaction_receipt.return_value = mock_receipt
        mock_w3.eth.account.sign_transaction.return_value.rawTransaction = b"signed_tx"
        
        mock_web3_class.return_value = mock_w3
        mock_web3_class.HTTPProvider.return_value = None
        
        # Call mint_scheme_nft
        token_id = mint_scheme_nft(
            submission=submission,
            ipfs_cid=mock_ipfs_cid,
            scheme_nft_address=mock_contract_address,
            private_key=mock_private_key
        )
        
        assert token_id == mock_token_id


def test_approve_submission_creates_scheme(client, test_db, test_account):
    """Test that approving a submission creates a Scheme record with NFT token ID"""
    session = test_db()
    
    # Create a test file
    test_file_content = b"Test PDF content"
    test_file_path = "archive/test_submission.pdf"
    os.makedirs("archive", exist_ok=True)
    with open(test_file_path, "wb") as f:
        f.write(test_file_content)
    
    # Create a pending submission
    submission = SchemeSubmission(
        submitter_account_id=test_account,
        scheme_name="Test Scheme",
        catchment="SOLENT",
        location="Test Location",
        land_parcel_number="1a",
        unit_type="nitrate",
        total_tonnage=50.0,
        file_path=test_file_path,
        status=SubmissionStatus.PENDING_REVIEW
    )
    session.add(submission)
    session.commit()
    submission_id = submission.id
    session.close()
    
    # Mock IPFS and NFT minting
    mock_cid = "QmTestCID123456"
    mock_token_id = 1
    
    with patch('backend.app.services.submissions.pin_file_to_ipfs') as mock_pin, \
         patch('backend.app.services.submissions.mint_scheme_nft') as mock_mint:
        mock_pin.return_value = mock_cid
        mock_mint.return_value = mock_token_id
        
        # Set environment variables for NFT minting
        os_module.environ['SCHEME_NFT_CONTRACT_ADDRESS'] = '0x1234567890123456789012345678901234567890'
        os_module.environ['REGULATOR_PRIVATE_KEY'] = '0x' + '1' * 64
        
        # Approve the submission
        response = client.post(f"/regulator/submissions/{submission_id}/approve")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "APPROVED"
        
        # Verify Scheme was created
        session = test_db()
        scheme = session.query(Scheme).filter(
            Scheme.nft_token_id == mock_token_id
        ).first()
        
        assert scheme is not None
        assert scheme.nft_token_id == mock_token_id
        assert scheme.name == "Test Scheme"
        assert scheme.catchment == "SOLENT"
        assert scheme.location == "Test Location"
        assert scheme.unit_type == "nitrate"
        assert scheme.original_tonnage == 50.0
        assert scheme.created_by_account_id == test_account
        session.close()
        
        # Cleanup env vars
        del os_module.environ['SCHEME_NFT_CONTRACT_ADDRESS']
        del os_module.environ['REGULATOR_PRIVATE_KEY']
    
    # Cleanup
    if os.path.exists(test_file_path):
        os.remove(test_file_path)


def test_approve_submission_without_nft_config(client, test_db, test_account):
    """Test that approval works even without NFT configuration"""
    session = test_db()
    
    # Create a test file
    test_file_path = "archive/test_submission.pdf"
    os.makedirs("archive", exist_ok=True)
    with open(test_file_path, "wb") as f:
        f.write(b"Test content")
    
    # Create a pending submission
    submission = SchemeSubmission(
        submitter_account_id=test_account,
        scheme_name="Test Scheme",
        catchment="SOLENT",
        location="Test Location",
        land_parcel_number="1a",
        unit_type="nitrate",
        total_tonnage=50.0,
        file_path=test_file_path,
        status=SubmissionStatus.PENDING_REVIEW
    )
    session.add(submission)
    session.commit()
    submission_id = submission.id
    session.close()
    
    # Mock IPFS (no NFT config)
    mock_cid = "QmTestCID123456"
    
    with patch('backend.app.services.submissions.pin_file_to_ipfs') as mock_pin:
        mock_pin.return_value = mock_cid
        
        # Ensure no NFT env vars
        if 'SCHEME_NFT_CONTRACT_ADDRESS' in os_module.environ:
            del os_module.environ['SCHEME_NFT_CONTRACT_ADDRESS']
        if 'REGULATOR_PRIVATE_KEY' in os_module.environ:
            del os_module.environ['REGULATOR_PRIVATE_KEY']
        
        # Approve the submission
        response = client.post(f"/regulator/submissions/{submission_id}/approve")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "APPROVED"
        
        # Verify no Scheme was created (NFT not configured)
        session = test_db()
        schemes = session.query(Scheme).all()
        assert len(schemes) == 0
        session.close()
    
    # Cleanup
    if os.path.exists(test_file_path):
        os.remove(test_file_path)

