# Quick Start: Backend API Deployment with SSL
## Deploy api.effmemberportal.org in 15 Minutes

This is a streamlined guide to get your backend API up and running with SSL as quickly as possible.

---

## 🎯 What You'll Accomplish

- ✅ Install Nginx on Ubuntu
- ✅ Configure reverse proxy to Node.js backend
- ✅ Obtain free SSL certificate from Let's Encrypt
- ✅ Secure API with HTTPS
- ✅ Configure automatic certificate renewal

**Time Required:** 15-20 minutes

---

## 📋 Before You Start

Ensure you have:

1. **Server:** Ubuntu 20.04/22.04 with root access
2. **Domain:** `api.effmemberportal.org` pointing to your server IP
3. **Backend:** Node.js app running on port 5000
4. **Ports:** 80 and 443 open in firewall

---

## 🚀 Step-by-Step Deployment

### Step 1: Verify DNS (2 minutes)

```bash
# Check your server IP
curl ifconfig.me

# Verify DNS points to your server
dig +short api.effmemberportal.org

# Both should match!
```

**If DNS doesn't match:**
- Go to your domain registrar
- Create A record: `api.effmemberportal.org` → `YOUR_SERVER_IP`
- Wait 5-15 minutes for propagation

---

### Step 2: Install Nginx (3 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify it's running
sudo systemctl status nginx

# Test locally
curl http://localhost
```

**Expected:** You should see "Welcome to nginx!" HTML

---

### Step 3: Install Certbot (2 minutes)

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

---

### Step 4: Configure Firewall (1 minute)

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

### Step 5: Verify Backend is Running (1 minute)

```bash
# Check if backend is running on port 5000
sudo netstat -tlnp | grep 5000

# Test backend health endpoint
curl http://localhost:5000/api/v1/health

# If not running, start it:
cd /opt/eff-membership/backend
pm2 start dist/app.js --name eff-api
```

---

### Step 6: Run Automated Setup Script (5 minutes)

```bash
# Navigate to deployment directory
cd /opt/eff-membership/deployment

# Make script executable
chmod +x setup-backend-api-ssl.sh

# Run the script
sudo ./setup-backend-api-ssl.sh
```

**The script will:**
1. Configure Nginx as reverse proxy
2. Obtain SSL certificate from Let's Encrypt
3. Set up HTTPS with automatic redirect
4. Configure security headers
5. Enable automatic certificate renewal

**Follow the prompts:**
- Confirm DNS is configured
- Wait for certificate issuance
- Script completes automatically

---

### Step 7: Update Backend Configuration (2 minutes)

```bash
# Edit backend .env file
cd /opt/eff-membership/backend
nano .env
```

**Add/Update these lines:**
```env
CORS_ORIGIN=https://effmemberportal.org,https://www.effmemberportal.org,https://api.effmemberportal.org
```

**Restart backend:**
```bash
pm2 restart eff-api
pm2 logs eff-api --lines 20
```

---

### Step 8: Test Your API (2 minutes)

```bash
# Test HTTPS endpoint
curl https://api.effmemberportal.org/api/v1/health

# Test with verbose output
curl -v https://api.effmemberportal.org/api/v1/health

# Check SSL certificate
curl -vI https://api.effmemberportal.org 2>&1 | grep -i "SSL\|TLS"
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-03T...",
  "uptime": 12345
}
```

---

## ✅ Verification

### Quick Checks

```bash
# 1. Nginx is running
sudo systemctl status nginx

# 2. SSL certificate is valid
sudo certbot certificates

# 3. Backend is accessible
curl https://api.effmemberportal.org/api/v1/health

# 4. HTTP redirects to HTTPS
curl -I http://api.effmemberportal.org

