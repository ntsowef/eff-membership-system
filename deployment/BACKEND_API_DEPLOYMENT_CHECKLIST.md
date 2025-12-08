# Backend API Deployment Checklist
## api.effmemberportal.org SSL Setup

Use this checklist to ensure all steps are completed correctly.

---

## 📋 Pre-Deployment Checklist

### DNS Configuration
- [ ] Domain `api.effmemberportal.org` registered
- [ ] DNS A record created pointing to server IP
- [ ] DNS propagation verified (5-15 minutes)
  ```bash
  dig +short api.effmemberportal.org
  ```
- [ ] Server IP matches DNS record

### Server Requirements
- [ ] Ubuntu 20.04/22.04 LTS or similar
- [ ] Root/sudo access available
- [ ] Minimum 2GB RAM, 2 CPU cores
- [ ] 20GB+ disk space available
- [ ] SSH access configured

### Backend Application
- [ ] Node.js backend installed and running
- [ ] Backend listening on port 5000
  ```bash
  netstat -tlnp | grep 5000
  ```
- [ ] PM2 process manager installed
- [ ] Backend health endpoint responding
  ```bash
  curl http://localhost:5000/api/v1/health
  ```

### Network & Firewall
- [ ] Port 80 (HTTP) accessible from internet
- [ ] Port 443 (HTTPS) accessible from internet
- [ ] Port 22 (SSH) accessible for management
- [ ] UFW or iptables configured

---

## 🚀 Deployment Steps

### Step 1: DNS Setup
- [ ] Login to domain registrar/DNS provider
- [ ] Create A record:
  - Name: `api` or `api.effmemberportal.org`
  - Type: `A`
  - Value: `YOUR_SERVER_IP`
  - TTL: `3600`
- [ ] Wait for DNS propagation
- [ ] Verify DNS resolution:
  ```bash
  dig +short api.effmemberportal.org
  nslookup api.effmemberportal.org
  ```

### Step 2: Server Preparation
- [ ] Connect to server via SSH
  ```bash
  ssh root@YOUR_SERVER_IP
  ```
