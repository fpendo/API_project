"""
Fix .env file by removing duplicate entries and keeping only the latest values.
"""
from pathlib import Path
import re

def fix_env_file():
    """Remove duplicates from .env file, keeping the last occurrence of each variable"""
    env_path = Path(__file__).parent / '.env'
    
    if not env_path.exists():
        print(f"ERROR: .env file not found at {env_path}")
        return False
    
    # Read current .env file
    with open(env_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split into lines
    lines = content.splitlines()
    
    # Track seen variables (keep last occurrence)
    seen_vars = {}
    cleaned_lines = []
    comments_and_empty = []
    
    # Process lines in reverse to keep last occurrence
    for i in range(len(lines) - 1, -1, -1):
        line = lines[i].strip()
        
        # Keep comments and empty lines
        if not line or line.startswith('#'):
            comments_and_empty.insert(0, lines[i])  # Preserve original formatting
            continue
        
        # Check if it's a variable assignment
        match = re.match(r'^([A-Z_]+)=(.*)$', line)
        if match:
            var_name = match.group(1)
            var_value = match.group(2)
            
            # Only keep if we haven't seen this variable yet (since we're going backwards)
            if var_name not in seen_vars:
                seen_vars[var_name] = var_value
                cleaned_lines.insert(0, f"{var_name}={var_value}")
        else:
            # Keep non-variable lines as-is
            cleaned_lines.insert(0, lines[i])
    
    # Reconstruct file: comments/empty at top, then variables
    final_lines = []
    
    # Add comments and empty lines from the beginning
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            final_lines.append(line)
        else:
            break  # Stop when we hit first variable
    
    # Add all variables (without duplicates)
    for line in cleaned_lines:
        if line.strip() and not line.strip().startswith('#'):
            final_lines.append(line)
    
    # Write cleaned .env file
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(final_lines))
        if not final_lines[-1].endswith('\n'):
            f.write('\n')
    
    print("=" * 70)
    print("CLEANED .env FILE - REMOVED DUPLICATES")
    print("=" * 70)
    print()
    print(f"Found and removed duplicates")
    print(f"Kept last occurrence of each variable")
    print()
    print("=" * 70)
    print("[OK] .env file cleaned successfully!")
    print("=" * 70)
    
    return True

if __name__ == "__main__":
    fix_env_file()


