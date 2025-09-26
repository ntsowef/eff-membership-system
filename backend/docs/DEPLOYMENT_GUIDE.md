# GEOMAPS Membership Management System - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the GEOMAPS Membership Management System in production environments. The system consists of a Node.js/TypeScript backend API, MySQL database, Redis cache, and optional frontend applications.

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores, 2.4 GHz
- **RAM**: 4 GB
- **Storage**: 50 GB SSD
- **Network**: 100 Mbps

### Recommended Requirements
- **CPU**: 4 cores, 3.0 GHz
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps

### Software Requirements
- **Node.js**: 18.x or higher
- **MySQL**: 8.0 or higher
- **Redis**: 6.0 or higher
- **Nginx**: 1.20 or higher (for reverse proxy)
- **PM2**: Latest version (for process management)

## Pre-deployment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git build-essential

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node --version
npm --version
```

### 2. Database Setup

```bash
# Install MySQL 8.0
sudo apt install -y mysql-server-8.0

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
-- Create database
CREATE DATABASE membership_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'membership_user'@'localhost' IDENTIFIED BY 'secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON membership_production.* TO 'membership_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### 3. Redis Setup

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Key configurations:
# maxmemory 1gb
# maxmemory-policy allkeys-lru
# save 900 1
# save 300 10
# save 60 10000

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
```

### 4. Nginx Setup

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Application Deployment

### 1. Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /var/www/geomaps-membership
sudo chown $USER:$USER /var/www/geomaps-membership

# Clone repository
cd /var/www/geomaps-membership
git clone https://github.com/your-org/geomaps-membership.git .

# Install dependencies
cd backend
npm ci --production

# Build application
npm run build
```

### 2. Environment Configuration

```bash
# Create production environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

```env
# Production Environment Configuration

# Server Configuration
NODE_ENV=production
PORT=5000
API_PREFIX=/api/v1

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=membership_user
DB_PASSWORD=secure_password_here
DB_NAME=membership_production
DB_CONNECTION_LIMIT=20

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=membership:prod:
REDIS_DEFAULT_TTL=1800

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=noreply@geomaps.org

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=jpg,jpeg,png,pdf,doc,docx
UPLOAD_PATH=/var/www/geomaps-membership/uploads

# Security Configuration
CORS_ORIGIN=https://your-frontend-domain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/log/geomaps-membership/app.log

# Monitoring Configuration
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 3. Database Migration

```bash
# Run database migrations
npm run migrate

# Seed initial data (if needed)
npm run seed
```

### 4. Process Management with PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'geomaps-membership-api',
    script: './dist/app.js',
    cwd: '/var/www/geomaps-membership/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_file: '.env.production',
    error_file: '/var/log/geomaps-membership/pm2-error.log',
    out_file: '/var/log/geomaps-membership/pm2-out.log',
    log_file: '/var/log/geomaps-membership/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

```bash
# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 5. Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/geomaps-membership
```

```nginx
server {
    listen 80;
    server_name your-api-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-api-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-api-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-api-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Client Max Body Size
    client_max_body_size 10M;

    # Proxy to Node.js application
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static file serving for uploads
    location /uploads/ {
        alias /var/www/geomaps-membership/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:5000/api/v1/health;
    }

    # Logging
    access_log /var/log/nginx/geomaps-membership-access.log;
    error_log /var/log/nginx/geomaps-membership-error.log;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/geomaps-membership /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 6. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-api-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Security Configuration

### 1. Firewall Setup

```bash
# Install UFW
sudo apt install -y ufw

# Configure firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 2. Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create custom configuration
sudo nano /etc/fail2ban/jail.local
```

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
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/*error.log
findtime = 600
bantime = 7200
maxretry = 10
```

```bash
# Start and enable Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 3. System Hardening

```bash
# Create dedicated user for application
sudo useradd -r -s /bin/false geomaps

