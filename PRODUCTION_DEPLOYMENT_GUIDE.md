# 🚀 Production Deployment Guide - EFF Membership Management System

## Table of Contents
1. [Infrastructure Requirements](#infrastructure-requirements)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Options](#deployment-options)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Backup & Recovery](#backup--recovery)
8. [Scaling Strategies](#scaling-strategies)

---

## 1. Infrastructure Requirements

### Minimum Server Specifications

#### Production Server (Single Server Setup)
- **CPU**: 4 cores (8 recommended)
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 100GB SSD (500GB recommended)
- **OS**: Ubuntu 22.04 LTS or similar Linux distribution
- **Network**: Static IP address, domain name configured

#### Database Server (If Separate)
- **CPU**: 4 cores
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 200GB SSD with RAID 10 for redundancy
- **Backup Storage**: Additional 500GB for backups

### Required Software Stack
```bash
# Core Dependencies
- Node.js 18.x or 20.x LTS
- PostgreSQL 14+ or 15+
- Redis 7.x
- Nginx (reverse proxy & load balancer)
- PM2 (process manager)
- LibreOffice (for Excel processing)
- SSL Certificate (Let's Encrypt recommended)
```

---

## 2. Pre-Deployment Checklist

### ✅ Code Preparation
- [ ] All tests passing (run `npm test` in backend)
- [ ] Build frontend successfully (`npm run build` in frontend)
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] API endpoints documented
- [ ] Error handling implemented
- [ ] Logging configured

### ✅ Security Checklist
- [ ] Strong JWT secret generated (64+ characters)
- [ ] Database passwords are strong and unique
- [ ] Redis password configured
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting enabled
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] HTTPS/SSL configured
- [ ] Firewall rules configured
- [ ] Sensitive data encrypted

### ✅ Configuration Files
- [ ] Production `.env` file prepared
- [ ] Nginx configuration ready
- [ ] PM2 ecosystem file created
- [ ] Database connection pooling configured
- [ ] File upload limits set appropriately

---

## 3. Deployment Options

### Option A: Traditional VPS Deployment (Recommended for Start)
**Providers**: DigitalOcean, Linode, Vultr, AWS EC2, Azure VM

**Pros**:
- Full control over server
- Cost-effective for medium traffic
- Easy to debug and maintain

**Cons**:
- Manual scaling required
- More maintenance overhead

### Option B: Docker + Docker Compose
**Providers**: Any VPS, AWS ECS, Azure Container Instances

**Pros**:
- Consistent environments
- Easy to replicate
- Simplified deployment

**Cons**:
- Additional complexity
- Resource overhead

### Option C: Platform-as-a-Service (PaaS)
**Providers**: Heroku, Railway, Render, Fly.io

**Pros**:
- Minimal DevOps required
- Auto-scaling
- Built-in monitoring

**Cons**:
- Higher costs
- Less control
- Vendor lock-in

### Option D: Kubernetes (For Large Scale)
**Providers**: AWS EKS, Google GKE, Azure AKS

**Pros**:
- Excellent scalability
- High availability
- Auto-healing

**Cons**:
- Complex setup
- Requires DevOps expertise
- Higher costs

---

## 4. Step-by-Step Deployment

### 4.1 Server Setup (Ubuntu 22.04)

#### Step 1: Initial Server Configuration
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential

# Create deployment user
sudo adduser effadmin
sudo usermod -aG sudo effadmin
su - effadmin
```

#### Step 2: Install Node.js
```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

#### Step 3: Install PostgreSQL
```bash
# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

```sql
-- In PostgreSQL prompt
CREATE DATABASE eff_membership_database;
CREATE USER eff_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE eff_membership_database TO eff_user;
\q
```

```bash
# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/15/main/postgresql.conf
# Set: listen_addresses = '*'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add: host    all    all    0.0.0.0/0    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Step 4: Install Redis
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: requirepass your_redis_password_here
# Set: maxmemory 2gb
# Set: maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli
AUTH your_redis_password_here
PING  # Should return PONG
exit
```

#### Step 5: Install LibreOffice (for Excel processing)
```bash
sudo apt install -y libreoffice libreoffice-calc
```

#### Step 6: Install Nginx
```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Step 7: Install PM2 (Process Manager)
```bash
sudo npm install -g pm2

# Configure PM2 to start on boot
pm2 startup systemd
# Run the command it outputs
```

---

### 4.2 Application Deployment

#### Step 1: Clone Repository
```bash
# Create application directory
sudo mkdir -p /var/www/eff-membership
sudo chown effadmin:effadmin /var/www/eff-membership
cd /var/www/eff-membership

# Clone repository (replace with your repo URL)
git clone https://github.com/ntsowef/eff-membership-system.git .

# Or upload files via SCP/SFTP
```

