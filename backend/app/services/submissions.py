from sqlalchemy.orm import Session
from ..models import SchemeSubmission, SubmissionStatus, AgreementArchive, Scheme, Notification
from ..utils.ipfs import pin_file_to_ipfs, calculate_file_hash
from ..services.nft_integration import mint_scheme_nft
import os
import uuid
from pathlib import Path


def create_submission(
    db: Session,
    submitter_account_id: int,
    scheme_name: str,
    catchment: str,
    location: str,
    land_parcel_number: str,
    unit_type: str,
    total_tonnage: float,
    file_path: str
) -> SchemeSubmission:
    """Create a new scheme submission in the database"""
    # Check for existing submission with same submitter, land parcel, and unit type
    existing = db.query(SchemeSubmission).filter(
        SchemeSubmission.submitter_account_id == submitter_account_id,
        SchemeSubmission.land_parcel_number == land_parcel_number,
        SchemeSubmission.unit_type == unit_type
    ).first()
    
    if existing:
        raise ValueError(
            f"A submission already exists for land parcel '{land_parcel_number}' with unit type '{unit_type}'. "
            f"Each land parcel can only have one submission per unit type."
        )
    
    submission = SchemeSubmission(
        submitter_account_id=submitter_account_id,
        scheme_name=scheme_name,
        catchment=catchment,
        location=location,
        land_parcel_number=land_parcel_number,
        unit_type=unit_type,
        total_tonnage=total_tonnage,
        file_path=file_path,
        status=SubmissionStatus.PENDING_REVIEW
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def save_uploaded_file(file_content: bytes, filename: str, base_dir: str = "archive/raw_submissions") -> str:
    """Save uploaded file to disk and return the file path"""
    # Get the backend directory (parent of 'app' directory)
    backend_dir = Path(__file__).parent.parent.parent
    # Create full path relative to backend directory
    full_base_dir = backend_dir / base_dir
    
    # Ensure directory exists
    full_base_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename to avoid collisions
    file_ext = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = full_base_dir / unique_filename
    
    # Write file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Return relative path for storage in database
    return str(file_path.relative_to(backend_dir))


def approve_submission(
    db: Session, 
    submission_id: int,
    scheme_nft_address: str = None,
    regulator_private_key: str = None,
    rpc_url: str = "http://127.0.0.1:8545"
) -> SchemeSubmission:
    """
    Approve a submission by setting status to APPROVED, pinning file to IPFS, and minting NFT.
    
    Args:
        db: Database session
        submission_id: ID of the submission to approve
        scheme_nft_address: Address of the SchemeNFT contract (optional, from env if not provided)
        regulator_private_key: Private key of regulator account (optional, from env if not provided)
        rpc_url: RPC URL of blockchain node (default: localhost:8545)
    """
    submission = db.query(SchemeSubmission).filter(SchemeSubmission.id == submission_id).first()
    
    if not submission:
        raise ValueError("Submission not found")
    
    if submission.status != SubmissionStatus.PENDING_REVIEW:
        raise ValueError(f"Cannot approve submission with status {submission.status.value}")
    
    # Pin file to IPFS (or generate CID locally as fallback)
    try:
        ipfs_cid = pin_file_to_ipfs(submission.file_path)
    except Exception as e:
        # This should rarely happen now since we have multiple fallback methods
        raise ValueError(f"Failed to generate IPFS CID: {str(e)}")
    
    # Calculate file hash (required so NFT can be cryptographically bound to this agreement)
    try:
        sha256_hash = calculate_file_hash(submission.file_path)
    except Exception as e:
        raise ValueError(f"Failed to calculate file hash: {str(e)}")
    
    if not sha256_hash:
        raise ValueError("Failed to calculate file hash: empty hash value")
    
    # Update submission status
    submission.status = SubmissionStatus.APPROVED
    db.commit()
    db.refresh(submission)
    
    # Create AgreementArchive record (stores file path, IPFS CID and SHA-256 hash)
    archive = AgreementArchive(
        submission_id=submission.id,
        file_path=submission.file_path,
        sha256_hash=sha256_hash,
        ipfs_cid=ipfs_cid
    )
    db.add(archive)
    db.commit()
    db.refresh(archive)
    
    # Mint SchemeNFT - required for approval.
    # NFT minting must succeed for the scheme to be approved so that the
    # on-chain token is cryptographically bound to the archived agreement
    # via both IPFS CID and SHA-256 hash.
    if not scheme_nft_address:
        raise ValueError(
            "Cannot approve submission: SCHEME_NFT_CONTRACT_ADDRESS environment variable is not set. "
            "Please configure blockchain settings in .env file."
        )
    
    if not regulator_private_key:
        raise ValueError(
            "Cannot approve submission: REGULATOR_PRIVATE_KEY environment variable is not set. "
            "Please configure blockchain settings in .env file."
        )
    
    # Get landowner's EVM address (they will own the NFT, regulator retains oversight)
    from ..models import Account
    landowner = db.query(Account).filter(Account.id == submission.submitter_account_id).first()
    if not landowner:
        raise ValueError("Landowner account not found")
    
    if not landowner.evm_address:
        raise ValueError(
            f"Landowner account (ID: {landowner.id}) does not have an EVM address. "
            "Please set an EVM address for the landowner account."
        )
    
    try:
        nft_token_id = mint_scheme_nft(
            submission=submission,
            ipfs_cid=ipfs_cid,
            sha256_hash=sha256_hash,
            scheme_nft_address=scheme_nft_address,
            private_key=regulator_private_key,
            landowner_address=landowner.evm_address,
            rpc_url=rpc_url
        )
        print(f"Successfully minted SchemeNFT with token ID: {nft_token_id}")
    except Exception as e:
        # NFT minting failed - this is a critical error, so we fail the approval
        error_msg = f"Failed to mint SchemeNFT: {str(e)}"
        print(f"ERROR: {error_msg}")
        raise ValueError(
            f"Cannot approve submission: {error_msg}. "
            "Please ensure Hardhat node is running and contract addresses are correct."
        )
    
    # Create Scheme record (even if nft_token_id is a fallback 0)
    # Initialize remaining_tonnage to original_tonnage (will be synced from contract later)
    scheme = Scheme(
        nft_token_id=nft_token_id,
        name=submission.scheme_name,
        catchment=submission.catchment,
        location=submission.location,
        unit_type=submission.unit_type,
        original_tonnage=submission.total_tonnage,
        remaining_tonnage=submission.total_tonnage,  # Initially equals original
        created_by_account_id=submission.submitter_account_id
    )
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    
    # Create notifications for the landowner
    # 1. Scheme approved notification with certificate details
    certificate_details_message = (
        f"Your scheme '{submission.scheme_name}' has been approved and a Digital Certificate has been issued!\n\n"
        f"📋 Certificate Details:\n"
        f"• Certificate ID: {nft_token_id}\n"
        f"• Owner: {landowner.evm_address} (Your wallet)\n"
        f"• IPFS CID: {ipfs_cid}\n"
        f"• SHA-256 Hash: {sha256_hash if sha256_hash else 'Not calculated'}\n"
        f"• Catchment: {submission.catchment}\n"
        f"• Location: {submission.location}\n"
        f"• Tonnage: {submission.total_tonnage} tonnes\n\n"
        f"✅ The Digital Certificate is now in your wallet. The regulator retains oversight, but you own it. "
        f"You can redeem it to receive credits, or hold it in your wallet."
    )
    approval_notification = Notification(
        account_id=submission.submitter_account_id,
        scheme_id=scheme.id,
        notification_type="SCHEME_APPROVED",
        message=certificate_details_message
    )
    db.add(approval_notification)
    
    # 2. Redeem to credits notification with claim token
    claim_token = str(uuid.uuid4())
    redeem_notification = Notification(
        account_id=submission.submitter_account_id,
        scheme_id=scheme.id,
        notification_type="REDEEM_TO_CREDITS",
        message=f"Redeem your scheme '{submission.scheme_name}' to receive credits on-chain",
        claim_token=claim_token
    )
    db.add(redeem_notification)
    
    db.commit()
    
    return submission


def decline_submission(db: Session, submission_id: int) -> SchemeSubmission:
    """Decline a submission by setting status to REJECTED"""
    submission = db.query(SchemeSubmission).filter(SchemeSubmission.id == submission_id).first()
    
    if not submission:
        raise ValueError("Submission not found")
    
    if submission.status != SubmissionStatus.PENDING_REVIEW:
        raise ValueError(f"Cannot decline submission with status {submission.status.value}")
    
    submission.status = SubmissionStatus.REJECTED
    db.commit()
    db.refresh(submission)
    return submission