# Set proper file permissions
sudo chown -R geomaps:geomaps /var/www/geomaps-membership
sudo chmod -R 755 /var/www/geomaps-membership
sudo chmod -R 644 /var/www/geomaps-membership/backend/.env.production

# Create log directory
sudo mkdir -p /var/log/geomaps-membership
sudo chown geomaps:geomaps /var/log/geomaps-membership
```

## Monitoring and Logging

### 1. Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/geomaps-membership
```

```
/var/log/geomaps-membership/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 geomaps geomaps
    postrotate
        pm2 reload geomaps-membership-api
    endscript
}
```

### 2. System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Setup system monitoring with PM2
pm2 install pm2-server-monit
```

### 3. Application Monitoring

```bash
# Monitor application logs
pm2 logs geomaps-membership-api

# Monitor system resources
pm2 monit

# Check application status
pm2 status
```

## Backup Strategy

### 1. Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-geomaps-db.sh
```

```bash
#!/bin/bash

# Configuration
DB_NAME="membership_production"
DB_USER="membership_user"
DB_PASSWORD="secure_password_here"
BACKUP_DIR="/var/backups/geomaps-membership"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Remove backups older than 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Database backup completed: db_backup_$DATE.sql.gz"
```

```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-geomaps-db.sh

# Setup cron job for daily backups
sudo crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-geomaps-db.sh
```

### 2. File Backup

```bash
# Create file backup script
sudo nano /usr/local/bin/backup-geomaps-files.sh
```

```bash
#!/bin/bash

# Configuration
SOURCE_DIR="/var/www/geomaps-membership"
BACKUP_DIR="/var/backups/geomaps-membership"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz -C $SOURCE_DIR uploads/ .env.production

# Remove backups older than 7 days
find $BACKUP_DIR -name "files_backup_*.tar.gz" -mtime +7 -delete

echo "Files backup completed: files_backup_$DATE.tar.gz"
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Add these to MySQL configuration (/etc/mysql/mysql.conf.d/mysqld.cnf)
[mysqld]
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
query_cache_size = 128M
query_cache_type = 1
max_connections = 200
```

### 2. Redis Optimization

```bash
# Add to Redis configuration (/etc/redis/redis.conf)
maxmemory 1gb
maxmemory-policy allkeys-lru
tcp-keepalive 300
timeout 300
```

### 3. Node.js Optimization

```bash
# Update PM2 configuration for better performance
pm2 delete geomaps-membership-api
pm2 start ecosystem.config.js --env production
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   - Check PM2 logs: `pm2 logs`
   - Verify environment variables: `cat .env.production`
   - Check database connectivity: `mysql -u membership_user -p -e "SELECT 1"`
   - Verify Node.js version: `node --version`
   - Check port availability: `netstat -tulpn | grep :5000`

2. **High memory usage**
   - Monitor with: `pm2 monit`
   - Check memory usage: `free -h`
   - Adjust PM2 max_memory_restart in ecosystem.config.js
   - Check for memory leaks: `pm2 logs --lines 100`
   - Review slow queries: Check MySQL slow query log

3. **Database connection issues**
   - Verify MySQL is running: `sudo systemctl status mysql`
   - Check connection limits: `SHOW VARIABLES LIKE 'max_connections'`
   - Review database logs: `sudo tail -f /var/log/mysql/error.log`
   - Test connection: `mysql -u membership_user -p -h localhost`
   - Check database size: `SELECT table_schema, ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS 'DB Size in MB' FROM information_schema.tables GROUP BY table_schema`

4. **Redis connection issues**
   - Check Redis status: `sudo systemctl status redis-server`
   - Test connection: `redis-cli ping`
   - Review Redis logs: `sudo tail -f /var/log/redis/redis-server.log`
   - Check Redis memory: `redis-cli info memory`
   - Monitor Redis performance: `redis-cli --latency`

5. **Performance issues**
   - Check system resources: `htop`
   - Monitor disk I/O: `iotop`
   - Check network usage: `nethogs`
   - Review slow API endpoints: Check application logs
   - Analyze database performance: `SHOW PROCESSLIST`

6. **Authentication issues**
   - Verify JWT secret configuration
   - Check token expiration settings
   - Review user account status
   - Check MFA settings if enabled
   - Verify session storage in Redis

7. **File upload issues**
   - Check upload directory permissions: `ls -la /var/www/geomaps-membership/uploads`
   - Verify disk space: `df -h`
   - Check file size limits in Nginx and application
   - Review upload logs for errors

8. **Email notification issues**
   - Verify SMTP configuration
   - Test SMTP connection: `telnet smtp.your-provider.com 587`
   - Check email queue status
   - Review email service logs

### Health Checks

```bash
# Comprehensive health check script
#!/bin/bash

