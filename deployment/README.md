# Deployment Scripts and Tools
## EFF Membership Management System - Split Architecture

This directory contains comprehensive deployment scripts, configuration files, and documentation for deploying the EFF Membership System to Ubuntu 22.x servers in a **split architecture** (separate backend and frontend servers).

---

## 📁 Files Overview

### 🚀 Setup Scripts

1. **`backend-server-setup.sh`** - Backend server automated setup
   - Installs Docker, Docker Compose, Node.js, PM2
   - Configures PostgreSQL, Redis, pgAdmin (via Docker)
   - Sets up firewall, fail2ban, log rotation
   - Creates application directories and health check scripts
   - **Target:** Backend server (Ubuntu 22.x)

2. **`frontend-server-setup.sh`** - Frontend server automated setup
   - Installs Nginx, Node.js, Certbot
   - Configures firewall, fail2ban, log rotation
   - Creates Nginx configuration templates
   - Sets up health check scripts
   - **Target:** Frontend server (Ubuntu 22.x)

3. **`ubuntu-setup.sh`** - Legacy single-server setup (deprecated)
   - Use backend-server-setup.sh and frontend-server-setup.sh instead

### 🔐 Firewall Configuration Scripts

4. **`configure-backend-firewall.sh`** - Backend firewall configuration
   - Interactive firewall setup for backend server
   - Configures access rules for API, PostgreSQL, Redis, pgAdmin
   - Whitelists frontend server IP
   - Creates helper scripts for firewall management

5. **`configure-frontend-firewall.sh`** - Frontend firewall configuration
   - Interactive firewall setup for frontend server
   - Configures HTTP/HTTPS access
   - Optional SSH IP whitelisting
   - Creates helper scripts for common tasks

### ⚙️ Configuration Files

6. **`backend.env.production`** - Backend environment template
   - Complete environment variable template for backend
   - Includes database, Redis, security, API, SMS, email settings
   - **Action Required:** Copy to `backend/.env` and update all values

7. **`frontend.env.production`** - Frontend environment template
   - Environment variables for frontend build
   - API URLs, feature flags, application settings
   - **Action Required:** Copy to `frontend/.env.production` and update

8. **`nginx-frontend.conf`** - Nginx configuration for frontend
   - Complete Nginx configuration with SSL, security headers
   - API proxy configuration to backend server
   - WebSocket support, rate limiting, caching
   - **Action Required:** Update domain and backend IP

9. **`ecosystem.config.js`** - PM2 process manager configuration
   - PM2 configuration for backend API
   - Cluster mode, auto-restart, logging
   - Optional worker process configuration

### 📚 Documentation

10. **`PRODUCTION_DEPLOYMENT_GUIDE.md`** - **START HERE**
    - Complete step-by-step deployment guide
    - Architecture overview and diagrams
    - Backend and frontend server setup procedures
    - Security configuration and SSL setup

11. **`DEPLOYMENT_CHECKLIST.md`** - Deployment checklist
    - Comprehensive checklist for deployment
    - Pre-deployment, deployment, and post-deployment tasks
    - Security verification
    - Sign-off sections

12. **`MONITORING_SETUP.md`** - Monitoring and health checks
    - Health check scripts and scheduling
    - PM2 monitoring
    - Log management
    - System and database monitoring
    - Alerting setup

13. **`BACKUP_RECOVERY.md`** - Backup and recovery procedures
    - Backup strategy and schedule
    - Database, file, and configuration backups
    - Automated backup setup
    - Recovery procedures
    - Disaster recovery plan

14. **`TROUBLESHOOTING.md`** - Troubleshooting guide
    - Common issues and solutions
    - Backend, frontend, database issues
    - Network and connectivity problems
    - Performance troubleshooting
    - Error message reference

### 🔧 Legacy Files

15. **`verify-deployment.sh`** - Deployment verification (legacy)
16. **`windows-backup.ps1`** - Windows backup script
17. **`windows-backup-enhanced.ps1`** - Enhanced Windows backup
18. **`WINDOWS_BACKUP_USAGE.md`** - Windows backup documentation