#### Step 2: Backend Setup
```bash
cd /var/www/eff-membership/backend

# Install dependencies
npm install --production

# Create production .env file
nano .env
```

**Production `.env` file:**
```env
# Server Configuration
NODE_ENV=production
PORT=5000
API_PREFIX=/api/v1

# Database Configuration
DATABASE_URL=postgresql://eff_user:your_strong_password_here@localhost:5432/eff_membership_database
DB_HOST=localhost
DB_PORT=5432
DB_USER=eff_user
DB_PASSWORD=your_strong_password_here
DB_NAME=eff_membership_database
DB_POOL_MIN=2
DB_POOL_MAX=20

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here
REDIS_DB=0

# JWT Configuration (CRITICAL: Generate strong secret)
JWT_SECRET=your_super_secret_jwt_key_minimum_64_characters_long_random_string_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_refresh_token_secret_also_64_characters_minimum
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://effmemberportal.org,https://www.effmemberportal.org

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
UPLOAD_DIR=/var/www/eff-membership/backend/_upload_file_directory
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv

# Email Configuration (Configure your SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@effmemberportal.org

# SMS Configuration (JSON Applink)
SMS_PROVIDER=json_applink
SMS_API_URL=https://api.jsonapplink.com/send
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=EFF

# IEC API Configuration
IEC_API_BASE_URL=https://api.elections.org.za
IEC_API_USERNAME=IECWebAPIPartyEFF
IEC_API_PASSWORD=85316416dc5b498586ed519e670931e9

# LibreOffice Path
LIBREOFFICE_PATH=/usr/bin/soffice

# Logging
LOG_LEVEL=info
LOG_FILE=/var/www/eff-membership/backend/logs/app.log

# Session Configuration
SESSION_SECRET=your_session_secret_64_characters_minimum
```

```bash
# Run database migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Build TypeScript (if needed)
npm run build

# Create necessary directories
mkdir -p _upload_file_directory
mkdir -p _bulk_upload_watch
mkdir -p uploads/bulk-applications
mkdir -p uploads/renewal-uploads
mkdir -p uploads/excel-processing
mkdir -p logs

# Set proper permissions
chmod 755 _upload_file_directory
chmod 755 _bulk_upload_watch
chmod 755 uploads
chmod 755 logs
```

#### Step 3: Frontend Setup
```bash
cd /var/www/eff-membership/frontend

# Install dependencies
npm install

# Create production .env file
nano .env.production
```

**Frontend `.env.production`:**
```env
VITE_API_URL=https://api.effmemberportal.org/api/v1
VITE_WS_URL=wss://api.effmemberportal.org
VITE_APP_NAME=EFF Membership Portal
VITE_APP_VERSION=1.0.0
```

```bash
# Build frontend for production
npm run build

# The build output will be in the 'dist' folder
```

---

### 4.3 PM2 Configuration

Create PM2 ecosystem file:
```bash
cd /var/www/eff-membership/backend
nano ecosystem.config.js
```

**`ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [
    {
      name: 'eff-membership-backend',
      script: './src/app.ts',
      interpreter: 'node',
      interpreter_args: '--require ts-node/register',
      instances: 4, // Use 'max' for all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '_upload_file_directory'],
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

```bash
# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Check status
pm2 status
pm2 logs eff-membership-backend

# Monitor
pm2 monit
```

---

### 4.4 Nginx Configuration

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/eff-membership
```

**Nginx Configuration:**
```nginx
# Backend API Server
upstream backend_api {
    least_conn;
    server 127.0.0.1:5000;
    # Add more backend instances if running multiple
    # server 127.0.0.1:5001;
    # server 127.0.0.1:5002;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name effmemberportal.org www.effmemberportal.org api.effmemberportal.org;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Frontend HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name effmemberportal.org www.effmemberportal.org;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/effmemberportal.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/effmemberportal.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend Static Files
    root /var/www/eff-membership/frontend/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Frontend Routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static Assets Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.effmemberportal.org;

    # SSL Configuration (same as above)
    ssl_certificate /etc/letsencrypt/live/effmemberportal.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/effmemberportal.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Request Size Limits
    client_max_body_size 20M;
    client_body_buffer_size 128k;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # API Routes
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
    }

    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health Check Endpoint
    location /health {
        proxy_pass http://backend_api/api/v1/health;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/eff-membership /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### 4.5 SSL Certificate Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d effmemberportal.org -d www.effmemberportal.org -d api.effmemberportal.org

# Test auto-renewal
sudo certbot renew --dry-run

# Certbot will automatically renew certificates
```

