#!/bin/bash

# =====================================================================================
# EFF Membership Management System - Backend API SSL Setup
# Domain: api.effmemberportal.org
# =====================================================================================
# This script will:
# 1. Install and configure Nginx
# 2. Configure Nginx as reverse proxy for Node.js backend
# 3. Install Certbot and obtain Let's Encrypt SSL certificate
# 4. Configure automatic SSL renewal
# 5. Set up firewall rules
# 6. Configure security headers and rate limiting
# =====================================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
   exit 1
fi

# Configuration
DOMAIN="api.effmemberportal.org"
BACKEND_PORT="5000"
EMAIL="ntsowef@gmail.com"  # Change this to your email
NGINX_CONF="/etc/nginx/sites-available/eff-api"
NGINX_ENABLED="/etc/nginx/sites-enabled/eff-api"

log "========================================================="
log "Backend API SSL Setup for api.effmemberportal.org"
log "========================================================="
echo ""

# Step 1: Update system
log "Step 1: Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install Nginx
log "Step 2: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    info "Installing Nginx web server..."
    apt install -y nginx

    # Start Nginx
    systemctl start nginx

    # Enable Nginx to start on boot
    systemctl enable nginx

    # Verify Nginx is running
    if systemctl is-active --quiet nginx; then
        log "Nginx installed and started successfully"
        info "Nginx version: $(nginx -v 2>&1)"
    else
        error "Nginx installation failed or service not running"
        exit 1
    fi

    # Check if port 80 is listening
    if netstat -tlnp | grep -q ":80"; then
        log "Nginx is listening on port 80"
    else
        warning "Nginx may not be listening on port 80"
    fi
else
    info "Nginx is already installed"
    info "Nginx version: $(nginx -v 2>&1)"

    # Ensure Nginx is running
    if ! systemctl is-active --quiet nginx; then
        warning "Nginx is installed but not running. Starting..."
        systemctl start nginx
    fi
fi

# Step 3: Install Certbot
log "Step 3: Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    log "Certbot installed successfully"
else
    info "Certbot is already installed"
fi

# Step 4: Create web root for ACME challenge
log "Step 4: Creating web root for Let's Encrypt..."
mkdir -p /var/www/html/.well-known/acme-challenge
chown -R www-data:www-data /var/www/html

# Step 5: Create initial Nginx configuration (HTTP only for certificate)
log "Step 5: Creating initial Nginx configuration..."
cat > "$NGINX_CONF" <<'EOF'
# Initial configuration for Let's Encrypt certificate
server {
    listen 80;
    listen [::]:80;
    server_name api.effmemberportal.org;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    # Temporary proxy to backend (will be replaced with HTTPS)
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable the site
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"

# Test Nginx configuration
log "Testing Nginx configuration..."
if nginx -t; then
    log "Nginx configuration is valid"
    systemctl restart nginx
else
    error "Nginx configuration test failed"
    exit 1
fi

# Step 6: Check if backend is running
log "Step 6: Checking if backend is running on port $BACKEND_PORT..."
if netstat -tlnp | grep -q ":$BACKEND_PORT"; then
    log "Backend is running on port $BACKEND_PORT"
else
    warning "Backend is NOT running on port $BACKEND_PORT"
    warning "Please start your backend before continuing"
    read -p "Press Enter when backend is running, or Ctrl+C to exit..."
fi

# Step 7: Verify DNS configuration
log "Step 7: Verifying DNS configuration..."
info "Checking if $DOMAIN points to this server..."
SERVER_IP=$(curl -s ifconfig.me)
DNS_IP=$(dig +short "$DOMAIN" | tail -n1)

if [ "$SERVER_IP" == "$DNS_IP" ]; then
    log "DNS is correctly configured: $DOMAIN -> $SERVER_IP"
else
    warning "DNS mismatch detected:"
    warning "  Server IP: $SERVER_IP"
    warning "  DNS IP: $DNS_IP"
    warning ""
    warning "Please ensure $DOMAIN points to $SERVER_IP before continuing"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Setup cancelled. Please configure DNS and try again."
        exit 1
    fi
fi

# Step 8: Obtain SSL certificate
log "Step 8: Obtaining SSL certificate from Let's Encrypt..."
info "This will obtain a certificate for $DOMAIN"
echo ""

# Run Certbot
certbot --nginx -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect \
    --hsts \
    --staple-ocsp

if [ $? -eq 0 ]; then
    log "SSL certificate obtained successfully!"
else
    error "Failed to obtain SSL certificate"
    error "Please check:"
    error "  1. DNS is correctly configured"
    error "  2. Port 80 and 443 are open in firewall"
    error "  3. Domain is accessible from the internet"
    exit 1
fi

# Step 9: Replace with production Nginx configuration
log "Step 9: Installing production Nginx configuration..."

# Copy the production configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/nginx-backend-api.conf" ]; then
    cp "$SCRIPT_DIR/nginx-backend-api.conf" "$NGINX_CONF"
    log "Production configuration installed"
else
    warning "Production config not found, using Certbot-generated config"
fi

# Test and reload Nginx
log "Testing Nginx configuration..."
if nginx -t; then
    systemctl reload nginx
    log "Nginx reloaded with production configuration"
else
    error "Nginx configuration test failed"
    exit 1
fi

# Step 10: Configure firewall
log "Step 10: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
    ufw allow 22/tcp
    ufw --force enable
    log "Firewall configured"
else
    warning "UFW not installed, skipping firewall configuration"
fi

# Step 11: Set up automatic renewal
log "Step 11: Setting up automatic SSL renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer
log "Automatic renewal configured"

# Step 12: Test SSL certificate
log "Step 12: Testing SSL certificate..."
sleep 2
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/v1/health" | grep -q "200"; then
    log "SSL is working correctly!"
else
    warning "Could not verify SSL endpoint"
fi

# Step 13: Display certificate information
log "Step 13: Certificate information..."
certbot certificates

# Final summary
echo ""
log "========================================================="
log "Backend API SSL Setup Complete!"
log "========================================================="
echo ""
info "✅ Domain: https://$DOMAIN"
info "✅ SSL Certificate: Let's Encrypt"
info "✅ Auto-renewal: Enabled"
info "✅ Backend proxy: localhost:$BACKEND_PORT"
echo ""
info "Next steps:"
info "1. Update your backend .env file:"
info "   CORS_ORIGIN=https://effmemberportal.org,https://www.effmemberportal.org,https://$DOMAIN"
info ""
info "2. Restart your backend:"
info "   pm2 restart eff-api"
info ""
info "3. Update frontend .env.production:"
info "   VITE_API_URL=https://$DOMAIN"
info "   VITE_API_BASE_URL=https://$DOMAIN/api/v1"
info "   VITE_WS_URL=wss://$DOMAIN"
info ""
info "4. Test the API:"
info "   curl https://$DOMAIN/api/v1/health"
echo ""
info "Certificate will auto-renew before expiration"
info "Check renewal status: sudo certbot renew --dry-run"
echo ""
log "Setup completed successfully!"

