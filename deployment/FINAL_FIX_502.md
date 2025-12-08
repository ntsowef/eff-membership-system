# Final Fix for 502 Bad Gateway Error

## 🎯 Root Cause Identified

Your backend logs show:
```
✅ SSL certificates found - Creating HTTPS server
🔒 Protocol: HTTPS
🌐 API available at: https://localhost:5000/api/v1
```

But Nginx is configured to connect via HTTP:
```
upstream: "http://127.0.0.1:5000/"
```

**Result:** Connection refused (Error 111)

---

## ✅ Solution: Remove SSL Certificates from Backend

Since Nginx handles SSL/TLS termination, your backend should NOT use HTTPS.

### Quick Fix (Run on Your Server)

```bash
# SSH to your server
ssh root@YOUR_SERVER_IP

# Navigate to backend directory
cd /root/Applications/backend

# Check for SSL certificates
ls -la | grep -E "ssl|key.pem|cert.pem"

# If SSL directory exists, move it
if [ -d "ssl" ]; then
    mv ssl ssl.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Moved SSL directory"
fi

# If certificate files exist in root, move them
if [ -f "key.pem" ]; then
    mv key.pem key.pem.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Moved key.pem"
fi

if [ -f "cert.pem" ]; then
    mv cert.pem cert.pem.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Moved cert.pem"
fi

# Restart backend
pm2 restart eff-api

# Wait 5 seconds
sleep 5

# Check logs - should now show HTTP
pm2 logs eff-api --lines 20 | grep -i "protocol\|server running"

# Test backend directly
curl http://localhost:5000/api/v1/health

# Test through Nginx
curl https://api.effmemberportal.org/api/v1/health
```

---

## 🔍 Detailed Steps

### Step 1: Locate SSL Certificates

```bash
cd /root/Applications/backend

# Check for SSL directory
ls -la ssl/

# Check for certificate files in root
ls -la | grep -E "key.pem|cert.pem"

# Check in dist directory
ls -la dist/ssl/
```

### Step 2: Move SSL Certificates (Don't Delete)

```bash
# Create backup directory
mkdir -p ssl-backups

# Move SSL directory if it exists
if [ -d "ssl" ]; then
    mv ssl ssl-backups/ssl.$(date +%Y%m%d_%H%M%S)
fi

# Move certificate files if they exist
if [ -f "key.pem" ]; then
    mv key.pem ssl-backups/key.pem.$(date +%Y%m%d_%H%M%S)
fi

if [ -f "cert.pem" ]; then
    mv cert.pem ssl-backups/cert.pem.$(date +%Y%m%d_%H%M%S)
fi

# Check dist directory
if [ -d "dist/ssl" ]; then
    mv dist/ssl dist/ssl.backup.$(date +%Y%m%d_%H%M%S)
fi
```

### Step 3: Update .env (If Needed)

```bash
nano .env

# Add or update these lines:
USE_HTTPS=false
SSL_ENABLED=false
HTTPS_ENABLED=false

# Comment out SSL paths:
# SSL_KEY_PATH=/path/to/key.pem
# SSL_CERT_PATH=/path/to/cert.pem

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 4: Restart Backend

```bash
# Restart PM2 process
pm2 restart eff-api

# Wait for startup
sleep 5

# Check status
pm2 status
```

### Step 5: Verify Backend is Using HTTP

```bash
# Check logs for protocol
pm2 logs eff-api --lines 30 | grep -i "protocol\|server running\|api available"

# Should see:
# 🔓 Protocol: HTTP
# 🌐 API available at: http://localhost:5000/api/v1
```

### Step 6: Test Backend Directly

```bash
# Test health endpoint
curl http://localhost:5000/api/v1/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...}
```

### Step 7: Test Through Nginx

```bash
# Test HTTPS endpoint
curl https://api.effmemberportal.org/api/v1/health

# Should return JSON (no 502 error)
```

---

## 🤖 Automated Fix Script

Run the updated fix script:

```bash
cd /root/Applications/deployment
bash fix-https-backend.sh
```

This script will:
1. ✅ Check for SSL certificates
2. ✅ Move SSL certificates to backup
3. ✅ Update .env file
4. ✅ Restart backend
5. ✅ Test backend on HTTP
6. ✅ Test through Nginx on HTTPS

---

## ✅ Expected Results

### Before Fix:
```bash
pm2 logs eff-api | grep Protocol
# 🔒 Protocol: HTTPS

curl http://localhost:5000/api/v1/health
# Connection refused

curl https://api.effmemberportal.org/api/v1/health
# 502 Bad Gateway
```

### After Fix:
```bash
pm2 logs eff-api | grep Protocol
# 🔓 Protocol: HTTP

