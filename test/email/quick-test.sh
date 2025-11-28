#!/bin/bash

# Quick Email Template Test Script
# This script provides an interactive way to test email templates

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Display header
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║           EFF Membership System - Email Template Test         ║${NC}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if email is provided as argument
if [ -z "$1" ]; then
    echo -e "${YELLOW}No email address provided.${NC}"
    echo -e "${BOLD}Usage:${NC} ./quick-test.sh your-email@example.com [template-name]"
    echo ""
    echo -e "${BOLD}Examples:${NC}"
    echo "  ./quick-test.sh john@example.com"
    echo "  ./quick-test.sh john@example.com welcome-email"
    echo ""
    exit 1
fi

EMAIL=$1
TEMPLATE=$2

# Validate email format
if [[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo -e "${RED}${BOLD}Error: Invalid email format${NC}"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/../../backend" || exit 1

echo -e "${CYAN}Target Email:${NC} $EMAIL"
echo ""

# Run the test
if [ -z "$TEMPLATE" ]; then
    echo -e "${GREEN}Running all email template tests...${NC}"
    echo ""
    npm run test:email -- --email "$EMAIL"
else
    echo -e "${GREEN}Testing template: ${BOLD}$TEMPLATE${NC}"
    echo ""
    npm run test:email -- --email "$EMAIL" --template "$TEMPLATE"
fi