---

## 🚀 Quick Start Guide

### Step 1: Prepare for Deployment

**On your local Windows machine:**

```powershell
# Navigate to project root
cd C:\Development\NewProj\Membership-new

# Create database backup
.\deployment\windows-backup.ps1

# Backup will be in: .\deployment\migration-backup\
```

### Step 2: Setup Backend Server

**Connect to backend server:**

```bash
ssh username@backend-server-ip
```

**Run backend setup script:**

```bash
# Download setup script
wget https://raw.githubusercontent.com/ntsowef/eff-membership-system/main/deployment/backend-server-setup.sh

# Make executable
chmod +x backend-server-setup.sh

# Run setup
./backend-server-setup.sh

# Log out and back in for Docker group changes
exit
ssh username@backend-server-ip
```

**Deploy backend application:**

```bash
# Clone repository
cd /opt/eff-membership
git clone https://github.com/ntsowef/eff-membership-system.git .

# Configure environment
cp deployment/backend.env.production backend/.env
nano backend/.env  # Update all CHANGE_THIS_* values

# Start Docker services
docker network create membership-network
docker compose -f docker-compose.postgres.yml up -d

# Transfer and restore database backup
# (Transfer backup file first using scp)
./backup-scripts/restore.sh backups/eff_membership_backup_*.dump

# Deploy API
cd backend
npm ci --production
npm run build
pm2 start ecosystem.config.js --env production
pm2 save

# Configure firewall
cd /opt/eff-membership/deployment
chmod +x configure-backend-firewall.sh
sudo ./configure-backend-firewall.sh
```

### Step 3: Setup Frontend Server

**Connect to frontend server:**

```bash
ssh username@frontend-server-ip
```

**Run frontend setup script:**

```bash
# Download setup script
wget https://raw.githubusercontent.com/ntsowef/eff-membership-system/main/deployment/frontend-server-setup.sh

# Make executable
chmod +x frontend-server-setup.sh

# Run setup
./frontend-server-setup.sh
```

**Deploy frontend application:**

```bash
# Clone repository
cd /opt/eff-membership
git clone https://github.com/ntsowef/eff-membership-system.git .

# Configure environment
cp deployment/frontend.env.production frontend/.env.production
nano frontend/.env.production  # Update API URLs

# Build frontend
cd frontend
npm ci
npm run build

# Configure Nginx
cd /opt/eff-membership
cp deployment/nginx-frontend.conf nginx-config/eff-membership.conf
nano nginx-config/eff-membership.conf  # Update domain and backend IP

sudo cp nginx-config/eff-membership.conf /etc/nginx/sites-available/eff-membership
sudo ln -s /etc/nginx/sites-available/eff-membership /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Configure firewall
cd /opt/eff-membership/deployment
chmod +x configure-frontend-firewall.sh
sudo ./configure-frontend-firewall.sh
```

### Step 4: Verify Deployment

**Test backend:**
```bash
# On backend server
/opt/eff-membership/health-check-backend.sh
curl http://localhost:5000/api/v1/health
```

**Test frontend:**
```bash
# On frontend server
/opt/eff-membership/health-check-frontend.sh
curl http://localhost
```

**Test end-to-end:**
- Open browser: `https://your-domain.com`
- Login with test credentials
- Verify all functionality works

---

## 📖 Detailed Documentation

### Architecture Documentation

**Read First:** `PRODUCTION_DEPLOYMENT_GUIDE.md`
- Complete deployment guide for split architecture
- Architecture diagrams and communication flow
- Server requirements and specifications
- Step-by-step setup for both servers
- Security configuration
- SSL/HTTPS setup

### Deployment Process

**Follow This:** `DEPLOYMENT_CHECKLIST.md`
- Comprehensive checklist for entire deployment
- Pre-deployment preparation
- Backend server deployment steps
- Frontend server deployment steps
- Security verification
- Post-deployment testing
- Sign-off sections

### Operations & Maintenance

