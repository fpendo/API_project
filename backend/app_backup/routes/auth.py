from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db import SessionLocal
from ..models import Account

router = APIRouter()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class MockLoginRequest(BaseModel):
    account_id: int


class MockLoginResponse(BaseModel):
    account_id: int
    name: str
    role: str
    evm_address: str | None = None


@router.post("/mock-login", response_model=MockLoginResponse)
def mock_login(request: MockLoginRequest, db: Session = Depends(get_db)):
    """Mock login endpoint - returns account info based on account_id"""
    account = db.query(Account).filter(Account.id == request.account_id).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return MockLoginResponse(
        account_id=account.id,
        name=account.name,
        role=account.role.value,
        evm_address=account.evm_address
    )

