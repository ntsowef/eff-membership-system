# 🔧 Fix Duplicate CORS Headers Error

## 🚨 The Error

```
Access to XMLHttpRequest at 'https://api.effmemberportal.org/api/v1/statistics/expired-members' 
from origin 'https://www.effmemberportal.org' has been blocked by CORS policy: 
The 'Access-Control-Allow-Origin' header contains multiple values 
'https://www.effmemberportal.org, *', but only one is allowed.
```

---

## 🔍 Root Cause

**You have CORS headers configured in TWO places:**

1. ✅ **Node.js Backend** (`backend/src/app.ts`) - Properly configured with:
   ```typescript
   app.use(cors({
     origin: config.cors.origin,  // From .env: https://www.effmemberportal.org
     credentials: true,
     allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', ...]
   }));
   ```

2. ❌ **Nginx Reverse Proxy** (`/etc/nginx/sites-available/eff-membership`) - Also adding:
   ```nginx
   add_header 'Access-Control-Allow-Origin' '*' always;
   ```

**The Problem:**
- Backend adds: `Access-Control-Allow-Origin: https://www.effmemberportal.org`
- Nginx adds: `Access-Control-Allow-Origin: *`
- Browser sees: `Access-Control-Allow-Origin: https://www.effmemberportal.org, *`
- Browser rejects: "Only one value allowed!"

---

## ✅ The Solution

**Remove CORS headers from Nginx** and let the Node.js backend handle CORS exclusively.

### Why This Approach?

1. ✅ Backend already has proper CORS configuration
2. ✅ Backend supports multiple origins from `.env` file
3. ✅ Backend includes all necessary headers (x-session-id, etc.)
4. ✅ Avoids duplicate header conflicts
5. ✅ Easier to maintain (one place to configure)

---

## 🚀 How to Fix (3 Options)

### Option 1: Automated Script (Recommended)

```bash
# SSH into your server
ssh your-user@your-server

# Navigate to project directory
cd /opt/eff-membership

# Run the automated fix
sudo bash deployment/QUICK_FIX_CORS.sh
```

### Option 2: Manual Edit

```bash
# 1. Backup current config
sudo cp /etc/nginx/sites-available/eff-membership \
       /etc/nginx/sites-available/eff-membership.backup-$(date +%Y%m%d-%H%M%S)

# 2. Edit the config
sudo nano /etc/nginx/sites-available/eff-membership

# 3. Find and DELETE this entire section (around lines 181-196):
```

**DELETE THIS:**
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

**REPLACE WITH:**
```nginx
        # CORS is handled by the Node.js backend (backend/src/app.ts)
        # Do NOT add CORS headers here to avoid duplicate header conflicts
```

```bash
# 4. Test configuration
sudo nginx -t

# 5. Reload Nginx
sudo systemctl reload nginx
```

### Option 3: Copy Updated Config

```bash
# Copy the corrected config from repository
sudo cp /opt/eff-membership/deployment/nginx-backend-api.conf \
       /etc/nginx/sites-available/eff-membership

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧪 Verify the Fix

### Test 1: Check Response Headers

```bash
curl -I https://api.effmemberportal.org/api/v1/statistics/dashboard \
  -H "Origin: https://www.effmemberportal.org"
```

**Expected:** Only ONE `Access-Control-Allow-Origin` header:
```
Access-Control-Allow-Origin: https://www.effmemberportal.org
```

**NOT multiple values like:**
```
Access-Control-Allow-Origin: https://www.effmemberportal.org, *
```

### Test 2: Browser Console

1. Open `https://www.effmemberportal.org`
2. Press F12 → Console tab
3. Navigate to Dashboard
4. **Expected:** No CORS errors

### Test 3: Network Tab

1. F12 → Network tab
2. Filter by "Fetch/XHR"
3. Click on any API request
4. Headers tab → Response Headers
5. **Verify:** Only ONE `Access-Control-Allow-Origin` header

---

## 📊 Before vs After

### ❌ BEFORE (Duplicate Headers)

**Request Flow:**
```
Browser → Nginx (adds CORS: *) → Backend (adds CORS: https://www.effmemberportal.org)
                                                ↓
                        Response has BOTH headers (ERROR!)
```

**Response Headers:**
```
Access-Control-Allow-Origin: https://www.effmemberportal.org, *  ❌ DUPLICATE!
```

### ✅ AFTER (Single Source)

**Request Flow:**
```
Browser → Nginx (no CORS headers) → Backend (adds CORS: https://www.effmemberportal.org)
                                                ↓
                        Response has ONE header (SUCCESS!)
```

