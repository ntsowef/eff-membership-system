# Backend API Deployment Package
## Provision api.effmemberportal.org with SSL/TLS

Complete deployment package for setting up your backend API with enterprise-grade SSL encryption.

---

## 🎯 Quick Links

- **Quick Start (15 min):** [QUICK_START_API_DEPLOYMENT.md](QUICK_START_API_DEPLOYMENT.md)
- **Full Guide:** [BACKEND_API_SSL_DEPLOYMENT.md](BACKEND_API_SSL_DEPLOYMENT.md)
- **Nginx Installation:** [NGINX_INSTALLATION_UBUNTU.md](NGINX_INSTALLATION_UBUNTU.md)
- **Package Summary:** [API_DEPLOYMENT_SUMMARY.md](API_DEPLOYMENT_SUMMARY.md)

---

## 📦 What's Included

### Configuration Files
- `nginx-backend-api.conf` - Production Nginx configuration
- `backend.env.production` - Backend environment template
- `ecosystem.config.js` - PM2 process manager config

### Scripts
- `setup-backend-api-ssl.sh` - Automated deployment script
- `backend-server-setup.sh` - Server preparation script
- `configure-backend-firewall.sh` - Firewall configuration

### Documentation
- `QUICK_START_API_DEPLOYMENT.md` - 15-minute quick start
- `BACKEND_API_SSL_DEPLOYMENT.md` - Complete deployment guide
- `NGINX_INSTALLATION_UBUNTU.md` - Nginx installation guide
- `API_DEPLOYMENT_SUMMARY.md` - Package overview
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Full production guide

---

## 🚀 Getting Started

### Prerequisites

✅ Ubuntu 20.04/22.04 LTS server  
✅ Domain `api.effmemberportal.org` pointing to server  
✅ Node.js backend running on port 5000  
✅ Root/sudo access  
✅ Ports 80, 443, 22 open  

### Quick Deployment

```bash
# 1. SSH to your server
ssh root@YOUR_SERVER_IP

# 2. Navigate to deployment directory
cd /opt/eff-membership/deployment

# 3. Make script executable
chmod +x setup-backend-api-ssl.sh

# 4. Run automated setup
sudo ./setup-backend-api-ssl.sh

# 5. Follow the prompts
# Script will handle everything automatically!
```

**That's it!** Your API will be live at `https://api.effmemberportal.org` in ~15 minutes.

---

## 📖 Documentation Guide

### Choose Your Path

#### 🏃 **I want to deploy quickly**
→ Read: [QUICK_START_API_DEPLOYMENT.md](QUICK_START_API_DEPLOYMENT.md)  
→ Time: 15 minutes  
→ Difficulty: Easy  

#### 📚 **I want to understand everything**
→ Read: [BACKEND_API_SSL_DEPLOYMENT.md](BACKEND_API_SSL_DEPLOYMENT.md)  
→ Time: 30 minutes  
→ Difficulty: Moderate  

#### 🔧 **I need to install Nginx first**
→ Read: [NGINX_INSTALLATION_UBUNTU.md](NGINX_INSTALLATION_UBUNTU.md)  
→ Time: 10 minutes  
→ Difficulty: Easy  

#### 📊 **I want an overview**
→ Read: [API_DEPLOYMENT_SUMMARY.md](API_DEPLOYMENT_SUMMARY.md)  
→ Time: 5 minutes  
→ Difficulty: Easy  

---

## 🎓 Step-by-Step Process

### Phase 1: Preparation (5 min)
1. Verify DNS configuration
2. Check server requirements
3. Ensure backend is running
4. Open required ports

### Phase 2: Installation (5 min)
1. Install Nginx
2. Install Certbot
3. Configure firewall
4. Verify installations

### Phase 3: SSL Setup (5 min)
1. Run automated script
2. Obtain SSL certificate
3. Configure Nginx
4. Test HTTPS endpoint

### Phase 4: Configuration (5 min)
1. Update backend CORS
2. Update frontend URLs
3. Restart services
4. Verify everything works

**Total Time:** ~20 minutes

---

## ✅ What You'll Get

After deployment:

### Security
✅ SSL/TLS encryption (HTTPS)  
✅ Let's Encrypt certificate (free, trusted)  
✅ A/A+ SSL grade  
✅ Security headers configured  
✅ Rate limiting enabled  

### Performance
✅ HTTP/2 support  
✅ Gzip compression  
✅ Connection pooling  
✅ SSL session caching  

### Reliability
✅ Automatic certificate renewal  
✅ Health monitoring  
✅ Error logging  
✅ Uptime tracking  

### Maintenance
✅ Easy updates  
✅ Log rotation  
✅ Status monitoring  
✅ Backup procedures  

---

## 🔧 Configuration Overview

### Nginx Configuration
**File:** `nginx-backend-api.conf`

**Features:**
- Reverse proxy to Node.js (port 5000)
- SSL/TLS termination
- Rate limiting (100 req/s)
- Security headers
- WebSocket support
- CORS configuration
- Gzip compression

### Backend Configuration
**File:** `backend/.env`

**Required:**
```env
CORS_ORIGIN=https://effmemberportal.org,https://api.effmemberportal.org
PORT=5000
NODE_ENV=production
```

### Frontend Configuration
**File:** `frontend/.env.production`

**Required:**
```env
VITE_API_URL=https://api.effmemberportal.org
VITE_API_BASE_URL=https://api.effmemberportal.org/api/v1
VITE_WS_URL=wss://api.effmemberportal.org
```

---

## 🧪 Testing

### Quick Tests

