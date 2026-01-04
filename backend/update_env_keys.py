"""
Update .env file with correct private keys for broker, developer, and trading account.
This script safely updates the .env file while preserving other variables.
"""
import os
import sys
from pathlib import Path

# Correct keys for Hardhat accounts
CORRECT_KEYS = {
    "BROKER_PRIVATE_KEY": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",  # Account #2
    "DEVELOPER_PRIVATE_KEY": "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",  # Account #5 (CORRECTED)
    "TRADING_ACCOUNT_ADDRESS": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  # Account #1
    "TRADING_ACCOUNT_PRIVATE_KEY": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"  # Account #1
}

def update_env_file():
    """Update .env file with correct keys."""
    backend_dir = Path(__file__).parent
    env_file = backend_dir / ".env"
    
    print("=" * 80)
    print("UPDATING .ENV FILE WITH CORRECT KEYS")
    print("=" * 80)
    print(f"\n.env file path: {env_file}")
    
    if not env_file.exists():
        print(f"\nERROR: .env file not found at {env_file}")
        print("Creating new .env file...")
        env_file.touch()
    
    # Read existing .env file
    print(f"\nReading existing .env file...")
    lines = []
    existing_vars = {}
    
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    lines.append(line)
                    continue
                
                # Parse key=value pairs
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    existing_vars[key] = value
                    lines.append(line)
                else:
                    lines.append(line)
    
    # Update or add the correct keys
    print(f"\nUpdating keys...")
    updated_count = 0
    added_count = 0
    
    for key, correct_value in CORRECT_KEYS.items():
        if key in existing_vars:
            old_value = existing_vars[key]
            if old_value != correct_value:
                print(f"  [UPDATE] {key}")
                print(f"    Old: {old_value[:30]}...{old_value[-10:]}")
                print(f"    New: {correct_value[:30]}...{correct_value[-10:]}")
                # Update in lines
                for i, line in enumerate(lines):
                    if line.startswith(f"{key}="):
                        lines[i] = f"{key}={correct_value}"
                        break
                updated_count += 1
            else:
                print(f"  [OK] {key} is already correct")
        else:
            print(f"  [ADD] {key}")
            # Add at the end (before any trailing comments/empty lines)
            # Find the last non-empty, non-comment line
            insert_pos = len(lines)
            for i in range(len(lines) - 1, -1, -1):
                if lines[i].strip() and not lines[i].strip().startswith('#'):
                    insert_pos = i + 1
                    break
            lines.insert(insert_pos, f"{key}={correct_value}")
            added_count += 1
    
    # Write back to file
    print(f"\nWriting updated .env file...")
    with open(env_file, 'w', encoding='utf-8') as f:
        for line in lines:
            f.write(line + '\n')
    
    print(f"\n" + "=" * 80)
    print("UPDATE COMPLETE")
    print("=" * 80)
    print(f"  Updated: {updated_count} keys")
    print(f"  Added: {added_count} keys")
    print(f"\nNext steps:")
    print(f"  1. Restart your backend server to load the new keys")
    print(f"  2. Verify with: python verify_env_keys.py")
    
    return updated_count + added_count > 0

if __name__ == "__main__":
    try:
        changes_made = update_env_file()
        if changes_made:
            print(f"\n[SUCCESS] .env file updated successfully!")
        else:
            print(f"\n[INFO] No changes needed - all keys are already correct")
    except Exception as e:
        print(f"\n[ERROR] Failed to update .env file: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

