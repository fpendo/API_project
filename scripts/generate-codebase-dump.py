#!/usr/bin/env python3
"""
Generate a comprehensive markdown file containing all code from the project.
Useful for sharing, documentation, or backup purposes.
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Configure UTF-8 encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# File extensions to include
CODE_EXTENSIONS = {
    '.py': 'Python',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript React',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript React',
    '.sol': 'Solidity',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.css': 'CSS',
    '.html': 'HTML',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.txt': 'Text',
    '.sh': 'Shell',
    '.bat': 'Batch',
    '.ps1': 'PowerShell',
}

# Directories to exclude
EXCLUDE_DIRS = {
    'node_modules',
    '__pycache__',
    '.git',
    '.pytest_cache',
    'dist',
    'build',
    'artifacts',
    'cache',
    'typechain-types',
    '.next',
    'venv',
    'env',
    '.venv',
    'coverage',
    '.idea',
    '.vscode',
    '.cursor',
}

# Files to exclude
EXCLUDE_FILES = {
    'package-lock.json',
    'yarn.lock',
    '.DS_Store',
    'Thumbs.db',
    'CODEBASE_DUMP.md',  # Don't include the dump itself
}

# File patterns to exclude
EXCLUDE_PATTERNS = [
    '*.db',
    '*.log',
    '*.pyc',
    '*.pyo',
    '*.pyd',
    '.env',
    '.env.local',
    '.env.*',
]


def should_include_file(file_path: Path) -> bool:
    """Check if a file should be included in the dump."""
    # Check file extension
    if file_path.suffix not in CODE_EXTENSIONS:
        return False
    
    # Check if file is in exclude list
    if file_path.name in EXCLUDE_FILES:
        return False
    
    # Check exclude patterns
    for pattern in EXCLUDE_PATTERNS:
        if file_path.match(pattern):
            return False
    
    return True


def should_include_dir(dir_path: Path) -> bool:
    """Check if a directory should be traversed."""
    return dir_path.name not in EXCLUDE_DIRS


def get_file_language(file_path: Path) -> str:
    """Get the language name for a file."""
    return CODE_EXTENSIONS.get(file_path.suffix, 'Unknown')


def generate_code_dump(root_dir: Path, output_file: Path, max_file_size: int = 1000000):
    """Generate a markdown file with all project code."""
    
    files_included = []
    files_skipped = []
    total_size = 0
    
    print(f"Generating code dump from: {root_dir}")
    print(f"Output file: {output_file}")
    print("Scanning files...")
    
    # First pass: collect all files
    toc_entries = []
    file_contents = []
    
    for root, dirs, files in os.walk(root_dir):
        # Filter directories
        dirs[:] = [d for d in dirs if should_include_dir(Path(root) / d)]
        
        for file_name in files:
            file_path = Path(root) / file_name
            rel_path = file_path.relative_to(root_dir)
            
            if not should_include_file(file_path):
                files_skipped.append(rel_path)
                continue
            
            try:
                # Check file size
                file_size = file_path.stat().st_size
                if file_size > max_file_size:
                    files_skipped.append(f"{rel_path} (too large: {file_size:,} bytes)")
                    continue
                
                # Read file content
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                    content = file.read()
                
                language = get_file_language(file_path)
                toc_entries.append((rel_path, language))
                file_contents.append((rel_path, language, content, file_size))
                files_included.append(rel_path)
                total_size += file_size
                
            except Exception as e:
                files_skipped.append(f"{rel_path} (error: {str(e)})")
    
    print(f"Found {len(files_included)} files to include")
    print(f"Writing to {output_file}...")
    
    # Write the dump file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            # Write header
            f.write(f"# Complete Codebase Dump\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Project Root:** `{root_dir}`\n\n")
            f.write("---\n\n")
            f.write("## Table of Contents\n\n")
            
            # Write table of contents
            for rel_path, language in toc_entries:
                anchor = str(rel_path).replace('/', '-').replace('\\', '-').replace('.', '-')
                f.write(f"- [`{rel_path}`](#{anchor}) ({language})\n")
            
            f.write("\n---\n\n")
            
            # Write file contents
            for idx, (rel_path, language, content, file_size) in enumerate(file_contents, 1):
                if idx % 10 == 0:
                    print(f"  Writing file {idx}/{len(file_contents)}...")
                
                anchor = str(rel_path).replace('/', '-').replace('\\', '-').replace('.', '-')
                f.write(f"## `{rel_path}`\n\n")
                f.write(f"**Language:** {language}  \n")
                f.write(f"**Size:** {file_size:,} bytes  \n\n")
                
                # Determine code block language
                code_lang = language.lower().replace(' ', '').replace('react', '')
                if code_lang == 'typescriptreact':
                    code_lang = 'tsx'
                elif code_lang == 'javascriptreact':
                    code_lang = 'jsx'
                
                f.write(f"```{code_lang}\n")
                f.write(content)
                if not content.endswith('\n'):
                    f.write('\n')
                f.write("```\n\n")
                f.write("---\n\n")
            
            # Write summary
            f.write("## Summary\n\n")
            f.write(f"- **Total Files Included:** {len(files_included)}\n")
            f.write(f"- **Total Files Skipped:** {len(files_skipped)}\n")
            f.write(f"- **Total Size:** {total_size:,} bytes ({total_size / 1024 / 1024:.2f} MB)\n\n")
            
            if files_skipped:
                f.write("### Skipped Files\n\n")
                for skipped in files_skipped[:100]:  # Limit to first 100
                    f.write(f"- `{skipped}`\n")
                if len(files_skipped) > 100:
                    f.write(f"\n... and {len(files_skipped) - 100} more files ...\n")
        
        print(f"\n[SUCCESS] Code dump generated: {output_file}")
        print(f"   - Included: {len(files_included)} files")
        print(f"   - Skipped: {len(files_skipped)} files")
        print(f"   - Total size: {total_size:,} bytes ({total_size / 1024 / 1024:.2f} MB)")
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Failed to write dump file: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate a markdown file with all project code')
    parser.add_argument('--overwrite', action='store_true', help='Overwrite existing output file without prompting')
    parser.add_argument('--output', type=str, help='Output file path (default: CODEBASE_DUMP.md)')
    args = parser.parse_args()
    
    # Get project root (parent of scripts directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Output file
    if args.output:
        output_file = Path(args.output)
    else:
        output_file = project_root / "CODEBASE_DUMP.md"
    
    # Check if output file exists
    if output_file.exists() and not args.overwrite:
        try:
            response = input(f"Output file {output_file} already exists. Overwrite? (y/n): ")
            if response.lower() != 'y':
                print("Cancelled.")
                sys.exit(0)
        except (EOFError, KeyboardInterrupt):
            print("Cancelled (non-interactive mode). Use --overwrite to skip prompt.")
            sys.exit(0)
    
    print(f"Project root: {project_root}")
    print(f"Output file: {output_file}")
    print("This may take a moment...\n")
    
    success = generate_code_dump(project_root, output_file)
    
    if success:
        print(f"\n✓ Code dump saved to: {output_file}")
        sys.exit(0)
    else:
        print(f"\n✗ Failed to generate code dump")
        sys.exit(1)