```bash
# 1. Test HTTPS endpoint
curl https://api.effmemberportal.org/api/v1/health

# 2. Test HTTP redirect
curl -I http://api.effmemberportal.org

# 3. Check SSL certificate
sudo certbot certificates

# 4. Test SSL grade
# Visit: https://www.ssllabs.com/ssltest/
```

### Expected Results

✅ Health endpoint returns JSON  
✅ HTTP redirects to HTTPS (301)  
✅ Certificate is valid for 90 days  
✅ SSL grade is A or A+  

---

## 🔄 Maintenance

### Daily
- Monitor logs for errors
- Check backend status: `pm2 status`

### Weekly
- Review access logs
- Check disk space
- Monitor SSL certificate expiry

### Monthly
- Test certificate renewal: `sudo certbot renew --dry-run`
- Update system packages: `sudo apt update && sudo apt upgrade`
- Review security logs

### Quarterly
- Backup configurations
- Review and update security settings
- Performance optimization

---

## 🚨 Troubleshooting

### Common Issues

#### DNS Not Resolving
```bash
# Check DNS
dig +short api.effmemberportal.org

# Wait for propagation (5-15 min)
```

#### Certificate Failed
```bash
# Check Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Verify port 80 accessible
curl -I http://api.effmemberportal.org
```

#### Backend Not Accessible
```bash
# Check backend status
pm2 status
pm2 logs eff-api

# Verify port 5000
sudo netstat -tlnp | grep 5000
```

#### 502 Bad Gateway
```bash
# Restart backend
pm2 restart eff-api

# Restart Nginx
sudo systemctl restart nginx
```

---

## 📊 Monitoring

### Check Service Status

```bash
# Nginx status
sudo systemctl status nginx

# Backend status
pm2 status

# Certificate status
sudo certbot certificates
```

### View Logs

```bash
# Nginx access log
sudo tail -f /var/log/nginx/api.effmemberportal.org-access.log

# Nginx error log
sudo tail -f /var/log/nginx/api.effmemberportal.org-error.log

# Backend logs
pm2 logs eff-api
```

### Monitor Resources

```bash
# CPU and memory
htop

# Disk usage
df -h

# Network connections
sudo netstat -tlnp
```

---

## 🔐 Security Best Practices

### Implemented
✅ SSL/TLS encryption  
✅ HSTS enabled  
✅ Security headers  
✅ Rate limiting  
✅ CORS configured  
✅ Firewall rules  

### Recommended
- Set up fail2ban
- Implement IP whitelisting
- Use strong passwords
- Regular security updates
- Monitor access logs
- Backup regularly

---

## 📚 Additional Resources

### Official Documentation
- **Nginx:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Certbot:** https://certbot.eff.org/docs/
- **PM2:** https://pm2.keymetrics.io/docs/

### Testing Tools
- **SSL Test:** https://www.ssllabs.com/ssltest/
- **Security Headers:** https://securityheaders.com/
- **DNS Checker:** https://dnschecker.org/

### Related Guides
- Backend setup: `backend-server-setup.sh`
- Frontend deployment: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- Database setup: `docker-compose.postgres.yml`

---

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] DNS configured
- [ ] Server prepared
- [ ] Backend running
- [ ] Ports open

### Deployment
- [ ] Nginx installed
- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] Configuration deployed

### Post-Deployment
- [ ] HTTPS working
- [ ] Backend accessible
- [ ] Frontend updated
- [ ] Tests passing

### Verification
- [ ] SSL grade A/A+
- [ ] Logs working
- [ ] Monitoring active
- [ ] Auto-renewal enabled

---

## 📞 Support

### Getting Help

1. **Check Documentation**
   - Review relevant guide
   - Check troubleshooting section

2. **Check Logs**
   - Nginx: `/var/log/nginx/`
   - Backend: `pm2 logs`
   - Certbot: `/var/log/letsencrypt/`

3. **Verify Configuration**
   - Test Nginx: `sudo nginx -t`
   - Check DNS: `dig +short api.effmemberportal.org`
   - Test backend: `curl http://localhost:5000/api/v1/health`

4. **Common Commands**
   ```bash
   # Restart services
   sudo systemctl restart nginx
   pm2 restart eff-api
   
   # View status
   sudo systemctl status nginx
   pm2 status
   
   # Check logs
   sudo tail -f /var/log/nginx/error.log
   pm2 logs eff-api
   ```

---

## 🎉 Success!

Once deployed, your API will be:

✅ **Live:** https://api.effmemberportal.org  
✅ **Secure:** SSL/TLS encrypted  
✅ **Fast:** Optimized performance  
✅ **Reliable:** Auto-renewal enabled  
✅ **Monitored:** Logging in place  

---

## 📝 Quick Reference

### Essential Commands

```bash
# Service management
sudo systemctl {start|stop|restart|status} nginx
pm2 {start|stop|restart|status} eff-api

# Configuration
sudo nginx -t                    # Test config
sudo systemctl reload nginx      # Reload config

# SSL certificate
sudo certbot certificates        # View certs
sudo certbot renew              # Renew certs
sudo certbot renew --dry-run    # Test renewal

# Logs
sudo tail -f /var/log/nginx/error.log
pm2 logs eff-api

# Testing
curl https://api.effmemberportal.org/api/v1/health
```

---

**Package Version:** 1.0.0  
**Last Updated:** 2025-11-03  
**Deployment Time:** 15-30 minutes  
**Production Ready:** ✅

---

## 🚀 Ready to Deploy?

1. Choose your guide from the Quick Links above
2. Follow the step-by-step instructions
3. Test your deployment
4. Enjoy your secure API!

**Let's get started!** 🔒

