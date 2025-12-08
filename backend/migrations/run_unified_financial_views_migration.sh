#!/bin/bash

# =====================================================
# Unified Financial Transactions View Migration Script
# Purpose: Run the migration on the server PostgreSQL database
# =====================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE_1="021_unified_financial_transactions_view_server.sql"
MIGRATION_FILE_2="023_financial_dashboard_summary_tables_server.sql"
MIGRATION_PATH_1="${SCRIPT_DIR}/${MIGRATION_FILE_1}"
MIGRATION_PATH_2="${SCRIPT_DIR}/${MIGRATION_FILE_2}"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Unified Financial Views Migration Script${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check if migration files exist
if [ ! -f "$MIGRATION_PATH_1" ]; then
    echo -e "${RED}Error: Migration file 021 not found at ${MIGRATION_PATH_1}${NC}"
    exit 1
fi

if [ ! -f "$MIGRATION_PATH_2" ]; then
    echo -e "${RED}Error: Migration file 023 not found at ${MIGRATION_PATH_2}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Both migration files found${NC}"
echo ""

# Prompt for database connection details
echo -e "${YELLOW}Please provide PostgreSQL connection details:${NC}"
echo ""

read -p "Database Host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database Port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Database Name (default: eff_membership_db): " DB_NAME
DB_NAME=${DB_NAME:-eff_membership_db}

read -p "Database User (default: eff_admin): " DB_USER
DB_USER=${DB_USER:-eff_admin}

read -sp "Database Password: " DB_PASSWORD
echo ""
echo ""

# Confirm before proceeding
echo -e "${YELLOW}Connection Details:${NC}"
echo "  Host: ${DB_HOST}"
echo "  Port: ${DB_PORT}"
echo "  Database: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo ""

read -p "Proceed with migration? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Migration cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Starting migrations...${NC}"
echo ""

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Run migration 021 - Financial Views
echo -e "${BLUE}Running Migration 021: Financial Transaction Views...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_PATH_1"

# Check if migration 021 was successful
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}Migration 021 failed!${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    unset PGPASSWORD
    exit 1
fi

echo ""
echo -e "${GREEN}Migration 021 completed successfully!${NC}"
echo ""

# Run migration 023 - Dashboard Tables
echo -e "${BLUE}Running Migration 023: Financial Dashboard Tables...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_PATH_2"

# Check if migration 023 was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}All migrations completed successfully!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${GREEN}Migration 021 - Financial Views:${NC}"
    echo -e "  ${GREEN}✓${NC} unified_financial_transactions"
    echo -e "  ${GREEN}✓${NC} financial_transactions_summary"
    echo -e "  ${GREEN}✓${NC} pending_financial_reviews"
    echo -e "  ${GREEN}✓${NC} financial_audit_trail_view"
    echo ""
    echo -e "${GREEN}Migration 023 - Dashboard Tables:${NC}"
    echo -e "  ${GREEN}✓${NC} daily_financial_summary"
    echo -e "  ${GREEN}✓${NC} monthly_financial_summary"
    echo -e "  ${GREEN}✓${NC} financial_reviewer_performance"
    echo -e "  ${GREEN}✓${NC} financial_dashboard_cache"
    echo -e "  ${GREEN}✓${NC} financial_kpi_tracking (with 13 initial KPIs)"
    echo ""
    echo -e "${GREEN}Performance indexes have been created.${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Restart your backend application"
    echo "  2. Test the financial dashboard endpoints"
    echo "  3. Verify National Admin can access financial reviews"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}Migration failed!${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo -e "${RED}Please check the error messages above.${NC}"
    echo ""
    exit 1
fi

# Clear password from environment
unset PGPASSWORD

exit 0

