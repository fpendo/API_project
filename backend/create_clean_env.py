"""
Create a clean .env file from scratch with correct values.
"""
from pathlib import Path

def create_clean_env():
    """Create a clean .env file"""
    env_path = Path(__file__).parent / '.env'
    
    # Correct values
    env_content = """# Contract Addresses (updated after Hardhat restart)
SCHEME_NFT_CONTRACT_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
SCHEME_CREDITS_CONTRACT_ADDRESS=0x0165878A594ca255338adfa4d48449f69242Eb8F
PLANNING_LOCK_CONTRACT_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853

# Network Configuration
RPC_URL=http://127.0.0.1:8545

# Private Keys (Hardhat account #0 - deterministic)
REGULATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
"""
    
    # Write clean file
    with open(env_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(env_content)
    
    print("=" * 70)
    print("CREATED CLEAN .env FILE")
    print("=" * 70)
    print()
    print("Contract addresses:")
    print("  SCHEME_NFT_CONTRACT_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707")
    print("  SCHEME_CREDITS_CONTRACT_ADDRESS=0x0165878A594ca255338adfa4d48449f69242Eb8F")
    print("  PLANNING_LOCK_CONTRACT_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853")
    print()
    print("Configuration:")
    print("  RPC_URL=http://127.0.0.1:8545")
    print("  REGULATOR_PRIVATE_KEY=***SET***")
    print()
    print("=" * 70)
    print("[OK] Clean .env file created!")
    print("=" * 70)
    
    return True

if __name__ == "__main__":
    create_clean_env()


