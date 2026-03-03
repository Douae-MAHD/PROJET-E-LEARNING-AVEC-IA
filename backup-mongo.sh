#!/bin/bash

# MongoDB Backup Script
# Usage: ./backup-mongo.sh [optional_backup_name]

set -e

BACKUP_DIR="./data/mongo_backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup_${TIMESTAMP}}"
FULL_BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting MongoDB backup..."
echo "📁 Backup location: $FULL_BACKUP_PATH"

# Perform backup using mongodump
docker exec mongo mongodump \
  -u admin \
  -p admin123 \
  --authenticationDatabase admin \
  -o "$FULL_BACKUP_PATH"

if [ $? -eq 0 ]; then
  echo "✅ Backup completed successfully!"
  echo "📦 Backup saved to: $FULL_BACKUP_PATH"
  
  # Show backup size
  SIZE=$(du -sh "$FULL_BACKUP_PATH" | cut -f1)
  echo "📊 Backup size: $SIZE"
  
  # List recent backups
  echo ""
  echo "📋 Recent backups:"
  ls -lhS "$BACKUP_DIR" | grep "^d" | head -5
else
  echo "❌ Backup failed!"
  exit 1
fi
