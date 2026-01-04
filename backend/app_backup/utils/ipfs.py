import os
import hashlib
import ipfshttpclient
from typing import Optional


def pin_file_to_ipfs(file_path: str, ipfs_host: str = "/ip4/127.0.0.1/tcp/5001") -> str:
    """
    Pin a file to IPFS and return the CID.
    
    Args:
        file_path: Path to the file to pin
        ipfs_host: IPFS daemon address (default: localhost:5001)
    
    Returns:
        CID string of the pinned file
    
    Raises:
        FileNotFoundError: If the file doesn't exist
        ConnectionError: If IPFS daemon is not reachable
        Exception: For other IPFS errors
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    try:
        # Connect to IPFS daemon
        client = ipfshttpclient.connect(ipfs_host)
        
        # Add file to IPFS
        result = client.add(file_path)
        
        # Extract CID from result
        # The result can be a dict or a list depending on ipfshttpclient version
        if isinstance(result, list):
            cid = result[0]['Hash']
        elif isinstance(result, dict):
            cid = result['Hash']
        else:
            cid = str(result)
        
        return cid
    
    except ipfshttpclient.exceptions.ConnectionError:
        raise ConnectionError("Could not connect to IPFS daemon. Make sure IPFS is running on localhost:5001")
    except Exception as e:
        raise Exception(f"Error pinning file to IPFS: {str(e)}")


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
