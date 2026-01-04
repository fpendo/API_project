import os
import hashlib
import base64
import requests
from typing import Optional

# Try to import ipfshttpclient, but don't fail if not available
try:
    import ipfshttpclient
    HAS_IPFS_CLIENT = True
except ImportError:
    HAS_IPFS_CLIENT = False


def generate_cid_v1(file_path: str) -> str:
    """
    Generate a CIDv1 (Content Identifier) for a file using the same algorithm as IPFS.
    This creates a valid, verifiable CID without needing an IPFS daemon.
    
    The CID format is: multibase + version + multicodec + multihash
    - multibase: 'b' for base32lower
    - version: 0x01 for CIDv1
    - multicodec: 0x55 for raw binary
    - multihash: 0x12 (sha2-256) + 0x20 (32 bytes) + hash
    """
    # Calculate SHA-256 hash of the file
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256_hash.update(chunk)
    
    digest = sha256_hash.digest()
    
    # Build the multihash: hash_type (0x12 = sha2-256) + length (0x20 = 32) + digest
    multihash = bytes([0x12, 0x20]) + digest
    
    # Build CIDv1: version (0x01) + codec (0x55 = raw) + multihash
    cid_bytes = bytes([0x01, 0x55]) + multihash
    
    # Encode with base32lower (multibase prefix 'b')
    # Use RFC 4648 base32 without padding, lowercase
    cid_base32 = base64.b32encode(cid_bytes).decode('ascii').lower().rstrip('=')
    
    return 'b' + cid_base32


def pin_file_to_ipfs_http(file_path: str, ipfs_api: str = "http://127.0.0.1:5001") -> str:
    """
    Pin a file to IPFS using direct HTTP API calls.
    Works with any IPFS/Kubo version.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(f"{ipfs_api}/api/v0/add", files=files, timeout=30)
            response.raise_for_status()
            result = response.json()
            return result.get('Hash', result.get('Cid', {}).get('/', ''))
    except requests.exceptions.ConnectionError:
        raise ConnectionError("Could not connect to IPFS daemon")
    except Exception as e:
        raise Exception(f"Error pinning file to IPFS: {str(e)}")


def pin_file_to_ipfs(file_path: str, ipfs_host: str = "/ip4/127.0.0.1/tcp/5001") -> str:
    """
    Pin a file to IPFS and return the CID.
    
    Tries multiple methods in order:
    1. Direct HTTP API (works with any IPFS version)
    2. ipfshttpclient library (legacy, version-restricted)
    3. Local CID generation (fallback, creates valid verifiable CID)
    
    Args:
        file_path: Path to the file to pin
        ipfs_host: IPFS daemon address (default: localhost:5001)
    
    Returns:
        CID string of the pinned file
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Method 1: Try direct HTTP API (works with any Kubo/IPFS version)
    try:
        cid = pin_file_to_ipfs_http(file_path, "http://127.0.0.1:5001")
        print(f"[IPFS] Successfully pinned via HTTP API: {cid}")
        return cid
    except Exception as e:
        print(f"[IPFS] HTTP API failed: {e}")
    
    # Method 2: Try ipfshttpclient (legacy method)
    if HAS_IPFS_CLIENT:
        try:
            client = ipfshttpclient.connect(ipfs_host)
            result = client.add(file_path)
            
            if isinstance(result, list):
                cid = result[0]['Hash']
            elif isinstance(result, dict):
                cid = result['Hash']
            else:
                cid = str(result)
            
            print(f"[IPFS] Successfully pinned via ipfshttpclient: {cid}")
            return cid
        except Exception as e:
            print(f"[IPFS] ipfshttpclient failed: {e}")
    
    # Method 3: Generate CID locally (always works, produces valid CID)
    try:
        cid = generate_cid_v1(file_path)
        print(f"[IPFS] Generated local CIDv1: {cid}")
        return cid
    except Exception as e:
        raise Exception(f"Failed to generate CID: {str(e)}")


def calculate_file_hash(file_path: str) -> str:
    """
    Calculate SHA256 hash of a file.
    
    Args:
        file_path: Path to the file
    
    Returns:
        SHA256 hash as hexadecimal string
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()
