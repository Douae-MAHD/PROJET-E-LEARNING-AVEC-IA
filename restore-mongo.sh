#!/bin/bash

# MongoDB Restore Script
# Usage: ./restore-mongo.sh [backup_name]

set -e

BACKUP_DIR="./data/mongo_backups"

# If no backup specified, list available backups
if [ -z "$1" ]; then
  echo "📋 Available backups:"
  ls -lhS "$BACKUP_DIR" 2>/dev/null | grep "^d" || echo "No backups found!"
  echo ""
  echo "Usage: $0 [backup_name]"
  echo "Example: $0 backup_20250210_120000"
  exit 0
fi

BACKUP_NAME="$1"
FULL_BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Check if backup exists
if [ ! -d "$FULL_BACKUP_PATH" ]; then
  echo "❌ Backup not found: $FULL_BACKUP_PATH"
  exit 1
fi

echo "⚠️  WARNING: This will restore your database from: $FULL_BACKUP_PATH"
echo "All current data will be overwritten!"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "🔄 Starting MongoDB restore..."

# Perform restore using mongorestore
docker exec mongo mongorestore \
  -u admin \
  -p admin123 \
  --authenticationDatabase admin \
  --drop \
  "$FULL_BACKUP_PATH"

if [ $? -eq 0 ]; then
  echo "✅ Restore completed successfully!"
  echo "📊 Database restored from: $FULL_BACKUP_PATH"
else
  echo "❌ Restore failed!"
  exit 1
fi
