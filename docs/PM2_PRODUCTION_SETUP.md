# PM2 Production Setup - Complete Guide

## 🎯 Overview

The EFF Membership System uses PM2 to manage three production processes:

| Process Name | Type | Port | Purpose |
|--------------|------|------|---------|
| **eff-backend** | Node.js | 5000 | REST API & WebSocket server |
| **eff-frontend** | Static Server | 3000 | React frontend (production build) |
| **bulk-upload-processor** | Python | N/A | Background file processor |

---

## 📦 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PM2 Process Manager                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ eff-backend  │  │ eff-frontend │  │ bulk-upload-     │  │
│  │              │  │              │  │ processor        │  │
│  │ Node.js      │  │ serve        │  │                  │  │
│  │ Port: 5000   │  │ Port: 3000   │  │ Python3          │  │
│  │              │  │              │  │                  │  │
│  │ • REST API   │  │ • Static     │  │ • Watches files  │  │
│  │ • WebSocket  │  │   files      │  │ • Processes      │  │
│  │ • Database   │  │ • React SPA  │  │   uploads        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Nginx (Optional) │
                    │                   │
                    │  • SSL/TLS        │
                    │  • Reverse Proxy  │
                    │  • Load Balancer  │
                    └──────────────────┘
```

---

## 🚀 Quick Start

### 1. Install PM2
```bash
sudo npm install -g pm2
```

### 2. Install Serve (for frontend)
```bash
sudo npm install -g serve
```

### 3. Start All Services
```bash
cd /var/www/eff-membership-system
pm2 start ecosystem.production.config.js
```

### 4. Save Configuration
```bash
pm2 save
```

### 5. Setup Auto-Start
```bash
pm2 startup
# Run the command it outputs
pm2 save
```

---

## 📋 Process Details

### 1. Backend (eff-backend)

**Configuration**:
```javascript
{
  name: 'eff-backend',
  script: './dist/app.js',
  cwd: '/var/www/eff-membership-system/backend',
  instances: 1,
  max_memory_restart: '1G',
  env: {
    NODE_ENV: 'production',
    PORT: 5000
  }
}
```

**Responsibilities**:
- REST API endpoints
- WebSocket connections
- Database operations
- Authentication & authorization
- File upload handling

**Health Check**:
```bash
curl http://localhost:5000/api/v1/health
```

**Logs**:
```bash
pm2 logs eff-backend
# Or view files directly:
tail -f /var/www/eff-membership-system/backend/logs/backend-combined.log
```

---

### 2. Frontend (eff-frontend)

**Configuration**:
```javascript
{
  name: 'eff-frontend',
  script: 'serve',
  args: '-s dist -l 3000 -n',
  cwd: '/var/www/eff-membership-system/frontend',
  instances: 1,
  max_memory_restart: '200M',
  env: {
    NODE_ENV: 'production'
  }
}
```

**Responsibilities**:
- Serves React production build
- Static file serving
- SPA routing (single-page application)

**Health Check**:
```bash
curl http://localhost:3000
```

**Logs**:
```bash
pm2 logs eff-frontend
# Or view files directly:
tail -f /var/www/eff-membership-system/frontend/logs/frontend-combined.log
```

**Note**: In production, you can use Nginx to serve the frontend instead of PM2. This is more efficient for static files.

---

### 3. Bulk Upload Processor (bulk-upload-processor)

**Configuration**:
```javascript
{
  name: 'bulk-upload-processor',
  script: 'bulk_upload_processor.py',
  cwd: '/var/www/eff-membership-system/backend/python',
  interpreter: 'python3',
  instances: 1,
  max_memory_restart: '500M'
}
```

**Responsibilities**:
- Watches `_upload_file_directory` for new files
- Processes Excel files
- Validates data
- Inserts into database
- Sends WebSocket updates

**Health Check**:
```bash
pm2 logs bulk-upload-processor | grep "Bulk Upload Processor started"
```

**Logs**:
```bash
pm2 logs bulk-upload-processor
# Or view files directly:
tail -f /var/www/eff-membership-system/backend/python/logs/processor-combined.log
```

---

## 🔧 Common Operations

### Starting Services
```bash
# All services
pm2 start ecosystem.production.config.js

