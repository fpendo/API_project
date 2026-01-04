#!/usr/bin/env python3
"""
Script to export all code files to a single markdown file.
Excludes common non-code directories and files.
"""
import os
import sys
from pathlib import Path
from datetime import datetime

# Directories and files to exclude
EXCLUDE_DIRS = {
    'node_modules',
    '__pycache__',
    '.git',
    '.vscode',
    '.idea',
    'dist',
    'build',
    '.next',
    'venv',
    'env',
    '.env',
    'target',
    'coverage',
    '.pytest_cache',
    'htmlcov',
    '.mypy_cache',
    '.ruff_cache',
}

EXCLUDE_FILES = {
    '.gitignore',
    '.env',
    '.env.local',
    '.DS_Store',
    'Thumbs.db',
}

EXCLUDE_EXTENSIONS = {
    '.pyc',
    '.pyo',
    '.pyd',
    '.so',
    '.dll',
    '.exe',
    '.db',
    '.sqlite',
    '.sqlite3',
    '.log',
    '.zip',
    '.tar',
    '.gz',
    '.pdf',
    '.docx',
    '.xlsx',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.svg',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
}

# Language mapping for markdown code blocks
LANGUAGE_MAP = {
    '.py': 'python',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.md': 'markdown',
    '.sql': 'sql',
    '.sh': 'bash',
    '.bash': 'bash',
    '.ps1': 'powershell',
    '.sol': 'solidity',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.h': 'c',
    '.hpp': 'cpp',
    '.xml': 'xml',
    '.env': 'bash',
    '.gitignore': 'gitignore',
    '.dockerfile': 'dockerfile',
    '.dockerignore': 'dockerignore',
}

def get_language(file_path):
    """Get the language identifier for markdown code block."""
    ext = Path(file_path).suffix.lower()
    return LANGUAGE_MAP.get(ext, 'text')

def should_exclude(path):
    """Check if a path should be excluded."""
    path_str = str(path)
    
    # Check if any excluded directory is in the path
    for exclude_dir in EXCLUDE_DIRS:
        if exclude_dir in path_str:
            return True
    
    # Check if file is in exclude list
    if path.name in EXCLUDE_FILES:
        return True
    
    # Check extension
    if path.suffix.lower() in EXCLUDE_EXTENSIONS:
        return True
    
    return False

def export_codebase(root_dir, output_file):
    """Export all code files to a markdown file."""
    root_path = Path(root_dir)
    output_path = Path(output_file)
    
    # Get all files
    code_files = []
    for file_path in root_path.rglob('*'):
        if file_path.is_file() and not should_exclude(file_path):
            # Get relative path
            try:
                rel_path = file_path.relative_to(root_path)
                code_files.append((rel_path, file_path))
            except ValueError:
                continue
    
    # Sort files by path
    code_files.sort(key=lambda x: str(x[0]))
    
    # Write to markdown file
    with open(output_path, 'w', encoding='utf-8') as f:
        # Write header
        f.write(f"# Codebase Export\n\n")
        f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**Total Files:** {len(code_files)}\n\n")
        f.write("---\n\n")
        
        # Write each file
        for rel_path, file_path in code_files:
            try:
                # Read file content
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as file_content:
                    content = file_content.read()
                
                # Get language
                language = get_language(file_path)
                
                # Write file header and content
                f.write(f"## `{rel_path}`\n\n")
                f.write(f"```{language}\n")
                f.write(content)
                if not content.endswith('\n'):
                    f.write('\n')
                f.write("```\n\n")
                f.write("---\n\n")
                
            except Exception as e:
                # If file can't be read, just note it
                f.write(f"## `{rel_path}`\n\n")
                f.write(f"*Error reading file: {str(e)}*\n\n")
                f.write("---\n\n")
    
    print(f"[OK] Exported {len(code_files)} files to {output_path}")
    print(f"  Output file size: {output_path.stat().st_size / 1024 / 1024:.2f} MB")

if __name__ == '__main__':
    # Fix encoding for Windows console
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    
    # Default to current directory
    root_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'codebase_export.md'
    
    # Ensure root_dir is absolute
    root_dir = os.path.abspath(root_dir)
    
    print(f"Exporting codebase from: {root_dir}")
    print(f"Output file: {output_file}")
    print()
    
    export_codebase(root_dir, output_file)
    print("\n[OK] Export complete!")

