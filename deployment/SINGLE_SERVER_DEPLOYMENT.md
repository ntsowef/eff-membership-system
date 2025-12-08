# 🚀 EFF Membership System - Single Server Production Deployment

**Complete Step-by-Step Guide for Single Server Deployment**

---

## 📋 Overview

This guide covers deploying both frontend and backend on a **single Ubuntu server**.

**Architecture:**
```
Internet → Nginx (Port 443/80) → {
    www.effmemberportal.org → React Frontend (Static Files)
    api.effmemberportal.org → Node.js Backend (Port 5000)
}
```

---

## 🎯 Prerequisites

### Required Information
- [ ] Server IP: `_________________`
- [ ] SSH Access: `root@your-server-ip`
- [ ] Domains configured:
  - Frontend: `www.effmemberportal.org` → Server IP
  - Backend: `api.effmemberportal.org` → Server IP
- [ ] Database credentials ready
- [ ] Email/SMS API credentials
- [ ] Payment gateway credentials

### Server Requirements
- **OS:** Ubuntu 20.04/22.04 LTS
- **RAM:** 4GB minimum (8GB recommended)
- **CPU:** 2+ cores
- **Storage:** 50GB+ SSD
- **Network:** Static IP

---

## 🚀 Quick Start (30 Minutes)

### Phase 1: Server Setup (10 min)

```bash
# 1. SSH into server
ssh root@your-server-ip

# 2. Update system
apt update && apt upgrade -y

# 3. Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 4. Install required packages
apt install -y nginx postgresql redis-server git build-essential

# 5. Install PM2
npm install -g pm2

# 6. Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Phase 2: Database Setup (5 min)

```bash
# 1. Setup PostgreSQL
sudo -u postgres psql << EOF
CREATE DATABASE eff_membership_db;
CREATE USER eff_admin WITH ENCRYPTED PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE eff_membership_db TO eff_admin;
\q
EOF

# 2. Test connection
psql -U eff_admin -d eff_membership_db -h localhost -W
# Enter password when prompted, then type \q to exit

# 3. Start Redis
systemctl start redis
systemctl enable redis
redis-cli ping  # Should return PONG
```

### Phase 3: Deploy Application (10 min)

```bash
# 1. Create app directory
mkdir -p /opt/eff-membership
cd /opt/eff-membership

# 2. Clone repository (or upload files)
git clone https://github.com/ntsowef/eff-membership-system.git .

# 3. Setup backend
cd /opt/eff-membership/backend
npm install --production
```

**Create `/opt/eff-membership/backend/.env`:**

```bash
nano /opt/eff-membership/backend/.env
```

**Paste this configuration (update values):**

```env
# Server
PORT=5000
NODE_ENV=production
API_PREFIX=/api
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=eff_admin
DB_PASSWORD=YourSecurePassword123!
DB_NAME=eff_membership_db
DB_CONNECTION_LIMIT=20

# Security
JWT_SECRET=CHANGE-THIS-TO-A-RANDOM-64-CHARACTER-STRING-FOR-PRODUCTION
BCRYPT_ROUNDS=12

# CORS - IMPORTANT: Add your domains
CORS_ORIGIN=https://www.effmemberportal.org,https://effmemberportal.org,https://api.effmemberportal.org

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Cache
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=1800

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@effmemberportal.org

# SMS (JSON Applink)
JSON_APPLINK_API_URL=https://gvrhvm15.vine.co.za/jsonapplink/v2/send/sms/
JSON_APPLINK_AUTH_CODE=EFFAPPLINK
JSON_APPLINK_AFFILIATE_CODE=INT001-1161-001
JSON_APPLINK_USER=AppLink

# Payment (Peach)
PEACH_ENTITY_ID=your_entity_id
PEACH_TEST_MODE=false

# IEC API
IEC_API_BASE_URL=https://api.elections.org.za
IEC_API_USERNAME=your_username
IEC_API_PASSWORD=your_password

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/eff-membership/backend/logs/app.log
```

```bash
# 4. Build and start backend
npm run build
pm2 start dist/server.js --name eff-api
pm2 save
pm2 startup  # Follow the command it outputs

# 5. Run migrations
npm run migrate

# 6. Build frontend
cd /opt/eff-membership/frontend
npm install
```

**Create `/opt/eff-membership/frontend/.env.production`:**

```bash
nano /opt/eff-membership/frontend/.env.production
```

```env
VITE_API_BASE_URL=https://api.effmemberportal.org
VITE_API_VERSION=v1
VITE_APP_NAME=EFF Membership Portal
```

```bash
# Build frontend
npm run build

