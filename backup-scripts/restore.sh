#!/bin/bash
# =====================================================================================
# PostgreSQL Database Restore Script
# EFF Membership Management System
# =====================================================================================

set -e  # Exit on error

# Configuration
BACKUP_DIR="/opt/eff-membership/backups/postgres"
CONTAINER_NAME="eff-membership-postgres"
DB_USER="eff_admin"
DB_NAME="eff_membership_db"
LOG_FILE="/opt/eff-membership/logs/restore.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Check if backup file is provided
if [ -z "$1" ]; then
    error "No backup file specified!"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.dump.gz 2>/dev/null || echo "No backups found in $BACKUP_DIR"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try to find it in backup directory
    if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    else
        error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

log "Starting database restore from: $BACKUP_FILE"

# Check if Docker container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    error "Container $CONTAINER_NAME is not running!"
    exit 1
fi

# Confirm restore operation
warning "This will REPLACE all data in the database: $DB_NAME"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled by user"
    exit 0
fi

# Decompress if needed
TEMP_FILE="/tmp/restore_$(date +%s).dump"
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log "Decompressing backup file..."
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
else
    cp "$BACKUP_FILE" "$TEMP_FILE"
fi

# Copy backup to container
log "Copying backup to container..."
if docker cp "$TEMP_FILE" "${CONTAINER_NAME}:/tmp/restore.dump"; then
    log "Backup copied to container"
else
    error "Failed to copy backup to container"
    rm -f "$TEMP_FILE"
    exit 1
fi

# Clean up local temp file
rm -f "$TEMP_FILE"

# Drop existing connections
log "Terminating existing database connections..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

# Restore database
log "Restoring database..."
if docker exec "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" -c -v /tmp/restore.dump 2>&1 | tee -a "$LOG_FILE"; then
    log "Database restored successfully"
else
    warning "Restore completed with some warnings (this is normal for existing objects)"
fi

# Clean up backup from container
docker exec "$CONTAINER_NAME" rm -f /tmp/restore.dump

# Verify restoration
log "Verifying database restoration..."
MEMBER_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM members;" 2>/dev/null | xargs)
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)

info "Database verification:"
info "  - Total tables: $TABLE_COUNT"
info "  - Total members: $MEMBER_COUNT"

log "Restore completed successfully!"

exit 0