# 5. Auto-renewal is enabled
sudo systemctl status certbot.timer
```

### Test SSL Grade

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.effmemberportal.org

**Target Grade:** A or A+

---

## 🎨 Update Frontend Configuration

If you have a frontend application:

```bash
# Edit frontend .env.production
cd /opt/eff-membership/frontend
nano .env.production
```

**Update these values:**
```env
VITE_API_URL=https://api.effmemberportal.org
VITE_API_BASE_URL=https://api.effmemberportal.org/api/v1
VITE_WS_URL=wss://api.effmemberportal.org
```

**Rebuild frontend:**
```bash
npm run build
```

---

## 🔄 Maintenance

### Check Certificate Status

```bash
# View certificate details
sudo certbot certificates

# Test renewal (dry run)
sudo certbot renew --dry-run
```

### Monitor Logs

```bash
# Nginx access log
sudo tail -f /var/log/nginx/api.effmemberportal.org-access.log

# Nginx error log
sudo tail -f /var/log/nginx/api.effmemberportal.org-error.log

# Backend logs
pm2 logs eff-api
```

### Restart Services

```bash
# Restart Nginx
sudo systemctl restart nginx

# Restart backend
pm2 restart eff-api

# Restart both
sudo systemctl restart nginx && pm2 restart eff-api
```

---

## 🚨 Troubleshooting

### Problem: Certificate Failed to Issue

**Solution:**
```bash
# Check DNS
dig +short api.effmemberportal.org

# Verify port 80 is accessible
curl -I http://api.effmemberportal.org

# Check Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Try manual certificate
sudo certbot certonly --manual -d api.effmemberportal.org
```

### Problem: Backend Not Accessible

**Solution:**
```bash
# Check backend is running
pm2 status

# Check backend logs
pm2 logs eff-api

# Test backend directly
curl http://localhost:5000/api/v1/health

# Restart backend
pm2 restart eff-api
```

### Problem: CORS Errors

**Solution:**
```bash
# Update backend CORS
cd /opt/eff-membership/backend
nano .env

# Add all origins
CORS_ORIGIN=https://effmemberportal.org,https://www.effmemberportal.org,https://api.effmemberportal.org,http://localhost:3000

# Restart backend
pm2 restart eff-api
```

### Problem: 502 Bad Gateway

**Solution:**
```bash
# Check if backend is running
pm2 status

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Verify backend port
sudo netstat -tlnp | grep 5000

# Restart both services
pm2 restart eff-api
sudo systemctl restart nginx
```

---

## 📚 Additional Resources

### Detailed Guides

- **Nginx Installation:** `NGINX_INSTALLATION_UBUNTU.md`
- **Full Deployment Guide:** `BACKEND_API_SSL_DEPLOYMENT.md`
- **Deployment Checklist:** `BACKEND_API_DEPLOYMENT_CHECKLIST.md`

### Configuration Files

- **Nginx Config:** `nginx-backend-api.conf`
- **Setup Script:** `setup-backend-api-ssl.sh`
- **Backend Env Template:** `backend.env.production`

### Useful Commands

```bash
# Check all services
sudo systemctl status nginx
pm2 status

# View all logs
sudo tail -f /var/log/nginx/*.log
pm2 logs

# Test everything
curl https://api.effmemberportal.org/api/v1/health
sudo nginx -t
sudo certbot certificates
```

---

## 🎉 Success!

Your backend API is now:

✅ **Accessible:** https://api.effmemberportal.org  
✅ **Secured:** SSL/TLS encryption with Let's Encrypt  
✅ **Protected:** Security headers and rate limiting  
✅ **Monitored:** Logging and status checks  
✅ **Maintained:** Automatic certificate renewal  

---

## 📞 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review detailed guides in `deployment/` folder
3. Check logs: Nginx and PM2
4. Verify DNS and firewall configuration
5. Test backend independently

---

**Deployment Time:** ~15 minutes  
**SSL Certificate:** Free (Let's Encrypt)  
**Auto-Renewal:** Enabled  
**Production Ready:** ✅

---

**Last Updated:** 2025-11-03  
**Version:** 1.0.0