# Deploy frontend files
mkdir -p /var/www/effmemberportal
cp -r dist/* /var/www/effmemberportal/
chmod -R 755 /var/www/effmemberportal
```

### Phase 4: Configure Nginx (5 min)

**Backend API Configuration:**

```bash
nano /etc/nginx/sites-available/eff-api
```

```nginx
upstream backend_api {
    server 127.0.0.1:5000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.effmemberportal.org;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.effmemberportal.org;

    # SSL will be configured by Certbot
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Logging
    access_log /var/log/nginx/api.access.log;
    error_log /var/log/nginx/api.error.log;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS handled by backend - DO NOT add CORS headers here
    }

    location /health {
        proxy_pass http://backend_api/health;
        access_log off;
    }
}
```

**Frontend Configuration:**

```bash
nano /etc/nginx/sites-available/eff-frontend
```

```nginx
server {
    listen 80;
    server_name www.effmemberportal.org effmemberportal.org;
    return 301 https://www.effmemberportal.org$request_uri;
}

server {
    listen 443 ssl http2;
    server_name effmemberportal.org;
    return 301 https://www.effmemberportal.org$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.effmemberportal.org;

    # SSL will be configured by Certbot

    root /var/www/effmemberportal;
    index index.html;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Logging
    access_log /var/log/nginx/frontend.access.log;
    error_log /var/log/nginx/frontend.error.log;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable sites
ln -s /etc/nginx/sites-available/eff-api /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/eff-frontend /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
```

### Phase 5: SSL Setup (5 min)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificates
certbot --nginx -d api.effmemberportal.org
certbot --nginx -d www.effmemberportal.org -d effmemberportal.org

# Test auto-renewal
certbot renew --dry-run
```

---

## ✅ Verification

```bash
# 1. Check services
systemctl status nginx postgresql redis
pm2 status

# 2. Test backend
curl https://api.effmemberportal.org/health
# Expected: {"status":"ok"}

# 3. Test frontend
curl -I https://www.effmemberportal.org
# Expected: HTTP/2 200

# 4. Check logs
pm2 logs eff-api --lines 20
tail -f /var/log/nginx/error.log

# 5. Test in browser
# Open: https://www.effmemberportal.org
# Check: No CORS errors in console (F12)
# Verify: Dashboard loads data
```

---

## 🔧 Common Issues & Fixes

### Issue 1: CORS Errors

```bash
# Check backend CORS config
grep CORS_ORIGIN /opt/eff-membership/backend/.env

# Should show all your domains:
# CORS_ORIGIN=https://www.effmemberportal.org,https://effmemberportal.org

# Restart backend
pm2 restart eff-api
```

### Issue 2: 502 Bad Gateway

```bash
# Check backend is running
pm2 status
pm2 logs eff-api

# Restart if needed
pm2 restart eff-api
```

### Issue 3: Database Connection Failed

```bash
# Test database
psql -U eff_admin -d eff_membership_db -h localhost

# Check PostgreSQL is running
systemctl status postgresql
systemctl restart postgresql
```

### Issue 4: Frontend Not Loading

```bash
# Check Nginx config
nginx -t

# Check file permissions
ls -la /var/www/effmemberportal

# Check Nginx logs
tail -f /var/log/nginx/error.log
```

---

## 📊 Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs eff-api
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Check resources
htop
df -h
free -h
```

---

## 🔄 Updates & Maintenance

### Update Backend

```bash
cd /opt/eff-membership/backend
git pull
npm install
npm run build
pm2 restart eff-api
```

### Update Frontend

```bash
cd /opt/eff-membership/frontend
git pull
npm install
npm run build
cp -r dist/* /var/www/effmemberportal/
```

### Database Backup

```bash
# Manual backup
pg_dump -U eff_admin eff_membership_db | gzip > backup_$(date +%Y%m%d).sql.gz

# Automated daily backup (add to crontab)
crontab -e
# Add: 0 2 * * * pg_dump -U eff_admin eff_membership_db | gzip > /opt/backups/db_$(date +\%Y\%m\%d).sql.gz
```

---

## 📋 Quick Commands

```bash
# PM2
pm2 status                    # Check status
pm2 logs eff-api             # View logs
pm2 restart eff-api          # Restart
pm2 stop eff-api             # Stop
pm2 monit                    # Monitor

# Nginx
nginx -t                     # Test config
systemctl reload nginx       # Reload
systemctl restart nginx      # Restart
tail -f /var/log/nginx/error.log  # Logs

# Database
psql -U eff_admin -d eff_membership_db  # Connect
pg_dump -U eff_admin eff_membership_db > backup.sql  # Backup

# Redis
redis-cli ping               # Test
redis-cli keys "*"          # List keys
redis-cli flushall          # Clear cache

# SSL
certbot renew               # Renew certificates
certbot certificates        # List certificates
```

---

## 📞 Support

**Logs Location:**
- Backend: `pm2 logs eff-api`
- Nginx: `/var/log/nginx/`
- Application: `/opt/eff-membership/backend/logs/`

**Configuration Files:**
- Backend: `/opt/eff-membership/backend/.env`
- Nginx Backend: `/etc/nginx/sites-available/eff-api`
- Nginx Frontend: `/etc/nginx/sites-available/eff-frontend`

---

## ✅ Deployment Checklist

- [ ] Server setup complete
- [ ] Node.js installed (v18.x)
- [ ] PostgreSQL installed and configured
- [ ] Redis installed and running
- [ ] Application cloned/uploaded
- [ ] Backend .env configured
- [ ] Frontend .env.production configured
- [ ] Backend built and running (PM2)
- [ ] Frontend built and deployed
- [ ] Nginx configured (both sites)
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] DNS records pointing to server
- [ ] Health checks passing
- [ ] No CORS errors
- [ ] Dashboard loads data
- [ ] Backups configured

---

**Guide Version:** 1.0  
**Last Updated:** 2025-11-03  
**Deployment Time:** ~30 minutes  
**Status:** ✅ Production Ready