**Monitoring:** `MONITORING_SETUP.md`
- Health check scripts and scheduling
- PM2 process monitoring
- Log management and rotation
- System resource monitoring
- Database and Redis monitoring
- Alerting setup (email, Slack)
- Performance metrics

**Backups:** `BACKUP_RECOVERY.md`
- Backup strategy and schedule
- Database backup procedures
- File system backups
- Automated backup setup
- Recovery procedures
- Disaster recovery plan
- Backup verification

**Troubleshooting:** `TROUBLESHOOTING.md`
- Common issues and solutions
- Backend server problems
- Frontend server problems
- Database issues
- Network connectivity
- Performance problems
- Error message reference

---

## ⚙️ Configuration Files

### Backend Environment (`backend.env.production`)

**Critical settings to configure:**

```bash
# Database
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_123!
DB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_123!

# Security
JWT_SECRET=CHANGE_THIS_TO_RANDOM_32_CHAR_STRING_OR_LONGER
SESSION_SECRET=CHANGE_THIS_SESSION_SECRET_32_CHARS_MIN

# CORS (Frontend URL)
CORS_ORIGIN=https://your-frontend-domain.com

# Redis
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_123!

# Email/SMS/Payment Gateway
# See template for all required credentials
```

**Action:** Copy to `backend/.env` and update all `CHANGE_THIS_*` values

### Frontend Environment (`frontend.env.production`)

**Critical settings to configure:**

```bash
# Backend API URL
VITE_API_URL=https://api.your-backend-domain.com
VITE_API_BASE_URL=https://api.your-backend-domain.com/api/v1

# WebSocket
VITE_WS_URL=wss://api.your-backend-domain.com
```

**Action:** Copy to `frontend/.env.production` and update URLs

### Nginx Configuration (`nginx-frontend.conf`)

**Update these values:**
- `your-domain.com` → Your actual domain
- `BACKEND_SERVER_IP` → Your backend server IP address
- SSL certificate paths (after obtaining certificates)

**Action:** Copy to `/etc/nginx/sites-available/eff-membership`

---

## 🔐 Security Best Practices

### Before Deployment

1. **Review all scripts** before running with sudo
2. **Create backups** of current system
3. **Test in staging** environment first
4. **Gather all credentials** securely
5. **Plan maintenance window** for deployment

### Password Requirements

- **Minimum length:** 16 characters
- **Complexity:** Mix of uppercase, lowercase, numbers, symbols
- **Uniqueness:** Different password for each service
- **Storage:** Use password manager, never commit to git

### After Deployment

1. **Change all default passwords**
2. **Configure firewalls** on both servers
3. **Install SSL certificates** with Let's Encrypt
4. **Restrict database access** to localhost or specific IPs
5. **Restrict pgAdmin access** (VPN or IP whitelist)
6. **Enable fail2ban** for SSH protection
7. **Setup automated backups** with off-site storage
8. **Enable monitoring** and alerting
9. **Review logs** regularly
10. **Keep systems updated** with security patches

### Network Security

**Backend Server:**
- Only allow API access from frontend server IP
- Restrict database/Redis to localhost or specific IPs
- Use strong firewall rules
- Consider VPN for administrative access

**Frontend Server:**
- Only expose HTTP/HTTPS ports publicly
- Restrict SSH to specific IPs (optional)
- Use rate limiting in Nginx
- Enable DDoS protection (if available)

---

## 🆘 Troubleshooting

### Setup Script Fails

**Backend setup script:**
```bash
# Check system requirements
lsb_release -a  # Should be Ubuntu 22.04

# Check internet connectivity
ping -c 3 google.com

# Check sudo access
sudo -v

# View detailed error
./backend-server-setup.sh 2>&1 | tee setup.log
```

**Frontend setup script:**
```bash
# Similar checks as above
./frontend-server-setup.sh 2>&1 | tee setup.log
```

### Docker Services Not Starting

```bash
# Check Docker status
sudo systemctl status docker

# Check containers
docker ps -a

# Check logs
docker logs eff-membership-postgres
docker logs eff-membership-redis

# Restart services
docker compose -f docker-compose.postgres.yml restart
```

