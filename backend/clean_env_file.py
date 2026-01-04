"""
Properly clean and reconstruct .env file, removing duplicates and fixing formatting.
"""
from pathlib import Path
import re

def clean_env_file():
    """Clean .env file by removing duplicates and fixing formatting"""
    env_path = Path(__file__).parent / '.env'
    
    if not env_path.exists():
        print(f"ERROR: .env file not found at {env_path}")
        return False
    
    # Read current .env file as raw bytes first to see what we're dealing with
    with open(env_path, 'rb') as f:
        raw_content = f.read()
    
    # Decode and split by newlines (handle both \n and \r\n)
    content = raw_content.decode('utf-8')
    all_lines = content.split('\n')
    
    # Parse all variables (keep last occurrence)
    variables = {}
    comments = []
    empty_lines_positions = []
    
    for i, line in enumerate(all_lines):
        stripped = line.strip()
        
        # Track empty lines and comments
        if not stripped:
            empty_lines_positions.append(i)
            continue
        elif stripped.startswith('#'):
            comments.append((i, line))
            continue
        
        # Parse variable assignment
        # Handle cases where multiple assignments might be on one line
        parts = stripped.split('=')
        if len(parts) >= 2:
            var_name = parts[0].strip()
            var_value = '='.join(parts[1:]).strip()  # Rejoin in case value has =
            variables[var_name] = var_value
    
    # Reconstruct file in proper order
    output_lines = []
    
    # Add comments at the top if any
    for pos, comment in sorted(comments):
        if pos < 10:  # Only keep comments near the top
            output_lines.append(comment.rstrip())
    
    # Add variables in a logical order
    preferred_order = [
        'SCHEME_NFT_CONTRACT_ADDRESS',
        'SCHEME_CREDITS_CONTRACT_ADDRESS',
        'PLANNING_LOCK_CONTRACT_ADDRESS',
        'RPC_URL',
        'REGULATOR_PRIVATE_KEY',
        'LANDOWNER_PRIVATE_KEY',
        'DEVELOPER_PRIVATE_KEY',
        'TRADING_ACCOUNT_ADDRESS',
        'TRADING_ACCOUNT_PRIVATE_KEY'
    ]
    
    # Add variables in preferred order
    for var_name in preferred_order:
        if var_name in variables:
            output_lines.append(f"{var_name}={variables[var_name]}")
    
    # Add any remaining variables not in preferred order
    for var_name, var_value in sorted(variables.items()):
        if var_name not in preferred_order:
            output_lines.append(f"{var_name}={var_value}")
    
    # Write cleaned file
    with open(env_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(output_lines))
        f.write('\n')
    
    print("=" * 70)
    print("CLEANED .env FILE")
    print("=" * 70)
    print()
    print("Removed duplicates and fixed formatting")
    print(f"Total variables: {len(variables)}")
    print()
    print("Current contract addresses:")
    if 'SCHEME_NFT_CONTRACT_ADDRESS' in variables:
        print(f"  SCHEME_NFT_CONTRACT_ADDRESS={variables['SCHEME_NFT_CONTRACT_ADDRESS']}")
    if 'SCHEME_CREDITS_CONTRACT_ADDRESS' in variables:
        print(f"  SCHEME_CREDITS_CONTRACT_ADDRESS={variables['SCHEME_CREDITS_CONTRACT_ADDRESS']}")
    if 'PLANNING_LOCK_CONTRACT_ADDRESS' in variables:
        print(f"  PLANNING_LOCK_CONTRACT_ADDRESS={variables['PLANNING_LOCK_CONTRACT_ADDRESS']}")
    print()
    print("=" * 70)
    print("[OK] .env file cleaned successfully!")
    print("=" * 70)
    
    return True

if __name__ == "__main__":
    clean_env_file()


