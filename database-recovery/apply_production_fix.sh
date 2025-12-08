#!/bin/bash

# Production Database Fix Script
# This script safely applies the database view fix to production

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-eff_membership_db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
SQL_FILE="./fix_optimized_view_expiry_date.sql"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  PRODUCTION DATABASE FIX SCRIPT${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}ERROR: SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Backup Database
echo -e "${YELLOW}Step 1: Creating database backup...${NC}"
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}  Backup size: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi

echo ""

# Step 2: Check current view
echo -e "${YELLOW}Step 2: Checking current view structure...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'vw_member_details_optimized' ORDER BY ordinal_position;" -t

echo ""

# Step 3: Confirm execution
echo -e "${YELLOW}Step 3: Ready to apply fix${NC}"
echo -e "${RED}WARNING: This will modify the production database!${NC}"
echo -e "Database: ${GREEN}$DB_NAME${NC}"
echo -e "Host: ${GREEN}$DB_HOST:$DB_PORT${NC}"
echo -e "Backup: ${GREEN}$BACKUP_FILE${NC}"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Aborted by user${NC}"
    exit 0
fi

echo ""

# Step 4: Apply SQL fix
echo -e "${YELLOW}Step 4: Applying database fix...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database fix applied successfully${NC}"
else
    echo -e "${RED}✗ Database fix failed!${NC}"
    echo -e "${YELLOW}To rollback, run:${NC}"
    echo -e "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
    exit 1
fi

echo ""

# Step 5: Verify fix
echo -e "${YELLOW}Step 5: Verifying fix...${NC}"
COLUMN_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'vw_member_details_optimized' AND column_name IN ('expiry_date', 'membership_status', 'days_until_expiry', 'membership_amount');")

if [ "$COLUMN_COUNT" -eq 4 ]; then
    echo -e "${GREEN}✓ All required columns exist${NC}"
else
    echo -e "${RED}✗ Verification failed! Expected 4 columns, found $COLUMN_COUNT${NC}"
    exit 1
fi

echo ""

# Step 6: Test query
echo -e "${YELLOW}Step 6: Testing query...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT member_id, firstname, surname, membership_status, expiry_date FROM vw_member_details_optimized LIMIT 1;"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Query test successful${NC}"
else
    echo -e "${RED}✗ Query test failed!${NC}"
    exit 1
fi

echo ""

# Step 7: Clear cache
echo -e "${YELLOW}Step 7: Clearing Redis cache...${NC}"
if command -v redis-cli &> /dev/null; then
    redis-cli FLUSHALL
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Redis cache cleared${NC}"
    else
        echo -e "${YELLOW}⚠ Redis cache clear failed (non-critical)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ redis-cli not found, skipping cache clear${NC}"
fi

echo ""

# Step 8: Restart application
echo -e "${YELLOW}Step 8: Restarting application...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart eff-api
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Application restarted${NC}"
    else
        echo -e "${RED}✗ Application restart failed!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ PM2 not found, please restart application manually${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  FIX APPLIED SUCCESSFULLY!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Backup location: ${GREEN}$BACKUP_FILE${NC}"
echo -e "Next steps:"
echo -e "  1. Monitor application logs: ${GREEN}pm2 logs eff-api${NC}"
echo -e "  2. Test digital card functionality"
echo -e "  3. Monitor for errors"
echo ""
echo -e "To rollback if needed:"
echo -e "  ${YELLOW}psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE${NC}"
echo ""

