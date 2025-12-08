#!/bin/bash
# =====================================================================================
# Backend Server Firewall Configuration Script
# EFF Membership Management System - Ubuntu 22.x
# =====================================================================================
# This script configures UFW firewall for the backend server
# Run this script after setting up the backend server
# =====================================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"; }
warning() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"; }

log "Configuring Backend Server Firewall"
log "===================================="

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    error "Please run this script with sudo"
    exit 1
fi

# Prompt for frontend server IP
echo ""
read -p "Enter the Frontend Server IP address: " FRONTEND_IP

if [ -z "$FRONTEND_IP" ]; then
    error "Frontend IP address is required"
    exit 1
fi

# Validate IP address format (basic check)
if ! [[ $FRONTEND_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    error "Invalid IP address format"
    exit 1
fi

log "Frontend Server IP: $FRONTEND_IP"
echo ""

# Reset UFW to default
warning "Resetting UFW to default settings..."
ufw --force reset

# Set default policies
log "Setting default policies..."
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT - don't lock yourself out!)
log "Allowing SSH (port 22)..."
ufw allow 22/tcp comment 'SSH'

# Allow API access from frontend server only
log "Allowing API access from frontend server ($FRONTEND_IP)..."
ufw allow from $FRONTEND_IP to any port 5000 proto tcp comment 'API from Frontend'

# Optional: Allow API from specific admin IPs
read -p "Do you want to allow API access from additional admin IPs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter admin IP addresses (comma-separated): " ADMIN_IPS
    IFS=',' read -ra ADDR <<< "$ADMIN_IPS"
    for ip in "${ADDR[@]}"; do
        ip=$(echo $ip | xargs) # trim whitespace
        if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            log "Allowing API access from admin IP: $ip"
            ufw allow from $ip to any port 5000 proto tcp comment "API from Admin $ip"
        fi
    done
fi

# PostgreSQL - Ask if remote access is needed
echo ""
read -p "Allow remote PostgreSQL access? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Allow from specific IP or all? (ip/all) " PG_ACCESS
    if [ "$PG_ACCESS" = "all" ]; then
        warning "Allowing PostgreSQL from all IPs (NOT RECOMMENDED for production)"
        ufw allow 5432/tcp comment 'PostgreSQL - All'
    else
        read -p "Enter IP address for PostgreSQL access: " PG_IP
        if [[ $PG_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            log "Allowing PostgreSQL from $PG_IP"
            ufw allow from $PG_IP to any port 5432 proto tcp comment "PostgreSQL from $PG_IP"
        fi
    fi
else
    info "PostgreSQL will only be accessible from localhost"
fi

# Redis - Ask if remote access is needed
echo ""
read -p "Allow remote Redis access? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter IP address for Redis access: " REDIS_IP
    if [[ $REDIS_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        log "Allowing Redis from $REDIS_IP"
        ufw allow from $REDIS_IP to any port 6379 proto tcp comment "Redis from $REDIS_IP"
    fi
else
    info "Redis will only be accessible from localhost"
fi

# pgAdmin - Ask if remote access is needed
echo ""
read -p "Allow remote pgAdmin access? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Allow from specific IP or all? (ip/all) " PGA_ACCESS
    if [ "$PGA_ACCESS" = "all" ]; then
        warning "Allowing pgAdmin from all IPs"
        ufw allow 5050/tcp comment 'pgAdmin - All'
    else
        read -p "Enter IP address for pgAdmin access: " PGA_IP
        if [[ $PGA_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            log "Allowing pgAdmin from $PGA_IP"
            ufw allow from $PGA_IP to any port 5050 proto tcp comment "pgAdmin from $PGA_IP"
        fi
    fi
else
    info "pgAdmin will only be accessible from localhost"
fi

# Enable UFW
log "Enabling UFW firewall..."
ufw --force enable

# Show status
log "Firewall configuration complete!"
echo ""
info "Current firewall rules:"
ufw status verbose

# Save configuration
log "Saving firewall configuration..."
cat > /opt/eff-membership/firewall-config.txt <<EOF
Backend Server Firewall Configuration
Generated: $(date)

Frontend Server IP: $FRONTEND_IP

Firewall Rules:
$(ufw status numbered)
EOF

info "Configuration saved to: /opt/eff-membership/firewall-config.txt"

# Create script to update frontend IP if needed
cat > /opt/eff-membership/update-frontend-ip.sh <<'SCRIPT'
#!/bin/bash
# Update Frontend Server IP in firewall

if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo"
    exit 1
fi

read -p "Enter new Frontend Server IP: " NEW_IP

if [[ $NEW_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    # Remove old rule
    ufw delete allow from any to any port 5000 proto tcp
    # Add new rule
    ufw allow from $NEW_IP to any port 5000 proto tcp comment 'API from Frontend'
    echo "Frontend IP updated to: $NEW_IP"
    ufw status verbose
else
    echo "Invalid IP address"
    exit 1
fi
SCRIPT

chmod +x /opt/eff-membership/update-frontend-ip.sh
info "Created helper script: /opt/eff-membership/update-frontend-ip.sh"

echo ""
warning "IMPORTANT NOTES:"
warning "1. Make sure you can still access SSH before closing this session"
warning "2. Test the firewall rules from the frontend server"
warning "3. Keep the firewall-config.txt file for reference"
warning "4. Use update-frontend-ip.sh if you need to change the frontend IP"

log "Firewall configuration complete!"
exit 0

