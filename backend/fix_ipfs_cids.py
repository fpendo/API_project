"""
Script to regenerate proper IPFS CIDs for existing agreement archives
that have the placeholder value "UNPINNED_UNSUPPORTED_IPFS_VERSION"
"""
import os
import sys

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db import SessionLocal
from app.models import AgreementArchive
from app.utils.ipfs import generate_cid_v1

def fix_cids():
    db = SessionLocal()
    
    try:
        # Find all archives with placeholder CID
        archives = db.query(AgreementArchive).filter(
            AgreementArchive.ipfs_cid == "UNPINNED_UNSUPPORTED_IPFS_VERSION"
        ).all()
        
        print(f"Found {len(archives)} archives with placeholder CID")
        
        for archive in archives:
            file_path = archive.file_path
            
            # Check if file exists
            if not os.path.exists(file_path):
                print(f"  [SKIP] Archive #{archive.id}: File not found at {file_path}")
                continue
            
            try:
                # Generate proper CIDv1
                new_cid = generate_cid_v1(file_path)
                
                print(f"  [OK] Archive #{archive.id}:")
                print(f"       Old CID: {archive.ipfs_cid}")
                print(f"       New CID: {new_cid}")
                
                # Update the record
                archive.ipfs_cid = new_cid
                db.commit()
                
            except Exception as e:
                print(f"  [ERROR] Archive #{archive.id}: {e}")
        
        print("\nDone!")
        
    finally:
        db.close()

if __name__ == "__main__":
    fix_cids()

