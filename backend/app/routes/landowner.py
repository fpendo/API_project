from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..db import SessionLocal
from ..models import Scheme, Notification, Account, BrokerMandate
from ..services.credits_integration import mint_scheme_credits
from ..services.exchange import transfer_credits_on_chain, get_scheme_credits_abi
import os
from sqlalchemy import func

router = APIRouter()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class RedeemRequest(BaseModel):
    claim_token: str
    landowner_account_id: int


class RedeemResponse(BaseModel):
    success: bool
    message: str
    scheme_id: int
    credits_minted: int


class NotificationResponse(BaseModel):
    id: int
    scheme_id: Optional[int]
    notification_type: str
    message: str
    claim_token: Optional[str]
    is_read: int
    is_used: int
    created_at: str

    model_config = {"from_attributes": True}


@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    account_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all notifications for a landowner account.
    """
    notifications = db.query(Notification).filter(
        Notification.account_id == account_id
    ).order_by(Notification.created_at.desc()).all()
    
    return [
        NotificationResponse(
            id=n.id,
            scheme_id=n.scheme_id,
            notification_type=n.notification_type,
            message=n.message,
            claim_token=n.claim_token,
            is_read=n.is_read,
            is_used=n.is_used,
            created_at=n.created_at.isoformat() if n.created_at else ""
        )
        for n in notifications
    ]


@router.post("/notifications/{notification_id}/mark-read")
def mark_notification_read(
    notification_id: int,
    account_id: int = Query(..., description="Account ID of the notification owner"),
    db: Session = Depends(get_db)
):
    """
    Mark a notification as read.
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.account_id == account_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = 1
    db.commit()
    
    return {"success": True, "message": "Notification marked as read"}


