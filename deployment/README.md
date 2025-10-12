# Deployment Scripts and Tools
## EFF Membership Management System

This directory contains scripts and tools to help you deploy the EFF Membership System to an Ubuntu server with Docker.

---

## 📁 Files Overview

### Scripts

1. **`ubuntu-setup.sh`** - Automated Ubuntu server setup
   - Installs Docker, Docker Compose, Node.js, PM2, Nginx
   - Configures firewall and security
   - Creates application directories
   - Sets up fail2ban for SSH protection

2. **`verify-deployment.sh`** - Deployment verification
   - Checks all services are running
   - Verifies database connectivity
   - Tests Redis connection
   - Validates configuration

3. **`windows-backup.ps1`** - Windows PowerShell backup script
   - Creates PostgreSQL database backup
   - Exports in both custom and SQL formats
   - Verifies backup integrity

### Documentation

- **`../docs/UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md`** - Complete deployment guide
- **`../docs/QUICK_DEPLOYMENT_REFERENCE.md`** - Quick reference guide

---

## 🚀 Quick Start

### On Windows (Backup Current Database)

```powershell
# Navigate to project root
cd C:\Development\NewProj\Membership-new

# Run backup script
.\deployment\windows-backup.ps1

# Backup will be in: .\migration-backup\
```

### On Ubuntu Server (Initial Setup)

```bash
# Connect to server
ssh username@your-server-ip

# Download setup script
wget https://raw.githubusercontent.com/ntsowef/eff-membership-system/main/deployment/ubuntu-setup.sh

# Make executable
chmod +x ubuntu-setup.sh

# Run setup
./ubuntu-setup.sh

# Log out and back in for Docker group changes
exit
ssh username@your-server-ip
```

### Transfer Files

```powershell
# From Windows PowerShell
scp .\migration-backup\eff_membership_backup_*.dump username@server-ip:/opt/eff-membership/
```

### Deploy Application

```bash
# On Ubuntu server
cd /opt/eff-membership

# Clone repository (if not already done)
git clone https://github.com/ntsowef/eff-membership-system.git .

# Configure environment
cp .env.postgres .env
nano .env  # Update passwords and settings

# Create Docker network
docker network create membership-network

# Start services
docker compose -f docker-compose.postgres.yml up -d

# Restore database
cd /opt/eff-membership
chmod +x backup-scripts/restore.sh
./backup-scripts/restore.sh eff_membership_backup_*.dump

# Verify deployment
chmod +x deployment/verify-deployment.sh
./deployment/verify-deployment.sh
```

---

## 📋 Script Details

### ubuntu-setup.sh

**Purpose**: Automates the initial Ubuntu server setup

**What it does**:
- Updates system packages
- Installs Docker and Docker Compose
- Installs Node.js 18.x and PM2
- Installs and configures Nginx
- Configures UFW firewall
- Sets up fail2ban for security
- Creates application directories
- Configures log rotation

**Usage**:
```bash
chmod +x ubuntu-setup.sh
./ubuntu-setup.sh
```

**Requirements**:
- Ubuntu 20.04 or 22.04 LTS
- Sudo privileges
- Internet connection

**Time**: ~10 minutes

---

### verify-deployment.sh

**Purpose**: Verifies that all components are properly deployed and running

**What it checks**:
- Docker installation and daemon status
- Docker Compose installation
- Docker network existence
- Container status (PostgreSQL, pgAdmin, Redis)
- Database connectivity and data
- Redis connectivity
- Node.js and PM2 installation
- Nginx installation and status
- Firewall configuration
- Application files and directories

**Usage**:
```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

**Exit codes**:
- `0` - All checks passed or only warnings
- `1` - Critical failures detected

**Time**: ~30 seconds

---

### windows-backup.ps1

**Purpose**: Creates a backup of your PostgreSQL database on Windows

**What it does**:
- Checks Docker is running
- Creates backup directory
- Exports database in custom format (compressed)
- Exports database in SQL format (plain text)
- Verifies backup integrity
- Shows backup file sizes and statistics

**Usage**:
```powershell
# Basic usage
.\deployment\windows-backup.ps1

