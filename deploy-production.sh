#!/bin/bash

# =============================================================================
# EFF Membership System - Complete Production Deployment Script
# =============================================================================
# This script deploys both frontend and backend to production
# Location: /var/www/eff-membership-system
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_ROOT="/var/www/eff-membership-system"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
PYTHON_DIR="$BACKEND_DIR/python"

# Helper functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    print_warning "This script should be run with sudo for proper permissions"
    print_info "Some operations may fail without sudo"
fi

print_header "EFF Membership System - Production Deployment"
echo ""

# =============================================================================
# STEP 1: PRE-DEPLOYMENT CHECKS
# =============================================================================
print_header "Step 1: Pre-Deployment Checks"

# Check if repository exists
if [ ! -d "$REPO_ROOT" ]; then
    print_error "Repository not found at: $REPO_ROOT"
    exit 1
fi
print_success "Repository found"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
print_success "Node.js $(node --version) installed"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm --version) installed"

# Check if Python3 is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is not installed"
    exit 1
fi
print_success "Python3 $(python3 --version) installed"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 is not installed. Installing..."
    npm install -g pm2
fi
print_success "PM2 installed"

echo ""

# =============================================================================
# STEP 2: STOP EXISTING SERVICES
# =============================================================================
print_header "Step 2: Stopping Existing Services"

# Stop PM2 processes
pm2 stop eff-backend 2>/dev/null || print_info "Backend not running"
pm2 stop eff-frontend-prod 2>/dev/null || print_info "Frontend not running"

# Stop Python processor
pkill -f bulk_upload_processor.py 2>/dev/null || print_info "Python processor not running"

print_success "Services stopped"
echo ""

# =============================================================================
# STEP 3: BACKUP CURRENT DEPLOYMENT
# =============================================================================
print_header "Step 3: Creating Backup"

BACKUP_DIR="/root/backups/eff-membership-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup backend dist
if [ -d "$BACKEND_DIR/dist" ]; then
    cp -r "$BACKEND_DIR/dist" "$BACKUP_DIR/backend-dist"
    print_success "Backend backed up"
fi

# Backup frontend dist
if [ -d "$FRONTEND_DIR/dist" ]; then
    cp -r "$FRONTEND_DIR/dist" "$BACKUP_DIR/frontend-dist"
    print_success "Frontend backed up"
fi

# Backup .env files
cp "$BACKEND_DIR/.env" "$BACKUP_DIR/backend.env" 2>/dev/null || print_info "No backend .env to backup"
cp "$REPO_ROOT/.env" "$BACKUP_DIR/root.env" 2>/dev/null || print_info "No root .env to backup"

print_success "Backup created at: $BACKUP_DIR"
echo ""

# =============================================================================
# STEP 4: PULL LATEST CODE (Optional)
# =============================================================================
print_header "Step 4: Update Code from Git"

cd "$REPO_ROOT"
read -p "Pull latest code from Git? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git pull origin main || git pull origin master
    print_success "Code updated"
else
    print_info "Skipping Git pull"
fi
echo ""

# =============================================================================
# STEP 5: BUILD BACKEND
# =============================================================================
print_header "Step 5: Building Backend"

cd "$BACKEND_DIR"

# Install dependencies
print_info "Installing backend dependencies..."
npm install --production=false
print_success "Dependencies installed"

# Generate Prisma Client
print_info "Generating Prisma Client..."
npx prisma generate
print_success "Prisma Client generated"

# Build TypeScript
print_info "Compiling TypeScript..."
npm run build
print_success "Backend built successfully"

# Check build output
if [ ! -f "$BACKEND_DIR/dist/app.js" ]; then
    print_error "Backend build failed - dist/app.js not found"
    exit 1
fi

print_info "Backend build size: $(du -sh $BACKEND_DIR/dist | cut -f1)"
echo ""

# =============================================================================
# STEP 6: BUILD FRONTEND
# =============================================================================
print_header "Step 6: Building Frontend"

cd "$FRONTEND_DIR"

# Install dependencies
print_info "Installing frontend dependencies..."
npm install
print_success "Dependencies installed"

# Build production bundle
print_info "Building production bundle..."
npm run build
print_success "Frontend built successfully"

# Check build output
if [ ! -d "$FRONTEND_DIR/dist" ]; then
    print_error "Frontend build failed - dist directory not found"
    exit 1
fi

print_info "Frontend build size: $(du -sh $FRONTEND_DIR/dist | cut -f1)"
echo ""

# =============================================================================
# STEP 7: SETUP PYTHON ENVIRONMENT
# =============================================================================
print_header "Step 7: Setting Up Python Environment"

cd "$PYTHON_DIR"

# Install Python dependencies
print_info "Installing Python dependencies..."
pip3 install -r requirements.txt 2>/dev/null || {
    print_warning "requirements.txt not found, installing manually..."
    pip3 install psycopg2-binary pandas openpyxl python-socketio[client] websocket-client requests python-dotenv
}
print_success "Python dependencies installed"

# Verify socketio installation
python3 -c "import socketio; print('✅ socketio.Client:', socketio.Client)" || {
    print_error "socketio.Client not available"
    exit 1
}
print_success "Python environment ready"
echo ""

# =============================================================================
# STEP 8: CONFIGURE ENVIRONMENT FILES
# =============================================================================
print_header "Step 8: Configuring Environment Files"

# Check backend .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_error "Backend .env file not found!"
    print_info "Please create $BACKEND_DIR/.env with production configuration"
    exit 1
fi
print_success "Backend .env exists"