curl http://localhost:5000/api/v1/health
# {"status":"ok",...}

curl https://api.effmemberportal.org/api/v1/health
# {"status":"ok",...}
```

---

## 🏗️ Architecture Explanation

### ❌ Current (Broken) Setup:
```
Internet (HTTPS) → Nginx (SSL) → Backend (HTTPS on port 5000)
                                      ↑
                                  Nginx tries HTTP
                                  Connection refused!
```

### ✅ Correct Setup:
```
Internet (HTTPS) → Nginx (SSL Termination) → Backend (HTTP on localhost:5000)
                                                  ↑
                                              Works perfectly!
```

**Why This is Correct:**
- ✅ External traffic is encrypted (HTTPS to Nginx)
- ✅ Nginx handles all SSL/TLS
- ✅ Backend uses HTTP internally (secure because localhost)
- ✅ No double encryption needed
- ✅ Standard production architecture

---

## 🔐 Security Note

This setup is **secure** because:

1. **External Traffic:** Encrypted with HTTPS (Nginx handles SSL)
2. **Internal Traffic:** HTTP on localhost (not accessible externally)
3. **Port 5000:** Blocked by firewall (only Nginx can access)
4. **SSL Certificates:** Managed by Let's Encrypt on Nginx

**You don't need SSL on the backend because:**
- Backend is only accessible from localhost
- Nginx is the only client connecting to backend
- All external traffic goes through Nginx's SSL
- Internal localhost traffic is already secure

---

## 🚨 Troubleshooting

### Issue: Still Getting 502 After Removing Certificates

**Check if backend restarted properly:**
```bash
pm2 status
pm2 logs eff-api --lines 50
```

**Rebuild backend if needed:**
```bash
cd /root/Applications/backend
npm run build
pm2 restart eff-api
```

### Issue: Backend Won't Start After Removing Certificates

**Check for errors:**
```bash
pm2 logs eff-api --err --lines 50
```

**Common fix:**
```bash
# Stop backend
pm2 stop eff-api
pm2 delete eff-api

# Start fresh
cd /root/Applications/backend
pm2 start dist/app.js --name eff-api
pm2 save
```

### Issue: Backend Still Shows HTTPS in Logs

**The compiled code may have hardcoded HTTPS logic:**
```bash
# Check the compiled app.js
grep -i "https\|ssl" dist/app.js | head -20

# If found, you need to rebuild from source
cd /root/Applications/backend
npm run build
pm2 restart eff-api
```

---

## 📋 Verification Checklist

After applying the fix:

```bash
# 1. No SSL certificates in backend directory
ls -la /root/Applications/backend | grep -E "ssl|key.pem|cert.pem"
# Should return nothing or show .backup files

# 2. Backend logs show HTTP
pm2 logs eff-api --lines 20 | grep -i protocol
# Should show: 🔓 Protocol: HTTP

# 3. Backend responds on HTTP
curl http://localhost:5000/api/v1/health
# Should return JSON

# 4. Nginx can connect to backend
sudo tail -20 /var/log/nginx/error.log
# Should not show connection errors

# 5. HTTPS endpoint works
curl https://api.effmemberportal.org/api/v1/health
# Should return JSON (no 502)

# 6. PM2 status is online
pm2 status
# eff-api should show "online"
```

---

## 🎉 Success Criteria

Your fix is successful when:

✅ Backend logs show "Protocol: HTTP"  
✅ `curl http://localhost:5000/api/v1/health` returns JSON  
✅ `curl https://api.effmemberportal.org/api/v1/health` returns JSON  
✅ No errors in Nginx error log  
✅ No errors in backend logs  
✅ PM2 shows backend as "online"  

---

## 📞 Next Steps

1. **Run the fix:**
   ```bash
   cd /root/Applications/backend
   mv ssl ssl.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null
   mv key.pem key.pem.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null
   mv cert.pem cert.pem.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null
   pm2 restart eff-api
   sleep 5
   curl http://localhost:5000/api/v1/health
   curl https://api.effmemberportal.org/api/v1/health
   ```

2. **Verify it works**

3. **Update frontend** (if needed):
   ```env
   VITE_API_URL=https://api.effmemberportal.org
   VITE_API_BASE_URL=https://api.effmemberportal.org/api/v1
   ```

---

**Issue:** Backend using HTTPS when it should use HTTP  
**Root Cause:** SSL certificates present in backend directory  
**Solution:** Remove/move SSL certificates from backend  
**Time to Fix:** 2 minutes  
**Status:** Ready to apply

