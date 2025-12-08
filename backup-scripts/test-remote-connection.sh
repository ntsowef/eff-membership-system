#!/bin/bash
# ============================================================================
# Test Remote PostgreSQL Connection (Linux/Mac)
# ============================================================================
# This script tests connectivity to the remote PostgreSQL server
# Run this before attempting a restore to verify everything is set up correctly
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Remote server configuration
REMOTE_HOST="${1:-69.164.245.173}"
REMOTE_PORT="${2:-5432}"
REMOTE_USER="${3:-eff_admin}"
REMOTE_DATABASE="${4:-eff_membership_database}"

echo -e "\n${CYAN}============================================================================${NC}"
echo -e "${CYAN}Remote PostgreSQL Connection Test${NC}"
echo -e "${CYAN}============================================================================${NC}\n"

echo -e "${YELLOW}Testing connection to:${NC}"
echo -e "${GRAY}  Host: $REMOTE_HOST${NC}"
echo -e "${GRAY}  Port: $REMOTE_PORT${NC}"
echo -e "${GRAY}  User: $REMOTE_USER${NC}"
echo -e "${GRAY}  Database: $REMOTE_DATABASE${NC}\n"

ALL_GOOD=true

# Test 1: Network connectivity (ping)
echo -e "${YELLOW}Test 1: Network Connectivity (Ping)${NC}"
if ping -c 2 -W 2 "$REMOTE_HOST" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Host is reachable${NC}"
else
    echo -e "${YELLOW}  ⚠️  Ping failed (may be normal if ICMP is blocked)${NC}"
fi

# Test 2: Port connectivity
echo -e "\n${YELLOW}Test 2: PostgreSQL Port Connectivity${NC}"
if timeout 5 bash -c "cat < /dev/null > /dev/tcp/$REMOTE_HOST/$REMOTE_PORT" 2>/dev/null; then
    echo -e "${GREEN}  ✅ Port $REMOTE_PORT is open and accepting connections${NC}"
else
    echo -e "${RED}  ❌ Port $REMOTE_PORT is not accessible${NC}"
    echo -e "${RED}  Check firewall rules on remote server${NC}"
    ALL_GOOD=false
fi

# Test 3: PostgreSQL client tools
echo -e "\n${YELLOW}Test 3: PostgreSQL Client Tools${NC}"
if command -v pg_dump > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ pg_dump is installed${NC}"
else
    echo -e "${RED}  ❌ pg_dump is not installed${NC}"
    echo -e "${RED}  Install with: sudo apt-get install postgresql-client (Ubuntu/Debian)${NC}"
    ALL_GOOD=false
fi

if command -v pg_restore > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ pg_restore is installed${NC}"
else
    echo -e "${RED}  ❌ pg_restore is not installed${NC}"
    ALL_GOOD=false
fi

if command -v psql > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ psql is installed${NC}"
    PSQL_AVAILABLE=true
else
    echo -e "${YELLOW}  ⚠️  psql is not installed (optional)${NC}"
    PSQL_AVAILABLE=false
fi

# Test 4: Database connection
echo -e "\n${YELLOW}Test 4: PostgreSQL Database Connection${NC}"
echo -e "${GRAY}  You will be prompted for the database password...${NC}"

if [ "$PSQL_AVAILABLE" = true ]; then
    TEST_QUERY="SELECT version();"
    
    if VERSION=$(psql -h "$REMOTE_HOST" -p "$REMOTE_PORT" -U "$REMOTE_USER" -d "$REMOTE_DATABASE" -c "$TEST_QUERY" -t 2>&1); then
        echo -e "${GREEN}  ✅ Successfully connected to database${NC}"
        echo -e "${GRAY}  PostgreSQL Version: $(echo $VERSION | xargs)${NC}"
        
        # Get database size
        SIZE_QUERY="SELECT pg_size_pretty(pg_database_size('$REMOTE_DATABASE'));"
        if SIZE=$(psql -h "$REMOTE_HOST" -p "$REMOTE_PORT" -U "$REMOTE_USER" -d "$REMOTE_DATABASE" -c "$SIZE_QUERY" -t 2>&1); then
            echo -e "${GRAY}  Database Size: $(echo $SIZE | xargs)${NC}"
        fi
        
        # Get table count
        TABLE_QUERY="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
        if TABLES=$(psql -h "$REMOTE_HOST" -p "$REMOTE_PORT" -U "$REMOTE_USER" -d "$REMOTE_DATABASE" -c "$TABLE_QUERY" -t 2>&1); then
            echo -e "${GRAY}  Table Count: $(echo $TABLES | xargs)${NC}"
        fi
    else
        echo -e "${RED}  ❌ Failed to connect to database${NC}"
        echo -e "${RED}  Error: $VERSION${NC}"
        ALL_GOOD=false
    fi
else
    echo -e "${YELLOW}  ⚠️  Skipped (psql not installed)${NC}"
fi

# Summary
echo -e "\n${CYAN}============================================================================${NC}"
echo -e "${CYAN}Test Summary${NC}"
echo -e "${CYAN}============================================================================${NC}\n"

if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    echo -e "${GREEN}You can proceed with the database dump and restore.${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please address the issues above before proceeding.${NC}"
fi

echo -e "\n${CYAN}Next Steps:${NC}"
echo -e "${GRAY}  1. If all tests passed, run: ./dump-and-restore.sh${NC}"
echo -e "${GRAY}  2. If tests failed, fix the issues and run this test again${NC}"
echo -e "${GRAY}  3. See README.md for detailed troubleshooting${NC}"

echo -e "\n${CYAN}============================================================================${NC}\n"

