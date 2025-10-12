# Ubuntu Server Docker Deployment Guide
## EFF Membership Management System - Complete Migration Guide

This guide provides step-by-step instructions for installing Docker on Ubuntu and migrating your PostgreSQL database with all existing data to a new Ubuntu server.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Ubuntu Server Preparation](#ubuntu-server-preparation)
3. [Docker Installation](#docker-installation)
4. [Database Backup and Export](#database-backup-and-export)
5. [Transfer Files to Ubuntu Server](#transfer-files-to-ubuntu-server)
6. [Deploy Application with Docker](#deploy-application-with-docker)
7. [Database Restoration](#database-restoration)
8. [Verification and Testing](#verification-and-testing)
9. [Production Configuration](#production-configuration)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### On Your Current Windows Machine:
- PostgreSQL database running with data
- Docker Desktop installed (for testing)
- Git installed
- SSH client (PowerShell or PuTTY)

### On Ubuntu Server:
- Ubuntu 20.04 LTS or 22.04 LTS (recommended)
- Minimum 4GB RAM (8GB+ recommended)
- 50GB+ disk space
- Root or sudo access
- Static IP address or domain name
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 5432 (PostgreSQL), 5050 (pgAdmin)

---

## Ubuntu Server Preparation

### 1. Update System Packages

```bash
# Connect to your Ubuntu server via SSH
ssh username@your-server-ip

# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim nano net-tools ufw
```

### 2. Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (if accessing externally)
sudo ufw allow 5432/tcp

# Allow pgAdmin (if accessing externally)
sudo ufw allow 5050/tcp

# Allow Redis (if accessing externally)
sudo ufw allow 6379/tcp

# Check firewall status
sudo ufw status verbose
```

### 3. Create Application Directory

```bash
# Create directory for the application
sudo mkdir -p /opt/eff-membership
sudo chown $USER:$USER /opt/eff-membership
cd /opt/eff-membership
```

---

## Docker Installation

### 1. Install Docker Engine

```bash
# Remove old Docker versions (if any)
sudo apt remove docker docker-engine docker.io containerd runc

# Install prerequisites
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

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

# Verify Docker installation
docker --version
docker compose version
```

### 2. Configure Docker Permissions

```bash
# Add your user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Apply group changes (logout and login, or use newgrp)
newgrp docker

# Test Docker without sudo
docker run hello-world
```

### 3. Configure Docker for Production

```bash
# Create Docker daemon configuration
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

# Verify Docker is running
sudo systemctl status docker
```

---

## Database Backup and Export

### On Your Windows Machine:

### 1. Create Database Backup

```powershell
# Open PowerShell in your project directory
cd C:\Development\NewProj\Membership-new

# Create backup directory
New-Item -ItemType Directory -Force -Path ".\migration-backup"

# Export PostgreSQL database (using Docker)
docker exec eff-membership-postgres pg_dump -U eff_admin -d eff_membership_db -F c -f /tmp/eff_membership_backup.dump

# Copy backup from container to local machine
docker cp eff-membership-postgres:/tmp/eff_membership_backup.dump .\migration-backup\eff_membership_backup.dump

# Alternative: Plain SQL format (easier to inspect)
docker exec eff-membership-postgres pg_dump -U eff_admin -d eff_membership_db > .\migration-backup\eff_membership_backup.sql
```

### 2. Verify Backup

```powershell
# Check backup file size (should be > 0 bytes)
Get-ChildItem .\migration-backup\

# Optional: Test restore locally first
# Create test database
docker exec eff-membership-postgres psql -U eff_admin -c "CREATE DATABASE eff_membership_test;"

# Restore to test database
docker exec -i eff-membership-postgres pg_restore -U eff_admin -d eff_membership_test < .\migration-backup\eff_membership_backup.dump
```

### 3. Package Application Files

```powershell
# Create deployment package (exclude node_modules, data directories)
$exclude = @('node_modules', 'data', 'logs', 'temp', '.git', 'dist', 'build')

# Create archive (you'll need 7-Zip or similar)
# Or manually copy these directories:
# - backend/
# - frontend/
# - database-recovery/
# - docker-compose.postgres.yml
# - .env.postgres (rename to .env on server)
# - package.json files
```

---

## Transfer Files to Ubuntu Server

### Method 1: Using SCP (Secure Copy)

```powershell
# From Windows PowerShell
# Transfer database backup
scp .\migration-backup\eff_membership_backup.dump username@your-server-ip:/opt/eff-membership/

# Transfer application files (if not using Git)
scp -r .\backend username@your-server-ip:/opt/eff-membership/
scp -r .\frontend username@your-server-ip:/opt/eff-membership/
scp -r .\database-recovery username@your-server-ip:/opt/eff-membership/
scp .\docker-compose.postgres.yml username@your-server-ip:/opt/eff-membership/
scp .\.env.postgres username@your-server-ip:/opt/eff-membership/.env
```

### Method 2: Using Git (Recommended)

```bash
# On Ubuntu server
cd /opt/eff-membership

# Clone your repository
git clone https://github.com/ntsowef/eff-membership-system.git .

# Or if already cloned, pull latest changes
git pull origin main

# Transfer only the database backup file via SCP
# (from Windows PowerShell)
scp .\migration-backup\eff_membership_backup.dump username@your-server-ip:/opt/eff-membership/
```

### Method 3: Using SFTP

```powershell
# Use FileZilla, WinSCP, or similar SFTP client
# Connect to: sftp://your-server-ip
# Upload files to: /opt/eff-membership/
```

---

## Deploy Application with Docker

### On Ubuntu Server:

### 1. Prepare Environment Configuration

```bash
cd /opt/eff-membership

# Copy environment template
cp .env.postgres .env

# Edit environment variables for production
nano .env
```

**Update these critical values in `.env`:**

```bash
# Change passwords for production
POSTGRES_PASSWORD=YourStrongPasswordHere123!
DB_PASSWORD=YourStrongPasswordHere123!
PGADMIN_DEFAULT_PASSWORD=YourStrongPasswordHere123!
JWT_SECRET=your-production-jwt-secret-min-32-chars-random

# Update host settings for production
DB_HOST=postgres  # Docker service name
REDIS_HOST=redis  # Docker service name

# Update CORS for your domain
CORS_ORIGIN=https://your-domain.com

# Set production mode
NODE_ENV=production

# Update email settings
MAIL_HOST=your-smtp-server.com
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-email-password
```

### 2. Create Required Directories

```bash
# Create data directories
mkdir -p data/postgres data/pgadmin data/redis
mkdir -p backups/postgres logs/nginx uploads temp

# Set proper permissions
chmod -R 755 data backups logs uploads temp
```

### 3. Create Docker Network

```bash
# Create external network for services
docker network create membership-network
```

### 4. Start Docker Services

```bash
# Start PostgreSQL and related services
docker compose -f docker-compose.postgres.yml up -d

# Check service status
docker compose -f docker-compose.postgres.yml ps

# View logs
docker compose -f docker-compose.postgres.yml logs -f postgres
```

---

## Database Restoration

### 1. Wait for PostgreSQL to Initialize

```bash
# Wait for PostgreSQL to be ready (about 30-60 seconds)
docker compose -f docker-compose.postgres.yml logs -f postgres

# Test connection
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT version();"
```

### 2. Restore Database from Backup

```bash
# Copy backup file into container
docker cp eff_membership_backup.dump eff-membership-postgres:/tmp/

# Restore database (custom format)
docker exec eff-membership-postgres pg_restore -U eff_admin -d eff_membership_db -c -v /tmp/eff_membership_backup.dump

# OR restore from SQL file
docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < eff_membership_backup.sql

# Verify restoration
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "\dt"
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT COUNT(*) FROM members;"
```

### 3. Run Additional SQL Scripts (if needed)

```bash
# If you have additional schema updates
docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < database-recovery/create-sms-webhook-tables.sql

# Run any other migration scripts
for file in database-recovery/*.sql; do
    echo "Running $file..."
    docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < "$file"
done
```

---

## Verification and Testing

### 1. Verify Database

```bash
# Connect to database
docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db

# Run verification queries
SELECT COUNT(*) FROM members;
SELECT COUNT(*) FROM provinces;
SELECT COUNT(*) FROM districts;
SELECT COUNT(*) FROM municipalities;
\dt  -- List all tables
\q   -- Exit
```

### 2. Access pgAdmin

```bash
# Get server IP
hostname -I

# Open browser: http://your-server-ip:5050
# Login with credentials from .env:
# Email: admin@example.com
# Password: (from PGADMIN_DEFAULT_PASSWORD)
```

### 3. Test Redis

```bash
# Test Redis connection
docker exec eff-membership-redis redis-cli ping
# Should return: PONG
```

---

## Production Configuration

### 1. Install and Configure Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/eff-membership
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # pgAdmin (optional, restrict access)
    location /pgadmin {
        proxy_pass http://localhost:5050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/eff-membership /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 2. Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3. Setup Automated Backups

Create backup script:

```bash
nano /opt/eff-membership/backup-scripts/backup.sh
```

**Backup Script Content:**

```bash
#!/bin/bash
# PostgreSQL Backup Script

BACKUP_DIR="/opt/eff-membership/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="eff_membership_backup_${DATE}.dump"
RETENTION_DAYS=30

# Create backup
docker exec eff-membership-postgres pg_dump -U eff_admin -d eff_membership_db -F c -f /tmp/${BACKUP_FILE}
docker cp eff-membership-postgres:/tmp/${BACKUP_FILE} ${BACKUP_DIR}/

# Compress backup
gzip ${BACKUP_DIR}/${BACKUP_FILE}

# Remove old backups
find ${BACKUP_DIR} -name "*.dump.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

```bash
# Make executable
chmod +x /opt/eff-membership/backup-scripts/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /opt/eff-membership/backup-scripts/backup.sh >> /opt/eff-membership/logs/backup.log 2>&1
```

### 4. Setup Application Services

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Navigate to backend
cd /opt/eff-membership/backend

# Install dependencies
npm ci --production

# Build application
npm run build

# Start with PM2
pm2 start dist/app.js --name eff-membership-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it provides

# Navigate to frontend
cd /opt/eff-membership/frontend

# Install dependencies
npm ci --production

# Build for production
npm run build

# Serve with PM2
pm2 serve build 3000 --name eff-membership-frontend --spa

# Save configuration
pm2 save
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Docker Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### 2. PostgreSQL Connection Refused

```bash
# Check if container is running
docker ps

# Check logs
docker logs eff-membership-postgres

# Verify port binding
sudo netstat -tulpn | grep 5432
```

#### 3. Database Restore Fails

```bash
# Drop and recreate database
docker exec eff-membership-postgres psql -U eff_admin -c "DROP DATABASE IF EXISTS eff_membership_db;"
docker exec eff-membership-postgres psql -U eff_admin -c "CREATE DATABASE eff_membership_db;"

# Restore again
docker exec eff-membership-postgres pg_restore -U eff_admin -d eff_membership_db -c -v /tmp/eff_membership_backup.dump
```

#### 4. Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker system
docker system prune -a --volumes

# Remove old logs
sudo find /var/log -type f -name "*.log" -mtime +30 -delete
```

#### 5. Port Already in Use

```bash
# Find process using port
sudo lsof -i :5432

# Kill process
sudo kill -9 <PID>

# Or change port in .env file
```

### Monitoring Commands

```bash
# View all containers
docker ps -a

# View container logs
docker logs -f eff-membership-postgres

# View resource usage
docker stats

# Check application logs
pm2 logs

# Monitor system resources
htop
```

---

## Security Checklist

- [ ] Changed all default passwords
- [ ] Configured firewall (UFW)
- [ ] Installed SSL certificate
- [ ] Restricted pgAdmin access
- [ ] Setup automated backups
- [ ] Configured log rotation
- [ ] Updated all packages
- [ ] Disabled root SSH login
- [ ] Setup fail2ban for SSH protection
- [ ] Configured Redis password (if exposed)
- [ ] Reviewed and secured .env file permissions

---

## Next Steps

1. **Test the application thoroughly**
2. **Setup monitoring** (Prometheus, Grafana)
3. **Configure log aggregation** (ELK Stack)
4. **Setup CI/CD pipeline** (GitHub Actions, Jenkins)
5. **Document your deployment process**
6. **Train team on server management**

---

## Support and Resources

- Docker Documentation: https://docs.docker.com/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Ubuntu Server Guide: https://ubuntu.com/server/docs
- Let's Encrypt: https://letsencrypt.org/

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Server IP:** _____________  
**Domain:** _____________


