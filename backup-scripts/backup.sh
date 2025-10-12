#!/bin/bash
# =====================================================================================
# PostgreSQL Automated Backup Script
# EFF Membership Management System
# =====================================================================================

set -e  # Exit on error

# Configuration
BACKUP_DIR="/opt/eff-membership/backups/postgres"
CONTAINER_NAME="eff-membership-postgres"
DB_USER="eff_admin"
DB_NAME="eff_membership_db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="eff_membership_backup_${DATE}.dump"
RETENTION_DAYS=30
LOG_FILE="/opt/eff-membership/logs/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log "Starting PostgreSQL backup..."

# Check if Docker container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    error "Container $CONTAINER_NAME is not running!"
    exit 1
fi

# Create backup inside container
log "Creating database dump..."
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f "/tmp/${BACKUP_FILE}"; then
    log "Database dump created successfully"
else
    error "Failed to create database dump"
    exit 1
fi

# Copy backup from container to host
log "Copying backup from container..."
if docker cp "${CONTAINER_NAME}:/tmp/${BACKUP_FILE}" "${BACKUP_DIR}/"; then
    log "Backup copied to ${BACKUP_DIR}/${BACKUP_FILE}"
else
    error "Failed to copy backup from container"
    exit 1
fi

# Clean up backup from container
docker exec "$CONTAINER_NAME" rm -f "/tmp/${BACKUP_FILE}"

# Compress backup
log "Compressing backup..."
if gzip "${BACKUP_DIR}/${BACKUP_FILE}"; then
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(du -h "${BACKUP_DIR}/${COMPRESSED_FILE}" | cut -f1)
    log "Backup compressed: ${COMPRESSED_FILE} (${COMPRESSED_SIZE})"
else
    error "Failed to compress backup"
    exit 1
fi

# Remove old backups
log "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "*.dump.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    log "Deleted ${DELETED_COUNT} old backup(s)"
else
    log "No old backups to delete"
fi

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.dump.gz 2>/dev/null | wc -l)

log "Backup completed successfully!"
log "Total backups: ${BACKUP_COUNT}, Total size: ${TOTAL_SIZE}"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# log "Uploading to cloud storage..."
# aws s3 cp "${BACKUP_DIR}/${COMPRESSED_FILE}" s3://your-bucket/backups/
# rclone copy "${BACKUP_DIR}/${COMPRESSED_FILE}" remote:backups/

exit 0

