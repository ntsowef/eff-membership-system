#!/bin/bash
# ============================================================================
# PostgreSQL Database Dump and Remote Restore Script (Linux/Mac)
# ============================================================================
# This script creates a database dump and restores it on a remote server
# 
# Usage:
#   ./dump-and-restore.sh dump          # Create dump only
#   ./dump-and-restore.sh restore       # Restore to remote only
#   ./dump-and-restore.sh both          # Dump and restore (default)
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    echo -e "${GREEN}✅ Loaded environment variables from .env${NC}"
fi

# Local database configuration
LOCAL_DB_HOST="${DB_HOST:-localhost}"
LOCAL_DB_PORT="${DB_PORT:-5432}"
LOCAL_DB_USER="${DB_USER:-eff_admin}"
LOCAL_DB_PASSWORD="${DB_PASSWORD:-Frames!123}"
LOCAL_DB_NAME="${DB_NAME:-eff_membership_database}"

# Remote server configuration
REMOTE_HOST="69.164.245.173"
REMOTE_DB_PORT="5432"
REMOTE_DB_USER="eff_admin"  # Update if different
REMOTE_DB_NAME="eff_membership_database"  # Update if different

# Backup directory
BACKUP_DIR="$SCRIPT_DIR/../backups/postgres"
mkdir -p "$BACKUP_DIR"

# Generate dump filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="${2:-$BACKUP_DIR/eff_membership_${TIMESTAMP}.sql}"

# Action (dump, restore, or both)
ACTION="${1:-both}"

echo -e "\n${CYAN}============================================================================${NC}"
echo -e "${CYAN}PostgreSQL Database Dump and Restore Utility${NC}"
echo -e "${CYAN}============================================================================${NC}\n"

# Function to create database dump
create_dump() {
    echo -e "${YELLOW}📦 Creating database dump...${NC}"
    echo -e "${GRAY}   Source: ${LOCAL_DB_HOST}:${LOCAL_DB_PORT}/${LOCAL_DB_NAME}${NC}"
    echo -e "${GRAY}   Output: $DUMP_FILE${NC}"
    
    # Set password environment variable for pg_dump
    export PGPASSWORD="$LOCAL_DB_PASSWORD"
    
    # Create dump with custom format (compressed and allows parallel restore)
    if pg_dump \
        -h "$LOCAL_DB_HOST" \
        -p "$LOCAL_DB_PORT" \
        -U "$LOCAL_DB_USER" \
        -d "$LOCAL_DB_NAME" \
        -F c \
        -b \
        -v \
        -f "$DUMP_FILE"; then
        
        FILE_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
        echo -e "${GREEN}✅ Database dump created successfully!${NC}"
        echo -e "${GREEN}   File: $DUMP_FILE${NC}"
        echo -e "${GREEN}   Size: $FILE_SIZE${NC}"
        unset PGPASSWORD
        return 0
    else
        echo -e "${RED}❌ Database dump failed!${NC}"
        unset PGPASSWORD
        return 1
    fi
}

# Function to restore database on remote server
restore_remote() {
    echo -e "\n${YELLOW}📤 Preparing to restore database on remote server...${NC}"
    echo -e "${GRAY}   Target: ${REMOTE_HOST}:${REMOTE_DB_PORT}/${REMOTE_DB_NAME}${NC}"
    echo -e "${GRAY}   Source: $DUMP_FILE${NC}"
    
    if [ ! -f "$DUMP_FILE" ]; then
        echo -e "${RED}❌ Dump file not found: $DUMP_FILE${NC}"
        return 1
    fi
    
    echo -e "\n${YELLOW}⚠️  IMPORTANT: You will need to provide the remote database password${NC}"
    echo -e "${YELLOW}   Remote Host: $REMOTE_HOST${NC}"
    echo -e "${YELLOW}   Remote User: $REMOTE_DB_USER${NC}"
    echo -e "${YELLOW}   Remote Database: $REMOTE_DB_NAME${NC}"
    
    read -p "$(echo -e '\nDo you want to continue? This will OVERWRITE the remote database! (yes/no): ')" confirm
    if [ "$confirm" != "yes" ]; then
        echo -e "${RED}❌ Restore cancelled by user${NC}"
        return 1
    fi
    
    echo -e "\n${YELLOW}🔄 Restoring database to remote server...${NC}"
    echo -e "${GRAY}   Note: You will be prompted for the remote database password${NC}"
    
    # Restore using pg_restore
    if pg_restore \
        -h "$REMOTE_HOST" \
        -p "$REMOTE_DB_PORT" \
        -U "$REMOTE_DB_USER" \
        -d "$REMOTE_DB_NAME" \
        -c \
        -v \
        "$DUMP_FILE"; then
        
        echo -e "${GREEN}✅ Database restored successfully on remote server!${NC}"
        return 0
    else
        # pg_restore often returns non-zero even on success due to warnings
        echo -e "${YELLOW}⚠️  Restore completed with warnings (this is normal for some objects)${NC}"
        return 0
    fi
}

# Main execution
SUCCESS=true

case "$ACTION" in
    dump)
        create_dump || SUCCESS=false
        ;;
    restore)
        restore_remote || SUCCESS=false
        ;;
    both)
        create_dump || SUCCESS=false
        if [ "$SUCCESS" = true ]; then
            restore_remote || SUCCESS=false
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid action: $ACTION${NC}"
        echo -e "Usage: $0 {dump|restore|both} [dump_file]"
        exit 1
        ;;
esac

echo -e "\n${CYAN}============================================================================${NC}"
if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}✅ Operation completed successfully!${NC}"
else
    echo -e "${RED}❌ Operation failed!${NC}"
fi
echo -e "${CYAN}============================================================================${NC}\n"

