#!/bin/bash

# Production User Hard Delete Helper Script
# EFF Membership System
# Usage: ./delete-user-production.sh <email>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if email is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ ERROR: Email address is required${NC}"
    echo ""
    echo "Usage: ./delete-user-production.sh <email>"
    echo "Example: ./delete-user-production.sh testuser@example.com"
    exit 1
fi

EMAIL="$1"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Production User Hard Delete${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Warning
echo -e "${RED}⚠️  WARNING: This will permanently delete the user with email: ${EMAIL}${NC}"
echo -e "${RED}This action cannot be undone!${NC}"
echo ""

# Confirm
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}❌ Deletion cancelled${NC}"
    exit 0
fi

# Navigate to backend directory
echo -e "${YELLOW}📂 Navigating to backend directory...${NC}"
cd /var/www/eff-membership-system/backend

# Check if script exists
if [ ! -f "scripts/delete-user.js" ]; then
    echo -e "${RED}❌ ERROR: delete-user.js script not found${NC}"
    echo "Expected location: /var/www/eff-membership-system/backend/scripts/delete-user.js"
    exit 1
fi

# Run deletion script
echo -e "${YELLOW}🗑️  Running deletion script...${NC}"
echo ""
node scripts/delete-user.js "$EMAIL"

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Deletion completed${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${CYAN}To verify deletion, run:${NC}"
    echo "  cd /var/www/eff-membership-system/backend"
    echo "  node scripts/verify-user-deletion.js $EMAIL"
    echo ""
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ Deletion failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Check the error message above for details${NC}"
    exit 1
fi

