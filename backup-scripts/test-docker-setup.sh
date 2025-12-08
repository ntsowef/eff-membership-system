#!/bin/bash
# ============================================================================
# Test Docker Setup for Database Dump and Restore (Linux/Mac)
# ============================================================================
# This script verifies that your Docker environment is ready for
# database dump and restore operations
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "\n${CYAN}============================================================================${NC}"
echo -e "${CYAN}Docker Setup Verification for Database Dump and Restore${NC}"
echo -e "${CYAN}============================================================================${NC}\n"

ALL_GOOD=true

# Test 1: Docker is installed and running
echo -e "${YELLOW}Test 1: Docker Installation and Status${NC}"
if command -v docker > /dev/null 2>&1; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}  ✅ Docker is installed: $DOCKER_VERSION${NC}"
    
    # Check if Docker daemon is running
    if docker info > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ Docker daemon is running${NC}"
    else
        echo -e "${RED}  ❌ Docker daemon is not running${NC}"
        echo -e "${RED}  Start Docker and try again${NC}"
        ALL_GOOD=false
    fi
else
    echo -e "${RED}  ❌ Docker is not installed${NC}"
    echo -e "${RED}  Install Docker from: https://docs.docker.com/get-docker/${NC}"
    ALL_GOOD=false
fi

# Test 2: Local PostgreSQL container
echo -e "\n${YELLOW}Test 2: Local PostgreSQL Container${NC}"
CONTAINER_NAME="eff-membership-postgres"
if docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}  ✅ Container '$CONTAINER_NAME' is running${NC}"
    
    # Get container details
    CONTAINER_STATUS=$(docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}")
    echo -e "${GRAY}  Status: $CONTAINER_STATUS${NC}"
    
    # Test database connection
    echo -e "${GRAY}  Testing database connection...${NC}"
    if docker exec "$CONTAINER_NAME" psql -U eff_admin -d eff_membership_database -c "SELECT version();" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ Database is accessible${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Database connection test failed${NC}"
    fi
else
    echo -e "${RED}  ❌ Container '$CONTAINER_NAME' is not running${NC}"
    echo -e "${YELLOW}  Start it with: docker-compose -f docker-compose.postgres.yml up -d${NC}"
    ALL_GOOD=false
fi

# Test 3: Environment file
echo -e "\n${YELLOW}Test 3: Environment Configuration${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}  ✅ .env file exists${NC}"
    
    # Check for required variables
    REQUIRED_VARS=("POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^$var=" "$ENV_FILE"; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -eq 0 ]; then
        echo -e "${GREEN}  ✅ All required variables are present${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Missing variables: ${MISSING_VARS[*]}${NC}"
    fi
else
    echo -e "${RED}  ❌ .env file not found${NC}"
    echo -e "${YELLOW}  Copy .env.postgres to .env and configure it${NC}"
    ALL_GOOD=false
fi

# Test 4: Backup directory
echo -e "\n${YELLOW}Test 4: Backup Directory${NC}"
BACKUP_DIR="$SCRIPT_DIR/../backups/postgres"
if [ -d "$BACKUP_DIR" ]; then
    echo -e "${GREEN}  ✅ Backup directory exists: $BACKUP_DIR${NC}"
    
    # Check write permissions
    if [ -w "$BACKUP_DIR" ]; then
        echo -e "${GREEN}  ✅ Directory is writable${NC}"
    else
        echo -e "${RED}  ❌ Directory is not writable${NC}"
        ALL_GOOD=false
    fi
else
    echo -e "${YELLOW}  ⚠️  Backup directory doesn't exist (will be created)${NC}"
fi

# Test 5: SSH client (for remote restore)
echo -e "\n${YELLOW}Test 5: SSH Client (for remote restore)${NC}"
if command -v ssh > /dev/null 2>&1; then
    SSH_VERSION=$(ssh -V 2>&1)
    echo -e "${GREEN}  ✅ SSH client is available: $SSH_VERSION${NC}"
else
    echo -e "${YELLOW}  ⚠️  SSH client not found${NC}"
    echo -e "${GRAY}  SSH is required for remote restore${NC}"
fi

# Test 6: SCP (for file transfer)
echo -e "\n${YELLOW}Test 6: SCP (for file transfer)${NC}"
if command -v scp > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ SCP is available${NC}"
else
    echo -e "${YELLOW}  ⚠️  SCP not found${NC}"
    echo -e "${GRAY}  SCP is required for remote restore${NC}"
fi

# Test 7: Remote server connectivity (optional)
echo -e "\n${YELLOW}Test 7: Remote Server Connectivity (Optional)${NC}"
REMOTE_HOST="69.164.245.173"
if ping -c 2 -W 2 "$REMOTE_HOST" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Remote server is reachable${NC}"
else
    echo -e "${YELLOW}  ⚠️  Remote server is not reachable${NC}"
    echo -e "${GRAY}  This may be normal if ICMP is blocked${NC}"
fi

# Summary
echo -e "\n${CYAN}============================================================================${NC}"
echo -e "${CYAN}Test Summary${NC}"
echo -e "${CYAN}============================================================================${NC}\n"

if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    echo -e "${GREEN}Your system is ready for database dump and restore operations.${NC}"
    echo -e "\n${CYAN}Next steps:${NC}"
    echo -e "${GRAY}  1. Run: ./backup-scripts/docker-dump-and-restore.sh dump${NC}"
    echo -e "${GRAY}  2. Verify the dump file was created${NC}"
    echo -e "${GRAY}  3. Run full dump and restore when ready${NC}"
else
    echo -e "${YELLOW}⚠️  Some critical tests failed.${NC}"
    echo -e "${YELLOW}Please address the issues above before proceeding.${NC}"
    echo -e "\n${CYAN}Common fixes:${NC}"
    echo -e "${GRAY}  - Start Docker service${NC}"
    echo -e "${GRAY}  - Run: docker-compose -f docker-compose.postgres.yml up -d${NC}"
    echo -e "${GRAY}  - Ensure .env file exists and is configured${NC}"
fi

echo -e "\n${CYAN}============================================================================${NC}\n"

