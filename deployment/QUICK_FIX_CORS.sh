#!/bin/bash

# ============================================================================
# Quick Fix for CORS x-session-id Header Error
# ============================================================================
# This script automatically updates Nginx configuration to allow x-session-id
# header in CORS requests
# ============================================================================

set -e  # Exit on error

echo "🔧 EFF Membership System - CORS Header Fix"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root or with sudo${NC}"
    exit 1
fi

# Nginx config file path
NGINX_CONFIG="/etc/nginx/sites-available/eff-membership"

# Check if config file exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Nginx config file not found: $NGINX_CONFIG${NC}"
    echo "Please update the NGINX_CONFIG variable in this script"
    exit 1
fi

echo -e "${YELLOW}📋 Step 1: Backing up current configuration...${NC}"
BACKUP_FILE="${NGINX_CONFIG}.backup-$(date +%Y%m%d-%H%M%S)"
cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
echo ""

echo -e "${YELLOW}📋 Step 2: Removing duplicate CORS headers from Nginx...${NC}"
echo -e "${YELLOW}   (CORS is handled by Node.js backend)${NC}"

# Check if CORS headers exist in Nginx config
if grep -q "Access-Control-Allow-Origin" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}   Found CORS headers in Nginx config - removing them...${NC}"

    # Create a temporary file
    TEMP_FILE=$(mktemp)

    # Remove CORS section (from "# CORS headers" to the closing brace of OPTIONS block)
    # This is a complex sed operation, so we'll use a more reliable approach
    awk '
    /# CORS headers \(if needed\)/ { skip=1; next }
    /# Handle preflight requests/ { skip=1; next }
    skip && /^[[:space:]]*}[[:space:]]*$/ { skip=0; next }
    !skip { print }
    ' "$NGINX_CONFIG" > "$TEMP_FILE"

    # Replace original file
    mv "$TEMP_FILE" "$NGINX_CONFIG"

    echo -e "${GREEN}✅ CORS headers removed from Nginx${NC}"
else
    echo -e "${GREEN}✅ No CORS headers found in Nginx (already clean)${NC}"
fi
echo ""

echo -e "${YELLOW}📋 Step 3: Testing Nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration test passed${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    cp "$BACKUP_FILE" "$NGINX_CONFIG"
    echo -e "${GREEN}✅ Backup restored${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}📋 Step 4: Reloading Nginx...${NC}"
if systemctl reload nginx; then
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to reload Nginx${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    cp "$BACKUP_FILE" "$NGINX_CONFIG"
    nginx -t && systemctl reload nginx
    echo -e "${GREEN}✅ Backup restored${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}=========================================="
echo "✅ CORS Fix Applied Successfully!"
echo "==========================================${NC}"
echo ""
echo "📋 What was changed:"
echo "  • Removed duplicate CORS headers from Nginx"
echo "  • CORS is now handled by Node.js backend only"
echo "  • This fixes the 'multiple values' CORS error"
echo ""
echo "🧪 Test the fix:"
echo "  1. Open https://www.effmemberportal.org"
echo "  2. Check browser console (F12)"
echo "  3. CORS errors should be gone"
echo ""
echo "📁 Backup location: $BACKUP_FILE"
echo ""
echo "🔄 To rollback if needed:"
echo "  sudo cp $BACKUP_FILE $NGINX_CONFIG"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo ""

