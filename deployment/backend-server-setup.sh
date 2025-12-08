#!/bin/bash
# =====================================================================================
# Backend Server Setup Script for EFF Membership System
# Ubuntu 22.x - Split Architecture
# This script sets up the backend server with Docker, PostgreSQL, Redis, and Node.js
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

log "Starting Backend Server Setup for EFF Membership System"
log "========================================================="
info "This script will install:"
info "  - Docker & Docker Compose"
info "  - Node.js 18.x & PM2"
info "  - PostgreSQL 16 (via Docker)"
info "  - Redis 7 (via Docker)"
info "  - pgAdmin 4 (via Docker)"
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
    lsb-release \
    build-essential

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

# Verify PM2 installation
pm2 --version

# Create application directory
log "Creating application directory..."
sudo mkdir -p /opt/eff-membership
sudo chown $USER:$USER /opt/eff-membership

# Create required subdirectories
cd /opt/eff-membership
mkdir -p data/postgres data/pgadmin data/redis
mkdir -p backups/postgres backups/database
mkdir -p logs/backend logs/nginx logs/pm2
mkdir -p uploads/documents uploads/excel-processing uploads/bulk-renewals
mkdir -p temp

# Set proper permissions
chmod -R 755 data backups logs uploads temp

# Create Docker network
log "Creating Docker network..."
docker network create membership-network 2>/dev/null || info "Network already exists"

# Configure log rotation
log "Configuring log rotation..."
sudo tee /etc/logrotate.d/eff-membership > /dev/null <<EOF
/opt/eff-membership/logs/backend/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 $USER $USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/opt/eff-membership/logs/pm2/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 $USER $USER
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

# Configure basic firewall (will be customized later)
log "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp comment 'SSH'
info "Firewall configured. Additional ports will be opened as needed."

# Install monitoring tools
log "Installing monitoring tools..."
sudo apt install -y \
    sysstat \
    iotop \
    nethogs \
    ncdu

# Create systemd service for Docker Compose (optional)
log "Creating systemd service for Docker services..."
sudo tee /etc/systemd/system/eff-membership-docker.service > /dev/null <<EOF
[Unit]
Description=EFF Membership Docker Services
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/eff-membership
ExecStart=/usr/bin/docker compose -f docker-compose.postgres.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.postgres.yml down
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload

# Create health check script
log "Creating health check script..."
cat > /opt/eff-membership/health-check-backend.sh <<'EOF'
#!/bin/bash
# Backend Server Health Check Script

echo "=== Backend Server Health Check ==="
echo "Date: $(date)"
echo ""

# Check Docker
echo "Docker Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Check PM2
echo "PM2 Status:"
pm2 status
echo ""

# Check PostgreSQL
echo "PostgreSQL Status:"
docker exec eff-membership-postgres pg_isready -U eff_admin || echo "PostgreSQL not responding"
echo ""

# Check Redis
echo "Redis Status:"
docker exec eff-membership-redis redis-cli ping || echo "Redis not responding"
echo ""

# Check disk space
echo "Disk Space:"
df -h /opt/eff-membership
echo ""

# Check memory
echo "Memory Usage:"
free -h
echo ""

# Check API endpoint
echo "API Health Check:"
curl -s http://localhost:5000/api/v1/health || echo "API not responding"
echo ""

echo "=== Health Check Complete ==="
EOF

chmod +x /opt/eff-membership/health-check-backend.sh

# Display system information
log "Setup completed successfully!"
log "========================================================="
info "System Information:"
info "  - OS: $(lsb_release -d | cut -f2)"
info "  - Kernel: $(uname -r)"
info "  - Docker: $(docker --version)"
info "  - Docker Compose: $(docker compose version)"
info "  - Node.js: $(node --version)"
info "  - NPM: $(npm --version)"
info "  - PM2: $(pm2 --version)"
info ""
info "Application directory: /opt/eff-membership"
info "Health check script: /opt/eff-membership/health-check-backend.sh"
info ""
warning "IMPORTANT: You need to log out and log back in for Docker group changes to take effect!"
warning "Or run: newgrp docker"
info ""
log "Next steps:"
info "1. Log out and log back in (or run: newgrp docker)"
info "2. Transfer your application files to /opt/eff-membership"
info "3. Transfer your database backup to /opt/eff-membership/backups/"
info "4. Configure backend/.env file (use deployment/backend.env.production as template)"
info "5. Start Docker services: docker compose -f docker-compose.postgres.yml up -d"
info "6. Restore database: ./backup-scripts/restore.sh backups/your-backup.dump"
info "7. Deploy backend: cd backend && npm ci --production && npm run build && pm2 start dist/app.js --name eff-api"
info "8. Configure firewall to allow frontend server access"
info ""
log "Refer to PRODUCTION_DEPLOYMENT_GUIDE.md for detailed instructions"

exit 0