### API Not Responding

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs eff-api --lines 100

# Test locally
curl http://localhost:5000/api/v1/health

# Restart
pm2 restart eff-api
```

### Frontend Not Loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /opt/eff-membership/logs/nginx/error.log

# Reload Nginx
sudo systemctl reload nginx
```

### Database Connection Issues

```bash
# Check PostgreSQL
docker exec eff-membership-postgres pg_isready -U eff_admin

# Check logs
docker logs eff-membership-postgres

# Restart
docker restart eff-membership-postgres
```

**For more detailed troubleshooting, see:** `TROUBLESHOOTING.md`

---

## 🔄 Update & Maintenance

### Update Application

**Backend update:**
```bash
cd /opt/eff-membership
git pull origin main

cd backend
npm ci --production
npm run build
pm2 restart eff-api

# Run migrations if needed
npm run migrate
```

**Frontend update:**
```bash
cd /opt/eff-membership
git pull origin main

cd frontend
npm ci
npm run build

# Nginx will serve the new build automatically
```

### System Maintenance

**Daily:**
- Check health status: `./health-check-backend.sh`
- Review error logs
- Verify backups completed

**Weekly:**
- Update system packages: `sudo apt update && sudo apt upgrade`
- Review performance metrics
- Check disk space: `df -h`

**Monthly:**
- Test disaster recovery procedures
- Review and update documentation
- Security audit

---

## 📞 Support & Resources

### Documentation

- **`PRODUCTION_DEPLOYMENT_GUIDE.md`** - Complete deployment guide
- **`DEPLOYMENT_CHECKLIST.md`** - Step-by-step checklist
- **`MONITORING_SETUP.md`** - Monitoring and health checks
- **`BACKUP_RECOVERY.md`** - Backup and recovery procedures
- **`TROUBLESHOOTING.md`** - Common issues and solutions

### Getting Help

1. **Check documentation** in this directory
2. **Review logs:**
   - Backend: `/opt/eff-membership/logs/backend/`
   - PM2: `/opt/eff-membership/logs/pm2/`
   - Nginx: `/opt/eff-membership/logs/nginx/`
   - Docker: `docker logs <container-name>`

3. **Run health checks:**
   - Backend: `./health-check-backend.sh`
   - Frontend: `./health-check-frontend.sh`

4. **Check system resources:**
   ```bash
   htop          # CPU and memory
   df -h         # Disk space
   pm2 monit     # PM2 processes
   docker ps     # Docker containers
   ```

5. **Contact support** with:
   - Error messages
   - Log excerpts
   - Steps to reproduce
   - Server specifications

---

## 📝 Important Notes

### Script Safety

- All scripts are designed to be **idempotent** (safe to run multiple times)
- Scripts include **error handling** and detailed logging
- Always **review scripts** before running with sudo
- Test in **staging environment** before production

### File Permissions

After deployment, ensure proper permissions:
```bash
# Backend .env file
chmod 600 /opt/eff-membership/backend/.env

# Frontend .env file
chmod 600 /opt/eff-membership/frontend/.env.production

# Scripts
chmod +x /opt/eff-membership/deployment/*.sh
chmod +x /opt/eff-membership/backup-scripts/*.sh
```

### Backup Verification

Always verify backups work:
```bash
# Test database restore
./backup-scripts/restore.sh backups/database/test-backup.dump

# Verify files backup
tar -tzf backups/files/uploads_latest.tar.gz
```

---

## 📅 Version History

**Version 2.0** (2025-10-24)
- Split architecture deployment (separate backend/frontend servers)
- Comprehensive documentation suite
- Enhanced security configurations
- Automated firewall setup
- Health check scripts
- Monitoring and alerting setup

**Version 1.0** (2025-10-12)
- Initial single-server deployment
- Basic Docker setup
- Legacy ubuntu-setup.sh script

---

**Last Updated:** 2025-10-24
**Version:** 2.0
**Architecture:** Split (Backend + Frontend Servers)
**Target OS:** Ubuntu 22.04 LTS

---

**End of Deployment README**

