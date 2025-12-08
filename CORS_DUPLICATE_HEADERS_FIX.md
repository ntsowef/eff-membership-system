# CORS Duplicate Headers Fix

## 🚨 **Problem**

```
The 'Access-Control-Allow-Origin' header contains multiple values 
'https://www.effmemberportal.org, https://www.effmemberportal.org', 
but only one is allowed.
```

---

## 🎯 **Root Cause**

Both **Nginx** and the **backend** are adding CORS headers, causing duplicates:

1. **Backend** (Express `cors` middleware) adds: `Access-Control-Allow-Origin: https://www.effmemberportal.org`
2. **Nginx** (add_header directive) also adds: `Access-Control-Allow-Origin: https://www.effmemberportal.org`
3. **Result**: Duplicate headers = CORS error

---

## ✅ **Solution: Let Backend Handle CORS**

Remove CORS headers from Nginx and let the backend Express app handle CORS.

---

## 🚀 **Quick Fix on Production Server**

```bash
sudo nano /etc/nginx/sites-available/api.effmemberportal.org.conf
```

### **Step 1: Remove CORS Validation Block**

**Find and DELETE** (around line 42-46):
```nginx
# DELETE THESE LINES:
set $cors_origin "";
if ($http_origin ~* ^https://(www\.)?effmemberportal\.org$) {
    set $cors_origin $http_origin;
}
```

---

### **Step 2: Simplify OPTIONS Handler**

**Find** (around line 50-59):
```nginx
if ($request_method = 'OPTIONS') {
    add_header Access-Control-Allow-Origin $cors_origin always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
    add_header Access-Control-Max-Age "1728000" always;
    add_header Content-Type "text/plain; charset=utf-8";
    add_header Content-Length "0";
    return 204;
}
```

**Replace with**:
```nginx
# Let backend handle OPTIONS/CORS
if ($request_method = 'OPTIONS') {
    proxy_pass http://localhost:5000;
}
```

---

### **Step 3: Remove CORS Headers from Main Location**

**Find and DELETE** (around line 88-92):
```nginx
# DELETE THESE LINES:
add_header Access-Control-Allow-Origin $cors_origin always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH" always;
add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
add_header Access-Control-Allow-Credentials "true" always;
```

**Keep the security headers** (HSTS, X-Frame-Options, etc.) - only remove `Access-Control` headers.

---

### **Step 4: Test and Restart**

```bash
# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## ✅ **Verify Backend CORS Configuration**

The backend should already have correct CORS configuration:

```bash
cat /var/www/eff-membership-system/backend/.env | grep CORS_ORIGIN
```

**Should show**:
```env
CORS_ORIGIN=http://localhost:3000,https://effmemberportal.org,https://www.effmemberportal.org
```

**If backend needs restart**:
```bash
pm2 restart eff-backend
```

---

## 📊 **Architecture**

### **Before (Broken - Duplicate Headers)**:
```
Browser → Nginx (adds CORS headers) → Backend (adds CORS headers) → Response with duplicate headers ❌
```

### **After (Working - Single Headers)**:
```
Browser → Nginx (just proxy) → Backend (adds CORS headers) → Response with single headers ✅
```

---

## 🔍 **Test**

Try logging in from `https://www.effmemberportal.org` - should work without CORS errors!

---

## 📋 **Summary**

**The fix**: Remove ALL `Access-Control` headers from Nginx config and let the backend handle CORS.

**Why**: The backend Express `cors` middleware already handles CORS correctly for multiple origins. Nginx should just proxy requests without adding its own CORS headers.

---

**Last Updated**: 2025-11-21  
**Status**: Ready to deploy

