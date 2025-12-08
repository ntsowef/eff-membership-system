#!/bin/bash
# =====================================================================================
# Frontend Server Setup Script for EFF Membership System
# Ubuntu 22.x - Split Architecture
# This script sets up the frontend server with Nginx and Node.js
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
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    error "Please do not run this script as root. Run as a regular user with sudo privileges."
    exit 1
fi

# Check if sudo is available
if ! command -v sudo &> /dev/null; then
    error "sudo is not installed. Please install sudo first."
    exit 1
fi

log "Starting Frontend Server Setup for EFF Membership System"
log "=========================================================="
info "This script will install:"
info "  - Nginx Web Server"
info "  - Node.js 18.x (for building)"
info "  - Essential tools and security configurations"
echo ""

# Confirm before proceeding
read -p "Do you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Installation cancelled by user"
    exit 1
fi

# Update system
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential tools
log "Installing essential tools..."
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    net-tools \
    ufw \
    htop \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Node.js (for building frontend)
log "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
log "Verifying Node.js installation..."
node --version
npm --version

# Install Nginx
log "Installing Nginx..."
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Verify Nginx installation
nginx -v

# Create application directory
log "Creating application directory..."
sudo mkdir -p /opt/eff-membership
sudo chown $USER:$USER /opt/eff-membership

# Create required subdirectories
cd /opt/eff-membership
mkdir -p frontend/dist
mkdir -p logs/nginx
mkdir -p ssl-certs
mkdir -p nginx-config/conf.d

# Set proper permissions
chmod -R 755 logs ssl-certs nginx-config

# Install Certbot for SSL
log "Installing Certbot for SSL certificates..."
sudo apt install -y certbot python3-certbot-nginx

# Configure log rotation for Nginx
log "Configuring log rotation..."
sudo tee /etc/logrotate.d/eff-membership-nginx > /dev/null <<EOF
/opt/eff-membership/logs/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 \$(cat /var/run/nginx.pid)
    endscript
}
EOF

# Setup fail2ban for SSH protection
log "Installing and configuring fail2ban..."
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create fail2ban configuration for SSH and Nginx
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

sudo systemctl restart fail2ban

# Configure firewall
log "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

info "Firewall configured:"
sudo ufw status verbose

# Install monitoring tools
log "Installing monitoring tools..."
sudo apt install -y \
    sysstat \
    iotop \
    nethogs \
    ncdu

# Create health check script
log "Creating health check script..."
cat > /opt/eff-membership/health-check-frontend.sh <<'EOF'
#!/bin/bash
# Frontend Server Health Check Script

echo "=== Frontend Server Health Check ==="
echo "Date: $(date)"
echo ""

# Check Nginx
echo "Nginx Status:"
sudo systemctl status nginx --no-pager | head -n 10
echo ""

# Check Nginx configuration
echo "Nginx Configuration Test:"
sudo nginx -t
echo ""

# Check disk space
echo "Disk Space:"
df -h /opt/eff-membership
echo ""

# Check memory
echo "Memory Usage:"
free -h
echo ""

# Check frontend files
echo "Frontend Build Status:"
if [ -d "/opt/eff-membership/frontend/dist" ]; then
    echo "Build directory exists"
    ls -lh /opt/eff-membership/frontend/dist/ | head -n 10
else
    echo "Build directory not found"
fi
echo ""

# Check SSL certificates
echo "SSL Certificates:"
if [ -d "/etc/letsencrypt/live" ]; then
    sudo ls -l /etc/letsencrypt/live/
else
    echo "No Let's Encrypt certificates found"
fi
echo ""

# Test frontend accessibility
echo "Frontend Accessibility Test:"
curl -I http://localhost 2>/dev/null | head -n 5 || echo "Frontend not accessible"
echo ""

echo "=== Health Check Complete ==="
EOF

chmod +x /opt/eff-membership/health-check-frontend.sh

# Create Nginx configuration template
log "Creating Nginx configuration template..."
cat > /opt/eff-membership/nginx-config/eff-membership.conf <<'EOF'
# EFF Membership Management System - Nginx Configuration
# Frontend Server Configuration

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (update paths after obtaining certificates)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logging
    access_log /opt/eff-membership/logs/nginx/access.log;
    error_log /opt/eff-membership/logs/nginx/error.log;

    # Root directory for React build
    root /opt/eff-membership/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to backend server
    location /api/ {
        proxy_pass http://BACKEND_SERVER_IP:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://BACKEND_SERVER_IP:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

info "Nginx configuration template created at: /opt/eff-membership/nginx-config/eff-membership.conf"
warning "Remember to update 'your-domain.com' and 'BACKEND_SERVER_IP' in the configuration!"

# Display system information
log "Setup completed successfully!"
log "========================================================="
info "System Information:"
info "  - OS: $(lsb_release -d | cut -f2)"
info "  - Kernel: $(uname -r)"
info "  - Node.js: $(node --version)"
info "  - NPM: $(npm --version)"
info "  - Nginx: $(nginx -v 2>&1)"
info ""
info "Application directory: /opt/eff-membership"
info "Nginx config template: /opt/eff-membership/nginx-config/eff-membership.conf"
info "Health check script: /opt/eff-membership/health-check-frontend.sh"
info ""
log "Next steps:"
info "1. Transfer your application files to /opt/eff-membership"
info "2. Configure frontend/.env.production file"
info "3. Build frontend: cd frontend && npm ci && npm run build"
info "4. Update Nginx configuration with your domain and backend server IP"
info "5. Copy Nginx config: sudo cp nginx-config/eff-membership.conf /etc/nginx/sites-available/"
info "6. Enable site: sudo ln -s /etc/nginx/sites-available/eff-membership.conf /etc/nginx/sites-enabled/"
info "7. Test config: sudo nginx -t"
info "8. Obtain SSL certificate: sudo certbot --nginx -d your-domain.com"
info "9. Reload Nginx: sudo systemctl reload nginx"
info ""
log "Refer to PRODUCTION_DEPLOYMENT_GUIDE.md for detailed instructions"

exit 0