---

## 5. Security Hardening

### 5.1 Firewall Configuration (UFW)
```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to backend port
sudo ufw deny 5000/tcp

# Deny direct access to PostgreSQL (if on same server)
sudo ufw deny 5432/tcp

# Deny direct access to Redis
sudo ufw deny 6379/tcp

# Check status
sudo ufw status verbose
```

### 5.2 Fail2Ban (Brute Force Protection)
```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Configure Fail2Ban
sudo nano /etc/fail2ban/jail.local
```

**Fail2Ban Configuration:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
```

```bash
# Restart Fail2Ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

### 5.3 PostgreSQL Security
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

**Restrict connections:**
```
# Only allow local connections
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 5.4 Redis Security
```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf
```

**Security settings:**
```
# Bind to localhost only
bind 127.0.0.1 ::1

# Require password
requirepass your_strong_redis_password

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
```

```bash
# Restart Redis
sudo systemctl restart redis-server
```

---

## 6. Monitoring & Maintenance

### 6.1 PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs eff-membership-backend

# View specific log lines
pm2 logs eff-membership-backend --lines 100

# Clear logs
pm2 flush
```

### 6.2 System Monitoring Tools

#### Install Monitoring Stack
```bash
# Install Node Exporter (for Prometheus)
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo nano /etc/systemd/system/node_exporter.service
```

**Node Exporter Service:**
```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
# Start Node Exporter
sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

### 6.3 Log Management

#### Setup Log Rotation
```bash
sudo nano /etc/logrotate.d/eff-membership
```

**Log Rotation Configuration:**
```
/var/www/eff-membership/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 effadmin effadmin
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
```

### 6.4 Database Monitoring
```bash
# Monitor PostgreSQL connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
sudo -u postgres psql -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database;"

# Monitor slow queries
sudo -u postgres psql -d eff_membership_database -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## 7. Backup & Recovery

### 7.1 Database Backup Script

Create backup script:
```bash
sudo nano /usr/local/bin/backup-eff-db.sh
```

**Backup Script:**
```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/eff-membership"
DB_NAME="eff_membership_database"
DB_USER="eff_user"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/eff_db_$DATE.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
echo "Starting database backup..."
PGPASSWORD="your_db_password" pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_FILE"

    # Delete old backups
    find $BACKUP_DIR -name "eff_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "Old backups cleaned up (retention: $RETENTION_DAYS days)"
else
    echo "Backup failed!"
    exit 1
fi

# Optional: Upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
# aws s3 cp $BACKUP_FILE s3://your-backup-bucket/database/
```

```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-eff-db.sh

# Test backup
sudo /usr/local/bin/backup-eff-db.sh
```

### 7.2 Automated Backup with Cron
```bash
# Edit crontab
sudo crontab -e
```

**Add backup schedule:**
```cron
# Daily database backup at 2 AM
0 2 * * * /usr/local/bin/backup-eff-db.sh >> /var/log/eff-backup.log 2>&1

# Weekly full system backup at 3 AM on Sundays
0 3 * * 0 tar -czf /var/backups/eff-membership/full_backup_$(date +\%Y\%m\%d).tar.gz /var/www/eff-membership --exclude='node_modules' --exclude='dist' >> /var/log/eff-backup.log 2>&1
```

### 7.3 Database Restore
```bash
# Restore from backup
gunzip -c /var/backups/eff-membership/eff_db_20250126_020000.sql.gz | PGPASSWORD="your_db_password" psql -U eff_user -h localhost eff_membership_database
```

---

## 8. Scaling Strategies

### 8.1 Vertical Scaling (Scale Up)
- Upgrade server CPU and RAM
- Increase PostgreSQL connection pool
- Optimize database queries and indexes
- Enable Redis caching more aggressively

### 8.2 Horizontal Scaling (Scale Out)

#### Load Balancer Setup
```nginx
# Nginx Load Balancer Configuration
upstream backend_cluster {
    least_conn;
    server 10.0.1.10:5000 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:5000 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:5000 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

#### Database Replication
- Setup PostgreSQL primary-replica replication
- Use read replicas for reporting queries
- Implement connection pooling with PgBouncer

#### Redis Cluster
- Setup Redis Sentinel for high availability
- Use Redis Cluster for horizontal scaling
- Implement session sharing across instances

### 8.3 CDN Integration
- Use Cloudflare or AWS CloudFront for static assets
- Cache frontend build files
- Reduce server load for static content

---

## 9. CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Install Backend Dependencies
      working-directory: ./backend
      run: npm ci

    - name: Run Backend Tests
      working-directory: ./backend
      run: npm test

    - name: Build Frontend
      working-directory: ./frontend
      run: |
        npm ci
        npm run build

    - name: Deploy to Server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/eff-membership
          git pull origin main
          cd backend && npm install --production
          cd ../frontend && npm install && npm run build
          pm2 reload ecosystem.config.js --env production
```