# Custom backup directory
.\deployment\windows-backup.ps1 -BackupDir "C:\Backups"

# Custom container name
.\deployment\windows-backup.ps1 -ContainerName "my-postgres-container"
```

**Parameters**:
- `-BackupDir` - Backup directory (default: `.\migration-backup`)
- `-ContainerName` - Docker container name (default: `eff-membership-postgres`)
- `-DbUser` - Database user (default: `eff_admin`)
- `-DbName` - Database name (default: `eff_membership_db`)

**Time**: ~2-5 minutes (depends on database size)

---

## 🔧 Configuration

### Environment Variables

Before deploying, update these critical values in `.env`:

```bash
# Database passwords
POSTGRES_PASSWORD=YourStrongPasswordHere123!
DB_PASSWORD=YourStrongPasswordHere123!
PGADMIN_DEFAULT_PASSWORD=YourStrongPasswordHere123!

# Security
JWT_SECRET=your-production-jwt-secret-min-32-chars-random

# Application
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com

# Email
MAIL_HOST=your-smtp-server.com
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-email-password
```

---

## 🔐 Security Considerations

### Before Running Scripts

1. **Review scripts** - Always review scripts before running with sudo
2. **Backup data** - Create backups before making changes
3. **Test environment** - Test in a staging environment first

### After Deployment

1. **Change all default passwords** in `.env`
2. **Configure firewall** properly
3. **Install SSL certificate** with Let's Encrypt
4. **Restrict pgAdmin access** (bind to localhost or use VPN)
5. **Setup automated backups**
6. **Enable monitoring and logging**

---

## 🆘 Troubleshooting

### ubuntu-setup.sh fails

```bash
# Check system requirements
lsb_release -a  # Should be Ubuntu 20.04 or 22.04

# Check internet connectivity
ping -c 3 google.com

# Check sudo access
sudo -v

# View detailed error
./ubuntu-setup.sh 2>&1 | tee setup.log
```

### verify-deployment.sh shows failures

```bash
# Check Docker
sudo systemctl status docker

# Check containers
docker ps -a

# Check logs
docker compose -f docker-compose.postgres.yml logs

# Restart services
docker compose -f docker-compose.postgres.yml restart
```

### windows-backup.ps1 fails

```powershell
# Check Docker Desktop is running
docker ps

# Check container name
docker ps --format "{{.Names}}"

# Check container logs
docker logs eff-membership-postgres

# Run with verbose output
.\deployment\windows-backup.ps1 -Verbose
```

---

## 📊 Deployment Checklist

Use this checklist to track your deployment progress:

- [ ] Windows backup completed
- [ ] Ubuntu server prepared
- [ ] ubuntu-setup.sh executed successfully
- [ ] Files transferred to server
- [ ] .env configured with production values
- [ ] Docker services started
- [ ] Database restored
- [ ] verify-deployment.sh passed
- [ ] Backend deployed with PM2
- [ ] Frontend deployed with PM2
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Automated backups scheduled
- [ ] Monitoring setup
- [ ] Documentation updated

---

## 🔄 Update Procedure

To update an existing deployment:

```bash
# Pull latest changes
cd /opt/eff-membership
git pull origin main

# Update backend
cd backend
npm ci --production
npm run build
pm2 restart eff-api

# Update frontend
cd ../frontend
npm ci --production
npm run build
pm2 restart eff-frontend

# Run migrations if needed
cd ../backend
npm run migrate

# Verify
cd /opt/eff-membership
./deployment/verify-deployment.sh
```

---

## 📞 Support

For detailed instructions, see:
- [Complete Deployment Guide](../docs/UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md)
- [Quick Reference](../docs/QUICK_DEPLOYMENT_REFERENCE.md)

For issues:
1. Check the troubleshooting sections in the guides
2. Review container logs: `docker compose logs`
3. Run verification script: `./deployment/verify-deployment.sh`
4. Check system resources: `htop`, `df -h`

---

## 📝 Notes

- All scripts are designed to be idempotent (safe to run multiple times)
- Scripts include error handling and logging
- Backup scripts preserve data integrity
- Verification script provides detailed diagnostics

---

**Last Updated**: 2025-10-12  
**Version**: 1.0

