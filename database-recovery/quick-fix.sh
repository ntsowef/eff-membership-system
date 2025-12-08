#!/bin/bash

# Quick Production Fix Script
# Run this on your production server to fix the database view issue

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-eff_membership_db}"
SQL_FILE="/tmp/fix_optimized_view_expiry_date.sql"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PRODUCTION DATABASE FIX SCRIPT       ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}✗ ERROR: SQL file not found: $SQL_FILE${NC}"
    echo -e "${YELLOW}Please upload the SQL file first:${NC}"
    echo -e "  scp database-recovery/fix_optimized_view_expiry_date.sql user@server:/tmp/"
    exit 1
fi

echo -e "${GREEN}✓ SQL file found${NC}"
echo ""

# Step 1: Backup
echo -e "${YELLOW}[1/8] Creating database backup...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi
echo ""

# Step 2: Check current view
echo -e "${YELLOW}[2/8] Checking current view...${NC}"
CURRENT_COLUMNS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'vw_member_details_optimized';" 2>/dev/null)
echo -e "${GREEN}✓ Current view has $CURRENT_COLUMNS columns${NC}"
echo ""

# Step 3: Confirm
echo -e "${YELLOW}[3/8] Ready to apply fix${NC}"
echo -e "Database: ${GREEN}$DB_NAME${NC}"
echo -e "Host: ${GREEN}$DB_HOST:$DB_PORT${NC}"
echo -e "Backup: ${GREEN}$BACKUP_FILE${NC}"
echo ""
echo -e "${RED}⚠ WARNING: This will modify the production database!${NC}"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Aborted by user${NC}"
    exit 0
fi
echo ""

# Step 4: Apply fix
echo -e "${YELLOW}[4/8] Applying database fix...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database fix applied successfully${NC}"
else
    echo -e "${RED}✗ Database fix failed!${NC}"
    echo -e "${YELLOW}To rollback:${NC}"
    echo -e "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
    exit 1
fi
echo ""

# Step 5: Verify columns
echo -e "${YELLOW}[5/8] Verifying fix...${NC}"
REQUIRED_COLUMNS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'vw_member_details_optimized' AND column_name IN ('expiry_date', 'membership_status', 'days_until_expiry', 'membership_amount');" 2>/dev/null)

if [ "$REQUIRED_COLUMNS" -eq 4 ]; then
    echo -e "${GREEN}✓ All 4 required columns exist${NC}"
else
    echo -e "${RED}✗ Verification failed! Expected 4 columns, found $REQUIRED_COLUMNS${NC}"
    exit 1
fi
echo ""

# Step 6: Test query
echo -e "${YELLOW}[6/8] Testing query...${NC}"
TEST_RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM vw_member_details_optimized WHERE expiry_date IS NOT NULL LIMIT 1;" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Query test successful${NC}"
else
    echo -e "${RED}✗ Query test failed!${NC}"
    exit 1
fi
echo ""

# Step 7: Clear cache
echo -e "${YELLOW}[7/8] Clearing Redis cache...${NC}"
if command -v redis-cli &> /dev/null; then
    redis-cli FLUSHALL > /dev/null 2>&1
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
echo -e "${YELLOW}[8/8] Restarting application...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart eff-api > /dev/null 2>&1
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

# Success
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     FIX APPLIED SUCCESSFULLY! ✓        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Backup: ${GREEN}$BACKUP_FILE${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Monitor logs: ${GREEN}pm2 logs eff-api${NC}"
echo -e "  2. Test digital card in browser"
echo -e "  3. Verify no errors"
echo ""
echo -e "${BLUE}To rollback if needed:${NC}"
echo -e "  ${YELLOW}psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE${NC}"
echo ""

