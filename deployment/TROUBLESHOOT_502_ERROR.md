# Troubleshooting 502 Bad Gateway Error

## 🚨 Problem
You're getting a 502 Bad Gateway error when accessing `https://api.effmemberportal.org/api/v1/health`

This means:
- ✅ Nginx is running
- ✅ SSL certificate is working
- ✅ Domain is resolving correctly
- ❌ Nginx cannot connect to your Node.js backend on port 5000

---

## 🔍 Quick Diagnosis

Run these commands to identify the issue:

```bash
# 1. Check if backend is running
pm2 status

# 2. Check if port 5000 is listening
sudo netstat -tlnp | grep 5000

# 3. Test backend directly
curl http://localhost:5000/api/v1/health

# 4. Check Nginx error log
sudo tail -20 /var/log/nginx/error.log

# 5. Check backend logs
pm2 logs eff-api --lines 50
```

---

## 🛠️ Common Causes & Solutions

### Cause 1: Backend Not Running

**Check:**
```bash
pm2 status
```

**If backend is not running:**
```bash
# Navigate to backend directory
cd /opt/eff-membership/backend

# Start backend
pm2 start dist/app.js --name eff-api

# Or if using ecosystem file
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Enable PM2 startup
pm2 startup
```

---

### Cause 2: Backend Running on Wrong Port

**Check backend .env file:**
```bash
cd /opt/eff-membership/backend
cat .env | grep PORT
```

**Should show:**
```env
PORT=5000
```

**If different, update:**
```bash
nano .env
# Set: PORT=5000
```

**Restart backend:**
```bash
pm2 restart eff-api
```

---

### Cause 3: Backend Crashed or Has Errors

**Check logs:**
```bash
pm2 logs eff-api --lines 50
```

**Common errors:**

#### Database Connection Error
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not running, start it
cd /opt/eff-membership
docker-compose up -d postgres

# Restart backend
pm2 restart eff-api
```

#### Redis Connection Error
```bash
# Check if Redis is running
docker ps | grep redis

# If not running, start it
cd /opt/eff-membership
docker-compose up -d redis

# Restart backend
pm2 restart eff-api
```

#### Missing Environment Variables
```bash
# Check .env file exists
cd /opt/eff-membership/backend
ls -la .env

# If missing, create from template
cp .env.example .env
nano .env
# Fill in all required variables

# Restart backend
pm2 restart eff-api
```

---

### Cause 4: Firewall Blocking Localhost Communication

**Check if localhost can connect:**
```bash
curl -v http://localhost:5000/api/v1/health
```

**If this fails, check firewall:**
```bash
# Allow localhost connections
sudo ufw allow from 127.0.0.1

# Or temporarily disable firewall to test
sudo ufw disable
curl http://localhost:5000/api/v1/health
sudo ufw enable
```

---

### Cause 5: Nginx Configuration Error

**Test Nginx configuration:**
```bash
sudo nginx -t
```

**Check upstream configuration:**
```bash
sudo cat /etc/nginx/sites-available/eff-api | grep upstream -A 5
```

**Should show:**
```nginx
upstream backend {
    server 127.0.0.1:5000;
    keepalive 64;
}
```

**If incorrect, fix it:**
```bash
sudo nano /etc/nginx/sites-available/eff-api
# Ensure upstream points to 127.0.0.1:5000 or localhost:5000

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### Cause 6: SELinux Blocking Connection (CentOS/RHEL)

**If on CentOS/RHEL:**
```bash
# Check SELinux status
getenforce

# If Enforcing, allow Nginx to connect
sudo setsebool -P httpd_can_network_connect 1
```

---

## 🔧 Step-by-Step Fix

### Step 1: Verify Backend Status

```bash
# Check PM2 status
pm2 status

# Expected output:
# ┌─────┬──────────┬─────────┬─────────┐
# │ id  │ name     │ status  │ restart │
# ├─────┼──────────┼─────────┼─────────┤
# │ 0   │ eff-api  │ online  │ 0       │
# └─────┴──────────┴─────────┴─────────┘
```

**If status is "stopped" or "errored":**
```bash
# View logs
pm2 logs eff-api --lines 50

# Delete and restart
pm2 delete eff-api
cd /opt/eff-membership/backend
pm2 start dist/app.js --name eff-api
pm2 save
```

---

### Step 2: Test Backend Directly

```bash
# Test health endpoint
curl http://localhost:5000/api/v1/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...}
```

**If this fails:**
```bash
# Check what's listening on port 5000
sudo netstat -tlnp | grep 5000

# If nothing, backend is not running
# If something else, backend is on wrong port
```

---

### Step 3: Check Dependencies

