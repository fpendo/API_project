import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, MagicMock
from backend.app.db import Base
from backend.app.models import Account, Scheme, PlanningApplication, PlanningApplicationScheme, AccountRole
from backend.app.main import app


@pytest.fixture
def test_db():
    """Create a file-based SQLite database for testing"""
    engine = create_engine("sqlite:///./test_planning_app.db", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Override the get_db dependency
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    from backend.app.routes import developer
    app.dependency_overrides[developer.get_db] = override_get_db
    
    try:
        yield TestingSessionLocal
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
        import time
        time.sleep(0.1)
        if os.path.exists("./test_planning_app.db"):
            try:
                os.remove("./test_planning_app.db")
            except PermissionError:
                pass


@pytest.fixture
def client(test_db):
    """Create a test client"""
    return TestClient(app)


@pytest.fixture
def test_developer(test_db):
    """Create a test developer account"""
    session = test_db()
    developer = Account(
        name="Test Developer",
        role=AccountRole.DEVELOPER,
        evm_address="0x3333333333333333333333333333333333333333"
    )
    session.add(developer)
    session.commit()
    account_id = developer.id
    session.close()
    return account_id


@pytest.fixture
def test_schemes(test_db, test_developer):
    """Create test schemes in SOLENT catchment"""
    session = test_db()
    
    # Use unique nft_token_ids to avoid conflicts
    import random
    nft_id1 = random.randint(1000, 9999)
    nft_id2 = random.randint(1000, 9999)
    while nft_id2 == nft_id1:
        nft_id2 = random.randint(1000, 9999)
    
    scheme1 = Scheme(
        nft_token_id=nft_id1,
        name="Solent Scheme A",
        catchment="SOLENT",
        location="Location A",
        unit_type="nitrate",
        original_tonnage=50.0,
        remaining_tonnage=50.0,
        created_by_account_id=test_developer
    )
    
    scheme2 = Scheme(
        nft_token_id=nft_id2,
        name="Solent Scheme B",
        catchment="SOLENT",
        location="Location B",
        unit_type="nitrate",
        original_tonnage=30.0,
        remaining_tonnage=30.0,
        created_by_account_id=test_developer
    )
    
    session.add(scheme1)
    session.add(scheme2)
    session.commit()
    scheme_ids = [scheme1.id, scheme2.id]
    session.close()
    return scheme_ids


@patch.dict(os.environ, {
    "SCHEME_CREDITS_CONTRACT_ADDRESS": "0x1111111111111111111111111111111111111111",
    "PLANNING_LOCK_CONTRACT_ADDRESS": "0x2222222222222222222222222222222222222222",
    "DEVELOPER_PRIVATE_KEY": "0x" + "3" * 64,
    "RPC_URL": "http://127.0.0.1:8545"
})
@patch('backend.app.services.planning_application.Web3')
@patch('backend.app.routes.developer.get_account_credits_summary')
def test_create_planning_application_success(mock_get_holdings, mock_web3_class, client, test_db, test_developer, test_schemes):
    """Test creating a planning application with known holdings"""
    # Mock holdings: scheme 1 = 50 tonnes, scheme 2 = 30 tonnes
    mock_get_holdings.return_value = [
        {"scheme_id": 1, "scheme_name": "Solent Scheme A", "catchment": "SOLENT", "unit_type": "nitrate", "credits": 5000000, "tonnes": 50.0},
        {"scheme_id": 2, "scheme_name": "Solent Scheme B", "catchment": "SOLENT", "unit_type": "nitrate", "credits": 3000000, "tonnes": 30.0}
    ]
    
    # Mock Web3 and contract
    mock_w3 = MagicMock()
    mock_w3.is_connected.return_value = True
    mock_w3.keccak.return_value = b'\x00' * 32  # Mock hash
    mock_w3.eth.gas_price = 1000000000  # 1 gwei
    
    # Mock account
    mock_account = MagicMock()
    mock_account.address = "0x3333333333333333333333333333333333333333"
    mock_w3.eth.account.from_key.return_value = mock_account
    mock_w3.eth.get_transaction_count.return_value = 0
    
    # Mock transaction receipt
    mock_receipt = MagicMock()
    mock_receipt.status = 1  # Success
    
    # Mock signed transaction
    mock_signed_txn = MagicMock()
    mock_signed_txn.rawTransaction = b'fake_tx'
    mock_w3.eth.account.sign_transaction.return_value = mock_signed_txn
    
    # Mock send and wait
    mock_w3.eth.send_raw_transaction.return_value = b'fake_hash'
    mock_w3.eth.wait_for_transaction_receipt.return_value = mock_receipt
    
    # Mock contract
    mock_contract = MagicMock()
    mock_function = MagicMock()
    mock_function.call.return_value = 1  # Application ID
    mock_function.build_transaction.return_value = {'from': mock_account.address, 'nonce': 0}
    mock_contract.functions.submitApplication.return_value = mock_function
    mock_w3.eth.contract.return_value = mock_contract
    
    mock_web3_class.return_value = mock_w3
    
    response = client.post(
        "/developer/planning-applications",
        json={
            "developer_account_id": test_developer,
            "catchment": "SOLENT",
            "unit_type": "nitrate",
            "required_tonnage": 60.0,
            "planning_reference": "PL/2024/001"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["developer_account_id"] == test_developer
    assert data["catchment"] == "SOLENT"
    assert data["unit_type"] == "nitrate"
    assert data["required_tonnage"] == 60.0
    assert data["planning_reference"] == "PL/2024/001"
    assert data["status"] == "PENDING"
    assert data["application_token"] is not None
    assert len(data["application_token"]) > 0
    assert data["qr_code_data_url"] is not None
    
    # Check schemes were allocated correctly
    assert len(data["schemes"]) == 2
    
    # Should allocate 50 tonnes from scheme 1 and 10 tonnes from scheme 2
    scheme1_alloc = next(s for s in data["schemes"] if s["scheme_id"] == 1)
    scheme2_alloc = next(s for s in data["schemes"] if s["scheme_id"] == 2)
    
    assert scheme1_alloc["tonnes_allocated"] == 50.0
    assert scheme1_alloc["credits_allocated"] == 5000000
    
    assert scheme2_alloc["tonnes_allocated"] == 10.0
    assert scheme2_alloc["credits_allocated"] == 1000000
    
    # Verify DB records
    session = test_db()
    app_record = session.query(PlanningApplication).filter(PlanningApplication.id == data["id"]).first()
    assert app_record is not None
    assert app_record.on_chain_application_id == 1
    
    scheme_records = session.query(PlanningApplicationScheme).filter(
        PlanningApplicationScheme.application_id == data["id"]
    ).all()
    assert len(scheme_records) == 2
    session.close()


@patch.dict(os.environ, {
    "SCHEME_CREDITS_CONTRACT_ADDRESS": "0x1111111111111111111111111111111111111111",
    "RPC_URL": "http://127.0.0.1:8545"
})
@patch('backend.app.routes.developer.get_account_credits_summary')
def test_create_planning_application_insufficient_holdings(mock_get_holdings, client, test_db, test_developer):
    """Test creating planning application with insufficient holdings"""
    # Mock holdings: only 30 tonnes available
    mock_get_holdings.return_value = [
        {"scheme_id": 1, "scheme_name": "Solent Scheme", "catchment": "SOLENT", "unit_type": "nitrate", "credits": 3000000, "tonnes": 30.0}
    ]
    
    response = client.post(
        "/developer/planning-applications",
        json={
            "developer_account_id": test_developer,
            "catchment": "SOLENT",
            "unit_type": "nitrate",
            "required_tonnage": 50.0
        }
    )
    
    assert response.status_code == 400
    assert "Insufficient holdings" in response.json()["detail"]


@patch.dict(os.environ, {
    "SCHEME_CREDITS_CONTRACT_ADDRESS": "0x1111111111111111111111111111111111111111",
    "RPC_URL": "http://127.0.0.1:8545"
})
@patch('backend.app.routes.developer.get_account_credits_summary')
def test_create_planning_application_no_holdings(mock_get_holdings, client, test_db, test_developer):
    """Test creating planning application with no matching holdings"""
    # Mock no holdings
    mock_get_holdings.return_value = []
    
    response = client.post(
        "/developer/planning-applications",
        json={
            "developer_account_id": test_developer,
            "catchment": "SOLENT",
            "unit_type": "nitrate",
            "required_tonnage": 10.0
        }
    )
    
    assert response.status_code == 400
    assert "No holdings found" in response.json()["detail"]


def test_create_planning_application_no_evm_address(client, test_db):
    """Test creating planning application for account without EVM address"""
    session = test_db()
    developer = Account(
        name="No EVM Developer",
        role=AccountRole.DEVELOPER,
        evm_address=None
    )
    session.add(developer)
    session.commit()
    account_id = developer.id
    session.close()
    
    response = client.post(
        "/developer/planning-applications",
        json={
            "developer_account_id": account_id,
            "catchment": "SOLENT",
            "unit_type": "nitrate",
            "required_tonnage": 10.0
        }
    )
    
    assert response.status_code == 400
    assert "EVM address" in response.json()["detail"]


@patch.dict(os.environ, {
    "SCHEME_CREDITS_CONTRACT_ADDRESS": "0x1111111111111111111111111111111111111111",
    "RPC_URL": "http://127.0.0.1:8545"
})
@patch('backend.app.routes.developer.get_account_credits_summary')
def test_create_planning_application_without_on_chain_config(mock_get_holdings, client, test_db, test_developer):
    """Test creating planning application without PlanningLock contract config (should still work)"""
    # Mock holdings
    mock_get_holdings.return_value = [
        {"scheme_id": 1, "scheme_name": "Solent Scheme", "catchment": "SOLENT", "unit_type": "nitrate", "credits": 1000000, "tonnes": 10.0}
    ]
    
    response = client.post(
        "/developer/planning-applications",
        json={
            "developer_account_id": test_developer,
            "catchment": "SOLENT",
            "unit_type": "nitrate",
            "required_tonnage": 5.0
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["on_chain_application_id"] is None  # No on-chain submission
    assert data["application_token"] is not None  # Token still generated

