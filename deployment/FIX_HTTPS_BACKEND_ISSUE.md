# Fix: Backend Running HTTPS Instead of HTTP

## 🚨 Problem Identified

Your backend is running on **HTTPS** (port 5000) but Nginx is trying to connect via **HTTP**.

From your logs:
```
🔒 Protocol: HTTPS
🌐 API available at: https://localhost:5000/api/v1
```

Nginx configuration expects:
```
http://localhost:5000
```

---

## ✅ Solution: Configure Backend to Use HTTP

Since Nginx handles SSL/TLS termination, your backend should use HTTP (not HTTPS).

### Step 1: Update Backend Environment

```bash
# SSH to your server
ssh root@YOUR_SERVER_IP

# Navigate to backend directory
cd /root/Applications/backend

# Edit .env file
nano .env
```

### Step 2: Disable HTTPS in Backend

Find and update/add these lines in `.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# SSL Configuration - DISABLE for backend (Nginx handles SSL)
USE_HTTPS=false
SSL_ENABLED=false
HTTPS_ENABLED=false

# Or remove SSL certificate paths if they exist
# SSL_KEY_PATH=
# SSL_CERT_PATH=
```

### Step 3: Restart Backend

```bash
# Restart the backend
pm2 restart eff-api

# Wait a few seconds
sleep 3

# Check logs
pm2 logs eff-api --lines 20
```

### Step 4: Verify Backend is Using HTTP

```bash
# Check the logs - should now show HTTP
pm2 logs eff-api --lines 20 | grep -i "protocol\|https\|http"

# Should see:
# 🔓 Protocol: HTTP
# 🌐 API available at: http://localhost:5000/api/v1
```

### Step 5: Test Backend Directly

```bash
# Test with HTTP (should work now)
curl http://localhost:5000/api/v1/health

# Should return JSON:
# {"status":"ok","timestamp":"..."}
```

### Step 6: Test Through Nginx

```bash
# Test HTTPS endpoint (should work now)
curl https://api.effmemberportal.org/api/v1/health

# Should return JSON without 502 error
```

---

## 🔍 Alternative: Update Nginx to Use HTTPS Backend

If you want to keep backend on HTTPS, update Nginx configuration:

### Step 1: Edit Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/eff-api
```

### Step 2: Update Upstream to Use HTTPS

Find the `upstream` block and change it to:

```nginx
upstream backend {
    server 127.0.0.1:5000;
    keepalive 64;
}
```

And update the `proxy_pass` in the location blocks to use HTTPS:

```nginx
location / {
    proxy_pass https://backend;  # Changed from http:// to https://
    proxy_http_version 1.1;
    
    # Add these lines for self-signed certificates
    proxy_ssl_verify off;
    proxy_ssl_server_name on;
    
    # Rest of configuration...
}
```

### Step 3: Test and Reload Nginx

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Test endpoint
curl https://api.effmemberportal.org/api/v1/health
```

---

## ⚡ Quick Fix Script

Run this script to automatically fix the issue:

```bash
#!/bin/bash

echo "Fixing HTTPS backend issue..."

# Navigate to backend
cd /root/Applications/backend

# Backup .env
cp .env .env.backup

# Disable HTTPS in backend
if grep -q "USE_HTTPS" .env; then
    sed -i 's/USE_HTTPS=true/USE_HTTPS=false/g' .env
else
    echo "USE_HTTPS=false" >> .env
fi

if grep -q "SSL_ENABLED" .env; then
    sed -i 's/SSL_ENABLED=true/SSL_ENABLED=false/g' .env
else
    echo "SSL_ENABLED=false" >> .env
fi

if grep -q "HTTPS_ENABLED" .env; then
    sed -i 's/HTTPS_ENABLED=true/HTTPS_ENABLED=false/g' .env
else
    echo "HTTPS_ENABLED=false" >> .env
fi

echo "✅ Updated .env file"

# Restart backend
pm2 restart eff-api

echo "⏳ Waiting for backend to start..."
sleep 5

# Test backend
echo "🧪 Testing backend..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/health)

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Backend is now responding on HTTP"
    
    # Test through Nginx
    HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.effmemberportal.org/api/v1/health)
    
    if [ "$HTTPS_RESPONSE" = "200" ]; then
        echo "✅ HTTPS endpoint is working!"
        echo ""
        echo "🎉 SUCCESS! 502 Error Fixed!"
        echo ""
        echo "Your API is now accessible at:"
        echo "  https://api.effmemberportal.org"
    else
        echo "⚠️  Backend works but HTTPS still returns $HTTPS_RESPONSE"
        echo "Check Nginx logs: sudo tail -20 /var/log/nginx/error.log"
    fi
else
    echo "❌ Backend still not responding"
    echo "Check logs: pm2 logs eff-api"
fi
```

Save this as `deployment/fix-https-backend.sh` and run:

```bash
chmod +x deployment/fix-https-backend.sh
sudo bash deployment/fix-https-backend.sh
```

---

## 📋 Verification Checklist

After applying the fix:

```bash
# 1. Check backend logs show HTTP (not HTTPS)
pm2 logs eff-api --lines 20 | grep -i protocol

# Should show: 🔓 Protocol: HTTP

# 2. Test backend directly with HTTP
curl http://localhost:5000/api/v1/health

# Should return JSON

# 3. Test through Nginx with HTTPS
curl https://api.effmemberportal.org/api/v1/health

# Should return JSON (no 502)

# 4. Check Nginx error log
sudo tail -20 /var/log/nginx/error.log

# Should not show connection errors
```

---

## 🎯 Why This Happens

**Typical Architecture:**
```
Client (HTTPS) → Nginx (SSL Termination) → Backend (HTTP)
```

**Your Current Setup:**
```
Client (HTTPS) → Nginx (SSL) → Backend (HTTPS) ❌
                                    ↑
                            Nginx expects HTTP
```

**Correct Setup:**
```
Client (HTTPS) → Nginx (SSL) → Backend (HTTP) ✅
```

Nginx handles SSL/TLS encryption, so the backend should use plain HTTP for internal communication.

---

## 🔐 Security Note

This is **secure** because:
- ✅ External traffic uses HTTPS (encrypted)
- ✅ Nginx terminates SSL/TLS
- ✅ Backend communication is on localhost (internal)
- ✅ No external access to port 5000

The backend doesn't need HTTPS because:
1. It's only accessible from localhost
2. Nginx handles all external SSL/TLS
3. Internal communication is already secure (localhost)

---

## ✅ Expected Result

After the fix:

**Backend logs should show:**
```
🔓 Protocol: HTTP
🌐 API available at: http://localhost:5000/api/v1
📊 Health check: http://localhost:5000/api/v1/health
```

**Testing:**
```bash
# Direct backend test (HTTP)
curl http://localhost:5000/api/v1/health
# ✅ Returns JSON

# Through Nginx (HTTPS)
curl https://api.effmemberportal.org/api/v1/health
# ✅ Returns JSON (no 502)
```

---

**Issue:** Backend using HTTPS when it should use HTTP  
**Solution:** Disable HTTPS in backend .env  
**Time to Fix:** 2 minutes  
**Status:** Ready to apply

