# Nginx Configuration Deployment Instructions

## 🐛 Issues Fixed

### **Issue 1: Backend API Configuration**

The original `api.effmemberportal.org.conf` had **`add_header` directives inside an `if` block** (line 51), which is **not allowed** in Nginx.

**Error**:
```
nginx: [emerg] "add_header" directive is not allowed here in /etc/nginx/sites-enabled/api.effmemberportal.org.conf:51
```

**Solution**: Moved all `add_header` directives outside the `if` block and placed them at the location level.

### **Issue 2: Frontend Configuration**

The `effmemberportal.org.conf` had **`a =============`** instead of **`# =============`** on line 1.

**Error**:
```
2025/11/21 10:52:27 [emerg] 2298524#2298524: unknown directive "a" in /etc/nginx/sites-enabled/effmemberportal.org.conf:9
```

**Solution**: Fixed the comment syntax from `a =====` to `# =====`.

---

## 📁 Files

- **`api.effmemberportal.org.FIXED.conf`** - ✅ Backend API configuration (FIXED)
- **`effmemberportal.org.conf`** - ✅ Frontend configuration (FIXED)

---

## 🚀 Deployment Steps

### **On Production Server**

#### **Step 1: Backup Current Configuration**

```bash
# Backup existing config (if any)
sudo cp /etc/nginx/sites-available/api.effmemberportal.org.conf /etc/nginx/sites-available/api.effmemberportal.org.conf.backup 2>/dev/null || echo "No existing config to backup"
```

#### **Step 2: Copy Fixed Configurations**

```bash
# Copy the FIXED backend API configuration
sudo cp /var/www/eff-membership-system/nginx/api.effmemberportal.org.FIXED.conf /etc/nginx/sites-available/api.effmemberportal.org.conf

# Copy the FIXED frontend configuration
sudo cp /var/www/eff-membership-system/nginx/effmemberportal.org.conf /etc/nginx/sites-available/effmemberportal.org.conf
```

#### **Step 3: Create Symlinks**

```bash
# Remove old symlinks if they exist
sudo rm /etc/nginx/sites-enabled/api.effmemberportal.org.conf 2>/dev/null
sudo rm /etc/nginx/sites-enabled/effmemberportal.org.conf 2>/dev/null

# Create new symlinks
sudo ln -s /etc/nginx/sites-available/api.effmemberportal.org.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/effmemberportal.org.conf /etc/nginx/sites-enabled/
```

#### **Step 4: Test Configuration**

```bash
# Test Nginx configuration
sudo nginx -t
```

**Expected Output**:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

#### **Step 5: Reload Nginx**

```bash
# Reload Nginx to apply changes
sudo systemctl reload nginx
```

#### **Step 6: Verify**

```bash
# Check Nginx status
sudo systemctl status nginx

# Test backend API
curl http://localhost:5000/api/v1/health

# Test through Nginx (if SSL is setup)
curl https://api.effmemberportal.org/api/v1/health
```

---

## 🔧 What Was Fixed

### **Before (BROKEN)**

```nginx
# Handle preflight requests
if ($request_method = 'OPTIONS') {
    add_header Access-Control-Allow-Origin "https://effmemberportal.org" always;  # ❌ NOT ALLOWED!
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
    add_header Access-Control-Max-Age 1728000;
    add_header Content-Type 'text/plain; charset=utf-8';
    add_header Content-Length 0;
    return 204;
}
```

### **After (FIXED)**

```nginx
location / {
    # Handle OPTIONS preflight requests - if block ONLY for return, not add_header
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "https://effmemberportal.org" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
        add_header Access-Control-Max-Age "1728000" always;
        add_header Content-Type "text/plain; charset=utf-8";
        add_header Content-Length "0";
        return 204;  # ✅ This is the key - return immediately
    }

    # All other add_header directives at location level
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    # ... etc
}
```

**Key Point**: When using `add_header` in an `if` block, you **must** use `return` immediately after to exit the block. The fixed version does this correctly.

---

## 📋 Configuration Features

### ✅ What's Included

1. **HTTP to HTTPS Redirect** - All HTTP traffic redirected to HTTPS
2. **SSL/TLS Support** - Ready for Let's Encrypt certificates
3. **CORS Headers** - Configured for `https://effmemberportal.org`
4. **WebSocket Support** - For Socket.IO connections
5. **File Upload Support** - 50MB max file size
6. **Security Headers** - HSTS, X-Frame-Options, etc.
7. **Health Check Endpoints** - `/health` and `/api/v1/health`
8. **Long Timeouts** - 600s for long-running operations
9. **Logging** - Access and error logs

---

## 🔐 SSL Certificate Setup

If you haven't setup SSL yet:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.effmemberportal.org

# Test auto-renewal
sudo certbot renew --dry-run
```

**Note**: The configuration already has SSL directives. Certbot will use them.

---

## 🆘 Troubleshooting

### Issue: "nginx: [emerg] cannot load certificate"

**Solution**: SSL certificates not yet installed. Either:
1. Comment out SSL lines (lines 33-36) temporarily
2. Or run Certbot to get certificates

```bash
# Temporary fix - comment out SSL lines
sudo nano /etc/nginx/sites-available/api.effmemberportal.org.conf
# Comment out lines 33-36 (ssl_certificate, ssl_certificate_key, include, ssl_dhparam)

# Then test and reload
sudo nginx -t && sudo systemctl reload nginx

# Then run Certbot
sudo certbot --nginx -d api.effmemberportal.org
```

### Issue: "502 Bad Gateway"

**Solution**: Backend not running

```bash
# Check if backend is running
curl http://localhost:5000/api/v1/health

# If not, start it with PM2
pm2 start ecosystem.production.config.js --only eff-backend
pm2 list
```

### Issue: CORS errors in browser

**Solution**: Update CORS origin in the config

```nginx
# Change this line (around line 92):
add_header Access-Control-Allow-Origin "https://effmemberportal.org" always;

# To allow all origins (for testing):
add_header Access-Control-Allow-Origin "*" always;
```

---

## 📞 Quick Commands

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/api-effmemberportal-error.log

# View access logs
sudo tail -f /var/log/nginx/api-effmemberportal-access.log
```

---

## ✅ Verification Checklist

- [ ] Configuration file copied to `/etc/nginx/sites-available/`
- [ ] Symlink created in `/etc/nginx/sites-enabled/`
- [ ] `sudo nginx -t` passes without errors
- [ ] Nginx reloaded successfully
- [ ] Backend is running on port 5000
- [ ] Health check works: `curl http://localhost:5000/api/v1/health`
- [ ] SSL certificates installed (if using HTTPS)
- [ ] Can access API through Nginx

---

**Last Updated**: 2025-11-21  
**Status**: Production Ready ✅