@router.post("/redeem-scheme", response_model=RedeemResponse)
def redeem_scheme(request: RedeemRequest, db: Session = Depends(get_db)):
    """
    Redeem a scheme NFT to receive ERC-1155 credits on-chain.
    
    Validates the claim token, loads the scheme, computes credit units,
    and calls SchemeCredits.mintCredits via web3.
    """
    # Find notification with claim token
    notification = db.query(Notification).filter(
        Notification.claim_token == request.claim_token,
        Notification.notification_type == "REDEEM_TO_CREDITS"
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Invalid or not found claim token")
    
    if notification.is_used == 1:
        raise HTTPException(status_code=400, detail="Claim token has already been used")
    
    # Verify landowner account
    landowner = db.query(Account).filter(Account.id == request.landowner_account_id).first()
    if not landowner:
        raise HTTPException(status_code=404, detail="Landowner account not found")
    
    if landowner.id != notification.account_id:
        raise HTTPException(status_code=403, detail="Claim token does not belong to this account")
    
    if not landowner.evm_address:
        raise HTTPException(status_code=400, detail="Landowner account does not have an EVM address")
    
    # Load scheme
    scheme = db.query(Scheme).filter(Scheme.id == notification.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    # Get contract addresses and keys from environment
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address or not regulator_private_key:
        raise HTTPException(
            status_code=500,
            detail="Blockchain configuration missing. SCHEME_CREDITS_CONTRACT_ADDRESS and REGULATOR_PRIVATE_KEY must be set."
        )
    
    # Compute credits: 1 tonne = 100,000 credits
    credits_amount = int(scheme.original_tonnage * 100000)
    
    # Mint credits on-chain
    try:
        mint_scheme_credits(
            scheme_id=scheme.nft_token_id,
            landowner_address=landowner.evm_address,
            original_tonnage=scheme.original_tonnage,
            scheme_credits_address=scheme_credits_address,
            private_key=regulator_private_key,
            rpc_url=rpc_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mint credits on-chain: {str(e)}")
    
    # Mark notification as used
    notification.is_used = 1
    db.commit()
    
    return RedeemResponse(
        success=True,
        message=f"Successfully redeemed scheme '{scheme.name}' and minted {credits_amount} credits",
        scheme_id=scheme.nft_token_id,
        credits_minted=credits_amount
    )


class AssignToBrokerRequest(BaseModel):
    landowner_account_id: int
    broker_account_id: int
    scheme_id: int  # Scheme ID to assign credits from
    credits_amount: int
    fee_percentage: float = 5.0  # Fixed at 5%


class AssignToBrokerResponse(BaseModel):
    success: bool
    message: str
    mandate_id: int
    fee_amount: int


class RecallFromBrokerRequest(BaseModel):
    mandate_id: int
    landowner_account_id: int


class RecallFromBrokerResponse(BaseModel):
    success: bool
    message: str
    transaction_hash: str


class BrokerMandateItem(BaseModel):
    mandate_id: int
    broker_id: int
    broker_name: str
    scheme_id: int
    scheme_name: str
    catchment: str
    unit_type: str
    total_credits: int
    client_credits: int
    fee_credits: int
    fee_percentage: float
    is_active: bool
    is_recalled: bool
    created_at: str
    recalled_at: Optional[str]
    fee_transaction_hash: Optional[str]
    client_transaction_hash: Optional[str]
    recall_transaction_hash: Optional[str]


class LandownerMandatesResponse(BaseModel):
    landowner_account_id: int
    mandates: List[BrokerMandateItem]


class TransferToTradingAccountRequest(BaseModel):
    landowner_account_id: int
    scheme_id: int
    credits_amount: int
    trading_account_address: str  # EVM address of trading account


@router.post("/assign-to-broker", response_model=AssignToBrokerResponse)
def assign_to_broker(request: AssignToBrokerRequest, db: Session = Depends(get_db)):
    """
    Assign credits to a broker with a mandate agreement.
    Transfers credits on-chain to broker and house addresses, then creates a BrokerMandate record.
    """
    import traceback
    from web3 import Web3
    
    print(f"[ASSIGN_TO_BROKER] Starting assignment: landowner_id={request.landowner_account_id}, broker_id={request.broker_account_id}, scheme_id={request.scheme_id}, credits={request.credits_amount}")
    
    try:
        # Validate landowner account
        print(f"[ASSIGN_TO_BROKER] Validating landowner account {request.landowner_account_id}")
        landowner = db.query(Account).filter(Account.id == request.landowner_account_id).first()
        if not landowner:
            print(f"[ASSIGN_TO_BROKER] ERROR: Landowner account {request.landowner_account_id} not found")
            raise HTTPException(status_code=404, detail="Landowner account not found")
        
        if not landowner.evm_address:
            print(f"[ASSIGN_TO_BROKER] ERROR: Landowner account {request.landowner_account_id} has no EVM address")
            raise HTTPException(status_code=400, detail="Landowner account does not have an EVM address")
        
        print(f"[ASSIGN_TO_BROKER] Landowner validated: {landowner.name}, EVM: {landowner.evm_address}")
        
        # Validate broker account
        print(f"[ASSIGN_TO_BROKER] Validating broker account {request.broker_account_id}")
        broker = db.query(Account).filter(Account.id == request.broker_account_id).first()
        if not broker:
            print(f"[ASSIGN_TO_BROKER] ERROR: Broker account {request.broker_account_id} not found")
            raise HTTPException(status_code=404, detail="Broker account not found")
        
        if broker.role.value != "BROKER":
            print(f"[ASSIGN_TO_BROKER] ERROR: Account {request.broker_account_id} is not a broker (role: {broker.role.value})")
            raise HTTPException(status_code=400, detail="Account is not a broker")
        
        if not broker.evm_address:
            print(f"[ASSIGN_TO_BROKER] ERROR: Broker account {request.broker_account_id} has no EVM address")
            raise HTTPException(status_code=400, detail="Broker account does not have an EVM address")
        
        print(f"[ASSIGN_TO_BROKER] Broker validated: {broker.name}, EVM: {broker.evm_address}")
        
        # Validate inputs
        print(f"[ASSIGN_TO_BROKER] Validating inputs: credits_amount={request.credits_amount}, fee_percentage={request.fee_percentage}")
        if request.credits_amount <= 0:
            print(f"[ASSIGN_TO_BROKER] ERROR: Invalid credits amount: {request.credits_amount}")
            raise HTTPException(status_code=400, detail="Credits amount must be greater than 0")
        
        if request.fee_percentage < 0 or request.fee_percentage > 100:
            print(f"[ASSIGN_TO_BROKER] ERROR: Invalid fee percentage: {request.fee_percentage}")
            raise HTTPException(status_code=400, detail="Fee percentage must be between 0 and 100")
        
        # Validate scheme
        print(f"[ASSIGN_TO_BROKER] Validating scheme {request.scheme_id}")
        scheme = db.query(Scheme).filter(Scheme.id == request.scheme_id).first()
        if not scheme:
            print(f"[ASSIGN_TO_BROKER] ERROR: Scheme {request.scheme_id} not found")
            raise HTTPException(status_code=404, detail="Scheme not found")
        
        print(f"[ASSIGN_TO_BROKER] Scheme validated: {scheme.name}, NFT token ID: {scheme.nft_token_id}")
        
        # Get contract addresses and keys from environment
        print(f"[ASSIGN_TO_BROKER] Loading environment variables")
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
        landowner_private_key = os.getenv("LANDOWNER_PRIVATE_KEY")
        house_address = os.getenv("BROKER_HOUSE_ADDRESS")
        rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
        
        print(f"[ASSIGN_TO_BROKER] Config check: scheme_credits_address={'set' if scheme_credits_address else 'NOT SET'}, house_address={'set' if house_address else 'NOT SET'}, landowner_key={'set' if landowner_private_key else 'NOT SET'}")
        
        if not scheme_credits_address:
            print(f"[ASSIGN_TO_BROKER] ERROR: SCHEME_CREDITS_CONTRACT_ADDRESS not set")
            raise HTTPException(
                status_code=500,
                detail="Blockchain configuration missing. SCHEME_CREDITS_CONTRACT_ADDRESS must be set."
            )
        
        if not landowner_private_key:
            # Fallback to REGULATOR_PRIVATE_KEY if LANDOWNER_PRIVATE_KEY not set
            print(f"[ASSIGN_TO_BROKER] LANDOWNER_PRIVATE_KEY not set, trying REGULATOR_PRIVATE_KEY")
            landowner_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
            if not landowner_private_key:
                print(f"[ASSIGN_TO_BROKER] ERROR: Both LANDOWNER_PRIVATE_KEY and REGULATOR_PRIVATE_KEY not set")
                raise HTTPException(
                    status_code=500,
                    detail="Blockchain configuration missing. LANDOWNER_PRIVATE_KEY or REGULATOR_PRIVATE_KEY must be set."
                )
        
        if not house_address:
            print(f"[ASSIGN_TO_BROKER] ERROR: BROKER_HOUSE_ADDRESS not set")
            raise HTTPException(
                status_code=500,
                detail="Blockchain configuration missing. BROKER_HOUSE_ADDRESS must be set."
            )
        
        print(f"[ASSIGN_TO_BROKER] Environment variables loaded successfully")
    
        # Verify landowner has sufficient credits for this scheme
        print(f"[ASSIGN_TO_BROKER] Checking landowner balance for scheme {scheme.nft_token_id}")
        try:
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            if not w3.is_connected():
                print(f"[ASSIGN_TO_BROKER] ERROR: Cannot connect to blockchain node at {rpc_url}")
                raise HTTPException(status_code=500, detail="Cannot connect to blockchain node")
            
            print(f"[ASSIGN_TO_BROKER] Connected to blockchain node")
            
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(scheme_credits_address),
                abi=get_scheme_credits_abi()
            )
            
            landowner_address = Web3.to_checksum_address(landowner.evm_address)
            print(f"[ASSIGN_TO_BROKER] Querying balance for {landowner_address}, token ID {scheme.nft_token_id}")
            
            total_balance = contract.functions.balanceOf(landowner_address, scheme.nft_token_id).call()
            locked_balance = contract.functions.lockedBalance(scheme.nft_token_id, landowner_address).call()
            available_credits = int(total_balance) - int(locked_balance)
            
            print(f"[ASSIGN_TO_BROKER] Balance check: total={total_balance}, locked={locked_balance}, available={available_credits}, requested={request.credits_amount}")
            
            if available_credits < request.credits_amount:
                print(f"[ASSIGN_TO_BROKER] ERROR: Insufficient credits")
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient credits. Available: {available_credits:,}, Requested: {request.credits_amount:,}"
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"[ASSIGN_TO_BROKER] ERROR checking balance: {str(e)}")
            print(f"[ASSIGN_TO_BROKER] Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to check landowner balance: {str(e)}")
    
        # Calculate fee amount and client credits
        fee_amount = int(request.credits_amount * (request.fee_percentage / 100.0))
        client_credits = request.credits_amount - fee_amount
        print(f"[ASSIGN_TO_BROKER] Calculated: fee={fee_amount}, client_credits={client_credits}")
        
        # Transfer fee to house address
        fee_tx_hash = None
        print(f"[ASSIGN_TO_BROKER] Transferring fee ({fee_amount} credits) to house address {house_address}")
        try:
            fee_tx_hash = transfer_credits_on_chain(
                seller_address=landowner.evm_address,
                buyer_address=house_address,
                scheme_id=scheme.nft_token_id,
                quantity_credits=fee_amount,
                seller_private_key=landowner_private_key,
                scheme_credits_address=scheme_credits_address,
                rpc_url=rpc_url
            )
            print(f"[ASSIGN_TO_BROKER] Fee transfer successful: tx_hash={fee_tx_hash}")
        except Exception as e:
            print(f"[ASSIGN_TO_BROKER] ERROR transferring fee: {str(e)}")
            print(f"[ASSIGN_TO_BROKER] Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to transfer fee to house address: {str(e)}")
        
        # Transfer client credits to broker address
        client_tx_hash = None
        print(f"[ASSIGN_TO_BROKER] Transferring client credits ({client_credits} credits) to broker address {broker.evm_address}")
        try:
            client_tx_hash = transfer_credits_on_chain(
                seller_address=landowner.evm_address,
                buyer_address=broker.evm_address,
                scheme_id=scheme.nft_token_id,
                quantity_credits=client_credits,
                seller_private_key=landowner_private_key,
                scheme_credits_address=scheme_credits_address,
                rpc_url=rpc_url
            )
            print(f"[ASSIGN_TO_BROKER] Client transfer successful: tx_hash={client_tx_hash}")
        except Exception as e:
            # If client transfer fails, we should ideally rollback the fee transfer
            # For now, we'll just raise an error and let the user handle it
            print(f"[ASSIGN_TO_BROKER] ERROR transferring client credits: {str(e)}")
            print(f"[ASSIGN_TO_BROKER] Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to transfer client credits to broker: {str(e)}. Fee transfer succeeded (tx: {fee_tx_hash})")
        
        # Create broker mandate with transaction hashes
        print(f"[ASSIGN_TO_BROKER] Creating broker mandate record")
        try:
            mandate = BrokerMandate(
                landowner_account_id=request.landowner_account_id,
                broker_account_id=request.broker_account_id,
                scheme_id=request.scheme_id,
                credits_amount=request.credits_amount,
                fee_percentage=request.fee_percentage,
                is_active=1,
                fee_transaction_hash=fee_tx_hash,
                client_transaction_hash=client_tx_hash,
                house_address=house_address,
                is_recalled=0
            )
            db.add(mandate)
            db.commit()
            db.refresh(mandate)
            print(f"[ASSIGN_TO_BROKER] Mandate created successfully: mandate_id={mandate.id}")
        except Exception as e:
            print(f"[ASSIGN_TO_BROKER] ERROR creating mandate: {str(e)}")
            print(f"[ASSIGN_TO_BROKER] Traceback: {traceback.format_exc()}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create broker mandate: {str(e)}")
        
        print(f"[ASSIGN_TO_BROKER] Assignment completed successfully")
        return AssignToBrokerResponse(
            success=True,
            message=f"Successfully assigned {request.credits_amount} credits from scheme '{scheme.name}' to broker. Fee: {fee_amount} credits ({request.fee_percentage}%)",
            mandate_id=mandate.id,
            fee_amount=fee_amount
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ASSIGN_TO_BROKER] UNEXPECTED ERROR: {str(e)}")
        print(f"[ASSIGN_TO_BROKER] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Unexpected error during assignment: {str(e)}")


class TransferToTradingAccountResponse(BaseModel):
    success: bool
    message: str
    transaction_hash: Optional[str] = None


@router.post("/transfer-to-trading-account", response_model=TransferToTradingAccountResponse)
def transfer_to_trading_account(request: TransferToTradingAccountRequest, db: Session = Depends(get_db)):
    """
    Transfer credits from landowner's holdings to their trading account.
    Performs on-chain transfer of credits.
    """
    # Validate landowner account
    landowner = db.query(Account).filter(Account.id == request.landowner_account_id).first()
    if not landowner:
        raise HTTPException(status_code=404, detail="Landowner account not found")
    
    if not landowner.evm_address:
        raise HTTPException(status_code=400, detail="Landowner account does not have an EVM address")
    
    # Validate inputs
    if request.credits_amount <= 0:
        raise HTTPException(status_code=400, detail="Credits amount must be greater than 0")
    
    # Validate scheme
    scheme = db.query(Scheme).filter(Scheme.id == request.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    # Validate trading account address format
    if not request.trading_account_address or len(request.trading_account_address) != 42 or not request.trading_account_address.startswith('0x'):
        raise HTTPException(status_code=400, detail="Invalid trading account address format")
    
    # Get contract addresses and keys from environment
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    landowner_private_key = os.getenv("LANDOWNER_PRIVATE_KEY")  # In production, this would be stored securely per account
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address:
        raise HTTPException(
            status_code=500,
            detail="Blockchain configuration missing. SCHEME_CREDITS_CONTRACT_ADDRESS must be set."
        )
    
    if not landowner_private_key:
        # Fallback to REGULATOR_PRIVATE_KEY if LANDOWNER_PRIVATE_KEY not set
        landowner_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
        if not landowner_private_key:
            raise HTTPException(
                status_code=500,
                detail="Blockchain configuration missing. LANDOWNER_PRIVATE_KEY or REGULATOR_PRIVATE_KEY must be set."
            )
    
    # Transfer credits on-chain
    try:
        # Verify the private key matches the landowner's address
        from web3 import Web3
        w3_temp = Web3(Web3.HTTPProvider(rpc_url))
        account_from_key = w3_temp.eth.account.from_key(landowner_private_key)
        
        # Use the address from the private key, not the database address
        # This ensures the transaction is signed by the correct account
        seller_address_from_key = account_from_key.address
        
        # Log for debugging
        print(f"Transfer: landowner DB address: {landowner.evm_address}")
        print(f"Transfer: address from private key: {seller_address_from_key}")
        print(f"Transfer: trading account: {request.trading_account_address}")
        print(f"Transfer: scheme_id: {scheme.nft_token_id}, credits: {request.credits_amount}")
        
        # Credits are minted to landowner.evm_address (DB address)
        # We need to use the address that owns the credits for the transfer
        # The private key must match the address where credits are located
        if seller_address_from_key.lower() != landowner.evm_address.lower():
            print(f"WARNING: Address mismatch! DB address: {landowner.evm_address}, Private key address: {seller_address_from_key}")
            print(f"Credits were minted to DB address. Checking balance at DB address...")
            
            # Check balance at DB address to see if credits are there
            from web3 import Web3
            w3_check = Web3(Web3.HTTPProvider(rpc_url))
            contract_check = w3_check.eth.contract(
                address=Web3.to_checksum_address(scheme_credits_address),
                abi=get_scheme_credits_abi()
            )
            db_address_balance = contract_check.functions.balanceOf(
                Web3.to_checksum_address(landowner.evm_address),
                scheme.nft_token_id
            ).call()
            db_address_locked = contract_check.functions.lockedBalance(
                scheme.nft_token_id,
                Web3.to_checksum_address(landowner.evm_address)
            ).call()
            db_address_available = int(db_address_balance) - int(db_address_locked)
            print(f"Balance at DB address ({landowner.evm_address}): Total={db_address_balance}, Locked={db_address_locked}, Available={db_address_available}")
            
            # If credits are at DB address but private key doesn't match, we can't transfer
            if db_address_balance > 0:
                # We have credits at DB address, but private key is for different address
                # We need to use the DB address for transfer, but verify the private key can sign for it
                # Actually, we can't sign for an address we don't have the key for
                # So we need to either:
                # 1. Use a private key that matches the DB address, OR
                # 2. Update the DB address to match the private key
                print(f"ERROR: Cannot transfer - credits are at {landowner.evm_address} but private key is for {seller_address_from_key}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot transfer: Credits ({db_address_balance:,} total, {db_address_available:,} available) are at address {landowner.evm_address}, "
                           f"but LANDOWNER_PRIVATE_KEY in .env is for address {seller_address_from_key}. "
                           f"To fix this, either:\n"
                           f"1. Update LANDOWNER_PRIVATE_KEY in .env to match address {landowner.evm_address}, OR\n"
                           f"2. Update the landowner's evm_address in the database to {seller_address_from_key}"
                )
            else:
                # No credits at DB address, check at private key address
                pk_address_balance = contract_check.functions.balanceOf(
                    seller_address_from_key,
                    scheme.nft_token_id
                ).call()
                print(f"Balance at private key address ({seller_address_from_key}): {pk_address_balance}")
                # If credits are at private key address, use that
                if pk_address_balance > 0:
                    print(f"Credits found at private key address. Using {seller_address_from_key} for transfer.")
                    transfer_address = seller_address_from_key
                else:
                    # No credits at either address
                    raise HTTPException(
                        status_code=400,
                        detail=f"No credits found at either address. DB address: {landowner.evm_address}, Private key address: {seller_address_from_key}"
                    )
        else:
            # Addresses match - use DB address
            transfer_address = landowner.evm_address
            print(f"Addresses match. Using {transfer_address} for transfer.")
        
        # Additional debug: Check balance at transfer address before transfer
        print(f"Pre-transfer check: Using address {transfer_address} for transfer")
        w3_precheck = Web3(Web3.HTTPProvider(rpc_url))
        contract_precheck = w3_precheck.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        precheck_balance = contract_precheck.functions.balanceOf(
            Web3.to_checksum_address(transfer_address),
            scheme.nft_token_id
        ).call()
        precheck_locked = contract_precheck.functions.lockedBalance(
            scheme.nft_token_id,
            Web3.to_checksum_address(transfer_address)
        ).call()
        precheck_available = int(precheck_balance) - int(precheck_locked)
        print(f"Pre-transfer balance at {transfer_address}: Total={precheck_balance}, Locked={precheck_locked}, Available={precheck_available}")
        print(f"Transfer will use: address={transfer_address}, scheme_id={scheme.nft_token_id}, amount={request.credits_amount}")
        
        tx_hash = transfer_credits_on_chain(
            seller_address=transfer_address,  # Use DB address where credits were minted
            buyer_address=request.trading_account_address,
            scheme_id=scheme.nft_token_id,
            quantity_credits=request.credits_amount,
            seller_private_key=landowner_private_key,
            scheme_credits_address=scheme_credits_address,
            rpc_url=rpc_url
        )
        
        return TransferToTradingAccountResponse(
            success=True,
            message=f"Successfully transferred {request.credits_amount} credits from scheme '{scheme.name}' to trading account",
            transaction_hash=tx_hash
        )
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Transfer error: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to transfer credits on-chain: {str(e)}")


@router.get("/{landowner_account_id}/mandates", response_model=LandownerMandatesResponse)
def get_landowner_mandates(
    landowner_account_id: int = Path(..., description="Landowner account ID"),
    db: Session = Depends(get_db)
):
    """
    Get all mandates (active and recalled) for a landowner.
    """
    landowner = db.query(Account).filter(Account.id == landowner_account_id).first()
    
    if not landowner:
        raise HTTPException(status_code=404, detail="Landowner account not found")
    
    mandates = db.query(BrokerMandate).filter(
        BrokerMandate.landowner_account_id == landowner_account_id
    ).order_by(BrokerMandate.created_at.desc()).all()
    
    result = []
    for mandate in mandates:
        fee_amount = int(mandate.credits_amount * (mandate.fee_percentage / 100.0))
        client_credits = mandate.credits_amount - fee_amount
        
        result.append(BrokerMandateItem(
            mandate_id=mandate.id,
            broker_id=mandate.broker_account_id,
            broker_name=mandate.broker.name if mandate.broker else "Unknown",
            scheme_id=mandate.scheme_id,
            scheme_name=mandate.scheme.name if mandate.scheme else "Unknown",
            catchment=mandate.scheme.catchment if mandate.scheme else "",
            unit_type=mandate.scheme.unit_type if mandate.scheme else "",
            total_credits=mandate.credits_amount,
            client_credits=client_credits,
            fee_credits=fee_amount,
            fee_percentage=mandate.fee_percentage,
            is_active=mandate.is_active == 1,
            is_recalled=mandate.is_recalled == 1,
            created_at=mandate.created_at.isoformat() if mandate.created_at else "",
            recalled_at=mandate.recalled_at.isoformat() if mandate.recalled_at else None,
            fee_transaction_hash=mandate.fee_transaction_hash,
            client_transaction_hash=mandate.client_transaction_hash,
            recall_transaction_hash=mandate.recall_transaction_hash
        ))
    
    return LandownerMandatesResponse(
        landowner_account_id=landowner_account_id,
        mandates=result
    )


@router.post("/recall-from-broker", response_model=RecallFromBrokerResponse)
def recall_from_broker(request: RecallFromBrokerRequest, db: Session = Depends(get_db)):
    """
    Recall credits from a broker after the 30-day lockup period.
    Transfers client credits back from broker to landowner on-chain.
    House keeps the 5% fee.
    """
    from web3 import Web3
    from datetime import datetime, timezone, timedelta
    
    # Validate landowner account
    landowner = db.query(Account).filter(Account.id == request.landowner_account_id).first()
    if not landowner:
        raise HTTPException(status_code=404, detail="Landowner account not found")
    
    if not landowner.evm_address:
        raise HTTPException(status_code=400, detail="Landowner account does not have an EVM address")
    
    # Validate mandate
    mandate = db.query(BrokerMandate).filter(BrokerMandate.id == request.mandate_id).first()
    if not mandate:
        raise HTTPException(status_code=404, detail="Mandate not found")
    
    if mandate.landowner_account_id != request.landowner_account_id:
        raise HTTPException(status_code=403, detail="Mandate does not belong to this landowner")
    
    if mandate.is_recalled == 1:
        raise HTTPException(status_code=400, detail="Mandate has already been recalled")
    
    # Check 30-day lockup period
    if not mandate.created_at:
        raise HTTPException(status_code=500, detail="Mandate missing creation date")
    
    lockup_period = timedelta(days=30)
    now = datetime.now(timezone.utc)
    time_since_assignment = now - mandate.created_at
    
    if time_since_assignment < lockup_period:
        days_remaining = (lockup_period - time_since_assignment).days + 1
        raise HTTPException(
            status_code=400,
            detail=f"Credits cannot be recalled until 30 days after assignment. {days_remaining} days remaining."
        )
    
    # Get broker account
    broker = db.query(Account).filter(Account.id == mandate.broker_account_id).first()
    if not broker or not broker.evm_address:
        raise HTTPException(status_code=404, detail="Broker account not found or missing EVM address")
    
    # Get scheme
    scheme = db.query(Scheme).filter(Scheme.id == mandate.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    # Calculate client credits (original amount minus fee)
    fee_amount = int(mandate.credits_amount * (mandate.fee_percentage / 100.0))
    client_credits = mandate.credits_amount - fee_amount
    
    # Get contract addresses and keys from environment
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    broker_private_key = os.getenv("BROKER_PRIVATE_KEY")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address:
        raise HTTPException(
            status_code=500,
            detail="Blockchain configuration missing. SCHEME_CREDITS_CONTRACT_ADDRESS must be set."
        )
    
    # For recall, we need the broker's private key to transfer from broker back to landowner
    # If not set, try to use a fallback (in production, this should be per-broker)
    if not broker_private_key:
        # Fallback to REGULATOR_PRIVATE_KEY if available
        broker_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
        if not broker_private_key:
            raise HTTPException(
                status_code=500,
                detail="Blockchain configuration missing. BROKER_PRIVATE_KEY or REGULATOR_PRIVATE_KEY must be set for recall."
            )
    
    # Verify broker has sufficient credits
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            raise HTTPException(status_code=500, detail="Cannot connect to blockchain node")
        
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        broker_address = Web3.to_checksum_address(broker.evm_address)
        total_balance = contract.functions.balanceOf(broker_address, scheme.nft_token_id).call()
        locked_balance = contract.functions.lockedBalance(scheme.nft_token_id, broker_address).call()
        available_credits = int(total_balance) - int(locked_balance)
        
        if available_credits < client_credits:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient credits at broker address. Available: {available_credits:,}, Required: {client_credits:,}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check broker balance: {str(e)}")
    
    # Transfer client credits back from broker to landowner
    recall_tx_hash = None
    try:
        recall_tx_hash = transfer_credits_on_chain(
            seller_address=broker.evm_address,
            buyer_address=landowner.evm_address,
            scheme_id=scheme.nft_token_id,
            quantity_credits=client_credits,
            seller_private_key=broker_private_key,
            scheme_credits_address=scheme_credits_address,
            rpc_url=rpc_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to transfer credits back from broker: {str(e)}")
    
    # Update mandate as recalled
    mandate.is_recalled = 1
    mandate.recalled_at = datetime.now(timezone.utc)
    mandate.recall_transaction_hash = recall_tx_hash
    db.commit()
    
    return RecallFromBrokerResponse(
        success=True,
        message=f"Successfully recalled {client_credits:,} client credits from broker. House fee of {fee_amount:,} credits remains with broker.",
        transaction_hash=recall_tx_hash
    )
