"""
Update .env file with new contract addresses after redeployment.
"""
import os
from pathlib import Path
import re

# New contract addresses from deployment
NEW_ADDRESSES = {
    "SCHEME_NFT_CONTRACT_ADDRESS": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    "SCHEME_CREDITS_CONTRACT_ADDRESS": "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    "PLANNING_LOCK_CONTRACT_ADDRESS": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"
}

def update_env_file():
    """Update .env file with new contract addresses"""
    env_path = Path(__file__).parent / '.env'
    
    if not env_path.exists():
        print(f"ERROR: .env file not found at {env_path}")
        return False
    
    # Read current .env file
    with open(env_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Update or add addresses
    updated = {}
    new_lines = []
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped or line_stripped.startswith('#'):
            # Keep comments and empty lines
            new_lines.append(line)
            continue
        
        # Check if this line contains an address we need to update
        for var_name, new_address in NEW_ADDRESSES.items():
            if line_stripped.startswith(f"{var_name}="):
                # Update existing line
                new_lines.append(f"{var_name}={new_address}\n")
                updated[var_name] = True
                break
        else:
            # Keep line as-is
            new_lines.append(line)
    
    # Add any missing addresses
    for var_name, new_address in NEW_ADDRESSES.items():
        if var_name not in updated:
            new_lines.append(f"{var_name}={new_address}\n")
            updated[var_name] = True
    
    # Write updated .env file
    with open(env_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print("=" * 70)
    print("UPDATED .env FILE WITH NEW CONTRACT ADDRESSES")
    print("=" * 70)
    print()
    for var_name, address in NEW_ADDRESSES.items():
        print(f"  {var_name}={address}")
    print()
    print("=" * 70)
    print("[OK] .env file updated successfully!")
    print()
    print("Next steps:")
    print("1. Restart your backend server")
    print("2. The errors should now be resolved")
    print("=" * 70)
    
    return True

if __name__ == "__main__":
    update_env_file()