**Response Headers:**
```
Access-Control-Allow-Origin: https://www.effmemberportal.org  ✅ SINGLE VALUE!
```

---

## 🔐 Backend CORS Configuration

Your backend is already properly configured in `backend/src/app.ts`:

```typescript
app.use(cors({
  origin: config.cors.origin,  // From .env file
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-session-id',
    'X-Session-Id'
  ],
  exposedHeaders: ['x-session-id', 'X-Session-Id']
}));
```

**Backend .env Configuration:**
```env
# Multiple origins supported (comma-separated)
CORS_ORIGIN=https://www.effmemberportal.org,https://effmemberportal.org
```

This configuration:
- ✅ Allows specific origins (not wildcard `*`)
- ✅ Supports credentials (cookies, auth headers)
- ✅ Includes all necessary custom headers
- ✅ Can be easily updated via .env file

---

## 🚨 Troubleshooting

### Still Getting CORS Errors?

**1. Clear Browser Cache**
```bash
# Hard refresh
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# Or clear all cache
Browser Settings → Clear browsing data → Cached images and files
```

**2. Verify Nginx Config Applied**
```bash
# Check active Nginx configuration
sudo nginx -T | grep -i "access-control"

# Should return NOTHING (no CORS headers in Nginx)
```

**3. Verify Backend CORS Config**
```bash
# Check backend .env
cat /opt/eff-membership/backend/.env | grep CORS_ORIGIN

# Should show:
# CORS_ORIGIN=https://www.effmemberportal.org,https://effmemberportal.org
```

**4. Restart Backend**
```bash
# Restart to ensure .env changes are loaded
pm2 restart eff-api
pm2 logs eff-api --lines 20
```

**5. Check Backend Logs**
```bash
# Look for CORS-related messages
pm2 logs eff-api | grep -i cors
```

### Different Error: "Origin not allowed"

If you see:
```
Access to XMLHttpRequest has been blocked by CORS policy: 
The 'Access-Control-Allow-Origin' header has a value 'https://effmemberportal.org' 
that is not equal to the supplied origin.
```

**Solution:** Add your origin to backend `.env`:
```bash
sudo nano /opt/eff-membership/backend/.env

# Update CORS_ORIGIN to include all your domains:
CORS_ORIGIN=https://www.effmemberportal.org,https://effmemberportal.org,https://api.effmemberportal.org

# Restart backend
pm2 restart eff-api
```

---

## 📋 Verification Checklist

- [ ] Nginx config backed up
- [ ] CORS headers removed from Nginx config
- [ ] Nginx configuration test passed (`nginx -t`)
- [ ] Nginx reloaded successfully
- [ ] Backend .env has correct CORS_ORIGIN
- [ ] Backend restarted (if .env changed)
- [ ] Browser cache cleared
- [ ] No CORS errors in browser console
- [ ] Only ONE Access-Control-Allow-Origin header in responses
- [ ] Dashboard loads data successfully
- [ ] All API endpoints working

---

## 🎯 Why This Happens

**Common Scenario:**
1. Developer adds CORS to Nginx for quick testing
2. Developer also adds CORS to backend application
3. Both configurations remain active
4. Duplicate headers cause conflicts

**Best Practice:**
- ✅ Handle CORS in application layer (Node.js/Express)
- ✅ Let reverse proxy (Nginx) just forward requests
- ✅ Keep CORS configuration in ONE place
- ✅ Use environment variables for easy updates

---

## 📞 Support

If issues persist:

**Check Nginx:**
```bash
sudo nginx -T | grep -A 10 "location /api"
sudo tail -f /var/log/nginx/error.log
```

**Check Backend:**
```bash
pm2 logs eff-api --lines 50
pm2 status
```

**Test CORS:**
```bash
curl -v https://api.effmemberportal.org/api/v1/statistics/dashboard \
  -H "Origin: https://www.effmemberportal.org" \
  2>&1 | grep -i "access-control"
```

---

## ✅ Success Indicators

After applying the fix:
- ✅ No CORS errors in browser console
- ✅ Dashboard loads analytics data
- ✅ Statistics widgets display correctly
- ✅ Network tab shows single CORS header
- ✅ All API calls complete successfully
- ✅ Session tracking works properly

---

## 🔄 Rollback

If you need to rollback:

```bash
# Restore backup
sudo cp /etc/nginx/sites-available/eff-membership.backup-TIMESTAMP \
       /etc/nginx/sites-available/eff-membership

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

**Note:** The original config had duplicate headers, so rollback will restore the error. Only rollback if the fix causes other issues.

