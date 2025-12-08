#!/bin/bash

# =============================================================================
# Quick Fix: Generate Prisma Client and Restart Backend
# =============================================================================
# This script fixes the "Prisma client did not initialize" error
# Run this on production server: bash fix-prisma-backend.sh
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/var/www/eff-membership-system/backend"

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Start
print_header "Fixing Prisma Client Issue"
echo ""

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Backend directory not found at: $BACKEND_DIR"
    exit 1
fi

# Navigate to backend
cd "$BACKEND_DIR"
print_info "Working directory: $(pwd)"
echo ""

# Step 1: Check if Prisma schema exists
print_info "Step 1: Checking Prisma schema..."
if [ ! -f "prisma/schema.prisma" ]; then
    print_error "Prisma schema not found at: prisma/schema.prisma"
    print_info "Current directory contents:"
    ls -la
    echo ""
    print_info "Checking if prisma directory exists:"
    if [ -d "prisma" ]; then
        print_info "Prisma directory exists, contents:"
        ls -la prisma/
    else
        print_error "Prisma directory does not exist!"
        print_info "This means the prisma directory was not deployed to production."
        print_info "You need to copy the prisma directory from your development machine."
        echo ""
        print_info "On your development machine, run:"
        echo "  scp -r backend/prisma root@YOUR_SERVER:/var/www/eff-membership-system/backend/"
    fi
    exit 1
fi
print_success "Prisma schema found"
echo ""

# Step 2: Install dependencies (if needed)
print_info "Step 2: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi
echo ""

# Step 3: Generate Prisma Client
print_info "Step 3: Generating Prisma Client..."
npx prisma generate
print_success "Prisma Client generated successfully"
echo ""

# Step 4: Verify Prisma Client
print_info "Step 4: Verifying Prisma Client..."
if [ -d "node_modules/.prisma/client" ]; then
    print_success "Prisma Client exists at: node_modules/.prisma/client"
else
    print_error "Prisma Client generation failed"
    exit 1
fi
echo ""

# Step 5: Restart backend
print_info "Step 5: Restarting backend..."
pm2 restart eff-backend
print_success "Backend restarted"
echo ""

# Step 6: Wait and check logs
print_info "Step 6: Checking backend status..."
sleep 3

# Check PM2 status
pm2 list | grep eff-backend

echo ""
print_info "Checking backend logs (last 20 lines)..."
pm2 logs eff-backend --lines 20 --nostream

echo ""
print_header "Fix Complete!"
echo ""
print_info "🔍 Next Steps:"
echo "  1. Check if backend is running: pm2 list"
echo "  2. View live logs: pm2 logs eff-backend"
echo "  3. Test health endpoint: curl http://localhost:5000/api/v1/health"
echo ""
print_info "If backend is still failing, check logs with:"
echo "  pm2 logs eff-backend --err --lines 50"
echo ""

