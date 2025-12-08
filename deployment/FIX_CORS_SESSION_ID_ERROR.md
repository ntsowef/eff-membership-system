# 🔧 Fix CORS x-session-id Header Error

## 🔍 Problem Description

**Error Message:**
```
Access to XMLHttpRequest at 'https://api.effmemberportal.org/api/v1/analytics/dashboard' 
from origin 'https://www.effmemberportal.org' has been blocked by CORS policy: 
Request header field x-session-id is not allowed by Access-Control-Allow-Headers 
in preflight response.
```

**Root Cause:**
- The frontend sends a custom header `x-session-id` with API requests
- The Nginx reverse proxy is blocking this header in the CORS preflight check
- The backend Node.js app already allows this header, but Nginx intercepts first

---

## ✅ Solution: Update Nginx Configuration

### Step 1: SSH into Production Server

```bash
ssh your-user@your-server-ip
```

### Step 2: Backup Current Nginx Configuration

```bash
sudo cp /etc/nginx/sites-available/eff-membership /etc/nginx/sites-available/eff-membership.backup-$(date +%Y%m%d-%H%M%S)
```

### Step 3: Edit Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/eff-membership
```

### Step 4: Find and Update CORS Headers

**Find this section** (around line 181-196):

```nginx
# CORS headers (if needed)
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

# Handle preflight requests
if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
    add_header 'Access-Control-Max-Age' 1728000;
    add_header 'Content-Type' 'text/plain; charset=utf-8';
    add_header 'Content-Length' 0;
    return 204;
}
```

**Replace with:**

```nginx
# CORS headers (if needed)
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-Session-Id,x-session-id,X-CSRF-Token' always;
add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range,X-Session-Id,x-session-id' always;

# Handle preflight requests
if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-Session-Id,x-session-id,X-CSRF-Token';
    add_header 'Access-Control-Max-Age' 1728000;
    add_header 'Content-Type' 'text/plain; charset=utf-8';
    add_header 'Content-Length' 0;
    return 204;
}
```

**Key Changes:**
- ✅ Added `X-Session-Id` to allowed headers
- ✅ Added `x-session-id` (lowercase variant) to allowed headers
- ✅ Added `X-CSRF-Token` to allowed headers
- ✅ Added session ID headers to exposed headers

### Step 5: Test Nginx Configuration

```bash
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 6: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Step 7: Verify the Fix

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🧪 Testing the Fix

### Test 1: Browser Console

1. Open your frontend: `https://www.effmemberportal.org`
2. Open browser DevTools (F12)
3. Navigate to a page that makes API calls
4. Check the Console tab - CORS errors should be gone

### Test 2: Network Tab

1. Open DevTools → Network tab
2. Filter by "XHR" or "Fetch"
3. Look for API calls to `api.effmemberportal.org`
4. Click on a request → Headers tab
5. Verify:
   - ✅ Request Headers include `x-session-id`
   - ✅ Response Headers include `Access-Control-Allow-Headers` with `x-session-id`

### Test 3: CURL Test

```bash
# Test OPTIONS preflight request
curl -X OPTIONS https://api.effmemberportal.org/api/v1/analytics/dashboard \
  -H "Origin: https://www.effmemberportal.org" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: x-session-id,authorization" \
  -v
```

**Expected response headers:**
```
Access-Control-Allow-Headers: DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-Session-Id,x-session-id,X-CSRF-Token
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

---

## 🔍 Understanding the Issue

### What is CORS?

**CORS (Cross-Origin Resource Sharing)** is a security feature that:
- Prevents malicious websites from making unauthorized requests to your API
- Requires explicit permission for cross-origin requests
- Uses "preflight" OPTIONS requests to check permissions

### The Request Flow

```
1. Browser → OPTIONS request to API (preflight check)
   ├─ Asks: "Can I send x-session-id header?"
   └─ Nginx responds: "No, only these headers allowed: [list]"
   
2. ❌ Browser blocks the actual request
   └─ Error: "x-session-id is not allowed"
```

### After the Fix

```
1. Browser → OPTIONS request to API (preflight check)
   ├─ Asks: "Can I send x-session-id header?"
   └─ Nginx responds: "Yes, x-session-id is allowed"
   
2. ✅ Browser sends actual GET/POST request
   └─ Request includes x-session-id header
```

---

## 🚨 Troubleshooting

### Issue: Still Getting CORS Errors

**Solution 1: Clear Browser Cache**
```bash
# Hard refresh in browser
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

**Solution 2: Check Nginx Reload**
```bash
# Force restart instead of reload
sudo systemctl restart nginx
```

**Solution 3: Verify Configuration Applied**
```bash
# Check active Nginx config
sudo nginx -T | grep -A 5 "Access-Control-Allow-Headers"
```

### Issue: Nginx Test Fails

**Check syntax errors:**
```bash
sudo nginx -t
```

**View detailed error:**
```bash
sudo tail -n 50 /var/log/nginx/error.log
```

### Issue: 502 Bad Gateway After Changes

**Check backend is running:**
```bash
pm2 status
pm2 logs eff-api --lines 50
```

**Restart backend if needed:**
```bash
pm2 restart eff-api
```

---

## 📋 Verification Checklist

- [ ] Nginx configuration backed up
- [ ] CORS headers updated in Nginx config
- [ ] Nginx configuration test passed (`nginx -t`)
- [ ] Nginx reloaded successfully
- [ ] Browser console shows no CORS errors
- [ ] API requests include `x-session-id` header
- [ ] Dashboard loads data successfully
- [ ] All API endpoints working

---

## 🔐 Security Notes

**Current Configuration:**
```nginx
add_header 'Access-Control-Allow-Origin' '*' always;
```

⚠️ **Warning:** This allows requests from ANY origin (not recommended for production)

**Recommended for Production:**
```nginx
# Replace '*' with specific domains
add_header 'Access-Control-Allow-Origin' 'https://www.effmemberportal.org' always;
```

**Or use backend CORS handling:**
- Remove Nginx CORS headers entirely
- Let Node.js backend handle CORS (already configured in `backend/src/app.ts`)
- Backend already has proper origin validation

---

## 📞 Support

If issues persist:
1. Check backend logs: `pm2 logs eff-api`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify backend CORS config: `cat /opt/eff-membership/backend/.env | grep CORS_ORIGIN`
4. Test with browser DevTools Network tab

---

## ✅ Success Indicators

After applying the fix, you should see:
- ✅ No CORS errors in browser console
- ✅ Dashboard loads analytics data
- ✅ Statistics widgets display data
- ✅ All API calls complete successfully
- ✅ Session tracking works properly