---

## 10. Health Checks & Alerts

### 10.1 Uptime Monitoring
- Use UptimeRobot, Pingdom, or StatusCake
- Monitor: https://effmemberportal.org
- Monitor: https://api.effmemberportal.org/api/v1/health

### 10.2 Error Tracking
- Integrate Sentry for error tracking
- Setup email alerts for critical errors
- Monitor PM2 logs for crashes

### 10.3 Performance Monitoring
- Use New Relic or DataDog APM
- Monitor database query performance
- Track API response times

---

## 11. Troubleshooting Common Issues

### Issue 1: Application Won't Start
```bash
# Check PM2 logs
pm2 logs eff-membership-backend --lines 100

# Check if port is in use
sudo lsof -i :5000

# Check environment variables
pm2 env 0
```

### Issue 2: Database Connection Errors
```bash
# Test database connection
PGPASSWORD="your_password" psql -U eff_user -h localhost -d eff_membership_database -c "SELECT 1;"

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Issue 3: High Memory Usage
```bash
# Check memory usage
free -h
pm2 monit

# Restart application
pm2 restart eff-membership-backend

# Clear Redis cache
redis-cli -a your_redis_password FLUSHDB
```

### Issue 4: Slow Performance
```bash
# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check slow queries
sudo -u postgres psql -d eff_membership_database -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

---

## 12. Post-Deployment Checklist

### ✅ Verification Steps
- [ ] Application accessible via HTTPS
- [ ] SSL certificate valid and auto-renewing
- [ ] Database migrations applied
- [ ] All API endpoints responding correctly
- [ ] File uploads working
- [ ] Email notifications sending
- [ ] SMS notifications sending
- [ ] IEC API integration working
- [ ] WebSocket connections established
- [ ] Background jobs processing
- [ ] Logs being written correctly
- [ ] Backups running automatically
- [ ] Monitoring alerts configured
- [ ] Error tracking active
- [ ] Performance metrics collecting

### ✅ Security Verification
- [ ] Firewall rules active
- [ ] Fail2Ban protecting SSH
- [ ] Database not accessible externally
- [ ] Redis not accessible externally
- [ ] Strong passwords in use
- [ ] JWT secrets are secure
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Security headers present

---

## 13. Maintenance Schedule

### Daily
- Monitor application logs
- Check PM2 status
- Review error reports

### Weekly
- Review backup logs
- Check disk space usage
- Review security logs
- Update dependencies (if needed)

### Monthly
- Review and optimize database
- Clean up old logs and files
- Review and update SSL certificates
- Performance audit
- Security audit

### Quarterly
- Full system backup test
- Disaster recovery drill
- Update system packages
- Review and update documentation

---

## 14. Support & Resources

### Documentation
- Backend API: `/api/v1/docs` (if Swagger enabled)
- Frontend: Check `frontend/README.md`
- Database Schema: Check `backend/prisma/schema.prisma`

### Useful Commands
```bash
# PM2 Commands
pm2 list                    # List all processes
pm2 restart all             # Restart all processes
pm2 reload all              # Reload all processes (zero-downtime)
pm2 stop all                # Stop all processes
pm2 delete all              # Delete all processes
pm2 logs                    # View logs
pm2 monit                   # Monitor processes

# Nginx Commands
sudo nginx -t               # Test configuration
sudo systemctl reload nginx # Reload configuration
sudo systemctl restart nginx # Restart Nginx
sudo tail -f /var/log/nginx/error.log  # View error logs

# PostgreSQL Commands
sudo systemctl status postgresql  # Check status
sudo -u postgres psql            # Connect to PostgreSQL
\l                                # List databases
\dt                               # List tables
\q                                # Quit

# Redis Commands
redis-cli -a password        # Connect to Redis
PING                         # Test connection
INFO                         # Server info
MONITOR                      # Monitor commands
```

---

## 15. Emergency Contacts

- **System Administrator**: [Your contact]
- **Database Administrator**: [Your contact]
- **DevOps Team**: [Your contact]
- **Hosting Provider Support**: [Provider contact]
- **SSL Certificate Support**: Let's Encrypt Community

---

## Conclusion

This guide provides a comprehensive approach to deploying the EFF Membership Management System to production. Always test changes in a staging environment before applying to production, and maintain regular backups.

For questions or issues, refer to the project documentation or contact the development team.

**Good luck with your deployment! 🚀**


