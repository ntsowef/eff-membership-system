# 🚀 EFF Membership System - Deployment Guide Index

**Start here for production deployment!**

---

## 📚 Quick Navigation

### 🎯 **New Deployment? Start Here:**

1. **[SINGLE_SERVER_DEPLOYMENT.md](SINGLE_SERVER_DEPLOYMENT.md)** ⭐ **RECOMMENDED**
   - Complete single-server deployment guide
   - Step-by-step instructions (30 minutes)
   - Perfect for most deployments

2. **[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)**
   - Detailed two-server deployment
   - Advanced configuration options
   - For distributed architecture

---

## 🔧 **Current Issue: CORS Errors?**

### Quick Fix (2 minutes):

1. **[CORS_QUICK_REFERENCE.md](CORS_QUICK_REFERENCE.md)** ⚡ **START HERE**
   - Quick 30-second fix
   - Automated script available
   - Most common solution

2. **[FIX_DUPLICATE_CORS_HEADERS.md](FIX_DUPLICATE_CORS_HEADERS.md)**
   - Detailed explanation
   - Step-by-step manual fix
   - Troubleshooting guide

3. **[CORS_ERROR_SUMMARY.md](CORS_ERROR_SUMMARY.md)**
   - Overview of CORS issues
   - Multiple fix options
   - Verification steps

---

## 📋 Deployment Guides by Type

### Single Server Deployment
- **[SINGLE_SERVER_DEPLOYMENT.md](SINGLE_SERVER_DEPLOYMENT.md)** - Complete guide (30 min)
- **[QUICK_START_API_DEPLOYMENT.md](QUICK_START_API_DEPLOYMENT.md)** - Quick start guide

### Two-Server Deployment
- **[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)** - Full guide
- **[DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md)** - Architecture overview

### Backend Only
- **[BACKEND_API_DEPLOYMENT_CHECKLIST.md](BACKEND_API_DEPLOYMENT_CHECKLIST.md)** - Backend checklist
- **[README_API_DEPLOYMENT.md](README_API_DEPLOYMENT.md)** - API deployment guide

### Frontend Only
- **[FRONTEND_REDEPLOY_GUIDE.md](FRONTEND_REDEPLOY_GUIDE.md)** - Frontend redeployment

---

## 🔒 SSL/HTTPS Setup

- **[BACKEND_API_SSL_DEPLOYMENT.md](BACKEND_API_SSL_DEPLOYMENT.md)** - SSL for backend API
- **[setup-backend-api-ssl.sh](setup-backend-api-ssl.sh)** - Automated SSL setup script

---

## 🐛 Troubleshooting

### CORS Issues
- **[CORS_QUICK_REFERENCE.md](CORS_QUICK_REFERENCE.md)** - Quick fix
- **[FIX_DUPLICATE_CORS_HEADERS.md](FIX_DUPLICATE_CORS_HEADERS.md)** - Duplicate headers
- **[FIX_CORS_SESSION_ID_ERROR.md](FIX_CORS_SESSION_ID_ERROR.md)** - Session ID errors
- **[CORS_BEFORE_AFTER.md](CORS_BEFORE_AFTER.md)** - Configuration comparison
- **[QUICK_FIX_CORS.sh](QUICK_FIX_CORS.sh)** - Automated fix script

### 502 Bad Gateway
- **[FINAL_FIX_502.md](FINAL_FIX_502.md)** - Complete 502 fix guide
- **[TROUBLESHOOT_502_ERROR.md](TROUBLESHOOT_502_ERROR.md)** - Troubleshooting steps
- **[fix-502.sh](fix-502.sh)** - Automated fix script
- **[diagnose-502.sh](diagnose-502.sh)** - Diagnostic script

### HTTPS Issues
- **[FIX_HTTPS_BACKEND_ISSUE.md](FIX_HTTPS_BACKEND_ISSUE.md)** - HTTPS configuration
- **[fix-https-backend.sh](fix-https-backend.sh)** - Automated fix

### General Troubleshooting
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Comprehensive troubleshooting guide

---

## 📊 Monitoring & Maintenance

- **[MONITORING_SETUP.md](MONITORING_SETUP.md)** - Setup monitoring
- **[BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)** - Backup and recovery procedures

---

## ⚙️ Configuration Files

### Nginx Configuration
- **[nginx-backend-api.conf](nginx-backend-api.conf)** - Backend API Nginx config
- **[nginx-frontend.conf](nginx-frontend.conf)** - Frontend Nginx config

### Environment Files
- **[backend.env.production](backend.env.production)** - Backend environment template
- **[frontend.env.production](frontend.env.production)** - Frontend environment template

### PM2 Configuration
- **[ecosystem.config.js](ecosystem.config.js)** - PM2 ecosystem file

---

## 🤖 Automated Scripts

### Setup Scripts
- **[backend-server-setup.sh](backend-server-setup.sh)** - Backend server setup
- **[frontend-server-setup.sh](frontend-server-setup.sh)** - Frontend server setup
- **[make-scripts-executable.sh](make-scripts-executable.sh)** - Make scripts executable

### Firewall Scripts
- **[configure-backend-firewall.sh](configure-backend-firewall.sh)** - Backend firewall
- **[configure-frontend-firewall.sh](configure-frontend-firewall.sh)** - Frontend firewall

