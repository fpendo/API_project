from sqlalchemy.orm import Session
from typing import List, Dict, Tuple, Optional
from ..models import Account, Scheme
from ..services.credits_summary import get_account_credits_summary
from web3 import Web3
import os
import uuid


def get_planning_lock_abi() -> list:
    """Get ABI for PlanningLock contract"""
    return [
        {
            "inputs": [
                {"name": "developer", "type": "address"},
                {"name": "schemeIds", "type": "uint256[]"},
                {"name": "amounts", "type": "uint256[]"},
                {"name": "requiredCatchment", "type": "bytes32"}
            ],
            "name": "submitApplication",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "inputs": [],
            "name": "nextApplicationId",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]


def select_schemes_for_application(
    developer: Account,
    required_catchment: str,
    required_unit_type: str,
    required_tonnage: float,
    db: Session,
    holdings_override: Optional[List[Dict]] = None
) -> List[Dict]:
    """
    Select combination of schemes from developer's holdings to meet required tonnage.
    
    Returns:
        List of dicts with scheme_id, tonnes_allocated, credits_allocated
    """
    # Get developer's holdings (or use override for testing)
    if holdings_override is not None:
        holdings = holdings_override
    else:
        holdings = get_account_credits_summary(developer, db)
    
    # Filter by catchment and unit type
    matching_holdings = [
        h for h in holdings
        if h["catchment"] == required_catchment.upper()
        and h["unit_type"] == required_unit_type.lower()
    ]
    
    if not matching_holdings:
        raise ValueError(f"No holdings found for {required_catchment} {required_unit_type}")
    
    # Sort by available tonnes (descending) for greedy allocation
    matching_holdings.sort(key=lambda x: x["tonnes"], reverse=True)
    
    # Allocate schemes to meet requirement
    allocations = []
    remaining_required = required_tonnage
    
    for holding in matching_holdings:
        if remaining_required <= 0:
            break
        
        # Allocate up to available, but not more than required
        tonnes_allocated = min(holding["tonnes"], remaining_required)
        credits_allocated = int(tonnes_allocated * 100000)  # 1 tonne = 100,000 credits
        
        allocations.append({
            "scheme_id": holding["scheme_id"],
            "tonnes_allocated": tonnes_allocated,
            "credits_allocated": credits_allocated
        })
        
        remaining_required -= tonnes_allocated
    
    if remaining_required > 0.001:  # Allow small floating point differences
        total_available = sum(h["tonnes"] for h in matching_holdings)
        raise ValueError(
            f"Insufficient holdings. Required: {required_tonnage} tonnes, "
            f"Available: {total_available:.4f} tonnes"
        )
    
    return allocations


def get_scheme_nft_abi() -> list:
    """Get ABI for SchemeNFT contract"""
    return [
        {
            "inputs": [{"name": "tokenId", "type": "uint256"}],
            "name": "getSchemeCatchment",
            "outputs": [{"name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "tokenId", "type": "uint256"}],
            "name": "ownerOf",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]


def submit_planning_application_on_chain(
    developer_address: str,
    scheme_ids: List[int],
    amounts: List[int],  # In credits
    required_catchment: str,
    planning_lock_address: str,
    developer_private_key: str,
    rpc_url: str = "http://127.0.0.1:8545",
    scheme_nft_address: Optional[str] = None
) -> int:
    """
    Submit planning application to PlanningLock contract on-chain.
    
    Returns:
        Application ID from PlanningLock contract
    """
    try:
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            raise ConnectionError("Cannot connect to blockchain node")
        
        # Get developer account
        developer_account = w3.eth.account.from_key(developer_private_key)
        
        # Query actual catchment from first scheme on-chain (if SchemeNFT address provided)
        # This ensures we use the exact format stored on-chain
        actual_catchment = required_catchment.upper()  # Default to required catchment
        
        if scheme_nft_address and scheme_ids:
            try:
                scheme_nft_abi = get_scheme_nft_abi()
                scheme_nft_contract = w3.eth.contract(
                    address=Web3.to_checksum_address(scheme_nft_address),
                    abi=scheme_nft_abi
                )
                
                # First check if scheme exists by trying to get owner
                try:
                    scheme_owner = scheme_nft_contract.functions.ownerOf(scheme_ids[0]).call()
                    if scheme_owner == '0x0000000000000000000000000000000000000000':
                        raise ValueError(f"Scheme {scheme_ids[0]} does not exist on-chain")
                except Exception as e:
                    error_msg = str(e)
                    if "does not exist" in error_msg or "ERC721: invalid token ID" in error_msg or "owner query for nonexistent token" in error_msg:
                        raise ValueError(
                            f"Scheme {scheme_ids[0]} does not exist on-chain. "
                            f"This usually means the scheme was not properly minted, or the Hardhat node was restarted. "
                            f"Please ensure the scheme is minted on-chain before creating planning applications."
                        )
                    # If it's a different error, continue to catchment check
                
                # Get catchment from first scheme to use as reference
                first_scheme_catchment = scheme_nft_contract.functions.getSchemeCatchment(scheme_ids[0]).call()
                
                # Check if scheme has catchment data (empty catchment means scheme wasn't minted properly)
                if not first_scheme_catchment or first_scheme_catchment.strip() == '':
                    raise ValueError(
                        f"Scheme {scheme_ids[0]} exists but has no catchment data. "
                        f"This usually means the scheme was not properly minted with catchment information. "
                        f"Please re-mint the scheme with proper catchment data."
                    )
                
                actual_catchment = first_scheme_catchment  # Use the exact format from on-chain
                
                # Verify all schemes have the same catchment
                required_catchment_normalized = required_catchment.upper()
                for scheme_id in scheme_ids:
                    # Check if scheme exists
                    try:
                        scheme_owner = scheme_nft_contract.functions.ownerOf(scheme_id).call()
                        if scheme_owner == '0x0000000000000000000000000000000000000000':
                            raise ValueError(f"Scheme {scheme_id} does not exist on-chain")
                    except Exception as e:
                        error_msg = str(e)
                        if "does not exist" in error_msg or "ERC721: invalid token ID" in error_msg or "owner query for nonexistent token" in error_msg:
                            raise ValueError(
                                f"Scheme {scheme_id} does not exist on-chain. "
                                f"This usually means the scheme was not properly minted, or the Hardhat node was restarted. "
                                f"Please ensure all schemes are minted on-chain before creating planning applications."
                            )
                    
                    # Get catchment
                    on_chain_catchment = scheme_nft_contract.functions.getSchemeCatchment(scheme_id).call()
                    
                    # Check if scheme has catchment data
                    if not on_chain_catchment or on_chain_catchment.strip() == '':
                        raise ValueError(
                            f"Scheme {scheme_id} exists but has no catchment data. "
                            f"This usually means the scheme was not properly minted with catchment information. "
                            f"Please re-mint the scheme with proper catchment data."
                        )
                    
                    # Compare case-insensitively
                    if on_chain_catchment.upper() != required_catchment_normalized:
                        raise ValueError(
                            f"Scheme {scheme_id} has catchment '{on_chain_catchment}' which does not match required catchment '{required_catchment}'. "
                            f"All schemes must be in the same catchment."
                        )
            except Exception as e:
                # If we can't query, use required catchment but log warning
                error_msg = str(e)
                if "does not match" in error_msg:
                    # Re-raise catchment mismatch errors
                    raise
                print(f"Warning: Could not query SchemeNFT for catchment verification: {error_msg}")
                # Continue with required_catchment as fallback
        
        # Calculate catchment hash using the actual catchment (from on-chain or required)
        # The contract compares keccak256(bytes(catchment)), so we need to hash the exact string format
        catchment_hash = w3.keccak(text=actual_catchment)
        
        # Get contract (includes submitApplication + nextApplicationId view)
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(planning_lock_address),
            abi=get_planning_lock_abi()
        )

        # Read the next application ID *before* submitting.
        # PlanningLock increments nextApplicationId after storing the new application,
        # so this value will be the ID assigned to the transaction we are about to send.
        next_app_id = contract.functions.nextApplicationId().call()
        
        # Prepare submitApplication call with exact amounts (no rounding)
        # The contract will burn exactly what was submitted
        function_call = contract.functions.submitApplication(
            Web3.to_checksum_address(developer_address),
            scheme_ids,
            amounts,  # Use exact amounts as submitted
            catchment_hash
        )
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(developer_account.address)
        transaction = function_call.build_transaction({
            'from': developer_account.address,
            'nonce': nonce,
            'gas': 1000000,  # Higher gas for multiple scheme operations
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, developer_private_key)
        
        # Send transaction (handle both web3.py v6 and v7)
        raw_tx = getattr(signed_txn, 'rawTransaction', getattr(signed_txn, 'raw_transaction', None))
        if raw_tx is None:
            raise ValueError("Could not get raw transaction from signed transaction")
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status != 1:
            raise ValueError("Transaction failed")

        # Return the application ID that was just used on-chain.
        # This avoids re-calling submitApplication() and keeps Python and Solidity in sync.
        return next_app_id
    
    except Exception as e:
        raise ValueError(f"Failed to submit planning application on-chain: {str(e)}")


def generate_application_token() -> str:
    """Generate a unique application token for QR code"""
    return str(uuid.uuid4())


def generate_qr_code_data_url(token: str) -> str:
    """
    Generate QR code as data URL using an online QR code generator API.
    The QR code will contain the application token.
    """
    # Use a QR code API service to generate the QR code
    # Format: PLANNING_APP:{token}
    qr_data = f"PLANNING_APP:{token}"
    # Use qrcode.xyz API (free, no API key required)
    # This returns a PNG image that can be used as an img src
    import urllib.parse
    encoded_data = urllib.parse.quote(qr_data)
    return f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encoded_data}"


def get_planning_lock_decision_abi() -> list:
    """Get ABI for PlanningLock decision functions"""
    return [
        {
            "inputs": [{"name": "applicationId", "type": "uint256"}],
            "name": "approveApplication",
            "outputs": [],
            "type": "function"
        },
        {
            "inputs": [{"name": "applicationId", "type": "uint256"}],
            "name": "rejectApplication",
            "outputs": [],
            "type": "function"
        }
    ]


def approve_planning_application_on_chain(
    application_id: int,
    planning_lock_address: str,
    regulator_private_key: str,
    rpc_url: str = "http://127.0.0.1:8545"
) -> bool:
    """
    Approve planning application on-chain via PlanningLock contract.
    
    Returns:
        True on success
    """
    try:
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            raise ConnectionError("Cannot connect to blockchain node")
        
        # Get regulator account
        regulator_account = w3.eth.account.from_key(regulator_private_key)
        
        # Get contract
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(planning_lock_address),
            abi=get_planning_lock_decision_abi()
        )
        
        # Prepare approveApplication call
        function_call = contract.functions.approveApplication(application_id)
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(regulator_account.address)
        transaction = function_call.build_transaction({
            'from': regulator_account.address,
            'nonce': nonce,
            'gas': 1000000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, regulator_private_key)
        
        # Send transaction (handle both web3.py v6 and v7)
        raw_tx = getattr(signed_txn, 'rawTransaction', getattr(signed_txn, 'raw_transaction', None))
        if raw_tx is None:
            raise ValueError("Could not get raw transaction from signed transaction")
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status != 1:
            raise ValueError("Transaction failed")
        
        return True
    
    except Exception as e:
        raise ValueError(f"Failed to approve planning application on-chain: {str(e)}")


def reject_planning_application_on_chain(
    application_id: int,
    planning_lock_address: str,
    regulator_private_key: str,
    rpc_url: str = "http://127.0.0.1:8545"
) -> bool:
    """
    Reject planning application on-chain via PlanningLock contract.
    
    Returns:
        True on success
    """
    try:
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            raise ConnectionError("Cannot connect to blockchain node")
        
        # Get regulator account
        regulator_account = w3.eth.account.from_key(regulator_private_key)
        
        # Get contract
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(planning_lock_address),
            abi=get_planning_lock_decision_abi()
        )
        
        # Prepare rejectApplication call
        function_call = contract.functions.rejectApplication(application_id)
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(regulator_account.address)
        transaction = function_call.build_transaction({
            'from': regulator_account.address,
            'nonce': nonce,
            'gas': 1000000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, regulator_private_key)
        
        # Send transaction (handle both web3.py v6 and v7)
        raw_tx = getattr(signed_txn, 'rawTransaction', getattr(signed_txn, 'raw_transaction', None))
        if raw_tx is None:
            raise ValueError("Could not get raw transaction from signed transaction")
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status != 1:
            raise ValueError("Transaction failed")
        
        return True
    
    except Exception as e:
        raise ValueError(f"Failed to reject planning application on-chain: {str(e)}")