# Individual services
pm2 start ecosystem.production.config.js --only eff-backend
pm2 start ecosystem.production.config.js --only eff-frontend
pm2 start ecosystem.production.config.js --only bulk-upload-processor
```

### Stopping Services
```bash
pm2 stop all
pm2 stop eff-backend
pm2 stop eff-frontend
pm2 stop bulk-upload-processor
```

### Restarting Services
```bash
pm2 restart all
pm2 restart eff-backend
pm2 restart eff-frontend
pm2 restart bulk-upload-processor
```

### Viewing Status
```bash
pm2 list
pm2 monit
pm2 show eff-backend
```

### Viewing Logs
```bash
pm2 logs
pm2 logs eff-backend
pm2 logs eff-frontend
pm2 logs bulk-upload-processor
```

---

## 🔄 Deployment Workflow

### After Code Changes

```bash
# 1. Navigate to repository
cd /var/www/eff-membership-system

# 2. Pull latest code
git pull origin main

# 3. Build backend
cd backend
npm install
npm run build

# 4. Build frontend
cd ../frontend
npm install
npm run build

# 5. Restart services
cd ..
pm2 restart all

# 6. Verify
pm2 list
pm2 logs
```

### Using Deployment Script

```bash
cd /var/www/eff-membership-system
sudo ./deploy-production.sh
```

This script automatically:
- Builds backend and frontend
- Installs dependencies
- Configures environment
- Restarts all PM2 services

---

## 🌐 Nginx Integration (Recommended)

For production, it's recommended to use Nginx as a reverse proxy:

### Frontend via Nginx
```nginx
# Serve frontend directly from Nginx
location / {
    root /var/www/eff-membership-system/frontend/dist;
    try_files $uri $uri/ /index.html;
}
```

**Benefit**: More efficient static file serving, better caching

### Backend via Nginx
```nginx
# Proxy API requests to backend
location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}
```

**Benefit**: SSL termination, load balancing, better security

**With Nginx**: You can disable the `eff-frontend` PM2 process:
```bash
pm2 delete eff-frontend
pm2 save
```

---

## 📊 Monitoring

### Real-Time Monitoring
```bash
pm2 monit
```

### Process Metrics
```bash
pm2 describe eff-backend
```

### Log Monitoring
```bash
# Watch all logs
pm2 logs

# Watch specific service
pm2 logs eff-backend --lines 100
```

---

## 🆘 Troubleshooting

### Process Won't Start

**Check logs**:
```bash
pm2 logs eff-backend --err
```

**Common issues**:
- Port already in use
- Missing dependencies
- Database connection failed
- Environment variables not set

### High Memory Usage

**Check memory**:
```bash
pm2 list
```

**Restart process**:
```bash
pm2 restart eff-backend
```

### Process Keeps Restarting

**Check restart count**:
```bash
pm2 list
```

**View errors**:
```bash
pm2 logs eff-backend --err --lines 100
```

---

## 📚 Additional Resources

- **PM2 Usage Guide**: `docs/PM2_USAGE_GUIDE.md`
- **Deployment Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Deployment README**: `DEPLOYMENT_README.md`
- **PM2 Official Docs**: https://pm2.keymetrics.io/

---

## ✅ Production Checklist

- [ ] PM2 installed globally
- [ ] Serve package installed globally
- [ ] All services start successfully
- [ ] PM2 configuration saved
- [ ] Auto-start configured
- [ ] Health checks pass
- [ ] Logs are accessible
- [ ] Nginx configured (optional)
- [ ] SSL certificates installed
- [ ] Monitoring setup

---

**Last Updated**: 2025-11-21  
**Version**: 1.0.0  
**Status**: Production Ready

