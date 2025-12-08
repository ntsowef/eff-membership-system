# PM2 Process Management Guide

## 🎯 Overview

PM2 manages three processes for the EFF Membership System:

1. **eff-backend** - Node.js API Server (Port 5000)
2. **eff-frontend** - React Frontend Server (Port 3000)
3. **bulk-upload-processor** - Python File Processor

---

## 🚀 Starting Services

### Start All Services
```bash
cd /var/www/eff-membership-system
pm2 start ecosystem.production.config.js
```

### Start Individual Services
```bash
# Backend only
pm2 start ecosystem.production.config.js --only eff-backend

# Frontend only
pm2 start ecosystem.production.config.js --only eff-frontend

# Python processor only
pm2 start ecosystem.production.config.js --only bulk-upload-processor
```

---

## 🛑 Stopping Services

### Stop All Services
```bash
pm2 stop all
```

### Stop Individual Services
```bash
pm2 stop eff-backend
pm2 stop eff-frontend
pm2 stop bulk-upload-processor
```

---

## 🔄 Restarting Services

### Restart All Services
```bash
pm2 restart all
```

### Restart Individual Services
```bash
pm2 restart eff-backend
pm2 restart eff-frontend
pm2 restart bulk-upload-processor
```

### Reload (Zero-Downtime Restart)
```bash
pm2 reload all
pm2 reload eff-backend
```

---

## 📊 Monitoring Services

### View Process List
```bash
pm2 list
```

**Output Example**:
```
┌─────┬──────────────────────────┬─────────┬─────────┬──────────┬────────┐
│ id  │ name                     │ mode    │ ↺      │ status   │ cpu    │
├─────┼──────────────────────────┼─────────┼─────────┼──────────┼────────┤
│ 0   │ eff-backend              │ fork    │ 0      │ online   │ 0.3%   │
│ 1   │ eff-frontend             │ fork    │ 0      │ online   │ 0.1%   │
│ 2   │ bulk-upload-processor    │ fork    │ 0      │ online   │ 0.2%   │
└─────┴──────────────────────────┴─────────┴─────────┴──────────┴────────┘
```

### Real-Time Monitoring
```bash
pm2 monit
```

### View Detailed Info
```bash
pm2 show eff-backend
pm2 show eff-frontend
pm2 show bulk-upload-processor
```

---

## 📝 Viewing Logs

### View All Logs (Real-Time)
```bash
pm2 logs
```

### View Specific Service Logs
```bash
# Backend logs
pm2 logs eff-backend

# Frontend logs
pm2 logs eff-frontend

# Python processor logs
pm2 logs bulk-upload-processor
```

### View Last N Lines
```bash
pm2 logs --lines 100
pm2 logs eff-backend --lines 50
```

### View Only Errors
```bash
pm2 logs --err
pm2 logs eff-backend --err
```

### Clear Logs
```bash
pm2 flush
```

---

## 💾 Saving Configuration

### Save Current Process List
```bash
pm2 save
```

This saves the current running processes so they can be restored after reboot.

### Delete Saved Configuration
```bash
pm2 delete all
pm2 save --force
```

---

## 🔧 Auto-Start on System Boot

### Setup Startup Script
```bash
pm2 startup
```

This will output a command like:
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

Run that command, then:
```bash
pm2 save
```

### Disable Auto-Start
```bash
pm2 unstartup
```

---

## 🗑️ Deleting Processes

### Delete All Processes
```bash
pm2 delete all
```

### Delete Individual Process
```bash
pm2 delete eff-backend
pm2 delete eff-frontend
pm2 delete bulk-upload-processor
```

---

## 🔍 Troubleshooting

### Process Not Starting

**Check logs**:
```bash
pm2 logs eff-backend --err
```

**Check if port is in use**:
```bash
# Check port 5000 (backend)
sudo lsof -i :5000

# Check port 3000 (frontend)
sudo lsof -i :3000
```

**Restart with fresh logs**:
```bash
pm2 delete eff-backend
pm2 flush
pm2 start ecosystem.production.config.js --only eff-backend
pm2 logs eff-backend
```

### High Memory Usage

**Check memory usage**:
```bash
pm2 list
```

**Restart process**:
```bash
pm2 restart eff-backend
```

**Adjust max memory restart** in `ecosystem.production.config.js`:
```javascript
max_memory_restart: '1G'  // Restart if exceeds 1GB
```

### Process Keeps Restarting

**Check restart count**:
```bash
pm2 list
```

**View error logs**:
```bash
pm2 logs eff-backend --err --lines 100
```

**Common issues**:
- Database connection failed
- Port already in use
- Missing environment variables
- File permissions

---

## 📊 Performance Metrics

### CPU and Memory Usage
```bash
pm2 monit
```

### Process Metrics
```bash
pm2 describe eff-backend
```

---

## 🔄 Update Workflow

### After Code Changes

```bash
# 1. Pull latest code
cd /var/www/eff-membership-system
git pull origin main

# 2. Rebuild backend
cd backend
npm install
npm run build

# 3. Rebuild frontend
cd ../frontend
npm install
npm run build

# 4. Restart services
cd ..
pm2 restart all

# 5. Verify
pm2 list
pm2 logs
```

### Quick Restart (No Rebuild)
```bash
pm2 restart all
```

---

## 📋 Common Commands Cheat Sheet

| Command | Description |
|---------|-------------|
| `pm2 start ecosystem.production.config.js` | Start all services |
| `pm2 list` | View all processes |
| `pm2 logs` | View all logs |
| `pm2 monit` | Real-time monitoring |
| `pm2 restart all` | Restart all services |
| `pm2 stop all` | Stop all services |
| `pm2 delete all` | Delete all processes |
| `pm2 save` | Save process list |
| `pm2 startup` | Setup auto-start |
| `pm2 logs eff-backend` | View backend logs |
| `pm2 logs eff-frontend` | View frontend logs |
| `pm2 restart eff-backend` | Restart backend only |
| `pm2 flush` | Clear all logs |

---

## 🎯 Production Best Practices

1. **Always save after changes**:
   ```bash
   pm2 restart all
   pm2 save
   ```

2. **Monitor regularly**:
   ```bash
   pm2 monit
   ```

3. **Check logs for errors**:
   ```bash
   pm2 logs --err
   ```

4. **Keep PM2 updated**:
   ```bash
   npm install -g pm2@latest
   pm2 update
   ```

5. **Backup before major changes**:
   ```bash
   pm2 save
   cp ~/.pm2/dump.pm2 ~/.pm2/dump.pm2.backup
   ```

---

## 📞 Support

For more information:
- PM2 Documentation: https://pm2.keymetrics.io/docs/usage/quick-start/
- `DEPLOYMENT_README.md` - Deployment overview
- `DEPLOYMENT_CHECKLIST.md` - Complete checklist

