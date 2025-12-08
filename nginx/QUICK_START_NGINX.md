# Quick Start: Get Nginx Running NOW

## 🚀 **Option 1: Start Without SSL (Fastest)**

Use this if you don't have SSL certificates yet or want to test quickly.

### **Commands**

```bash
# 1. Copy NO-SSL configurations
sudo cp /var/www/eff-membership-system/nginx/api.effmemberportal.org.NO-SSL.conf \
       /etc/nginx/sites-available/api.effmemberportal.org.conf

sudo cp /var/www/eff-membership-system/nginx/effmemberportal.org.NO-SSL.conf \
       /etc/nginx/sites-available/effmemberportal.org.conf

# 2. Create symlinks
sudo ln -sf /etc/nginx/sites-available/api.effmemberportal.org.conf \
            /etc/nginx/sites-enabled/

sudo ln -sf /etc/nginx/sites-available/effmemberportal.org.conf \
            /etc/nginx/sites-enabled/

# 3. Test configuration
sudo nginx -t

# 4. Start Nginx
sudo systemctl start nginx

# 5. Check status
sudo systemctl status nginx

# 6. Enable auto-start
sudo systemctl enable nginx
```

### **Test It Works**

```bash
# Test frontend (replace with your server IP)
curl http://YOUR_SERVER_IP

# Test backend API
curl http://YOUR_SERVER_IP/api/v1/health

# Or if DNS is setup:
curl http://effmemberportal.org
curl http://api.effmemberportal.org/api/v1/health
```

### **Add SSL Later**

Once Nginx is running, add SSL:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificates
sudo certbot --nginx -d effmemberportal.org -d www.effmemberportal.org
sudo certbot --nginx -d api.effmemberportal.org

# Certbot will automatically update your configs and reload Nginx
```

---

## 🔐 **Option 2: Start With SSL (If Certificates Exist)**

Use this if you already have SSL certificates installed.

### **Check if SSL Certificates Exist**

```bash
# Check if certificates exist
ls -la /etc/letsencrypt/live/effmemberportal.org/
ls -la /etc/letsencrypt/live/api.effmemberportal.org/
```

**If they exist**, use the SSL versions:

```bash
# 1. Copy SSL configurations
sudo cp /var/www/eff-membership-system/nginx/api.effmemberportal.org.FIXED.conf \
       /etc/nginx/sites-available/api.effmemberportal.org.conf

sudo cp /var/www/eff-membership-system/nginx/effmemberportal.org.conf \
       /etc/nginx/sites-available/effmemberportal.org.conf

# 2. Create symlinks
sudo ln -sf /etc/nginx/sites-available/api.effmemberportal.org.conf \
            /etc/nginx/sites-enabled/

sudo ln -sf /etc/nginx/sites-available/effmemberportal.org.conf \
            /etc/nginx/sites-enabled/

# 3. Test configuration
sudo nginx -t

# 4. Start Nginx
sudo systemctl start nginx

# 5. Check status
sudo systemctl status nginx
```

---

## 🐛 **If `nginx -t` Fails**

### **Error: "cannot load certificate"**

**Solution**: Use NO-SSL versions (Option 1 above)

### **Error: "unknown directive"**

**Solution**: Check for typos in config files

```bash
# View the problematic file
sudo cat /etc/nginx/sites-enabled/effmemberportal.org.conf | head -20

# Look for lines starting with 'a' instead of '#'
```

### **Error: "add_header directive not allowed"**

**Solution**: Make sure you're using the FIXED version for API config

```bash
sudo cp /var/www/eff-membership-system/nginx/api.effmemberportal.org.FIXED.conf \
       /etc/nginx/sites-available/api.effmemberportal.org.conf
```

---

## 📋 **Verification Checklist**

After starting Nginx:

```bash
# 1. Check Nginx is running
sudo systemctl status nginx
# Should show: Active: active (running)

# 2. Check backend is running
curl http://localhost:5000/api/v1/health
# Should return: {"status":"ok"}

# 3. Check PM2 processes
pm2 list
# Should show: eff-backend, eff-frontend, bulk-upload-processor

# 4. Test frontend access
curl http://localhost
# Should return HTML

# 5. Check logs for errors
sudo tail -20 /var/log/nginx/error.log
```

---

## 🔄 **Common Commands**

```bash
# Test configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx

# Stop Nginx
sudo systemctl stop nginx

# Restart Nginx
sudo systemctl restart nginx

# Reload configuration (when Nginx is running)
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

---

## 📁 **Configuration Files Summary**

| File | Purpose | SSL |
|------|---------|-----|
| `api.effmemberportal.org.FIXED.conf` | Backend API | ✅ Yes |
| `api.effmemberportal.org.NO-SSL.conf` | Backend API | ❌ No |
| `effmemberportal.org.conf` | Frontend | ✅ Yes |
| `effmemberportal.org.NO-SSL.conf` | Frontend | ❌ No |

**Recommendation**: Start with NO-SSL versions, then add SSL with Certbot.

---

## 🎯 **Quick Decision Tree**

```
Do you have SSL certificates?
│
├─ NO → Use NO-SSL versions (Option 1)
│       Then run Certbot to add SSL
│
└─ YES → Use SSL versions (Option 2)
         Make sure certificates are valid
```

---

## ✅ **Success Indicators**

You'll know it's working when:

1. ✅ `sudo nginx -t` shows "syntax is ok"
2. ✅ `sudo systemctl status nginx` shows "active (running)"
3. ✅ `curl http://localhost` returns HTML
4. ✅ `curl http://localhost:5000/api/v1/health` returns `{"status":"ok"}`
5. ✅ No errors in `/var/log/nginx/error.log`

---

**Start with Option 1 (NO-SSL) if you're unsure!** 🚀

