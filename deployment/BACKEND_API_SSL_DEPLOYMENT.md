# Backend API SSL Deployment Guide
## Domain: api.effmemberportal.org

This guide will help you provision `api.effmemberportal.org` to your server with proper SSL/TLS encryption using Let's Encrypt.

---

## 📋 Prerequisites

Before starting, ensure you have:

1. **Server Requirements:**
   - Ubuntu 20.04/22.04 LTS or similar Linux distribution
   - Root or sudo access
   - Minimum 2GB RAM, 2 CPU cores
   - 20GB+ disk space

2. **Domain Configuration:**
   - Domain `api.effmemberportal.org` registered
   - DNS A record pointing to your server IP
   - Port 80 and 443 accessible from the internet

3. **Backend Application:**
   - Node.js backend running on port 5000
   - PM2 process manager installed
   - Backend accessible via `http://localhost:5000`

4. **Network Requirements:**
   - Firewall allows HTTP (80) and HTTPS (443)
   - SSH access (port 22)

---

## 🚀 Quick Start (Automated Setup)

### Step 1: Configure DNS

Point your domain to your server IP:

```bash
# Check your server's public IP
curl ifconfig.me

# Verify DNS propagation
dig +short api.effmemberportal.org
nslookup api.effmemberportal.org
```

**DNS Configuration:**
- Type: `A`
- Name: `api.effmemberportal.org` or `api`
- Value: Your server IP (e.g., `69.164.245.173`)
- TTL: `3600` (or default)

Wait 5-15 minutes for DNS propagation.

### Step 2: Prepare Your Server

```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Navigate to deployment directory
cd /opt/eff-membership/deployment

# Make the setup script executable
chmod +x setup-backend-api-ssl.sh

# Update email in script (optional)
nano setup-backend-api-ssl.sh
# Change: EMAIL="ntsowef@gmail.com" to your email
```

### Step 3: Run Automated Setup

```bash
# Run the setup script
sudo ./setup-backend-api-ssl.sh
```

