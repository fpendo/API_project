from sqlalchemy.orm import Session
from typing import Optional
from ..models import ExchangeListing, Account, Scheme, Trade, AccountRole
from ..services.credits_summary import get_account_credits_summary
from web3 import Web3
import os


def get_scheme_credits_abi() -> list:
    """Get ABI for SchemeCredits contract"""
    return [
        {
            "constant": False,
            "inputs": [
                {"name": "from", "type": "address"},
                {"name": "to", "type": "address"},
                {"name": "id", "type": "uint256"},
                {"name": "amount", "type": "uint256"},
                {"name": "data", "type": "bytes"}
            ],
            "name": "safeTransferFrom",
            "outputs": [],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "account", "type": "address"},
                {"name": "id", "type": "uint256"}
            ],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "schemeId", "type": "uint256"},
                {"name": "user", "type": "address"}
            ],
            "name": "lockedBalance",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "account", "type": "address"},
                {"name": "operator", "type": "address"}
            ],
            "name": "isApprovedForAll",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
    ]


def check_seller_has_sufficient_credits(
    seller: Account,
    db_scheme_id: int,
    scheme_nft_token_id: int,
    required_credits: int,
    db: Session,
    scheme_credits_address: Optional[str] = None,
    rpc_url: str = "http://127.0.0.1:8545"
) -> tuple[bool, int]:
    """
    Check if seller has sufficient free (unlocked) credits for a given scheme NFT tokenId.
    For landowners, checks the trading account instead of their main account.

    Returns:
        (has_sufficient, available_credits)
    """
    # For landowners, use trading account address; otherwise use seller's main address
    trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
    
    if seller.role == AccountRole.LANDOWNER:
        # Landowners sell from trading account
        seller_address_to_check = trading_account_address
    else:
        if not seller.evm_address:
            return False, 0
        seller_address_to_check = seller.evm_address
    
    # Get contract address
    if not scheme_credits_address:
        scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    
    if not scheme_credits_address:
        return False, 0
    
    try:
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            return False, 0
        
        # Get contract
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        seller_address = Web3.to_checksum_address(seller_address_to_check)

        # Get on-chain total balance for this ERC-1155 ID (scheme NFT tokenId)
        balance = contract.functions.balanceOf(
            seller_address,
            scheme_nft_token_id
        ).call()

        # Get locked balance from SchemeCredits.lockedBalance mapping
        locked = contract.functions.lockedBalance(
            scheme_nft_token_id,
            seller_address
        ).call()

        # Available on-chain credits = total balance - locked credits
        available_credits = int(balance) - int(locked)
        if available_credits < 0:
            available_credits = 0

        # Check existing ACTIVE listings and PENDING/PARTIALLY_FILLED orders for this seller
        # These represent already-reserved units that shouldn't be double-listed.
        # IMPORTANT: Only count reservations for the SAME scheme (same NFT token ID)
        from ..models import Order
        existing_listings = db.query(ExchangeListing).filter(
            ExchangeListing.owner_account_id == seller.id,
            ExchangeListing.scheme_id == db_scheme_id,
            ExchangeListing.status == "ACTIVE"
        ).all()
        
        # Only count orders for the same scheme (same NFT token ID)
        existing_orders = db.query(Order).filter(
            Order.account_id == seller.id,
            Order.side == "SELL",
            Order.status.in_(["PENDING", "PARTIALLY_FILLED"]),
            Order.nft_token_id == scheme_nft_token_id  # Only count orders for this specific scheme
        ).all()

        # Reserved credits across listings and orders (for this specific scheme only)
        reserved_credits = sum(listing.quantity_units for listing in existing_listings)
        reserved_credits += sum(order.remaining_quantity for order in existing_orders)

        # Free credits = available on-chain (excluding locked) minus credits already listed
        free_credits = available_credits - reserved_credits

        if free_credits < 0:
            free_credits = 0

        return free_credits >= required_credits, free_credits
    
    except Exception as e:
        print(f"Error checking seller credits: {str(e)}")
        return False, 0


def transfer_credits_on_chain(
    seller_address: str,
    buyer_address: str,
    scheme_id: int,
    quantity_credits: int,
    seller_private_key: str,
    scheme_credits_address: str,
    rpc_url: str = "http://127.0.0.1:8545"
) -> str:
    """
    Transfer credits from seller to buyer on-chain.
    
    Returns:
        Transaction hash
    """
    try:
        # Connect to blockchain
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            raise ConnectionError("Cannot connect to blockchain node")
        
        # Get seller account from private key
        seller_account = w3.eth.account.from_key(seller_private_key)
        seller_address_from_key = Web3.to_checksum_address(seller_account.address)
        seller_address_checksum = Web3.to_checksum_address(seller_address)
        
        # Check if private key matches seller address OR if operator is approved
        key_matches = seller_address_from_key == seller_address_checksum
        is_approved = False
        
        if not key_matches:
            # Check if the private key's address is approved to transfer on behalf of seller
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(scheme_credits_address),
                abi=get_scheme_credits_abi()
            )
            try:
                is_approved = contract.functions.isApprovedForAll(
                    seller_address_checksum,
                    seller_address_from_key
                ).call()
            except:
                pass
        
        # CRITICAL: Validate that the private key matches the seller address OR operator is approved
        # This prevents ERC1155MissingApprovalForAll errors
        if not key_matches and not is_approved:
            raise ValueError(
                f"Private key mismatch and no approval! "
                f"The provided private key corresponds to address {seller_address_from_key}, "
                f"but the seller address is {seller_address_checksum}. "
                f"Operator {seller_address_from_key} is not approved to transfer on behalf of {seller_address_checksum}. "
                f"This will cause an ERC1155MissingApprovalForAll error. "
                f"Either use the private key that matches the seller address, or set up an approval."
            )
        
        # Get contract
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        # Check available (unlocked) balance before attempting transfer
        seller_checksum = Web3.to_checksum_address(seller_address)
        
        # Debug: Log what we're checking
        print(f"Balance check: address={seller_checksum}, scheme_id={scheme_id}")
        
        total_balance = contract.functions.balanceOf(seller_checksum, scheme_id).call()
        locked_balance = contract.functions.lockedBalance(scheme_id, seller_checksum).call()
        available_credits = int(total_balance) - int(locked_balance)
        
        # Debug: Log the results
        print(f"Balance check result: Total={total_balance}, Locked={locked_balance}, Available={available_credits}")
        
        if available_credits < quantity_credits:
            raise ValueError(
                f"Insufficient unlocked credits. "
                f"Total: {total_balance}, Locked: {locked_balance}, "
                f"Available: {available_credits}, Requested: {quantity_credits}"
            )
        
        # Prepare safeTransferFrom call
        function_call = contract.functions.safeTransferFrom(
            seller_checksum,
            Web3.to_checksum_address(buyer_address),
            scheme_id,
            quantity_credits,
            b""  # Empty data
        )
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(seller_account.address)
        transaction = function_call.build_transaction({
            'from': seller_account.address,
            'nonce': nonce,
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, seller_private_key)
        
        # Send transaction (web3.py v7 uses .raw_transaction)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status != 1:
            raise ValueError("Transaction failed")
        
        # Return transaction hash (web3.py v7 uses .transactionHash or .hash)
        return receipt.transactionHash.hex() if hasattr(receipt, 'transactionHash') else receipt.hash.hex()
    
    except Exception as e:
        raise ValueError(f"Failed to transfer credits on-chain: {str(e)}")
