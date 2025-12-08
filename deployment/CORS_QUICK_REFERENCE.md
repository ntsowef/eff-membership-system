# 🚀 CORS Error - Quick Reference Card

## 🚨 Current Error

```
The 'Access-Control-Allow-Origin' header contains multiple values 
'https://www.effmemberportal.org, *', but only one is allowed.
```

---

## ⚡ Quick Fix (30 seconds)

```bash
# SSH into server
ssh your-user@your-server

# Run automated fix
cd /opt/eff-membership
sudo bash deployment/QUICK_FIX_CORS.sh

# Done! ✅
```

---

## 🔍 What's Wrong?

**Problem:** Duplicate CORS headers
- ❌ Nginx adds: `Access-Control-Allow-Origin: *`
- ❌ Backend adds: `Access-Control-Allow-Origin: https://www.effmemberportal.org`
- ❌ Browser sees both: `https://www.effmemberportal.org, *`
- ❌ Browser rejects: "Only one allowed!"

**Solution:** Remove CORS from Nginx, keep in backend only

---

## 📋 Manual Fix (2 minutes)

```bash
# 1. Backup
sudo cp /etc/nginx/sites-available/eff-membership \
       /etc/nginx/sites-available/eff-membership.backup

# 2. Edit
sudo nano /etc/nginx/sites-available/eff-membership

# 3. Find lines ~181-196 with "Access-Control-Allow-Origin"
#    DELETE the entire CORS section

# 4. Add comment:
# CORS is handled by Node.js backend

# 5. Test & Reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## ✅ Verify Fix

```bash
# Should show ONLY ONE Access-Control-Allow-Origin header
curl -I https://api.effmemberportal.org/api/v1/statistics/dashboard \
  -H "Origin: https://www.effmemberportal.org" | grep -i "access-control-allow-origin"

# Expected output:
# Access-Control-Allow-Origin: https://www.effmemberportal.org
```

**Browser Test:**
1. Open `https://www.effmemberportal.org`
2. F12 → Console
3. No CORS errors ✅

---

## 🔧 Troubleshooting

### Still getting errors?

```bash
# 1. Clear browser cache (Ctrl+Shift+R)

# 2. Verify Nginx has NO CORS headers
sudo nginx -T | grep -i "access-control"
# Should return NOTHING

# 3. Verify backend CORS config
cat /opt/eff-membership/backend/.env | grep CORS_ORIGIN
# Should show: CORS_ORIGIN=https://www.effmemberportal.org,...

# 4. Restart backend
pm2 restart eff-api

# 5. Check logs
pm2 logs eff-api --lines 20
sudo tail -f /var/log/nginx/error.log
```

---

## 📚 Detailed Guides

- **Quick Summary:** `deployment/CORS_ERROR_SUMMARY.md`
- **Duplicate Headers Fix:** `deployment/FIX_DUPLICATE_CORS_HEADERS.md`
- **Session ID Fix:** `deployment/FIX_CORS_SESSION_ID_ERROR.md`
- **Before/After Comparison:** `deployment/CORS_BEFORE_AFTER.md`

---

## 🎯 Key Points

1. ✅ **Backend handles CORS** (backend/src/app.ts)
2. ❌ **Nginx should NOT add CORS headers**
3. ✅ **Only ONE source should add CORS headers**
4. ✅ **Backend config is in .env file**

---

## 🔐 Backend CORS Config

**File:** `/opt/eff-membership/backend/.env`

```env
# Add all your domains (comma-separated)
CORS_ORIGIN=https://www.effmemberportal.org,https://effmemberportal.org,https://api.effmemberportal.org
```

**After changing .env:**
```bash
pm2 restart eff-api
```

---

## ⏱️ Time to Fix

- **Automated:** 30 seconds
- **Manual:** 2 minutes
- **Testing:** 1 minute
- **Total:** ~3 minutes

---

## 📞 Need Help?

**Check this first:**
```bash
# See if Nginx has CORS headers (should be empty)
sudo nginx -T | grep -i "access-control"

# See backend CORS config
cat /opt/eff-membership/backend/.env | grep CORS

# Test actual response
curl -I https://api.effmemberportal.org/api/v1/statistics/dashboard \
  -H "Origin: https://www.effmemberportal.org"
```

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Still duplicate headers | Clear browser cache, verify Nginx reloaded |
| "Origin not allowed" | Add origin to backend .env CORS_ORIGIN |
| 502 Bad Gateway | Check backend: `pm2 status` |
| Nginx test fails | Check syntax: `sudo nginx -t` |

---

## ✅ Success Checklist

- [ ] Nginx config backed up
- [ ] CORS headers removed from Nginx
- [ ] Nginx test passed (`nginx -t`)
- [ ] Nginx reloaded
- [ ] Browser cache cleared
- [ ] No CORS errors in console
- [ ] Dashboard loads data
- [ ] Only ONE CORS header in responses

---

## 🔄 Rollback

```bash
# Restore backup
sudo cp /etc/nginx/sites-available/eff-membership.backup \
       /etc/nginx/sites-available/eff-membership

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

**Note:** Rollback restores the duplicate headers error!

---

## 📊 Expected Results

**Before Fix:**
- ❌ CORS errors in console
- ❌ Dashboard empty
- ❌ Multiple CORS header values

**After Fix:**
- ✅ No CORS errors
- ✅ Dashboard loads
- ✅ Single CORS header value

---

## 🎓 Understanding CORS

**What is CORS?**
- Security feature that controls cross-origin requests
- Prevents malicious sites from accessing your API
- Requires explicit permission for cross-origin access

**Why duplicate headers fail?**
- Browser expects exactly ONE value
- Multiple values = configuration error
- Browser rejects for security

**Best practice?**
- Handle CORS in application layer (Node.js)
- Don't add CORS in reverse proxy (Nginx)
- Keep configuration in ONE place

---

## 🚀 Quick Commands

```bash
# Fix
cd /opt/eff-membership && sudo bash deployment/QUICK_FIX_CORS.sh

# Verify
curl -I https://api.effmemberportal.org/api/v1/statistics/dashboard -H "Origin: https://www.effmemberportal.org" | grep -i "access-control-allow-origin"

# Check Nginx
sudo nginx -T | grep -i "access-control"

# Check Backend
cat /opt/eff-membership/backend/.env | grep CORS_ORIGIN

# Restart Backend
pm2 restart eff-api

# View Logs
pm2 logs eff-api --lines 20
```

---

**Last Updated:** 2025-11-03  
**Status:** ✅ Ready to deploy  
**Estimated Fix Time:** 3 minutes

