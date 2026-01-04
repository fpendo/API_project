"""
Completely reconstruct .env file from scratch with correct values.
"""
from pathlib import Path

def reconstruct_env():
    """Reconstruct .env file with correct values"""
    env_path = Path(__file__).parent / '.env'
    
    # Correct contract addresses from latest deployment
    correct_addresses = {
        'SCHEME_NFT_CONTRACT_ADDRESS': '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
        'SCHEME_CREDITS_CONTRACT_ADDRESS': '0x0165878A594ca255338adfa4d48449f69242Eb8F',
        'PLANNING_LOCK_CONTRACT_ADDRESS': '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    }
    
    # Try to read existing values for other variables
    other_vars = {}
    if env_path.exists():
        try:
            with open(env_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line = line.strip()
                    if '=' in line and not line.startswith('#'):
                        parts = line.split('=', 1)
                        if len(parts) == 2:
                            key = parts[0].strip()
                            value = parts[1].strip()
                            # Only keep non-contract-address variables
                            if key not in correct_addresses:
                                other_vars[key] = value
        except:
            pass
    
    # Default values for common variables
    defaults = {
        'RPC_URL': 'http://127.0.0.1:8545',
        'REGULATOR_PRIVATE_KEY': '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    }
    
    # Merge: use existing if available, otherwise use defaults
    for key, default_value in defaults.items():
        if key not in other_vars:
            other_vars[key] = default_value
    
    # Write clean .env file
    with open(env_path, 'w', encoding='utf-8', newline='\n') as f:
        # Write contract addresses first
        f.write('# Contract Addresses\n')
        for key, value in correct_addresses.items():
            f.write(f'{key}={value}\n')
        
        f.write('\n# Configuration\n')
        # Write other variables
        for key, value in sorted(other_vars.items()):
            f.write(f'{key}={value}\n')
    
    print("=" * 70)
    print("RECONSTRUCTED .env FILE")
    print("=" * 70)
    print()
    print("Contract addresses (updated):")
    for key, value in correct_addresses.items():
        print(f"  {key}={value}")
    print()
    print("Other variables (preserved):")
    for key in sorted(other_vars.keys()):
        if 'PRIVATE_KEY' in key:
            print(f"  {key}=***MASKED***")
        else:
            print(f"  {key}={other_vars[key]}")
    print()
    print("=" * 70)
    print("[OK] .env file reconstructed successfully!")
    print("=" * 70)
    
    return True

if __name__ == "__main__":
    reconstruct_env()


