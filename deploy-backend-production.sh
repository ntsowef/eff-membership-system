#!/bin/bash

# =====================================================
# Backend Production Deployment Script
# Server: 69.164.245.173 (api.effmemberportal.org)
# =====================================================

set -e  # Exit on error

echo "=========================================="
echo "Backend Production Deployment"
echo "=========================================="
echo ""

# Configuration
REPO_ROOT="/var/www/eff-membership-system"
BACKEND_DIR="$REPO_ROOT/backend"
UPLOAD_DIR="$REPO_ROOT/_upload_file_directory"
PYTHON_VENV="$REPO_ROOT/venv"

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

# Step 3: Backend - Install dependencies
echo "3. Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --production || { print_error "npm install failed"; exit 1; }
print_success "Dependencies installed"
echo ""

# Step 4: Backend - Build TypeScript
echo "4. Building backend (TypeScript compilation)..."
npm run build || { print_error "Build failed"; exit 1; }
print_success "Backend built successfully"
echo ""

# Step 5: Copy production environment file
echo "5. Setting up production environment..."
if [ -f "$BACKEND_DIR/.env.production" ]; then
    cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
    print_success "Production environment configured"
else
    print_warning ".env.production not found, using existing .env"
fi
echo ""

# Step 6: Setup Python environment
echo "6. Setting up Python environment..."
cd "$REPO_ROOT"

if [ ! -d "$PYTHON_VENV" ]; then
    print_warning "Python virtual environment not found, creating..."
    python3.11 -m venv venv || { print_error "Failed to create virtual environment"; exit 1; }
    print_success "Virtual environment created"
fi

source "$PYTHON_VENV/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt || { print_error "Python dependencies installation failed"; exit 1; }
print_success "Python dependencies installed"
echo ""

# Step 7: Create required directories
echo "7. Creating required directories..."
mkdir -p "$UPLOAD_DIR"
mkdir -p "$BACKEND_DIR/python/data/logs"
mkdir -p "$REPO_ROOT/logs"
print_success "Directories created"
echo ""

# Step 8: Set proper permissions
echo "8. Setting directory permissions..."
chown -R www-data:www-data "$UPLOAD_DIR" 2>/dev/null || print_warning "Could not set ownership (run with sudo)"
chown -R www-data:www-data "$BACKEND_DIR/python/data/logs" 2>/dev/null || print_warning "Could not set ownership (run with sudo)"
chown -R www-data:www-data "$REPO_ROOT/logs" 2>/dev/null || print_warning "Could not set ownership (run with sudo)"

chmod 775 "$UPLOAD_DIR"
chmod 775 "$BACKEND_DIR/python/data/logs"
chmod 775 "$REPO_ROOT/logs"
print_success "Permissions set"
echo ""

# Step 9: Run database migrations (if any)
echo "9. Checking for database migrations..."
if [ -d "$BACKEND_DIR/migrations" ]; then
    print_warning "Database migrations found - review and run manually if needed"
    print_warning "Location: $BACKEND_DIR/migrations"
else
    print_success "No migrations directory found"
fi
echo ""

# Step 10: Restart PM2 services
echo "10. Restarting PM2 services..."

# Restart backend API
pm2 restart eff-backend || pm2 start "$REPO_ROOT/ecosystem.production.config.cjs" --only eff-backend
print_success "Backend API restarted"

# Restart background processor
pm2 restart bulk-upload-processor || pm2 start "$REPO_ROOT/ecosystem.bulk-processor.config.cjs"
print_success "Background processor restarted"

# Save PM2 configuration
pm2 save
print_success "PM2 configuration saved"
echo ""

# Step 11: Verify services
echo "11. Verifying services..."
sleep 3
pm2 status
echo ""

# Step 12: Check logs for errors
echo "12. Checking recent logs..."
echo "Backend API logs:"
pm2 logs eff-backend --lines 10 --nostream
echo ""
echo "Background processor logs:"
pm2 logs bulk-upload-processor --lines 10 --nostream
echo ""

# Final summary
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
print_success "Backend deployed successfully"
print_success "Services restarted"
echo ""
echo "Next steps:"
echo "  1. Monitor logs: pm2 logs"
echo "  2. Check status: pm2 status"
echo "  3. Test API: curl https://api.effmemberportal.org/api/v1/health"
echo ""

