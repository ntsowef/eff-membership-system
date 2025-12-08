#!/bin/bash

# Quick Fix Script for 502 Bad Gateway Error
# This script attempts to fix the most common causes of 502 errors

echo "=========================================="
echo "  502 Bad Gateway Quick Fix"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    warn "This script should be run as root (sudo)"
    echo "Some commands may fail without root privileges"
    echo ""
fi

# Step 1: Start Docker Containers
echo "Step 1: Starting Docker containers..."
if command -v docker &> /dev/null; then
    cd /opt/eff-membership 2>/dev/null || cd ~/eff-membership 2>/dev/null || {
        error "Cannot find project directory"
        exit 1
    }
    
    if [ -f docker-compose.yml ]; then
        docker-compose up -d
        success "Docker containers started"
        sleep 5
    else
        warn "docker-compose.yml not found"
    fi
else
    warn "Docker not installed"
fi
echo ""

# Step 2: Check Backend Directory
echo "Step 2: Checking backend directory..."
BACKEND_DIR="/opt/eff-membership/backend"
if [ ! -d "$BACKEND_DIR" ]; then
    BACKEND_DIR="$HOME/eff-membership/backend"
fi

if [ ! -d "$BACKEND_DIR" ]; then
    error "Backend directory not found"
    exit 1
fi

cd "$BACKEND_DIR"
success "Found backend directory: $BACKEND_DIR"
echo ""

# Step 3: Check if backend is compiled
echo "Step 3: Checking backend compilation..."
if [ ! -d "dist" ] || [ ! -f "dist/app.js" ]; then
    warn "Backend not compiled, compiling now..."
    if [ -f "package.json" ]; then
        npm run build
        success "Backend compiled"
    else
        error "package.json not found"
        exit 1
    fi
else
    success "Backend is compiled"
fi
echo ""

# Step 4: Check .env file
echo "Step 4: Checking .env file..."
if [ ! -f ".env" ]; then
    warn ".env file not found"
    if [ -f ".env.example" ]; then
        info "Creating .env from .env.example"
        cp .env.example .env
        warn "Please edit .env file with your configuration"
        echo "   nano $BACKEND_DIR/.env"
    else
        error ".env.example not found"
    fi
else
    success ".env file exists"
    
    # Check PORT setting
    if grep -q "^PORT=5000" .env; then
        success "PORT is set to 5000"
    else
        warn "PORT may not be set to 5000"
        echo "   Check: cat .env | grep PORT"
    fi
fi
echo ""

# Step 5: Stop existing backend
echo "Step 5: Stopping existing backend..."
if command -v pm2 &> /dev/null; then
    pm2 stop eff-api 2>/dev/null
    pm2 delete eff-api 2>/dev/null
    success "Stopped existing backend"
else
    error "PM2 not installed"
    echo "   Install: npm install -g pm2"
    exit 1
fi
echo ""

# Step 6: Start backend
echo "Step 6: Starting backend..."
cd "$BACKEND_DIR"
pm2 start dist/app.js --name eff-api
sleep 3

# Check if started successfully
if pm2 list | grep -q "eff-api.*online"; then
    success "Backend started successfully"
    pm2 save
else
    error "Backend failed to start"
    echo "   Check logs: pm2 logs eff-api"
    exit 1
fi
echo ""

# Step 7: Test backend directly
echo "Step 7: Testing backend on localhost:5000..."
sleep 2
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/health 2>/dev/null)

if [ "$RESPONSE" = "200" ]; then
    success "Backend is responding on localhost:5000"
    echo "   Response: $(curl -s http://localhost:5000/api/v1/health 2>/dev/null | head -c 100)"
else
    error "Backend is not responding (HTTP $RESPONSE)"
    echo "   Check logs: pm2 logs eff-api"
    exit 1
fi
echo ""

# Step 8: Check Nginx
echo "Step 8: Checking Nginx..."
if systemctl is-active --quiet nginx; then
    success "Nginx is running"
else
    warn "Nginx is not running, starting..."
    systemctl start nginx
    if systemctl is-active --quiet nginx; then
        success "Nginx started"
    else
        error "Failed to start Nginx"
        exit 1
    fi
fi
echo ""

# Step 9: Test Nginx configuration
echo "Step 9: Testing Nginx configuration..."
if nginx -t &> /dev/null; then
    success "Nginx configuration is valid"
else
    error "Nginx configuration has errors"
    nginx -t
    exit 1
fi
echo ""

# Step 10: Reload Nginx
echo "Step 10: Reloading Nginx..."
systemctl reload nginx
success "Nginx reloaded"
echo ""

# Step 11: Test HTTPS endpoint
echo "Step 11: Testing HTTPS endpoint..."
sleep 2
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.effmemberportal.org/api/v1/health 2>/dev/null)

if [ "$HTTPS_RESPONSE" = "200" ]; then
    success "HTTPS endpoint is working!"
    echo ""
    echo "=========================================="
    echo -e "${GREEN}  SUCCESS! 502 Error Fixed!${NC}"
    echo "=========================================="
    echo ""
    echo "Your API is now accessible at:"
    echo "  https://api.effmemberportal.org"
    echo ""
    echo "Test it:"
    echo "  curl https://api.effmemberportal.org/api/v1/health"
    echo ""
elif [ "$HTTPS_RESPONSE" = "502" ]; then
    error "Still getting 502 Bad Gateway"
    echo ""
    echo "Additional troubleshooting needed:"
    echo "  1. Check Nginx error log: sudo tail -20 /var/log/nginx/error.log"
    echo "  2. Check backend logs: pm2 logs eff-api"
    echo "  3. Verify Nginx config: sudo cat /etc/nginx/sites-available/eff-api | grep upstream -A 5"
    echo ""
    echo "Run diagnostic script:"
    echo "  sudo bash deployment/diagnose-502.sh"
elif [ "$HTTPS_RESPONSE" = "000" ]; then
    warn "Cannot connect to HTTPS endpoint"
    echo ""
    echo "Possible issues:"
    echo "  1. DNS not configured: dig +short api.effmemberportal.org"
    echo "  2. Firewall blocking: sudo ufw status"
    echo "  3. SSL certificate issue: sudo certbot certificates"
else
    warn "HTTPS endpoint responded with HTTP $HTTPS_RESPONSE"
    echo ""
    echo "Check the response:"
    echo "  curl -v https://api.effmemberportal.org/api/v1/health"
fi

echo ""
echo "=========================================="
echo "  Service Status"
echo "=========================================="
echo ""
echo "Backend (PM2):"
pm2 list
echo ""
echo "Nginx:"
systemctl status nginx --no-pager -l
echo ""
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "=========================================="
echo "  Useful Commands"
echo "=========================================="
echo ""
echo "View backend logs:"
echo "  pm2 logs eff-api"
echo ""
echo "View Nginx error log:"
echo "  sudo tail -f /var/log/nginx/error.log"
echo ""
echo "Restart backend:"
echo "  pm2 restart eff-api"
echo ""
echo "Restart Nginx:"
echo "  sudo systemctl restart nginx"
echo ""
echo "Run diagnostics:"
echo "  sudo bash deployment/diagnose-502.sh"
echo ""

