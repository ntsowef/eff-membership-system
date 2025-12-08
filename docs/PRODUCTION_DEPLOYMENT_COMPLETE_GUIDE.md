# Complete Production Deployment Guide

## 🎯 Overview

This guide covers the complete production deployment of the EFF Membership System on your Ubuntu server.

**Server**: VPS at `/var/www/eff-membership-system`  
**Domains**:
- Frontend: `https://effmemberportal.org` and `https://www.effmemberportal.org`
- Backend API: `https://api.effmemberportal.org`

**Date**: 2025-11-21  
**Status**: Production Ready

---

## 📋 Prerequisites

### System Requirements
- Ubuntu 20.04+ LTS
- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL 12+
- Nginx
- PM2 (process manager)
- SSL certificates (Let's Encrypt)

### Domain Configuration
Ensure DNS records point to your server:
```
A     effmemberportal.org        → YOUR_SERVER_IP
A     www.effmemberportal.org    → YOUR_SERVER_IP
A     api.effmemberportal.org    → YOUR_SERVER_IP
```

---

## 🚀 Quick Deployment

### Option 1: Automated Deployment Script

```bash
cd /var/www/eff-membership-system

# Make script executable
chmod +x deploy-production.sh

# Run deployment
sudo ./deploy-production.sh
```

This script will:
1. ✅ Check prerequisites
2. ✅ Stop existing services
3. ✅ Create backup
4. ✅ Pull latest code (optional)
5. ✅ Build backend
6. ✅ Build frontend
7. ✅ Setup Python environment
8. ✅ Configure environment files
9. ✅ Set permissions
10. ✅ Start all services
11. ✅ Verify deployment

---

## 📝 Manual Deployment Steps

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python3 and pip
sudo apt install -y python3 python3-pip

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install serve (for frontend)
sudo npm install -g serve
```

### Step 2: Clone/Update Repository

```bash
# If not already cloned
cd /var/www
sudo git clone https://github.com/ntsowef/eff-membership-system.git

# Or update existing
cd /var/www/eff-membership-system
sudo git pull origin main
```

### Step 3: Build Backend

```bash
cd /var/www/eff-membership-system/backend

# Install dependencies
npm install --production=false

# Build TypeScript
npm run build

# Verify build
ls -la dist/app.js
```

### Step 4: Build Frontend

```bash
cd /var/www/eff-membership-system/frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Verify build
ls -la dist/index.html
```

### Step 5: Setup Python Environment

```bash
cd /var/www/eff-membership-system/backend/python

# Install dependencies
pip3 install psycopg2-binary pandas openpyxl python-socketio[client] websocket-client requests python-dotenv

# Verify socketio
python3 -c "import socketio; print('✅ socketio.Client:', socketio.Client)"
```

### Step 6: Configure Environment Files

#### Backend .env (`/var/www/eff-membership-system/backend/.env`)

```env
# Server Configuration
PORT=5000
NODE_ENV=production
SKIP_AUTH=false

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=eff_admin
DB_PASSWORD=Frames!123
DB_NAME=eff_membership_database
DB_CONNECTION_LIMIT=20
DB_TIMEOUT=30000
DB_IDLE_TIMEOUT=300000

# Prisma Database URL
DATABASE_URL="postgresql://eff_admin:Frames!123@localhost:5432/eff_membership_database?schema=public"

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-postgresql
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=https://effmemberportal.org,https://www.effmemberportal.org

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# File Upload Configuration
UPLOAD_DIR=_upload_file_directory

# IEC API Configuration
IEC_API_URL=https://api.iec.org.za
IEC_API_USERNAME=IECWebAPIPartyEFF
IEC_API_PASSWORD=85316416dc5b498586ed519e670931e9
IEC_API_TIMEOUT=30000

# SMS Configuration
JSON_APPLINK_API_URL=https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/
JSON_APPLINK_AUTH_CODE=EFFAPPLINK
JSON_APPLINK_AFFILIATE_CODE=INT001-1161-001
JSON_APPLINK_USER=AppLink
SMS_ENABLED=true

# Email Configuration
MAIL_DRIVER=smtp
MAIL_HOST=mail.bakkie-connect.co.za
MAIL_PORT=587
MAIL_USERNAME=effmembership@bakkie-connect.co.za
MAIL_PASSWORD=EFF2@xza123
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=effmembership@bakkie-connect.co.za
MAIL_FROM_NAME="EFF Membership System"
```


