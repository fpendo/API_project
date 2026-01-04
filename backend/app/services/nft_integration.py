from web3 import Web3
from typing import Optional
import os
from ..models import SchemeSubmission


def mint_scheme_nft(
    submission: SchemeSubmission,
    ipfs_cid: str,
    sha256_hash: str,
    scheme_nft_address: str,
    private_key: str,
    landowner_address: str,
    rpc_url: str = "http://127.0.0.1:8545"
) -> int:
    """
    Mint a SchemeNFT for an approved submission. The NFT is minted to the landowner's address,
    but the regulator (contract owner) retains oversight/custody through contract owner functions.
    
    Args:
        submission: The approved SchemeSubmission
        ipfs_cid: IPFS CID of the agreement file
        sha256_hash: SHA-256 hash of the agreement file
        scheme_nft_address: Address of the deployed SchemeNFT contract
        private_key: Private key of the account that will mint (regulator)
        landowner_address: EVM address of the landowner who will own the NFT
        rpc_url: RPC URL of the Hardhat node (default: localhost:8545)
    
    Returns:
        token_id: The minted NFT token ID
    
    Raises:
        ConnectionError: If cannot connect to blockchain node
        ValueError: If minting fails
    """
    try:
        # Connect to Hardhat node
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not w3.is_connected():
            raise ConnectionError("Cannot connect to blockchain node")
        
        # Check if contract is deployed BEFORE trying to use it
        scheme_nft_checksum = Web3.to_checksum_address(scheme_nft_address)
        contract_code = w3.eth.get_code(scheme_nft_checksum)
        if not contract_code or contract_code == b'':
            raise ValueError(
                f"Contract not deployed at address {scheme_nft_address}. "
                "Please deploy the SchemeNFT contract first using: npx hardhat run scripts/deploy.ts --network localhost"
            )
        
        # Get account from private key
        account = w3.eth.account.from_key(private_key)
        
        # Get contract ABI (simplified - in production, load from artifacts)
        contract = w3.eth.contract(
            address=scheme_nft_checksum,
            abi=get_scheme_nft_abi()
        )
        
        # Prepare mintScheme call
        # mintScheme(
        #   string name,
        #   string catchment,
        #   string location,
        #   uint256 originalTonnes,
        #   string ipfsCid,
        #   string sha256Hash,
        #   address recipient
        # )
        landowner_checksum = Web3.to_checksum_address(landowner_address)
        function_call = contract.functions.mintScheme(
            submission.scheme_name,
            submission.catchment,
            submission.location,
            int(submission.total_tonnage),  # Convert to int (tonnes as uint256)
            ipfs_cid,
            sha256_hash,
            landowner_checksum
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
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status != 1:
            raise ValueError("Transaction failed")
        
        # Parse the minted token ID from events
        # SchemeNFT emits a Transfer event when minting (from address(0) to owner)
        # _safeMint in ERC721 emits Transfer(address(0), to, tokenId)
        transfer_events = contract.events.Transfer().process_receipt(receipt)
        
        if transfer_events:
            # Find the mint event (from address(0))
            zero_address = '0x0000000000000000000000000000000000000000'
            for event in transfer_events:
                event_from = event.args.get('from')
                # Handle both string and Address types
                from_address = str(event_from) if event_from else None
                if from_address and from_address.lower() == zero_address.lower():
                    token_id = event.args.get('tokenId')
                    if token_id is not None:
                        return int(token_id)
        
        # Fallback: Try to get token ID from function return value by calling the contract
        # The mintScheme function returns the token ID, but we can't get it from a transaction
        # Instead, we can check the contract state or try alternative event parsing
        # Check if contract is actually deployed and accessible
        try:
            # Try to call a view function to verify contract is deployed
            contract_code = w3.eth.get_code(Web3.to_checksum_address(scheme_nft_address))
            if not contract_code or contract_code == b'':
                raise ValueError(
                    f"Contract not deployed at address {scheme_nft_address}. "
                    "Please deploy the SchemeNFT contract first using: npx hardhat run scripts/deploy.ts --network localhost"
                )
        except Exception as e:
            raise ValueError(f"Error checking contract deployment: {str(e)}")
        
        # If we get here, transaction succeeded but we couldn't parse the event
        # This could mean:
        # 1. The contract ABI doesn't match the actual contract
        # 2. The event format is different than expected
        # 3. The transaction didn't actually mint (reverted silently)
        raise ValueError(
            f"Could not determine minted token ID from transaction receipt. "
            f"No Transfer event found from zero address. "
            f"Transaction hash: {tx_hash.hex()}, "
            f"Receipt status: {receipt.status}, "
            f"Logs count: {len(receipt.logs) if receipt.logs else 0}. "
            f"Please check that the contract is deployed and the ABI matches the contract."
        )
    
    except Exception as e:
        raise ValueError(f"Failed to mint SchemeNFT: {str(e)}")


def get_scheme_nft_abi() -> list:
    """
    Get the ABI for SchemeNFT contract.
    In production, this should be loaded from the compiled contract artifacts.
    """
    # Simplified ABI - includes only the functions we need
    return [
        {
            "inputs": [
                {"internalType": "string", "name": "name", "type": "string"},
                {"internalType": "string", "name": "catchment", "type": "string"},
                {"internalType": "string", "name": "location", "type": "string"},
                {"internalType": "uint256", "name": "originalTonnes", "type": "uint256"},
                {"internalType": "string", "name": "ipfsCid", "type": "string"},
                {"internalType": "string", "name": "sha256Hash", "type": "string"},
                {"internalType": "address", "name": "recipient", "type": "address"}
            ],
            "name": "mintScheme",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "anonymous": False,
            "inputs": [
                {"indexed": True, "internalType": "address", "name": "from", "type": "address"},
                {"indexed": True, "internalType": "address", "name": "to", "type": "address"},
                {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"}
            ],
            "name": "Transfer",
            "type": "event"
        }
    ]
