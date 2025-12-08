#!/bin/bash

# Fix HTTPS Backend Issue
# Backend is running HTTPS but Nginx expects HTTP

echo "=========================================="
echo "  Fix HTTPS Backend Issue"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Navigate to backend directory
BACKEND_DIR="/root/Applications/backend"
if [ ! -d "$BACKEND_DIR" ]; then
    BACKEND_DIR="/opt/eff-membership/backend"
fi

if [ ! -d "$BACKEND_DIR" ]; then
    error "Backend directory not found"
    exit 1
fi

cd "$BACKEND_DIR"
info "Working in: $BACKEND_DIR"
echo ""

# Step 0: Check for SSL certificates and remove them
echo "Step 0: Checking for SSL certificates..."
if [ -d "ssl" ]; then
    warn "Found SSL directory - this is causing HTTPS mode"
    info "Moving SSL directory to ssl.backup"
    mv ssl ssl.backup.$(date +%Y%m%d_%H%M%S)
    success "SSL directory moved"
elif [ -f "key.pem" ] || [ -f "cert.pem" ]; then
    warn "Found SSL certificate files in root directory"
    info "Moving certificate files to backup"
    [ -f "key.pem" ] && mv key.pem key.pem.backup.$(date +%Y%m%d_%H%M%S)
    [ -f "cert.pem" ] && mv cert.pem cert.pem.backup.$(date +%Y%m%d_%H%M%S)
    success "Certificate files moved"
else
    info "No SSL certificates found in backend directory"
fi
echo ""

# Step 1: Backup .env
echo "Step 1: Backing up .env file..."
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    success ".env backed up"
else
    error ".env file not found"
    exit 1
fi
echo ""

# Step 2: Disable HTTPS in backend
echo "Step 2: Disabling HTTPS in backend..."

# Remove or comment out SSL-related variables
if grep -q "^USE_HTTPS=true" .env; then
    sed -i 's/^USE_HTTPS=true/USE_HTTPS=false/' .env
    success "Set USE_HTTPS=false"
elif grep -q "^USE_HTTPS=" .env; then
    sed -i 's/^USE_HTTPS=.*/USE_HTTPS=false/' .env
    success "Updated USE_HTTPS=false"
else
    echo "USE_HTTPS=false" >> .env
    success "Added USE_HTTPS=false"
fi

if grep -q "^SSL_ENABLED=true" .env; then
    sed -i 's/^SSL_ENABLED=true/SSL_ENABLED=false/' .env
    success "Set SSL_ENABLED=false"
elif grep -q "^SSL_ENABLED=" .env; then
    sed -i 's/^SSL_ENABLED=.*/SSL_ENABLED=false/' .env
    success "Updated SSL_ENABLED=false"
else
    echo "SSL_ENABLED=false" >> .env
    success "Added SSL_ENABLED=false"
fi

if grep -q "^HTTPS_ENABLED=true" .env; then
    sed -i 's/^HTTPS_ENABLED=true/HTTPS_ENABLED=false/' .env
    success "Set HTTPS_ENABLED=false"
elif grep -q "^HTTPS_ENABLED=" .env; then
    sed -i 's/^HTTPS_ENABLED=.*/HTTPS_ENABLED=false/' .env
    success "Updated HTTPS_ENABLED=false"
else
    echo "HTTPS_ENABLED=false" >> .env
    success "Added HTTPS_ENABLED=false"
fi

# Comment out SSL certificate paths if they exist
if grep -q "^SSL_KEY_PATH=" .env; then
    sed -i 's/^SSL_KEY_PATH=/#SSL_KEY_PATH=/' .env
    success "Commented out SSL_KEY_PATH"
fi

if grep -q "^SSL_CERT_PATH=" .env; then
    sed -i 's/^SSL_CERT_PATH=/#SSL_CERT_PATH=/' .env
    success "Commented out SSL_CERT_PATH"
fi

echo ""