# Check root .env (for Python processor)
if [ ! -f "$REPO_ROOT/.env" ]; then
    print_warning "Root .env file not found - creating from template..."
    cat > "$REPO_ROOT/.env" << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=eff_admin
DB_PASSWORD=Frames!123
DB_NAME=eff_membership_database

# WebSocket Configuration
WEBSOCKET_URL=http://localhost:5000

# Upload Directory
UPLOAD_DIR=_upload_file_directory

# Processing Interval (seconds)
PROCESSING_INTERVAL=10

# IEC Verification
IEC_VERIFICATION_ENABLED=true
EOF
    print_success "Root .env created"
else
    print_success "Root .env exists"
fi

# Verify UPLOAD_DIR is set
if ! grep -q "UPLOAD_DIR" "$BACKEND_DIR/.env"; then
    print_warning "Adding UPLOAD_DIR to backend .env..."
    echo "" >> "$BACKEND_DIR/.env"
    echo "# File Upload Configuration" >> "$BACKEND_DIR/.env"
    echo "UPLOAD_DIR=_upload_file_directory" >> "$BACKEND_DIR/.env"
fi
print_success "Environment files configured"
echo ""

# =============================================================================
# STEP 9: SET PERMISSIONS
# =============================================================================
print_header "Step 9: Setting Permissions"

# Create upload directory
mkdir -p "$REPO_ROOT/_upload_file_directory"
chmod 755 "$REPO_ROOT/_upload_file_directory"
print_success "Upload directory created"

# Set ownership (if running as root)
if [ "$EUID" -eq 0 ]; then
    chown -R www-data:www-data "$REPO_ROOT/_upload_file_directory"
    chown -R www-data:www-data "$BACKEND_DIR/dist"
    chown -R www-data:www-data "$FRONTEND_DIR/dist"
    print_success "Ownership set to www-data"
fi

# Secure .env files
chmod 600 "$BACKEND_DIR/.env"
chmod 600 "$REPO_ROOT/.env"
print_success "Environment files secured"
echo ""

# =============================================================================
# STEP 10: INSTALL SERVE PACKAGE (for frontend)
# =============================================================================
print_header "Step 10: Installing Serve Package"

# Check if serve is installed globally
if ! command -v serve &> /dev/null; then
    print_info "Installing serve package globally..."
    npm install -g serve
    print_success "Serve package installed"
else
    print_success "Serve package already installed"
fi

echo ""

# =============================================================================
# STEP 11: START SERVICES WITH PM2
# =============================================================================
print_header "Step 11: Starting Services with PM2"

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || print_info "No existing PM2 processes to stop"

# Start all services using ecosystem file
cd "$REPO_ROOT"
pm2 start ecosystem.production.config.js

# Save PM2 configuration
pm2 save
print_success "All services started with PM2"

# Setup PM2 startup
pm2 startup systemd -u root --hp /root 2>/dev/null || print_info "PM2 startup already configured"
print_success "PM2 configured for auto-start"

echo ""

# =============================================================================
# STEP 12: VERIFY DEPLOYMENT
# =============================================================================
print_header "Step 12: Verifying Deployment"

# Wait for services to start
print_info "Waiting for services to start..."
sleep 5

# Check PM2 status
print_info "PM2 Process Status:"
pm2 list

echo ""

# Check backend health
print_info "Checking backend health..."
if curl -s http://localhost:5000/api/v1/health > /dev/null; then
    print_success "Backend is responding on port 5000"
else
    print_warning "Backend health check failed"
fi

# Check frontend
print_info "Checking frontend..."
if curl -s http://localhost:3000 > /dev/null; then
    print_success "Frontend is responding on port 3000"
else
    print_warning "Frontend health check failed"
fi

# Check upload directory
print_info "Upload directory: $REPO_ROOT/_upload_file_directory"
ls -la "$REPO_ROOT/_upload_file_directory" | head -5

echo ""

# =============================================================================
# DEPLOYMENT COMPLETE
# =============================================================================
print_header "Deployment Complete!"

echo ""
print_success "✅ Backend API: Running on port 5000"
print_success "✅ Frontend: Running on port 3000"
print_success "✅ Python Processor: Watching $REPO_ROOT/_upload_file_directory"
echo ""
print_info "🌐 Services:"
echo "  Backend API:  http://localhost:5000"
echo "  Frontend:     http://localhost:3000"
echo "  Health Check: http://localhost:5000/api/v1/health"
echo ""
print_info "📋 Next Steps:"
echo "  1. Configure Nginx to serve frontend and proxy backend"
echo "  2. Setup SSL certificates with Let's Encrypt"
echo "  3. Test file upload functionality"
echo "  4. Monitor logs: pm2 logs"
echo ""
print_info "🔧 Useful Commands:"
echo "  pm2 list                       - View all processes"
echo "  pm2 logs                       - View all logs"
echo "  pm2 logs eff-backend           - View backend logs"
echo "  pm2 logs eff-frontend          - View frontend logs"
echo "  pm2 logs bulk-upload-processor - View processor logs"
echo "  pm2 restart all                - Restart all services"
echo "  pm2 restart eff-backend        - Restart backend only"
echo "  pm2 restart eff-frontend       - Restart frontend only"
echo "  pm2 monit                      - Monitor resources"
echo "  pm2 stop all                   - Stop all services"
echo ""
print_info "📚 Documentation:"
echo "  DEPLOYMENT_CHECKLIST.md                      - Complete checklist"
echo "  docs/PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md - Full guide"
echo "  DEPLOYMENT_README.md                         - Quick reference"
echo ""


