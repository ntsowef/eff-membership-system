# CORS Fix Guide: Allow www Subdomain

## 🚨 **Problem**

Frontend at `https://www.effmemberportal.org` cannot access API at `https://api.effmemberportal.org` due to CORS error:

```
Access to XMLHttpRequest at 'https://api.effmemberportal.org/api/v1/auth/login' 
from origin 'https://www.effmemberportal.org' has been blocked by CORS policy: 
The 'Access-Control-Allow-Origin' header has a value 'https://effmemberportal.org' 
that is not equal to the supplied origin.
```

---

## 🎯 **Root Cause**

The API Nginx configuration was hardcoded to only allow `https://effmemberportal.org` (without `www`).

CORS requires **exact match** of origins:
- ❌ `effmemberportal.org` ≠ `www.effmemberportal.org`
- ✅ Need to allow **both** domains

---

## ✅ **Solution**

### **Two Fixes Required**:

1. ✅ **Backend `.env`** - Already correct (allows both domains)
2. ⚠️ **API Nginx Config** - Needs update (currently hardcoded)

---

## 📋 **Fix 1: Verify Backend CORS Configuration**

### **Check Production .env**

```bash
# On production server
cat /var/www/eff-membership-system/backend/.env | grep CORS_ORIGIN
```

**Should show**:
```env
CORS_ORIGIN=https://effmemberportal.org,https://www.effmemberportal.org,https://api.effmemberportal.org
```

**If not, update it**:
```bash
nano /var/www/eff-membership-system/backend/.env
```

**Add/Update**:
```env
CORS_ORIGIN=https://effmemberportal.org,https://www.effmemberportal.org,https://api.effmemberportal.org
```

**Restart backend**:
```bash
pm2 restart eff-backend
```

---

## 📋 **Fix 2: Update API Nginx Configuration**

### **Option A: Copy Updated Config (Recommended)**

**From development machine**:
```powershell
scp C:\Development\NewProj\Membership-newV2\nginx\api.effmemberportal.org.FIXED.conf root@YOUR_SERVER_IP:/tmp/
```

**On production server**:
```bash
# Backup current config
sudo cp /etc/nginx/sites-available/api.effmemberportal.org.conf /etc/nginx/sites-available/api.effmemberportal.org.conf.backup

# Copy new config
sudo cp /tmp/api.effmemberportal.org.FIXED.conf /etc/nginx/sites-available/api.effmemberportal.org.conf

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

### **Option B: Manual Edit**

```bash
sudo nano /etc/nginx/sites-available/api.effmemberportal.org.conf
```

**Add CORS validation after `client_max_body_size` (around line 40)**:

```nginx
# CORS Origin Validation - Only allow specific domains
set $cors_origin "";
if ($http_origin ~* ^https://(www\.)?effmemberportal\.org$) {
    set $cors_origin $http_origin;
}
```

**Update OPTIONS preflight handler (around line 50)**:

Change:
```nginx
add_header Access-Control-Allow-Origin "https://effmemberportal.org" always;
```

To:
```nginx
add_header Access-Control-Allow-Origin $cors_origin always;
```

**Update CORS headers in main location block (around line 90)**:

Change:
```nginx
add_header Access-Control-Allow-Origin "https://effmemberportal.org" always;
```

To:
```nginx
add_header Access-Control-Allow-Origin $cors_origin always;
```

**Test and restart**:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## ✅ **Verification**

### **Test CORS from Browser Console**

Open `https://www.effmemberportal.org` and run in console:

```javascript
fetch('https://api.effmemberportal.org/api/v1/health', {
  method: 'GET',
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log('Success:', d))
.catch(e => console.error('Error:', e));
```

**Expected**: Should return health check response without CORS error.

---

### **Test Login**

Try logging in from the frontend. Should work without CORS errors.

---

## 📊 **How It Works**

### **Before (Broken)**
```nginx
# Hardcoded - only allows effmemberportal.org
add_header Access-Control-Allow-Origin "https://effmemberportal.org" always;
```

### **After (Working)**
```nginx
# Dynamic - validates and allows both domains
set $cors_origin "";
if ($http_origin ~* ^https://(www\.)?effmemberportal\.org$) {
    set $cors_origin $http_origin;
}

add_header Access-Control-Allow-Origin $cors_origin always;
```

**Regex Explanation**:
- `^https://` - Must start with https://
- `(www\.)?` - Optional "www." subdomain
- `effmemberportal\.org$` - Must end with effmemberportal.org

**Allowed Origins**:
- ✅ `https://effmemberportal.org`
- ✅ `https://www.effmemberportal.org`
- ❌ `https://evil.com` (blocked)
- ❌ `http://effmemberportal.org` (blocked - not HTTPS)

---

## 🔍 **Debugging CORS Issues**

### **Check Response Headers**

```bash
curl -I -H "Origin: https://www.effmemberportal.org" https://api.effmemberportal.org/api/v1/health
```

**Should show**:
```
Access-Control-Allow-Origin: https://www.effmemberportal.org
Access-Control-Allow-Credentials: true
```

---

### **Check Nginx Error Logs**

```bash
sudo tail -50 /var/log/nginx/api-effmemberportal-error.log
```

---

### **Check Backend Logs**

```bash
pm2 logs eff-backend --lines 50
```

---

## 🎯 **Summary of Changes**

### **Files Updated**:
1. ✅ `nginx/api.effmemberportal.org.FIXED.conf` - Dynamic CORS validation
2. ✅ `backend/.env.production` - Already has correct CORS_ORIGIN

### **Key Changes**:
1. Added CORS origin validation using regex
2. Changed hardcoded origin to dynamic `$cors_origin` variable
3. Allows both `effmemberportal.org` and `www.effmemberportal.org`
4. Maintains security by validating origin before allowing

---

**Last Updated**: 2025-11-21  
**Status**: Ready to deploy

