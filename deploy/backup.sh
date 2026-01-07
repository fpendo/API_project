#!/bin/bash
#
# Backup Script for NEMX Portal
# Creates backups of database and configuration
#
# Usage: ./backup.sh [backup_dir]
# Example: ./backup.sh /backups
#

set -e

BACKUP_DIR=${1:-"/opt/backups"}
DATE=$(date +%Y%m%d_%H%M%S)
NEMX_DIR="/opt/app/nemx"
PORTAL_DIR="/opt/app/portal"

echo "Creating backup at $BACKUP_DIR..."

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Backup NEMX database
if [ -f "$NEMX_DIR/backend/nemx.db" ]; then
    cp "$NEMX_DIR/backend/nemx.db" "$BACKUP_DIR/$DATE/nemx.db"
    echo "  ✓ NEMX database backed up"
fi

# Backup environment files
if [ -f "$NEMX_DIR/backend/.env" ]; then
    cp "$NEMX_DIR/backend/.env" "$BACKUP_DIR/$DATE/nemx.env"
    echo "  ✓ NEMX .env backed up"
fi

if [ -f "$PORTAL_DIR/backend/.env" ]; then
    cp "$PORTAL_DIR/backend/.env" "$BACKUP_DIR/$DATE/portal.env"
    echo "  ✓ Portal .env backed up"
fi

# Backup Nginx config
cp /etc/nginx/sites-available/portal "$BACKUP_DIR/$DATE/nginx-portal.conf"
echo "  ✓ Nginx config backed up"

# Create archive
cd "$BACKUP_DIR"
tar -czf "backup_$DATE.tar.gz" "$DATE"
rm -rf "$DATE"

echo ""
echo "Backup complete: $BACKUP_DIR/backup_$DATE.tar.gz"

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete
echo "Old backups cleaned up (keeping last 7 days)"

