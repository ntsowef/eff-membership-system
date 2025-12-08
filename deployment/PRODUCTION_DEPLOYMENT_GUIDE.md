# EFF Membership Management System - Production Deployment Guide
## Split Architecture: Two-Server Deployment on Ubuntu 22.x

**Version:** 2.0  
**Last Updated:** 2025-10-24  
**Architecture:** Distributed (Backend Server + Frontend Server)

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Server Requirements](#server-requirements)
4. [Backend Server Setup](#backend-server-setup)
5. [Frontend Server Setup](#frontend-server-setup)
6. [Security Configuration](#security-configuration)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [Database Migration](#database-migration)
9. [Monitoring & Health Checks](#monitoring--health-checks)
10. [Backup & Recovery](#backup--recovery)
11. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### Split Architecture Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS (443)
                         │
         ┌───────────────▼────────────────┐
         │   FRONTEND SERVER (Ubuntu 22.x) │
         │   - Nginx (Web Server)          │
         │   - React App (Static Files)    │
         │   - SSL/TLS Termination         │
         │   - Port 443 (HTTPS)            │
         │   - Port 80 (HTTP → HTTPS)      │
         └───────────────┬────────────────┘
                         │
                         │ HTTPS/HTTP
                         │ API Requests
                         │
         ┌───────────────▼────────────────┐
         │   BACKEND SERVER (Ubuntu 22.x)  │
         │   - Node.js/Express API         │
         │   - PostgreSQL Database         │
         │   - Redis Cache                 │
         │   - pgAdmin                     │
         │   - Port 5000 (API)             │
         │   - Port 5432 (PostgreSQL)      │
         │   - Port 6379 (Redis)           │
         │   - Port 5050 (pgAdmin)         │
         └─────────────────────────────────┘
```

### Communication Flow

1. **User → Frontend Server**: HTTPS requests to Nginx
2. **Frontend Server → Backend Server**: API calls to Node.js/Express
3. **Backend Server → Database**: PostgreSQL queries
4. **Backend Server → Cache**: Redis operations

---

## 📦 Prerequisites

### Required Information

Before starting, gather the following:

- [ ] Backend server IP address and SSH credentials
- [ ] Frontend server IP address and SSH credentials
- [ ] Domain name(s) for the application
- [ ] SSL certificate (or use Let's Encrypt)
- [ ] Database backup file (.dump or .sql)
- [ ] Environment variable values (passwords, API keys, etc.)

### Required Software (will be installed by scripts)

- Ubuntu 22.04 LTS (both servers)
- Docker & Docker Compose (backend server)
- Node.js 18.x (both servers)
- PM2 Process Manager (both servers)
- Nginx (frontend server)
- PostgreSQL 16 (via Docker on backend)
- Redis 7 (via Docker on backend)

---

## 💻 Server Requirements

### Backend Server

**Minimum Specifications:**
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Network**: Static IP, open ports 5000, 5432, 6379, 5050

**Recommended Specifications:**
- **CPU**: 8 cores
- **RAM**: 16 GB
- **Storage**: 200 GB SSD
- **OS**: Ubuntu 22.04 LTS

### Frontend Server

**Minimum Specifications:**
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 50 GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Network**: Static IP, open ports 80, 443

**Recommended Specifications:**
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **OS**: Ubuntu 22.04 LTS

---

## 🔧 Backend Server Setup

### Step 1: Initial Server Preparation

```bash
# Connect to backend server
ssh username@backend-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Set hostname (optional)
sudo hostnamectl set-hostname eff-backend
```

### Step 2: Run Backend Setup Script

```bash
# Download the backend setup script
wget https://raw.githubusercontent.com/ntsowef/eff-membership-system/main/deployment/backend-server-setup.sh

# Make executable
chmod +x backend-server-setup.sh

# Run setup script
./backend-server-setup.sh

# Log out and back in for Docker group changes
exit
ssh username@backend-server-ip
```

### Step 3: Transfer Application Files

From your local machine:

```powershell
# Transfer database backup
scp .\migration-backup\eff_membership_backup_*.dump username@backend-server-ip:/opt/eff-membership/backups/

# Or clone from repository
ssh username@backend-server-ip
cd /opt/eff-membership
git clone https://github.com/ntsowef/eff-membership-system.git .
```

### Step 4: Configure Backend Environment

```bash
cd /opt/eff-membership

# Copy environment template
cp deployment/backend.env.production backend/.env

# Edit environment file
nano backend/.env
```

**Critical Backend Environment Variables:**

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
API_PREFIX=/api
API_VERSION=v1

# Database Configuration (Docker service names)
DB_HOST=postgres
DB_PORT=5432
DB_USER=eff_admin
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD_HERE
DB_NAME=eff_membership_db
DB_CONNECTION_LIMIT=20
DB_TIMEOUT=30000

# PostgreSQL Docker Configuration
POSTGRES_USER=eff_admin
POSTGRES_PASSWORD=YOUR_SECURE_DB_PASSWORD_HERE
POSTGRES_DB=eff_membership_db
POSTGRES_HOST_PORT=5432

# Redis Configuration (Docker service name)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_SECURE_REDIS_PASSWORD_HERE
REDIS_DB=0
REDIS_KEY_PREFIX=membership:prod:
REDIS_DEFAULT_TTL=1800

# Security
JWT_SECRET=YOUR_RANDOM_32_CHAR_JWT_SECRET_HERE
BCRYPT_ROUNDS=12

# CORS Configuration (Frontend server URL)
CORS_ORIGIN=https://your-frontend-domain.com

# Email Configuration
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-email-password
MAIL_FROM=noreply@your-domain.com

# SMS Configuration (JSON Applink)
SMS_PROVIDER=json-applink
JSON_APPLINK_API_URL=https://api.your-sms-provider.com/v1/send
JSON_APPLINK_API_KEY=your_api_key
JSON_APPLINK_USERNAME=your_username
JSON_APPLINK_PASSWORD=your_password
JSON_APPLINK_FROM_NUMBER=+27123456789

# IEC API Configuration
IEC_API_USERNAME=your_iec_username
IEC_API_PASSWORD=your_iec_password

# Payment Gateway (Peach Payments)
PEACH_PAYMENT_ENTITY_ID=your_entity_id
PEACH_PAYMENT_ACCESS_TOKEN=your_access_token
PEACH_PAYMENT_API_URL=https://api.peachpayments.com

# pgAdmin Configuration
PGADMIN_DEFAULT_EMAIL=admin@your-domain.com
PGADMIN_DEFAULT_PASSWORD=YOUR_SECURE_PGADMIN_PASSWORD_HERE
PGADMIN_HOST_PORT=5050
```

### Step 5: Start Backend Services

```bash
cd /opt/eff-membership

# Create Docker network
docker network create membership-network

# Start Docker services (PostgreSQL, Redis, pgAdmin)
docker compose -f docker-compose.postgres.yml up -d

# Wait for services to be healthy
docker compose -f docker-compose.postgres.yml ps

# Check logs
docker compose -f docker-compose.postgres.yml logs -f
```

### Step 6: Restore Database

```bash
cd /opt/eff-membership

# Make restore script executable
chmod +x backup-scripts/restore.sh

# Restore database
./backup-scripts/restore.sh backups/eff_membership_backup_*.dump

# Verify database
docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "\dt"
```

### Step 7: Deploy Backend Application

```bash
cd /opt/eff-membership/backend

# Install dependencies (production only)
npm ci --production

# Build TypeScript
npm run build

# Test the build
node dist/app.js

# If successful, stop the test (Ctrl+C) and deploy with PM2
pm2 start dist/app.js --name eff-api --time

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above

# Check status
pm2 status
pm2 logs eff-api
```

### Step 8: Configure Backend Firewall

```bash
# Allow API port from frontend server only
sudo ufw allow from FRONTEND_SERVER_IP to any port 5000 proto tcp comment 'API from Frontend'

# Allow PostgreSQL (if needed for remote admin)
sudo ufw allow 5432/tcp comment 'PostgreSQL'

# Allow Redis (if needed for remote admin)
sudo ufw allow 6379/tcp comment 'Redis'

# Allow pgAdmin (if needed for remote admin)
sudo ufw allow 5050/tcp comment 'pgAdmin'

# Allow SSH
sudo ufw allow 22/tcp comment 'SSH'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

---

## 🌐 Frontend Server Setup

### Step 1: Initial Server Preparation

```bash
# Connect to frontend server
ssh username@frontend-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Set hostname (optional)
sudo hostnamectl set-hostname eff-frontend
```

### Step 2: Run Frontend Setup Script

```bash
# Download the frontend setup script
wget https://raw.githubusercontent.com/ntsowef/eff-membership-system/main/deployment/frontend-server-setup.sh

# Make executable
chmod +x frontend-server-setup.sh

# Run setup script
./frontend-server-setup.sh
```

### Step 3: Transfer Application Files

From your local machine:

```powershell
# Clone repository on frontend server
ssh username@frontend-server-ip
cd /opt/eff-membership
git clone https://github.com/ntsowef/eff-membership-system.git .
```

### Step 4: Configure Frontend Environment

```bash
cd /opt/eff-membership/frontend

# Create production environment file
nano .env.production
```

**Frontend Environment Variables:**

```bash
# API Configuration (Backend Server)
VITE_API_URL=https://api.your-backend-domain.com
VITE_API_BASE_URL=https://api.your-backend-domain.com/api/v1

# WebSocket Configuration
VITE_WS_URL=wss://api.your-backend-domain.com

# Application Configuration
VITE_APP_NAME=EFF Membership Management System
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SMS=true
VITE_ENABLE_PAYMENTS=true
```

### Step 5: Build Frontend Application

```bash
cd /opt/eff-membership/frontend

# Install dependencies
npm ci --production

# Build for production
npm run build

# Verify build
ls -lh dist/
```

### Step 6: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp /opt/eff-membership/deployment/nginx-frontend.conf /etc/nginx/sites-available/eff-membership

# Update domain name in config
sudo nano /etc/nginx/sites-available/eff-membership

# Enable site
sudo ln -s /etc/nginx/sites-available/eff-membership /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 7: Configure Frontend Firewall

```bash
# Allow HTTP
sudo ufw allow 80/tcp comment 'HTTP'

# Allow HTTPS
sudo ufw allow 443/tcp comment 'HTTPS'

# Allow SSH
sudo ufw allow 22/tcp comment 'SSH'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

---

## 🔐 Security Configuration

### Backend Server Security

1. **Database Security**
   - Use strong passwords (min 16 characters)
   - Restrict PostgreSQL access to localhost or specific IPs
   - Enable SSL for PostgreSQL connections
   - Regular security updates

2. **API Security**
   - Use strong JWT secrets (min 32 characters)
   - Enable rate limiting
   - Configure CORS properly
   - Use HTTPS for all API calls

3. **Redis Security**
   - Set Redis password
   - Bind to localhost or specific IPs
   - Disable dangerous commands

### Frontend Server Security

1. **Nginx Security**
   - Enable SSL/TLS
   - Use strong cipher suites
   - Enable HSTS
   - Configure security headers

2. **File Permissions**
   - Restrict access to configuration files
   - Set proper ownership

---

## 🔒 SSL/HTTPS Setup

### Using Let's Encrypt (Recommended)

**Frontend Server:**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

**Backend Server (if exposing API directly):**

```bash
# Install Certbot
sudo apt install certbot -y

# Obtain certificate
sudo certbot certonly --standalone -d api.your-domain.com

# Configure Nginx or use in Node.js
```

---

## 📊 Monitoring & Health Checks

See [MONITORING_SETUP.md](./MONITORING_SETUP.md) for detailed monitoring configuration.

---

## 💾 Backup & Recovery

See [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md) for detailed backup procedures.

---

## 🔧 Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting guide
2. Review logs: `pm2 logs`, `docker logs`, `nginx logs`
3. Contact system administrator

---

**End of Production Deployment Guide**