- [ ] Update system packages
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```
- [ ] Navigate to deployment directory
  ```bash
  cd /opt/eff-membership/deployment
  ```
- [ ] Make setup script executable
  ```bash
  chmod +x setup-backend-api-ssl.sh
  ```

### Step 3: Nginx Installation
- [ ] Install Nginx
  ```bash
  sudo apt install -y nginx
  ```
- [ ] Start Nginx service
  ```bash
  sudo systemctl start nginx
  sudo systemctl enable nginx
  ```
- [ ] Verify Nginx is running
  ```bash
  sudo systemctl status nginx
  ```

### Step 4: Certbot Installation
- [ ] Install Certbot and Nginx plugin
  ```bash
  sudo apt install -y certbot python3-certbot-nginx
  ```
- [ ] Verify Certbot installation
  ```bash
  certbot --version
  ```

### Step 5: Initial Nginx Configuration
- [ ] Copy nginx configuration
  ```bash
  sudo cp nginx-backend-api.conf /etc/nginx/sites-available/eff-api
  ```
- [ ] Create symbolic link
  ```bash
  sudo ln -s /etc/nginx/sites-available/eff-api /etc/nginx/sites-enabled/
  ```
- [ ] Test Nginx configuration
  ```bash
  sudo nginx -t
  ```
- [ ] Restart Nginx
  ```bash
  sudo systemctl restart nginx
  ```

### Step 6: SSL Certificate
- [ ] Run Certbot to obtain certificate
  ```bash
  sudo certbot --nginx -d api.effmemberportal.org
  ```
- [ ] Enter email address for notifications
- [ ] Agree to Terms of Service
- [ ] Choose redirect option (2 - Redirect HTTP to HTTPS)
- [ ] Verify certificate obtained successfully

### Step 7: Production Configuration
- [ ] Update Nginx configuration with SSL paths
- [ ] Test Nginx configuration
  ```bash
  sudo nginx -t
  ```
- [ ] Reload Nginx
  ```bash
  sudo systemctl reload nginx
  ```

### Step 8: Firewall Configuration
- [ ] Allow Nginx Full (HTTP + HTTPS)
  ```bash
  sudo ufw allow 'Nginx Full'
  ```
- [ ] Allow SSH
  ```bash
  sudo ufw allow 22/tcp
  ```
- [ ] Enable firewall
  ```bash
  sudo ufw enable
  ```
- [ ] Verify firewall status
  ```bash
  sudo ufw status
  ```

### Step 9: Backend Configuration
- [ ] Update backend .env file
  ```bash
  cd /opt/eff-membership/backend
  nano .env
  ```
- [ ] Add CORS origins:
  ```env
  CORS_ORIGIN=https://effmemberportal.org,https://www.effmemberportal.org,https://api.effmemberportal.org
  ```
- [ ] Restart backend
  ```bash
  pm2 restart eff-api
  ```
- [ ] Verify backend is running
  ```bash
  pm2 status
  pm2 logs eff-api --lines 20
  ```

### Step 10: Frontend Configuration
- [ ] Update frontend .env.production
  ```bash
  cd /opt/eff-membership/frontend
  nano .env.production
  ```
- [ ] Update API URLs:
  ```env
  VITE_API_URL=https://api.effmemberportal.org
  VITE_API_BASE_URL=https://api.effmemberportal.org/api/v1
  VITE_WS_URL=wss://api.effmemberportal.org
  ```
- [ ] Rebuild frontend (if needed)
  ```bash
  npm run build
  ```

---

## ✅ Verification Checklist

### SSL Certificate
- [ ] Certificate obtained successfully
  ```bash
  sudo certbot certificates
  ```
- [ ] Certificate valid for api.effmemberportal.org
- [ ] Certificate expiration date is 90 days from now
- [ ] Auto-renewal timer is active
  ```bash
  sudo systemctl status certbot.timer
  ```

### HTTPS Endpoint
- [ ] HTTPS endpoint accessible
  ```bash
  curl -I https://api.effmemberportal.org
  ```
- [ ] Returns 200 OK status
- [ ] SSL certificate valid (no warnings)
- [ ] HTTP redirects to HTTPS

### API Functionality
- [ ] Health endpoint responding
  ```bash
  curl https://api.effmemberportal.org/api/v1/health
  ```
- [ ] Returns valid JSON response
- [ ] No CORS errors in browser console
- [ ] WebSocket connections working (if applicable)

### Security Headers
- [ ] HSTS header present
- [ ] X-Frame-Options header present
- [ ] X-Content-Type-Options header present
- [ ] Check security headers:
  ```bash
  curl -I https://api.effmemberportal.org | grep -i "strict-transport-security\|x-frame-options\|x-content-type-options"
  ```

### SSL Grade
- [ ] Test SSL configuration at:
  - https://www.ssllabs.com/ssltest/analyze.html?d=api.effmemberportal.org
- [ ] SSL Labs grade: A or A+
- [ ] No major vulnerabilities detected

### Monitoring
- [ ] Nginx access logs working
  ```bash
  sudo tail -f /var/log/nginx/api.effmemberportal.org-access.log
  ```
- [ ] Nginx error logs working
  ```bash
  sudo tail -f /var/log/nginx/api.effmemberportal.org-error.log
  ```
- [ ] PM2 monitoring backend
  ```bash
  pm2 monit
  ```

---

## 🔄 Post-Deployment Tasks

### Immediate Tasks
- [ ] Test all API endpoints
- [ ] Verify frontend can connect to backend
- [ ] Check for any CORS errors
- [ ] Monitor logs for errors
- [ ] Test file uploads (if applicable)
- [ ] Test WebSocket connections (if applicable)

### Within 24 Hours
- [ ] Monitor server resources (CPU, RAM, disk)
- [ ] Check SSL certificate auto-renewal
  ```bash
  sudo certbot renew --dry-run
  ```
- [ ] Review Nginx access logs for traffic patterns
- [ ] Verify rate limiting is working
- [ ] Test from different networks/locations

### Within 1 Week
- [ ] Set up monitoring alerts (optional)
- [ ] Configure log rotation
- [ ] Backup Nginx configuration
  ```bash
  sudo cp /etc/nginx/sites-available/eff-api /opt/eff-membership/backups/
  ```
- [ ] Document any custom configurations
- [ ] Update team documentation

### Monthly Tasks
- [ ] Review SSL certificate status
- [ ] Check for system updates
  ```bash
  sudo apt update && sudo apt list --upgradable
  ```
- [ ] Review security logs
- [ ] Test certificate renewal
- [ ] Backup configurations

---

## 🚨 Troubleshooting Checklist

### If SSL Certificate Fails
- [ ] Verify DNS is correctly configured
- [ ] Check port 80 is accessible from internet
- [ ] Verify domain ownership
- [ ] Check Certbot logs
  ```bash
  sudo tail -f /var/log/letsencrypt/letsencrypt.log
  ```
- [ ] Try manual verification
  ```bash
  sudo certbot certonly --manual -d api.effmemberportal.org
  ```

### If Backend Not Accessible
- [ ] Check backend is running
  ```bash
  pm2 status
  ```
- [ ] Check backend logs
  ```bash
  pm2 logs eff-api
  ```
- [ ] Verify port 5000 is listening
  ```bash
  sudo netstat -tlnp | grep 5000
  ```
- [ ] Test backend directly
  ```bash
  curl http://localhost:5000/api/v1/health
  ```

### If CORS Errors Occur
- [ ] Check backend CORS configuration
- [ ] Verify CORS_ORIGIN includes all domains
- [ ] Check Nginx CORS headers
- [ ] Test with browser developer tools
- [ ] Restart backend after changes

### If Nginx Errors
- [ ] Check Nginx configuration syntax
  ```bash
  sudo nginx -t
  ```
- [ ] Review error logs
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ```
- [ ] Verify upstream backend is running
- [ ] Check file permissions
- [ ] Restart Nginx
  ```bash
  sudo systemctl restart nginx
  ```

---

## 📝 Sign-Off

### Deployment Completed By
- Name: ___________________________
- Date: ___________________________
- Time: ___________________________

### Verification Completed By
- Name: ___________________________
- Date: ___________________________
- Time: ___________________________

### Production Ready
- [ ] All checklist items completed
- [ ] All tests passing
- [ ] Monitoring in place
- [ ] Documentation updated
- [ ] Team notified

---

## 📞 Emergency Contacts

- **System Administrator:** _________________________
- **Backend Developer:** _________________________
- **DevOps Engineer:** _________________________
- **On-Call Support:** _________________________

---

## 🔗 Quick Reference Links

- **SSL Test:** https://www.ssllabs.com/ssltest/
- **Security Headers:** https://securityheaders.com/
- **Let's Encrypt Docs:** https://letsencrypt.org/docs/
- **Nginx Docs:** https://nginx.org/en/docs/
- **Certbot Docs:** https://certbot.eff.org/docs/

---

**Last Updated:** 2025-11-03  
**Version:** 1.0.0

