"""
Master setup script to redo all plumbing after redeploying contracts.
This script:
1. Checks and mints SchemeNFTs if needed
2. Updates scheme nft_token_ids in database
3. Mints credits to landowners if needed
4. Sets up ERC-1155 approvals for trading account
5. Verifies account EVM addresses
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3
from app.db import SessionLocal
from app.models import Scheme, Account, AccountRole, Trade
from app.services.nft_integration import mint_scheme_nft
from app.services.credits_integration import mint_scheme_credits

# Fix encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

def get_scheme_nft_abi():
    """Get ABI for SchemeNFT contract"""
    return [
        {
            "inputs": [{"name": "tokenId", "type": "uint256"}],
            "name": "ownerOf",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "tokenId", "type": "uint256"}],
            "name": "getSchemeCatchment",
            "outputs": [{"name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]

def get_scheme_credits_abi():
    """Get ABI for SchemeCredits contract"""
    return [
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
            "constant": False,
            "inputs": [
                {"name": "operator", "type": "address"},
                {"name": "approved", "type": "bool"}
            ],
            "name": "setApprovalForAll",
            "outputs": [],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "owner", "type": "address"},
                {"name": "operator", "type": "address"}
            ],
            "name": "isApprovedForAll",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        }
    ]

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

def check_scheme_exists_on_chain(w3, scheme_nft_address, token_id):
    """Check if a scheme NFT exists on-chain"""
    try:
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(scheme_nft_address),
            abi=get_scheme_nft_abi()
        )
        owner = contract.functions.ownerOf(token_id).call()
        catchment = contract.functions.getSchemeCatchment(token_id).call()
        return owner != '0x0000000000000000000000000000000000000000' and catchment and catchment.strip() != ''
    except Exception:
        return False

def setup_after_redeploy():
    """Main setup function"""
    print("=" * 70)
    print("SETUP AFTER CONTRACT REDEPLOYMENT")
    print("=" * 70)
    print()
    
    # Get environment variables
    scheme_nft_address = os.getenv("SCHEME_NFT_CONTRACT_ADDRESS")
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    regulator_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
    trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_nft_address or not scheme_credits_address or not regulator_private_key:
        print("ERROR: Missing required environment variables in .env:")
        if not scheme_nft_address:
            print("  - SCHEME_NFT_CONTRACT_ADDRESS")
        if not scheme_credits_address:
            print("  - SCHEME_CREDITS_CONTRACT_ADDRESS")
        if not regulator_private_key:
            print("  - REGULATOR_PRIVATE_KEY")
        return False
    
    # Connect to blockchain
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print(f"ERROR: Cannot connect to blockchain at {rpc_url}")
        print("Make sure Hardhat node is running!")
        return False
    
    print(f"Connected to blockchain at {rpc_url}")
    print(f"SchemeNFT: {scheme_nft_address}")
    print(f"SchemeCredits: {scheme_credits_address}")
    print(f"Trading Account: {trading_account_address}")
    print()
    
    db = SessionLocal()
    try:
        # Step 1: Check and mint SchemeNFTs
        print("=" * 70)
        print("STEP 1: Checking and minting SchemeNFTs")
        print("=" * 70)
        print()
        
        schemes = db.query(Scheme).all()
        if not schemes:
            print("No schemes found in database. Nothing to mint.")
        else:
            regulator_account = w3.eth.account.from_key(regulator_private_key)
            regulator_address = regulator_account.address
            
            for scheme in schemes:
                # Check if scheme exists on-chain
                exists = check_scheme_exists_on_chain(w3, scheme_nft_address, scheme.nft_token_id)
                
                if exists:
                    print(f"[OK] Scheme {scheme.id} ({scheme.name}) - NFT Token ID {scheme.nft_token_id} exists on-chain")
                else:
                    print(f"[MINT] Scheme {scheme.id} ({scheme.name}) - Minting NFT...")
                    
                    # Get creator account
                    creator = db.query(Account).filter(Account.id == scheme.created_by_account_id).first()
                    if not creator or not creator.evm_address:
                        print(f"  ERROR: Creator account {scheme.created_by_account_id} not found or has no EVM address")
                        continue
                    
                    try:
                        # Create a mock submission object for minting
                        # We need to create a minimal object that has the required attributes
                        class MockSubmission:
                            def __init__(self, scheme):
                                self.scheme_name = scheme.name
                                self.catchment = scheme.catchment
                                self.location = scheme.location
                                self.total_tonnage = scheme.original_tonnage
                        
                        mock_submission = MockSubmission(scheme)
                        
                        # Mint the NFT
                        token_id = mint_scheme_nft(
                            submission=mock_submission,
                            ipfs_cid=scheme.ipfs_cid or "",
                            sha256_hash=scheme.sha256_hash or "",
                            scheme_nft_address=scheme_nft_address,
                            private_key=regulator_private_key,
                            landowner_address=creator.evm_address,
                            rpc_url=rpc_url
                        )
                        
                        # Update database with new token ID
                        scheme.nft_token_id = token_id
                        db.commit()
                        print(f"  [OK] Minted NFT Token ID: {token_id}")
                    except Exception as e:
                        print(f"  ERROR: Failed to mint: {str(e)}")
                        db.rollback()
        
        print()
        
        # Step 2: Check and mint credits
        print("=" * 70)
        print("STEP 2: Checking and minting credits to landowners")
        print("=" * 70)
        print()
        
        landowners = db.query(Account).filter(Account.role == AccountRole.LANDOWNER).all()
        if not landowners:
            print("No landowners found in database.")
        else:
            for landowner in landowners:
                if not landowner.evm_address:
                    print(f"[SKIP] Landowner {landowner.id} ({landowner.name}) - No EVM address")
                    continue
                
                # Get schemes created by this landowner
                landowner_schemes = db.query(Scheme).filter(
                    Scheme.created_by_account_id == landowner.id
                ).all()
                
                if not landowner_schemes:
                    print(f"[SKIP] Landowner {landowner.id} ({landowner.name}) - No schemes")
                    continue
                
                print(f"Landowner: {landowner.name} (ID: {landowner.id})")
                print(f"  Address: {landowner.evm_address}")
                
                for scheme in landowner_schemes:
                    if not scheme.nft_token_id:
                        print(f"  [SKIP] Scheme {scheme.id} ({scheme.name}) - No NFT token ID")
                        continue
                    
                    # Check on-chain balance
                    try:
                        contract = w3.eth.contract(
                            address=Web3.to_checksum_address(scheme_credits_address),
                            abi=get_scheme_credits_abi()
                        )
                        balance = contract.functions.balanceOf(
                            Web3.to_checksum_address(landowner.evm_address),
                            scheme.nft_token_id
                        ).call()
                        
                        expected_credits = int(scheme.original_tonnage * 100000)
                        
                        if balance >= expected_credits:
                            print(f"  [OK] Scheme {scheme.id} ({scheme.name}) - Balance: {balance:,} credits")
                        else:
                            print(f"  [MINT] Scheme {scheme.id} ({scheme.name}) - Current: {balance:,}, Expected: {expected_credits:,}")
                            credits_to_mint = expected_credits - balance
                            
                            try:
                                mint_scheme_credits(
                                    scheme_id=scheme.nft_token_id,
                                    landowner_address=landowner.evm_address,
                                    original_tonnage=scheme.original_tonnage,
                                    scheme_credits_address=scheme_credits_address,
                                    private_key=regulator_private_key,
                                    rpc_url=rpc_url
                                )
                                print(f"    [OK] Minted {credits_to_mint:,} credits")
                            except Exception as e:
                                print(f"    ERROR: Failed to mint: {str(e)}")
                    except Exception as e:
                        print(f"  ERROR: Failed to check balance: {str(e)}")
                
                print()
        
        # Step 3: Set up ERC-1155 approvals for trading account
        print("=" * 70)
        print("STEP 3: Setting up ERC-1155 approvals for trading account")
        print("=" * 70)
        print()
        
        # Get all accounts that need approval (landowners and regulator)
        accounts_to_approve = db.query(Account).filter(
            Account.role.in_([AccountRole.LANDOWNER, AccountRole.REGULATOR]),
            Account.evm_address.isnot(None)
        ).all()
        
        if not accounts_to_approve:
            print("No accounts found that need approval.")
        else:
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(scheme_credits_address),
                abi=get_scheme_credits_abi()
            )
            
            for account in accounts_to_approve:
                try:
                    # Check if already approved
                    is_approved = contract.functions.isApprovedForAll(
                        Web3.to_checksum_address(account.evm_address),
                        Web3.to_checksum_address(trading_account_address)
                    ).call()
                    
                    if is_approved:
                        print(f"[OK] {account.name} ({account.evm_address[:10]}...) - Already approved")
                    else:
                        print(f"[APPROVE] {account.name} ({account.evm_address[:10]}...) - Setting approval...")
                        
                        # Get private key (use regulator key for all, or account-specific if available)
                        private_key = regulator_private_key
                        if account.role == AccountRole.LANDOWNER:
                            landowner_key = os.getenv("LANDOWNER_PRIVATE_KEY")
                            if landowner_key:
                                private_key = landowner_key
                        
                        # Set approval
                        account_obj = w3.eth.account.from_key(private_key)
                        if account_obj.address.lower() != account.evm_address.lower():
                            print(f"  WARNING: Private key address doesn't match account address. Skipping.")
                            continue
                        
                        function_call = contract.functions.setApprovalForAll(
                            Web3.to_checksum_address(trading_account_address),
                            True
                        )
                        
                        nonce = w3.eth.get_transaction_count(account_obj.address)
                        transaction = function_call.build_transaction({
                            'from': account_obj.address,
                            'nonce': nonce,
                            'gas': 50000,
                            'gasPrice': w3.eth.gas_price
                        })
                        
                        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
                        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
                        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
                        
                        if receipt.status == 1:
                            print(f"  [OK] Approval set successfully (tx: {tx_hash.hex()[:10]}...)")
                        else:
                            print(f"  ERROR: Transaction failed")
                except Exception as e:
                    print(f"  ERROR: {str(e)}")
        
        print()
        
        # Step 4: Verify account EVM addresses
        print("=" * 70)
        print("STEP 4: Verifying account EVM addresses")
        print("=" * 70)
        print()
        
        all_accounts = db.query(Account).all()
        for account in all_accounts:
            if account.evm_address:
                print(f"[OK] {account.name} (ID: {account.id}, Role: {account.role}) - {account.evm_address}")
            else:
                print(f"[MISSING] {account.name} (ID: {account.id}, Role: {account.role}) - No EVM address")
        
        print()
        print("=" * 70)
        print("SETUP COMPLETE!")
        print("=" * 70)
        print()
        print("Next steps:")
        print("1. If you have existing trades, you may need to re-mint credits to developers")
        print("2. Check the developer dashboard to verify holdings appear")
        print("3. Test placing orders to ensure everything works")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = setup_after_redeploy()
    sys.exit(0 if success else 1)