The script will:
- ✅ Install Nginx
- ✅ Install Certbot (Let's Encrypt client)
- ✅ Configure Nginx as reverse proxy
- ✅ Obtain SSL certificate
- ✅ Configure automatic renewal
- ✅ Set up firewall rules
- ✅ Apply security headers

### Step 4: Verify Installation

```bash
# Test SSL certificate
curl https://api.effmemberportal.org/api/v1/health

# Check certificate details
sudo certbot certificates

# Test automatic renewal
sudo certbot renew --dry-run
```

---

## 🔧 Manual Setup (Step-by-Step)

If you prefer manual setup or the automated script fails:

### 1. Install Nginx on Ubuntu

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install -y nginx

# Start Nginx service
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Check Nginx status
sudo systemctl status nginx

# Verify installation
nginx -v

# Test Nginx is serving (should see "Welcome to nginx" page)
curl http://localhost

# Check if Nginx is listening on port 80
sudo netstat -tlnp | grep :80
# Or use ss command
sudo ss -tlnp | grep :80
```

**Expected Output:**
- Nginx version should be displayed (e.g., `nginx/1.18.0` or `nginx/1.22.0`)
- Status should show "active (running)"
- Port 80 should be listening

**Verify Nginx is accessible from outside:**
```bash
# Get your server IP
curl ifconfig.me

# From another machine or browser, visit:
# http://YOUR_SERVER_IP
# You should see the default Nginx welcome page
```

**If you encounter issues:**
```bash
# Check if Apache or another service is using port 80
sudo netstat -tlnp | grep :80

# If Apache is running, stop it
sudo systemctl stop apache2
sudo systemctl disable apache2

# Restart Nginx
sudo systemctl restart nginx
```

### 2. Install Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### 3. Create Initial Nginx Configuration

```bash
# Create configuration file
sudo nano /etc/nginx/sites-available/eff-api
```

Add this configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.effmemberportal.org;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    # Proxy to backend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/eff-api /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 4. Obtain SSL Certificate

```bash
# Run Certbot
sudo certbot --nginx -d api.effmemberportal.org

# Follow the prompts:
# 1. Enter your email address
# 2. Agree to Terms of Service (Y)
# 3. Choose whether to share email (Y/N)
# 4. Choose redirect option: Select 2 (Redirect HTTP to HTTPS)
```

### 5. Install Production Configuration

```bash
# Copy production configuration
sudo cp /opt/eff-membership/deployment/nginx-backend-api.conf /etc/nginx/sites-available/eff-api

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 6. Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow SSH
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## ⚙️ Backend Configuration

### Update Backend Environment Variables

```bash
# Edit backend .env file
cd /opt/eff-membership/backend
nano .env
```

Update these values:

```env
# CORS Configuration
CORS_ORIGIN=https://effmemberportal.org,https://www.effmemberportal.org,https://api.effmemberportal.org

# API Configuration
API_URL=https://api.effmemberportal.org
```

### Restart Backend

```bash
# Restart PM2 process
pm2 restart eff-api

# Check logs
pm2 logs eff-api

# Verify backend is running
curl http://localhost:5000/api/v1/health
```

---

## 🌐 Frontend Configuration

Update your frontend environment variables:

```bash
# Edit frontend .env.production
cd /opt/eff-membership/frontend
nano .env.production
```

Update these values:

```env
# Backend API URL
VITE_API_URL=https://api.effmemberportal.org
VITE_API_BASE_URL=https://api.effmemberportal.org/api/v1

# WebSocket URL
VITE_WS_URL=wss://api.effmemberportal.org
VITE_WS_PATH=/socket.io
```

Rebuild frontend:

```bash
npm run build
```

---

## 🔍 Testing & Verification

### Test SSL Certificate

```bash
# Test HTTPS endpoint
curl -I https://api.effmemberportal.org

# Test health endpoint
curl https://api.effmemberportal.org/api/v1/health

# Test with verbose output
curl -v https://api.effmemberportal.org/api/v1/health
```

### Check SSL Grade

Visit these sites to check your SSL configuration:
- https://www.ssllabs.com/ssltest/analyze.html?d=api.effmemberportal.org
- https://securityheaders.com/?q=api.effmemberportal.org

### Verify Certificate Details

```bash
# View certificate information
sudo certbot certificates

# Check certificate expiration
echo | openssl s_client -servername api.effmemberportal.org -connect api.effmemberportal.org:443 2>/dev/null | openssl x509 -noout -dates
```

### Test Automatic Renewal

```bash
# Dry run renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

---

## 🔄 SSL Certificate Renewal

Certificates are automatically renewed by Certbot. The renewal happens:
- **Frequency:** Checked twice daily
- **Renewal:** 30 days before expiration
- **Method:** Automatic via systemd timer

### Manual Renewal

If you need to renew manually:

```bash
# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name api.effmemberportal.org

# Force renewal (even if not due)
sudo certbot renew --force-renewal
```

---

## 🛠️ Troubleshooting

### Issue 1: DNS Not Resolving

```bash
# Check DNS propagation
dig +short api.effmemberportal.org
nslookup api.effmemberportal.org

# Wait for DNS propagation (5-15 minutes)
# Or flush DNS cache locally
```

### Issue 2: Certificate Validation Failed

```bash
# Check if port 80 is accessible
curl -I http://api.effmemberportal.org

# Check firewall
sudo ufw status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Issue 3: Backend Not Accessible

```bash
# Check if backend is running
pm2 status
pm2 logs eff-api

# Check if port 5000 is listening
sudo netstat -tlnp | grep 5000

# Test backend directly
curl http://localhost:5000/api/v1/health
```

### Issue 4: CORS Errors

Update backend CORS configuration:

```bash
cd /opt/eff-membership/backend
nano .env
```

Add all allowed origins:

```env
CORS_ORIGIN=https://effmemberportal.org,https://www.effmemberportal.org,https://api.effmemberportal.org,http://localhost:3000
```

Restart backend:

```bash
pm2 restart eff-api
```

---

## 📊 Monitoring

### Check Nginx Status

```bash
# Service status
sudo systemctl status nginx

# Access logs
sudo tail -f /var/log/nginx/api.effmemberportal.org-access.log

# Error logs
sudo tail -f /var/log/nginx/api.effmemberportal.org-error.log
```

### Check Backend Status

```bash
# PM2 status
pm2 status

# Backend logs
pm2 logs eff-api --lines 100

# Monitor in real-time
pm2 monit
```

---

## 🔐 Security Best Practices

1. **Keep System Updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Monitor SSL Certificate:**
   - Set up monitoring alerts for certificate expiration
   - Test renewal regularly

3. **Review Nginx Logs:**
   - Check for suspicious activity
   - Monitor rate limiting effectiveness

4. **Backup Configuration:**
   ```bash
   sudo cp /etc/nginx/sites-available/eff-api /opt/eff-membership/backups/
   ```

5. **Use Strong Firewall Rules:**
   - Only allow necessary ports
   - Whitelist trusted IPs for SSH

---

## 📝 Summary

After completing this guide, you will have:

✅ **Domain:** `api.effmemberportal.org` pointing to your server  
✅ **SSL Certificate:** Let's Encrypt (free, auto-renewing)  
✅ **Nginx:** Configured as reverse proxy with security headers  
✅ **Backend:** Accessible via HTTPS  
✅ **Firewall:** Properly configured  
✅ **Monitoring:** Logs and status checks in place  

Your API is now production-ready with enterprise-grade SSL/TLS encryption!

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Nginx and backend logs
3. Verify DNS configuration
4. Ensure firewall rules are correct
5. Test certificate renewal

For additional help, refer to:
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)

