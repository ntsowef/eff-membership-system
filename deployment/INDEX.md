# Deployment Documentation Index
## EFF Membership Management System - Split Architecture

**Welcome to the EFF Membership Management System deployment documentation!**

This index will guide you to the right documentation based on your needs.

---

## 🎯 I Want To...

### Deploy the System for the First Time

**Start Here:** [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)

This comprehensive guide covers:
- Architecture overview
- Server requirements
- Complete step-by-step deployment instructions
- Security configuration
- SSL/HTTPS setup

**Then Use:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

Follow this checklist to ensure you don't miss any steps.

---

### Understand the Architecture

**Read:** [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Section 2

**Quick Summary:**
- **Backend Server:** Node.js API, PostgreSQL, Redis, pgAdmin
- **Frontend Server:** React app, Nginx, SSL
- **Communication:** Frontend → Backend API (HTTPS)
- **Security:** Firewall, SSL/TLS, CORS, JWT

---

### Setup the Backend Server

**Scripts:**
1. [backend-server-setup.sh](./backend-server-setup.sh) - Automated setup
2. [configure-backend-firewall.sh](./configure-backend-firewall.sh) - Firewall configuration

**Configuration:**
- [backend.env.production](./backend.env.production) - Environment template
- [ecosystem.config.js](./ecosystem.config.js) - PM2 configuration

**Documentation:**
- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Section 5

---

### Setup the Frontend Server

**Scripts:**
1. [frontend-server-setup.sh](./frontend-server-setup.sh) - Automated setup
2. [configure-frontend-firewall.sh](./configure-frontend-firewall.sh) - Firewall configuration

**Configuration:**
- [frontend.env.production](./frontend.env.production) - Environment template
- [nginx-frontend.conf](./nginx-frontend.conf) - Nginx configuration

**Documentation:**
- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Section 6

---

### Configure Monitoring

**Read:** [MONITORING_SETUP.md](./MONITORING_SETUP.md)

This guide covers:
- Health check scripts
- PM2 monitoring
- Log management
- System monitoring
- Database monitoring
- Alerting setup

---

### Setup Backups

**Read:** [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md)

This guide covers:
- Backup strategy
- Database backups
- File system backups
- Automated backup setup
- Recovery procedures
- Disaster recovery

---

### Troubleshoot Issues

**Read:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

This guide covers:
- Backend server issues
- Frontend server issues
- Database issues
- Network connectivity issues
- Performance issues
- Common error messages

**Quick Troubleshooting:**
```bash
# Backend health check
/opt/eff-membership/health-check-backend.sh

# Frontend health check
/opt/eff-membership/health-check-frontend.sh

# Check PM2 processes
pm2 status
pm2 logs

# Check Docker containers
docker ps
docker logs <container-name>

# Check Nginx
sudo systemctl status nginx
sudo nginx -t
```

---

### Update the Application

**Backend Update:**
```bash
cd /opt/eff-membership
git pull origin main
cd backend
npm ci --production
npm run build
pm2 restart eff-api
```

**Frontend Update:**
```bash
cd /opt/eff-membership
git pull origin main
cd frontend
npm ci
npm run build
# Nginx will serve the new build automatically
```

**See:** [README.md](./README.md) - Update & Maintenance section

---

### Understand Security

**Read:** [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Section 7

**Key Security Features:**
- UFW firewall on both servers
- SSL/TLS encryption
- CORS configuration
- JWT authentication
- fail2ban for SSH protection
- Rate limiting
- Security headers

**See Also:** [README.md](./README.md) - Security Best Practices section

---

## 📚 Complete Documentation List

### Getting Started
1. **[INDEX.md](./INDEX.md)** ← You are here
2. **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** - Quick overview
3. **[README.md](./README.md)** - Deployment directory overview

### Main Guides
4. **[PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)** - Complete deployment guide
5. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist

### Operations
6. **[MONITORING_SETUP.md](./MONITORING_SETUP.md)** - Monitoring and health checks
7. **[BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md)** - Backup and recovery
8. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Troubleshooting guide

---

## 🛠️ Complete Scripts List

### Setup Scripts
1. **[backend-server-setup.sh](./backend-server-setup.sh)** - Backend server setup
2. **[frontend-server-setup.sh](./frontend-server-setup.sh)** - Frontend server setup
3. **[make-scripts-executable.sh](./make-scripts-executable.sh)** - Make scripts executable

### Firewall Scripts
4. **[configure-backend-firewall.sh](./configure-backend-firewall.sh)** - Backend firewall
5. **[configure-frontend-firewall.sh](./configure-frontend-firewall.sh)** - Frontend firewall

### Legacy Scripts
6. **[ubuntu-setup.sh](./ubuntu-setup.sh)** - Legacy single-server setup
7. **[verify-deployment.sh](./verify-deployment.sh)** - Deployment verification

---

## ⚙️ Complete Configuration List

### Environment Files
1. **[backend.env.production](./backend.env.production)** - Backend environment template
2. **[frontend.env.production](./frontend.env.production)** - Frontend environment template

### Service Configuration
3. **[nginx-frontend.conf](./nginx-frontend.conf)** - Nginx configuration
4. **[ecosystem.config.js](./ecosystem.config.js)** - PM2 configuration

---

## 🚀 Quick Start Path

**For first-time deployment, follow this path:**

1. **Read:** [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) (5 min)
   - Get overview of what's included
   - Understand the architecture
   - See quick deployment steps

2. **Read:** [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) (20 min)
   - Understand requirements
   - Learn detailed deployment steps
   - Review security considerations

3. **Follow:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) (2 hours)
   - Execute deployment step-by-step
   - Check off each item
   - Verify everything works

4. **Setup:** [MONITORING_SETUP.md](./MONITORING_SETUP.md) (30 min)
   - Configure health checks
   - Setup log monitoring
   - Configure alerts

5. **Setup:** [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md) (30 min)
   - Configure automated backups
   - Test restore procedures
   - Schedule backup jobs

6. **Bookmark:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
   - Keep handy for issues
   - Review common problems
   - Learn diagnostic commands

**Total Time:** ~3.5 hours

---

## 📞 Getting Help

### Documentation
All documentation is in the `deployment/` directory. Start with:
1. This index (INDEX.md)
2. Deployment summary (DEPLOYMENT_SUMMARY.md)
3. Main deployment guide (PRODUCTION_DEPLOYMENT_GUIDE.md)

### Troubleshooting
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review logs on both servers
3. Run health check scripts
4. Check system resources

### Support
Contact system administrator with:
- Error messages
- Log excerpts
- Steps to reproduce
- Server specifications

---

## 📋 Pre-Deployment Checklist

Before you start, ensure you have:

- [ ] Two Ubuntu 22.04 LTS servers (backend and frontend)
- [ ] SSH access to both servers with sudo privileges
- [ ] Domain name with DNS configured
- [ ] All API keys and credentials:
  - [ ] Database passwords
  - [ ] JWT secret
  - [ ] Email/SMTP credentials
  - [ ] SMS provider credentials
  - [ ] IEC API credentials
  - [ ] Payment gateway credentials
- [ ] Current database backup
- [ ] 2-3 hours for deployment
- [ ] Read the main deployment guide

---

## 🎯 Success Criteria

Your deployment is successful when:

- [ ] Both servers are accessible
- [ ] All services are running
- [ ] Frontend loads in browser (HTTPS)
- [ ] Users can login
- [ ] API calls work
- [ ] Database queries execute
- [ ] SSL certificate is valid
- [ ] Backups are scheduled
- [ ] Health checks pass
- [ ] No critical errors in logs

---

## 📅 Version Information

**Documentation Version:** 2.0  
**Last Updated:** 2025-10-24  
**Target OS:** Ubuntu 22.04 LTS  
**Architecture:** Split (Backend + Frontend Servers)

---

## 🔗 External Resources

- **Ubuntu Documentation:** https://ubuntu.com/server/docs
- **Docker Documentation:** https://docs.docker.com/
- **Nginx Documentation:** https://nginx.org/en/docs/
- **PM2 Documentation:** https://pm2.keymetrics.io/docs/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Let's Encrypt:** https://letsencrypt.org/getting-started/

---

**Need help? Start with [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) for a quick overview!**

---

**End of Index**