echo "=== GEOMAPS System Health Check ==="

# API health check
echo "1. API Health Check:"
curl -f http://localhost:5000/api/v1/health || echo "API health check failed"

# Database health check
echo "2. Database Health Check:"
mysql -u membership_user -p -e "SELECT 1" 2>/dev/null && echo "Database: OK" || echo "Database: FAILED"

# Redis health check
echo "3. Redis Health Check:"
redis-cli ping 2>/dev/null && echo "Redis: OK" || echo "Redis: FAILED"

# System resources
echo "4. System Resources:"
echo "Memory Usage:"
free -h
echo "Disk Usage:"
df -h
echo "CPU Load:"
uptime

# Application status
echo "5. Application Status:"
pm2 status

# Database connections
echo "6. Database Connections:"
mysql -u membership_user -p -e "SHOW STATUS LIKE 'Threads_connected'" 2>/dev/null

# Redis info
echo "7. Redis Info:"
redis-cli info server | grep redis_version
redis-cli info memory | grep used_memory_human

echo "=== Health Check Complete ==="
```

### Performance Monitoring

```bash
# Performance monitoring script
#!/bin/bash

echo "=== Performance Monitoring ==="

# API response times
echo "1. API Response Times:"
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/v1/health

# Database performance
echo "2. Database Performance:"
mysql -u membership_user -p -e "SHOW STATUS LIKE 'Slow_queries'"
mysql -u membership_user -p -e "SHOW STATUS LIKE 'Questions'"

# Redis performance
echo "3. Redis Performance:"
redis-cli --latency-history -i 1

# System performance
echo "4. System Performance:"
iostat -x 1 5
```

### Log Analysis

```bash
# Log analysis commands
# Application logs
pm2 logs geomaps-membership-api --lines 100

# Error logs
grep -i error /var/log/geomaps-membership/app.log | tail -20

# Database slow queries
sudo tail -f /var/log/mysql/mysql-slow.log

# Nginx access logs
sudo tail -f /var/log/nginx/geomaps-membership-access.log

# Security events
grep -i "suspicious\|failed\|locked" /var/log/geomaps-membership/app.log
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review application logs
   - Check system resources
   - Verify backups

2. **Monthly**
   - Update system packages
   - Review security logs
   - Optimize database

3. **Quarterly**
   - Security audit
   - Performance review
   - Backup restoration test

### Update Procedure

```bash
# 1. Backup current version
sudo cp -r /var/www/geomaps-membership /var/backups/geomaps-membership-$(date +%Y%m%d)

# 2. Pull latest changes
cd /var/www/geomaps-membership
git pull origin main

# 3. Install dependencies
cd backend
npm ci --production

# 4. Build application
npm run build

# 5. Run migrations
npm run migrate

# 6. Restart application
pm2 restart geomaps-membership-api

# 7. Verify deployment
curl -f http://localhost:5000/api/v1/health
```

## Support and Documentation

- **API Documentation**: https://your-api-domain.com/api/v1/docs
- **System Monitoring**: PM2 Web Interface
- **Log Files**: `/var/log/geomaps-membership/`
- **Configuration**: `/var/www/geomaps-membership/backend/.env.production`

For additional support, contact the development team or refer to the project documentation.
