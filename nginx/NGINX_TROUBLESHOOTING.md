# Nginx Troubleshooting Guide

## 🚨 Error: "nginx.service is not active, cannot reload"

This means Nginx is **not running**. You need to **start** it first, not reload it.

---

## 🔍 **Step 1: Check Nginx Status**

```bash
sudo systemctl status nginx
```

**Possible outputs**:
- `Active: inactive (dead)` - Nginx is stopped
- `Active: failed` - Nginx failed to start (configuration error)
- `Active: active (running)` - Nginx is running (shouldn't see this if you got the error)

---

## 🛠️ **Step 2: Test Configuration First**

**ALWAYS test configuration before starting Nginx!**

```bash
sudo nginx -t
```

### **If Test Passes** ✅

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Action**: Proceed to Step 3 (Start Nginx)

### **If Test Fails** ❌

```
nginx: [emerg] unknown directive "a" in /etc/nginx/sites-enabled/effmemberportal.org.conf:1
nginx: configuration file /etc/nginx/nginx.conf test failed
```

**Action**: Fix the configuration error first! See "Common Configuration Errors" section below.

---

## 🚀 **Step 3: Start Nginx**

Once configuration test passes:

```bash
# Start Nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx

# Enable auto-start on boot
sudo systemctl enable nginx
```

**Expected Output**:
```
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since Thu 2025-11-21 10:55:00 UTC; 5s ago
```

---

## 🔄 **Step 4: Reload Configuration (After Nginx is Running)**

Now you can reload configuration changes:

```bash
sudo systemctl reload nginx
```

---

## 🐛 **Common Configuration Errors**

### **Error 1: Unknown directive "a"**

```
nginx: [emerg] unknown directive "a" in /etc/nginx/sites-enabled/effmemberportal.org.conf:1
```

**Cause**: Typo in comment - `a ===` instead of `# ===`

**Fix**:
```bash
# Edit the file
sudo nano /etc/nginx/sites-enabled/effmemberportal.org.conf

# Change line 1 from:
a =============================================================================

# To:
# =============================================================================

# Save and test
sudo nginx -t
```

### **Error 2: "add_header" directive not allowed**

```
nginx: [emerg] "add_header" directive is not allowed here in /etc/nginx/sites-enabled/api.effmemberportal.org.conf:51
```

**Cause**: `add_header` inside `if` block at wrong level

**Fix**: Use the FIXED configuration file:
```bash
sudo cp /var/www/eff-membership-system/nginx/api.effmemberportal.org.FIXED.conf \
       /etc/nginx/sites-available/api.effmemberportal.org.conf

sudo nginx -t
```

### **Error 3: Cannot load certificate**

```
nginx: [emerg] cannot load certificate "/etc/letsencrypt/live/effmemberportal.org/fullchain.pem"
```

**Cause**: SSL certificates not installed yet

**Fix Option 1** - Comment out SSL lines temporarily:
```bash
sudo nano /etc/nginx/sites-available/effmemberportal.org.conf

# Comment out these lines (add # at the beginning):
# ssl_certificate /etc/letsencrypt/live/effmemberportal.org/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/effmemberportal.org/privkey.pem;
# include /etc/letsencrypt/options-ssl-nginx.conf;
# ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

# Also change listen 443 to listen 80 temporarily
# listen 80;
# listen [::]:80;

# Save and test
sudo nginx -t
```

**Fix Option 2** - Install SSL certificates:
```bash
sudo certbot --nginx -d effmemberportal.org -d www.effmemberportal.org
sudo certbot --nginx -d api.effmemberportal.org
```

### **Error 4: Port already in use**

```
nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
```

**Cause**: Another process is using port 80 or 443

**Check what's using the port**:
```bash
sudo lsof -i :80
sudo lsof -i :443
```

**Fix**: Stop the conflicting service or change Nginx port

---

## 📋 **Complete Deployment Checklist**

Use this checklist to deploy Nginx properly:

### **1. Copy Configuration Files**

```bash
# Backend API
sudo cp /var/www/eff-membership-system/nginx/api.effmemberportal.org.FIXED.conf \
       /etc/nginx/sites-available/api.effmemberportal.org.conf

# Frontend
sudo cp /var/www/eff-membership-system/nginx/effmemberportal.org.conf \
       /etc/nginx/sites-available/effmemberportal.org.conf
```

### **2. Create Symlinks**

```bash
sudo ln -sf /etc/nginx/sites-available/api.effmemberportal.org.conf \
            /etc/nginx/sites-enabled/

sudo ln -sf /etc/nginx/sites-available/effmemberportal.org.conf \
            /etc/nginx/sites-enabled/
```

### **3. Test Configuration**

```bash
sudo nginx -t
```

**Must see**: `syntax is ok` and `test is successful`

### **4. Start or Reload Nginx**

```bash
# If Nginx is NOT running:
sudo systemctl start nginx

# If Nginx IS running:
sudo systemctl reload nginx

# Enable auto-start on boot:
sudo systemctl enable nginx
```

### **5. Verify**

```bash
# Check status
sudo systemctl status nginx

# Test backend
curl http://localhost:5000/api/v1/health

# Test frontend (if SSL is setup)
curl https://effmemberportal.org

# Test API (if SSL is setup)
curl https://api.effmemberportal.org/api/v1/health
```

---

## 🔧 **Quick Fix Commands**

### **Scenario 1: Nginx won't start due to config error**

```bash
# Test configuration
sudo nginx -t

# View detailed error
sudo journalctl -xeu nginx.service

# Check syntax of specific file
sudo nginx -t -c /etc/nginx/sites-available/effmemberportal.org.conf
```

### **Scenario 2: Need to disable a site temporarily**

```bash
# Disable frontend
sudo rm /etc/nginx/sites-enabled/effmemberportal.org.conf

# Disable backend API
sudo rm /etc/nginx/sites-enabled/api.effmemberportal.org.conf

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

### **Scenario 3: Start fresh**

```bash
# Stop Nginx
sudo systemctl stop nginx

# Remove all site configs
sudo rm /etc/nginx/sites-enabled/*

# Keep only default
sudo ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/

# Test and start
sudo nginx -t && sudo systemctl start nginx
```

---

## 📞 **Diagnostic Commands**

```bash
# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo journalctl -xeu nginx.service

# View error logs
sudo tail -50 /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# List enabled sites
ls -la /etc/nginx/sites-enabled/

# Check what's listening on ports
sudo netstat -tlnp | grep -E ':(80|443|5000|3000)'

# Check if backend is running
curl http://localhost:5000/api/v1/health

# Check PM2 processes
pm2 list
```

---

## ✅ **Solution for Your Current Issue**

Based on your error: `nginx.service is not active, cannot reload`

**Run these commands in order**:

```bash
# 1. Test configuration first
sudo nginx -t

# 2. If test passes, start Nginx
sudo systemctl start nginx

# 3. Check status
sudo systemctl status nginx

# 4. Enable auto-start
sudo systemctl enable nginx

# 5. Verify it's running
curl http://localhost
```

**If `nginx -t` fails**, fix the configuration error first, then start Nginx.

---

## 🔧 **Common Backend Issues**

### **Issue: Prisma Client Not Generated**

**Error**:
```
Error: @prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.
```

**Solution**:
```bash
# Navigate to backend
cd /var/www/eff-membership-system/backend

# Generate Prisma Client
npx prisma generate

# Restart backend
pm2 restart eff-backend

# Check logs
pm2 logs eff-backend
```

**Quick Fix Script**:
```bash
# Run the automated fix script
bash /var/www/eff-membership-system/fix-prisma-backend.sh
```

---

**Last Updated**: 2025-11-21
**Status**: Troubleshooting Guide

