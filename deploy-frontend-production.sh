#!/bin/bash

# =====================================================
# Frontend Production Deployment Script
# Server: 69.164.245.125 (www.effmemberportal.org)
# =====================================================

set -e  # Exit on error

echo "=========================================="
echo "Frontend Production Deployment"
echo "=========================================="
echo ""

# Configuration
REPO_ROOT="/var/www/eff-membership-system"
FRONTEND_DIR="$REPO_ROOT/frontend"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_warning "This script should be run with sudo for proper permissions"
    print_warning "Some operations may fail without sudo"
fi

# Step 1: Navigate to repository
echo "1. Navigating to repository..."
cd "$REPO_ROOT" || { print_error "Repository directory not found: $REPO_ROOT"; exit 1; }
print_success "In directory: $(pwd)"
echo ""

# Step 2: Pull latest code
echo "2. Pulling latest code from Git..."
git pull origin main || { print_error "Git pull failed"; exit 1; }
print_success "Code updated"
echo ""

# Step 3: Navigate to frontend directory
echo "3. Navigating to frontend directory..."
cd "$FRONTEND_DIR" || { print_error "Frontend directory not found: $FRONTEND_DIR"; exit 1; }
print_success "In directory: $(pwd)"
echo ""

# Step 4: Install dependencies
echo "4. Installing frontend dependencies..."
npm install || { print_error "npm install failed"; exit 1; }
print_success "Dependencies installed"
echo ""

# Step 5: Copy production environment file
echo "5. Setting up production environment..."
if [ -f "$FRONTEND_DIR/.env.production" ]; then
    print_success "Production environment file exists"
    cat "$FRONTEND_DIR/.env.production"
else
    print_error ".env.production not found!"
    exit 1
fi
echo ""

# Step 6: Build production bundle
echo "6. Building production bundle..."
echo "This may take a few minutes..."
npm run build || { print_error "Build failed"; exit 1; }
print_success "Production bundle built successfully"
echo ""

# Step 7: Verify build output
echo "7. Verifying build output..."
if [ -d "$FRONTEND_DIR/dist" ]; then
    print_success "Build directory exists"
    echo "Build size:"
    du -sh "$FRONTEND_DIR/dist"
else
    print_error "Build directory not found!"
    exit 1
fi
echo ""

# Step 8: Set proper permissions
echo "8. Setting directory permissions..."
chown -R www-data:www-data "$FRONTEND_DIR/dist" 2>/dev/null || print_warning "Could not set ownership (run with sudo)"
chmod -R 755 "$FRONTEND_DIR/dist"
print_success "Permissions set"
echo ""

# Step 9: Restart PM2 service
echo "9. Restarting PM2 service..."
pm2 restart eff-frontend-prod || pm2 start "$REPO_ROOT/ecosystem.production.config.cjs" --only eff-frontend-prod
print_success "Frontend service restarted"

# Save PM2 configuration
pm2 save
print_success "PM2 configuration saved"
echo ""

# Step 10: Verify service
echo "10. Verifying service..."
sleep 3
pm2 status
echo ""

# Step 11: Check logs
echo "11. Checking recent logs..."
pm2 logs eff-frontend-prod --lines 10 --nostream
echo ""

# Final summary
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
print_success "Frontend deployed successfully"
print_success "Service restarted"
echo ""
echo "Next steps:"
echo "  1. Monitor logs: pm2 logs eff-frontend-prod"
echo "  2. Check status: pm2 status"
echo "  3. Test frontend: https://www.effmemberportal.org"
echo "  4. Clear browser cache if needed"
echo ""