```bash
# Check PostgreSQL
docker ps | grep postgres
# Should show running container

# Check Redis
docker ps | grep redis
# Should show running container

# If not running:
cd /opt/eff-membership
docker-compose up -d
```

---

### Step 4: Check Nginx Logs

```bash
# Check error log
sudo tail -50 /var/log/nginx/error.log

# Look for errors like:
# - "connect() failed (111: Connection refused)"
# - "upstream timed out"
# - "no live upstreams"
```

---

### Step 5: Restart Everything

```bash
# Restart backend
pm2 restart eff-api

# Wait 5 seconds
sleep 5

# Restart Nginx
sudo systemctl restart nginx

# Test again
curl https://api.effmemberportal.org/api/v1/health
```

---

## 🎯 Complete Reset (If Nothing Works)

```bash
# 1. Stop everything
pm2 stop all
sudo systemctl stop nginx

# 2. Start dependencies
cd /opt/eff-membership
docker-compose up -d

# Wait 10 seconds for databases to start
sleep 10

# 3. Start backend
cd /opt/eff-membership/backend
pm2 start dist/app.js --name eff-api

# Wait 5 seconds
sleep 5

# 4. Test backend directly
curl http://localhost:5000/api/v1/health

# 5. If backend works, start Nginx
sudo systemctl start nginx

# 6. Test through Nginx
curl https://api.effmemberportal.org/api/v1/health
```

---

## 📋 Verification Checklist

Run through this checklist:

```bash
# 1. Backend is running
pm2 status
# ✅ Status should be "online"

# 2. Backend is on port 5000
sudo netstat -tlnp | grep 5000
# ✅ Should show node process

# 3. Backend responds locally
curl http://localhost:5000/api/v1/health
# ✅ Should return JSON

# 4. PostgreSQL is running
docker ps | grep postgres
# ✅ Should show running container

# 5. Redis is running
docker ps | grep redis
# ✅ Should show running container

# 6. Nginx configuration is valid
sudo nginx -t
# ✅ Should show "syntax is ok"

# 7. Nginx is running
sudo systemctl status nginx
# ✅ Should show "active (running)"

# 8. Nginx can reach backend
sudo tail -20 /var/log/nginx/error.log
# ✅ Should not show connection errors

# 9. API responds through Nginx
curl https://api.effmemberportal.org/api/v1/health
# ✅ Should return JSON
```

---

## 🔍 Advanced Debugging

### Check Nginx Upstream Status

```bash
# Add this to your Nginx config for debugging
sudo nano /etc/nginx/sites-available/eff-api

# Add inside server block:
location /nginx_status {
    stub_status on;
    access_log off;
    allow 127.0.0.1;
    deny all;
}

# Reload Nginx
sudo systemctl reload nginx

# Check status
curl http://localhost/nginx_status
```

### Monitor Real-Time Logs

```bash
# Terminal 1: Watch Nginx error log
sudo tail -f /var/log/nginx/error.log

# Terminal 2: Watch backend logs
pm2 logs eff-api

# Terminal 3: Make test request
curl https://api.effmemberportal.org/api/v1/health
```

### Test with Verbose Output

```bash
# Test with full details
curl -v https://api.effmemberportal.org/api/v1/health

# Look for:
# - SSL handshake success
# - HTTP response code
# - Response headers
# - Response body
```

---

## 📞 Still Not Working?

If you've tried everything above and still getting 502:

1. **Provide these details:**
   ```bash
   # Backend status
   pm2 status
   pm2 logs eff-api --lines 50
   
   # Port check
   sudo netstat -tlnp | grep 5000
   
   # Direct backend test
   curl http://localhost:5000/api/v1/health
   
   # Nginx error log
   sudo tail -50 /var/log/nginx/error.log
   
   # Nginx config test
   sudo nginx -t
   
   # Docker containers
   docker ps
   ```

2. **Check backend .env file:**
   ```bash
   cd /opt/eff-membership/backend
   cat .env
   # (Remove sensitive data before sharing)
   ```

3. **Check Nginx configuration:**
   ```bash
   sudo cat /etc/nginx/sites-available/eff-api
   ```

---

## ✅ Success Indicators

You've fixed the issue when:

✅ `pm2 status` shows backend as "online"  
✅ `curl http://localhost:5000/api/v1/health` returns JSON  
✅ `curl https://api.effmemberportal.org/api/v1/health` returns JSON  
✅ No errors in Nginx error log  
✅ No errors in backend logs  

---

**Most Common Solution:**
```bash
# 90% of the time, this fixes it:
cd /opt/eff-membership
docker-compose up -d
cd backend
pm2 restart eff-api
sudo systemctl restart nginx
```

---

**Created:** 2025-11-03  
**Issue:** 502 Bad Gateway  
**Cause:** Backend not accessible on port 5000