# Step 3: Show changes
echo "Step 3: Configuration changes..."
info "SSL-related settings in .env:"
grep -E "USE_HTTPS|SSL_ENABLED|HTTPS_ENABLED|SSL_KEY_PATH|SSL_CERT_PATH" .env || echo "  (none found)"
echo ""

# Step 4: Restart backend
echo "Step 4: Restarting backend..."
pm2 restart eff-api
success "Backend restarted"
echo ""

# Step 5: Wait for backend to start
echo "Step 5: Waiting for backend to start..."
info "Waiting 5 seconds..."
sleep 5
echo ""

# Step 6: Check backend logs
echo "Step 6: Checking backend logs..."
info "Looking for protocol information..."
pm2 logs eff-api --lines 30 --nostream | grep -i "protocol\|server running\|api available" | tail -5
echo ""

# Step 7: Test backend directly
echo "Step 7: Testing backend on localhost:5000..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/health 2>/dev/null)

if [ "$RESPONSE" = "200" ]; then
    success "Backend is responding on HTTP (port 5000)"
    info "Response: $(curl -s http://localhost:5000/api/v1/health 2>/dev/null | head -c 100)"
    echo ""
else
    error "Backend is not responding on HTTP (got HTTP $RESPONSE)"
    warn "Check logs: pm2 logs eff-api"
    echo ""
    exit 1
fi

# Step 8: Test through Nginx
echo "Step 8: Testing HTTPS endpoint through Nginx..."
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.effmemberportal.org/api/v1/health 2>/dev/null)

if [ "$HTTPS_RESPONSE" = "200" ]; then
    success "HTTPS endpoint is working!"
    info "Response: $(curl -s https://api.effmemberportal.org/api/v1/health 2>/dev/null | head -c 100)"
    echo ""
    echo "=========================================="
    echo -e "${GREEN}  🎉 SUCCESS! 502 Error Fixed!${NC}"
    echo "=========================================="
    echo ""
    echo "Your API is now accessible at:"
    echo "  https://api.effmemberportal.org"
    echo ""
    echo "Backend is using HTTP (correct):"
    echo "  http://localhost:5000"
    echo ""
    echo "Nginx handles SSL/TLS (correct):"
    echo "  https://api.effmemberportal.org → http://localhost:5000"
    echo ""
elif [ "$HTTPS_RESPONSE" = "502" ]; then
    error "Still getting 502 Bad Gateway"
    echo ""
    warn "Backend is working but Nginx still can't connect"
    echo ""
    echo "Check Nginx error log:"
    echo "  sudo tail -20 /var/log/nginx/error.log"
    echo ""
    echo "Check Nginx configuration:"
    echo "  sudo cat /etc/nginx/sites-available/eff-api | grep upstream -A 10"
    echo ""
elif [ "$HTTPS_RESPONSE" = "000" ]; then
    warn "Cannot connect to HTTPS endpoint"
    echo ""
    echo "Possible issues:"
    echo "  1. DNS not configured"
    echo "  2. Firewall blocking"
    echo "  3. Nginx not running"
    echo ""
else
    warn "HTTPS endpoint responded with HTTP $HTTPS_RESPONSE"
    echo ""
    echo "Check the response:"
    echo "  curl -v https://api.effmemberportal.org/api/v1/health"
    echo ""
fi

# Step 9: Summary
echo "=========================================="
echo "  Summary"
echo "=========================================="
echo ""
echo "Changes made:"
echo "  ✓ Disabled HTTPS in backend .env"
echo "  ✓ Backend now uses HTTP on port 5000"
echo "  ✓ Nginx handles SSL/TLS termination"
echo ""
echo "Backup created:"
echo "  $(ls -t .env.backup.* 2>/dev/null | head -1)"
echo ""
echo "Service status:"
pm2 list | grep eff-api
echo ""
echo "Useful commands:"
echo "  View logs: pm2 logs eff-api"
echo "  Restart: pm2 restart eff-api"
echo "  Test backend: curl http://localhost:5000/api/v1/health"
echo "  Test API: curl https://api.effmemberportal.org/api/v1/health"
echo ""