### Fix Scripts
- **[QUICK_FIX_CORS.sh](QUICK_FIX_CORS.sh)** - Fix CORS errors
- **[fix-502.sh](fix-502.sh)** - Fix 502 errors
- **[fix-https-backend.sh](fix-https-backend.sh)** - Fix HTTPS issues
- **[diagnose-502.sh](diagnose-502.sh)** - Diagnose 502 errors

### SSL Scripts
- **[setup-backend-api-ssl.sh](setup-backend-api-ssl.sh)** - Setup SSL certificates

---

## 📖 Documentation

### Summaries
- **[DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)** - Deployment overview
- **[COMPLETE_DEPLOYMENT_SUMMARY.md](COMPLETE_DEPLOYMENT_SUMMARY.md)** - Complete summary
- **[API_DEPLOYMENT_SUMMARY.md](API_DEPLOYMENT_SUMMARY.md)** - API deployment summary

### Reference
- **[INDEX.md](INDEX.md)** - Documentation index
- **[README.md](README.md)** - General README

---

## 🎯 Recommended Deployment Path

### For First-Time Deployment:

```
1. Read: SINGLE_SERVER_DEPLOYMENT.md
   ↓
2. Prepare: Server, DNS, Credentials
   ↓
3. Follow: Step-by-step guide (30 min)
   ↓
4. Verify: Testing checklist
   ↓
5. Monitor: Setup monitoring
```

### For Existing Deployment with Issues:

```
1. Identify Issue:
   - CORS errors? → CORS_QUICK_REFERENCE.md
   - 502 errors? → FINAL_FIX_502.md
   - HTTPS issues? → FIX_HTTPS_BACKEND_ISSUE.md
   ↓
2. Apply Fix:
   - Use automated script (recommended)
   - Or follow manual steps
   ↓
3. Verify:
   - Test in browser
   - Check logs
   ↓
4. Document:
   - Note what was fixed
   - Update team
```

---

## 🚨 Emergency Quick Fixes

### CORS Error (Most Common)
```bash
cd /opt/eff-membership
sudo bash deployment/QUICK_FIX_CORS.sh
```

### 502 Bad Gateway
```bash
cd /opt/eff-membership
sudo bash deployment/fix-502.sh
```

### Backend Not Responding
```bash
pm2 restart eff-api
pm2 logs eff-api --lines 50
```

### Nginx Issues
```bash
sudo nginx -t
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

---

## 📞 Quick Commands Reference

```bash
# Check all services
systemctl status nginx postgresql redis
pm2 status

# View logs
pm2 logs eff-api
tail -f /var/log/nginx/error.log

# Restart services
pm2 restart eff-api
systemctl restart nginx

# Test endpoints
curl https://api.effmemberportal.org/health
curl -I https://www.effmemberportal.org

# Check resources
htop
df -h
free -h
```

---

## 🎓 Understanding the System

### Architecture
```
Internet
   ↓
Nginx (Port 443/80)
   ↓
   ├─→ Frontend (Static Files) → www.effmemberportal.org
   └─→ Backend API (Node.js:5000) → api.effmemberportal.org
       ↓
       ├─→ PostgreSQL (Database)
       └─→ Redis (Cache)
```

### Key Components
- **Frontend:** React app (static files served by Nginx)
- **Backend:** Node.js/Express API (proxied by Nginx)
- **Database:** PostgreSQL (data storage)
- **Cache:** Redis (performance optimization)
- **Process Manager:** PM2 (keeps backend running)
- **Web Server:** Nginx (serves frontend, proxies backend)
- **SSL:** Let's Encrypt (HTTPS certificates)

---

## ✅ Success Indicators

After deployment, you should see:
- ✅ Frontend loads: `https://www.effmemberportal.org`
- ✅ Backend responds: `https://api.effmemberportal.org/health`
- ✅ SSL certificates valid (green padlock)
- ✅ No CORS errors in browser console
- ✅ Dashboard loads data
- ✅ Login works
- ✅ All services running: `pm2 status`

---

## 📋 Pre-Deployment Checklist

- [ ] Server provisioned (Ubuntu 20.04/22.04)
- [ ] DNS records configured
- [ ] SSH access verified
- [ ] Credentials prepared (database, email, SMS, payment)
- [ ] Backup plan in place
- [ ] Team notified of deployment window

---

## 🎉 Post-Deployment

- [ ] All services verified
- [ ] Monitoring setup
- [ ] Backups configured
- [ ] Team trained on maintenance
- [ ] Documentation updated
- [ ] Credentials securely stored

---

## 📚 Additional Resources

### External Documentation
- [Node.js Documentation](https://nodejs.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

### Support
- **Issues:** Check TROUBLESHOOTING.md first
- **Logs:** Always check logs for errors
- **Community:** Search for similar issues online

---

**Last Updated:** 2025-11-03  
**Version:** 1.0  
**Status:** ✅ Production Ready

---

## 🚀 Ready to Deploy?

**Start with:** [SINGLE_SERVER_DEPLOYMENT.md](SINGLE_SERVER_DEPLOYMENT.md)

**Need help?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**Have CORS errors?** Use [CORS_QUICK_REFERENCE.md](CORS_QUICK_REFERENCE.md)

**Good luck! 🎉**

