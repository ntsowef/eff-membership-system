#!/bin/bash
# =====================================================================================
# Frontend Server Firewall Configuration Script
# EFF Membership Management System - Ubuntu 22.x
# =====================================================================================
# This script configures UFW firewall for the frontend server
# Run this script after setting up the frontend server
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

log "Configuring Frontend Server Firewall"
log "====================================="

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    error "Please run this script with sudo"
    exit 1
fi

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

# Allow HTTP
log "Allowing HTTP (port 80)..."
ufw allow 80/tcp comment 'HTTP'

# Allow HTTPS
log "Allowing HTTPS (port 443)..."
ufw allow 443/tcp comment 'HTTPS'

# Optional: Rate limiting for SSH
echo ""
read -p "Enable rate limiting for SSH? (recommended) (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Enabling SSH rate limiting..."
    ufw limit 22/tcp comment 'SSH Rate Limited'
fi

# Optional: Allow specific admin IPs only
echo ""
read -p "Restrict SSH access to specific IPs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter admin IP addresses for SSH (comma-separated): " ADMIN_IPS
    
    # Remove the general SSH rule
    ufw delete allow 22/tcp 2>/dev/null || true
    
    IFS=',' read -ra ADDR <<< "$ADMIN_IPS"
    for ip in "${ADDR[@]}"; do
        ip=$(echo $ip | xargs) # trim whitespace
        if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            log "Allowing SSH from admin IP: $ip"
            ufw allow from $ip to any port 22 proto tcp comment "SSH from Admin $ip"
        fi
    done
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
mkdir -p /opt/eff-membership
cat > /opt/eff-membership/firewall-config.txt <<EOF
Frontend Server Firewall Configuration
Generated: $(date)

Firewall Rules:
$(ufw status numbered)
EOF

info "Configuration saved to: /opt/eff-membership/firewall-config.txt"

# Additional security recommendations
echo ""
log "Additional Security Recommendations:"
info "1. Configure fail2ban for additional protection"
info "2. Keep your system updated: sudo apt update && sudo apt upgrade"
info "3. Monitor logs regularly: tail -f /var/log/nginx/access.log"
info "4. Use strong SSL/TLS configuration"
info "5. Enable automatic security updates"

# Create helper script for common firewall tasks
cat > /opt/eff-membership/firewall-helper.sh <<'SCRIPT'
#!/bin/bash
# Firewall Helper Script

if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo"
    exit 1
fi

echo "Firewall Helper Menu"
echo "===================="
echo "1. Show current rules"
echo "2. Add IP to SSH whitelist"
echo "3. Remove IP from SSH whitelist"
echo "4. Block specific IP"
echo "5. Unblock specific IP"
echo "6. Show blocked IPs"
echo "7. Exit"
echo ""
read -p "Select option: " option

case $option in
    1)
        ufw status verbose
        ;;
    2)
        read -p "Enter IP to allow SSH: " ip
        ufw allow from $ip to any port 22 proto tcp
        echo "SSH allowed from $ip"
        ;;
    3)
        read -p "Enter IP to remove: " ip
        ufw delete allow from $ip to any port 22 proto tcp
        echo "SSH rule removed for $ip"
        ;;
    4)
        read -p "Enter IP to block: " ip
        ufw deny from $ip
        echo "Blocked $ip"
        ;;
    5)
        read -p "Enter IP to unblock: " ip
        ufw delete deny from $ip
        echo "Unblocked $ip"
        ;;
    6)
        ufw status | grep DENY
        ;;
    7)
        exit 0
        ;;
    *)
        echo "Invalid option"
        ;;
esac
SCRIPT

chmod +x /opt/eff-membership/firewall-helper.sh
info "Created helper script: /opt/eff-membership/firewall-helper.sh"

echo ""
warning "IMPORTANT NOTES:"
warning "1. Make sure you can still access SSH before closing this session"
warning "2. Test HTTP/HTTPS access from a browser"
warning "3. Keep the firewall-config.txt file for reference"
warning "4. Use firewall-helper.sh for common firewall tasks"

log "Firewall configuration complete!"
exit 0

