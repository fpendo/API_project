from web3 import Web3
from typing import Optional
import os


def mint_scheme_credits(
    scheme_id: int,
    landowner_address: str,
    original_tonnage: float,
    scheme_credits_address: str,
    private_key: str,
    rpc_url: str = "http://127.0.0.1:8545"
) -> bool:
    """
    Mint SchemeCredits (ERC-1155) for a landowner after they redeem their scheme NFT.
    
    Args:
        scheme_id: The NFT token ID (also used as ERC-1155 token ID)
        landowner_address: EVM address of the landowner
        original_tonnage: Original tonnage of the scheme (in tonnes)
        scheme_credits_address: Address of the deployed SchemeCredits contract
        private_key: Private key of the account that will mint (regulator/owner)
        rpc_url: RPC URL of the Hardhat node (default: localhost:8545)
    
    Returns:
        True if successful
    
    Raises:
        ConnectionError: If cannot connect to blockchain node
        ValueError: If minting fails
    """
    try:
        # Connect to Hardhat node
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            raise ConnectionError("Cannot connect to blockchain node")
        
        # Get account from private key
        account = w3.eth.account.from_key(private_key)
        
        # Get contract ABI
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_credits_address),
            abi=get_scheme_credits_abi()
        )
        
        # Convert tonnage to credits
        # 1 tonne = 100,000 credits (as per plan.md)
        credits_amount = int(original_tonnage * 100000)
        
        # Prepare mintCredits call
        # mintCredits(uint256 schemeId, address to, uint256 amount)
        function_call = contract.functions.mintCredits(
            scheme_id,
            Web3.to_checksum_address(landowner_address),
            credits_amount
        )
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(account.address)
        transaction = function_call.build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 500000,  # Adjust as needed
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        
        # Send transaction (web3.py v7 uses .raw_transaction)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status != 1:
            raise ValueError("Transaction failed")
        
        return True
    
    except Exception as e:
        raise ValueError(f"Failed to mint SchemeCredits: {str(e)}")


def get_scheme_credits_abi() -> list:
    """
    Get the ABI for SchemeCredits contract.
    In production, this should be loaded from the compiled contract artifacts.
    """
    # Simplified ABI - includes only the functions we need
    return [
        {
            "inputs": [
                {"internalType": "uint256", "name": "schemeId", "type": "uint256"},
                {"internalType": "address", "name": "to", "type": "address"},
                {"internalType": "uint256", "name": "amount", "type": "uint256"}
            ],
            "name": "mintCredits",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]
