#!/bin/bash
# =====================================================================================
# Ubuntu Server Setup Script for EFF Membership System
# This script automates the initial server setup and Docker installation
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

log "Starting Ubuntu Server Setup for EFF Membership System"
log "========================================================"

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

# Configure firewall
log "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 5432/tcp comment 'PostgreSQL'
sudo ufw allow 5050/tcp comment 'pgAdmin'
sudo ufw allow 6379/tcp comment 'Redis'

info "Firewall configured. Current status:"
sudo ufw status verbose

# Install Docker
log "Installing Docker..."

# Remove old Docker versions
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
log "Adding user to docker group..."
sudo usermod -aG docker $USER

# Configure Docker daemon
log "Configuring Docker daemon..."
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

# Restart Docker
sudo systemctl restart docker
sudo systemctl enable docker

# Verify Docker installation
log "Verifying Docker installation..."
docker --version
docker compose version

# Install Node.js
log "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
log "Verifying Node.js installation..."
node --version
npm --version

# Install PM2
log "Installing PM2 process manager..."
sudo npm install -g pm2

# Install Nginx
log "Installing Nginx..."
sudo apt install -y nginx
sudo systemctl enable nginx

# Create application directory
log "Creating application directory..."
sudo mkdir -p /opt/eff-membership
sudo chown $USER:$USER /opt/eff-membership

# Create required subdirectories
cd /opt/eff-membership
mkdir -p data/postgres data/pgadmin data/redis
mkdir -p backups/postgres logs uploads temp

# Set proper permissions
chmod -R 755 data backups logs uploads temp

# Create Docker network
log "Creating Docker network..."
docker network create membership-network 2>/dev/null || info "Network already exists"

# Install Certbot for SSL
log "Installing Certbot for SSL certificates..."
sudo apt install -y certbot python3-certbot-nginx

# Configure log rotation
log "Configuring log rotation..."
sudo tee /etc/logrotate.d/eff-membership > /dev/null <<EOF
/opt/eff-membership/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 $USER $USER
    sharedscripts
}
EOF

# Setup fail2ban for SSH protection
log "Installing and configuring fail2ban..."
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create fail2ban configuration for SSH
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
EOF

sudo systemctl restart fail2ban

# Display system information
log "Setup completed successfully!"
log "========================================================"
info "System Information:"
info "  - OS: $(lsb_release -d | cut -f2)"
info "  - Kernel: $(uname -r)"
info "  - Docker: $(docker --version)"
info "  - Docker Compose: $(docker compose version)"
info "  - Node.js: $(node --version)"
info "  - NPM: $(npm --version)"
info "  - PM2: $(pm2 --version)"
info "  - Nginx: $(nginx -v 2>&1)"
info ""
info "Application directory: /opt/eff-membership"
info ""
warning "IMPORTANT: You need to log out and log back in for Docker group changes to take effect!"
warning "Or run: newgrp docker"
info ""
log "Next steps:"
info "1. Transfer your application files to /opt/eff-membership"
info "2. Transfer your database backup"
info "3. Configure .env file"
info "4. Run: docker compose -f docker-compose.postgres.yml up -d"
info "5. Restore database backup"
info "6. Deploy backend and frontend applications"
info ""
log "Refer to UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md for detailed instructions"

exit 0

