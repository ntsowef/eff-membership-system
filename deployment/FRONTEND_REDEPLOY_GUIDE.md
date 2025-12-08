# Frontend Redeployment Guide

## 🎯 Issue Fixed

**Problem:** Frontend was trying to connect to old IP address (`http://69.164.245.173:5000`) causing mixed content error.

**Solution:** Updated `.env.production` to use new domain (`https://api.effmemberportal.org`).

---

## ✅ Changes Made

### Before:
```env
VITE_API_URL=http://69.164.245.173:5000
VITE_API_BASE_URL=http://69.164.245.173:5000/api/v1
VITE_WS_URL=ws://69.164.245.173:5000
```

### After:
```env
VITE_API_URL=https://api.effmemberportal.org
VITE_API_BASE_URL=https://api.effmemberportal.org/api/v1
VITE_WS_URL=wss://api.effmemberportal.org
```

---

## 🚀 Rebuild and Deploy Frontend

### Step 1: Rebuild Frontend (On Your Local Machine)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Verify build was successful
ls -lh dist/
```

**Expected output:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

---

### Step 2: Upload to Web Server

#### Option A: Using SCP (Secure Copy)

```bash
# From your local machine (in frontend directory)
cd frontend

# Upload dist folder to server
scp -r dist/* root@YOUR_SERVER_IP:/var/www/effmemberportal/

# Or if using a different path
scp -r dist/* root@YOUR_SERVER_IP:/path/to/web/root/
```

#### Option B: Using SFTP

```bash
# Connect via SFTP
sftp root@YOUR_SERVER_IP

# Navigate to web root
cd /var/www/effmemberportal

# Upload files
put -r dist/*

# Exit
exit
```

#### Option C: Using FTP Client (FileZilla, WinSCP, etc.)

1. Connect to your server
2. Navigate to web root directory (e.g., `/var/www/effmemberportal`)
3. Upload all files from `frontend/dist/` directory
4. Overwrite existing files

---

### Step 3: Verify Deployment

#### On Server:

```bash
# SSH to server
ssh root@YOUR_SERVER_IP

# Check files were uploaded
ls -lh /var/www/effmemberportal/

# Check Nginx is serving the files
curl -I https://www.effmemberportal.org

# Should return: HTTP/2 200
```

#### In Browser:

1. **Clear browser cache:**
   - Chrome: `Ctrl+Shift+Delete` → Clear cached images and files
   - Firefox: `Ctrl+Shift+Delete` → Cached Web Content
   - Or use Incognito/Private mode

2. **Visit the site:**
   ```
   https://www.effmemberportal.org
   ```

3. **Open Developer Console (F12):**
   - Go to Network tab
   - Try to login
   - Check the API requests

4. **Verify API calls:**
   - Should see: `POST https://api.effmemberportal.org/api/v1/auth/login`
   - Should NOT see: `http://69.164.245.173:5000`
   - Should return: `200 OK` (not 502 or mixed content error)

---

## 🔍 Troubleshooting

### Issue 1: Still Seeing Old IP Address in Browser

**Cause:** Browser cache

**Solution:**
```bash
# Clear browser cache completely
# Or use Incognito/Private mode
# Or hard refresh: Ctrl+Shift+R (Chrome) or Ctrl+F5 (Firefox)
```

### Issue 2: Mixed Content Error Still Appears

**Cause:** Old build files still cached

**Solution:**
```bash
# On local machine
cd frontend
rm -rf dist/
npm run build

# Upload fresh build to server
scp -r dist/* root@YOUR_SERVER_IP:/var/www/effmemberportal/
```

### Issue 3: 404 Not Found After Deployment

**Cause:** Files not uploaded to correct directory

**Solution:**
```bash
# On server, check Nginx configuration
sudo nano /etc/nginx/sites-available/effmemberportal

# Look for 'root' directive:
# root /var/www/effmemberportal;

# Make sure files are in that directory
ls -lh /var/www/effmemberportal/
```

### Issue 4: API Calls Return 502 Error

**Cause:** Backend not running or SSL certificates issue

**Solution:**
```bash
# On server, check backend status
pm2 status

# Check backend logs
pm2 logs eff-api --lines 30

# Should show: 🔓 Protocol: HTTP

# Test backend directly
curl http://localhost:5000/api/v1/health

# Test through Nginx
curl https://api.effmemberportal.org/api/v1/health
```

---

## ✅ Verification Checklist

After deployment, verify:

```bash
# 1. Frontend files uploaded
ssh root@YOUR_SERVER_IP
ls -lh /var/www/effmemberportal/
# Should see: index.html, assets/, etc.

# 2. Nginx serving frontend
curl -I https://www.effmemberportal.org
# Should return: HTTP/2 200

# 3. Backend API accessible
curl https://api.effmemberportal.org/api/v1/health
# Should return: {"status":"ok",...}

# 4. No mixed content errors in browser console
# Open: https://www.effmemberportal.org
# F12 → Console
# Should NOT see: "Mixed Content" errors

# 5. Login works
# Try to login
# Should see: POST https://api.effmemberportal.org/api/v1/auth/login 200 OK
```

---

## 📋 Complete Deployment Commands

### On Local Machine:

```bash
# 1. Navigate to frontend
cd c:\Development\NewProj\Membership-new\frontend

# 2. Rebuild
npm run build

# 3. Upload to server (replace YOUR_SERVER_IP)
scp -r dist/* root@YOUR_SERVER_IP:/var/www/effmemberportal/
```

### On Server:

```bash
# 1. Verify files uploaded
ls -lh /var/www/effmemberportal/

# 2. Check Nginx
sudo nginx -t
sudo systemctl reload nginx

# 3. Test frontend
curl -I https://www.effmemberportal.org

# 4. Test backend API
curl https://api.effmemberportal.org/api/v1/health
```

### In Browser:

```
1. Clear cache (Ctrl+Shift+Delete)
2. Visit: https://www.effmemberportal.org
3. Open Console (F12)
4. Try login
5. Verify API calls go to: https://api.effmemberportal.org
```

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ Frontend loads at `https://www.effmemberportal.org`  
✅ No mixed content errors in console  
✅ API calls go to `https://api.effmemberportal.org`  
✅ Login works without errors  
✅ All features work correctly  
✅ No 502 errors  
✅ No connection refused errors  

---

## 📞 Quick Reference

**Frontend URL:** https://www.effmemberportal.org  
**Backend API URL:** https://api.effmemberportal.org/api/v1  
**WebSocket URL:** wss://api.effmemberportal.org  

**Web Root:** `/var/www/effmemberportal/`  
**Backend Directory:** `/root/Applications/backend/`  

**Build Command:** `npm run build`  
**Upload Command:** `scp -r dist/* root@SERVER_IP:/var/www/effmemberportal/`  
**Test Command:** `curl https://www.effmemberportal.org`  

---

## 🔐 Architecture Overview

```
User Browser (HTTPS)
    ↓
www.effmemberportal.org (Frontend - Nginx)
    ↓
api.effmemberportal.org (Backend API - Nginx SSL → Node.js HTTP)
    ↓
PostgreSQL Database (localhost)
```

**All external traffic uses HTTPS with Let's Encrypt certificates.**  
**Internal backend uses HTTP on localhost (secure).**

---

**Status:** ✅ Configuration Updated  
**Next Step:** Rebuild and deploy frontend  
**Estimated Time:** 5-10 minutes

