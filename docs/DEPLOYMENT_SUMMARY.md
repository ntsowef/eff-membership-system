# Deployment Summary
## Installing Docker with Database and Data on Ubuntu Server

---

## 📖 Overview

This guide helps you migrate your EFF Membership Management System from Windows to an Ubuntu server using Docker, including all your PostgreSQL database data.

---

## 🎯 What You'll Achieve

By following this guide, you will:

1. ✅ Install Docker on Ubuntu server
2. ✅ Transfer your application code
3. ✅ Migrate your PostgreSQL database with all data
4. ✅ Deploy the complete system with Docker Compose
5. ✅ Configure production settings
6. ✅ Setup automated backups
7. ✅ Secure your deployment

---

## 📚 Documentation Structure

### Main Guides

1. **[UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md](./UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md)** (300+ lines)
   - Complete step-by-step deployment guide
   - Detailed explanations for each step
   - Troubleshooting section
   - Production configuration
   - Security checklist

2. **[QUICK_DEPLOYMENT_REFERENCE.md](./QUICK_DEPLOYMENT_REFERENCE.md)** (200+ lines)
   - Quick reference for experienced users
   - Essential commands
   - Common operations
   - Quick troubleshooting

3. **[deployment/README.md](../deployment/README.md)** (150+ lines)
   - Script documentation
   - Usage instructions
   - Configuration details

---

## 🛠️ Available Tools

### Automated Scripts

1. **`deployment/ubuntu-setup.sh`** (Linux)
   - Automates Ubuntu server setup
   - Installs all required software
   - Configures security settings
   - **Run this first on your Ubuntu server**

2. **`deployment/windows-backup.ps1`** (Windows PowerShell)
   - Creates database backup on Windows
   - Exports in multiple formats
   - Verifies backup integrity
   - **Run this on your Windows machine**

3. **`deployment/verify-deployment.sh`** (Linux)
   - Verifies deployment health
   - Checks all services
   - Validates configuration
   - **Run this after deployment**

4. **`backup-scripts/backup.sh`** (Linux)
   - Automated backup script
   - For scheduled backups on Ubuntu
   - Includes retention policy

5. **`backup-scripts/restore.sh`** (Linux)
   - Database restoration script
   - Interactive and safe
   - Includes verification

---

## 🚀 Quick Start (30 Minutes)

### Phase 1: Backup on Windows (5 min)

```powershell
cd C:\Development\NewProj\Membership-new
.\deployment\windows-backup.ps1
```

**Output**: Database backup in `.\migration-backup\`

### Phase 2: Setup Ubuntu Server (10 min)

```bash
ssh username@your-server-ip
wget https://raw.githubusercontent.com/ntsowef/eff-membership-system/main/deployment/ubuntu-setup.sh
chmod +x ubuntu-setup.sh
./ubuntu-setup.sh
```

**Output**: Fully configured Ubuntu server with Docker

### Phase 3: Transfer Files (5 min)

```powershell
# From Windows
scp .\migration-backup\eff_membership_backup_*.dump username@server-ip:/opt/eff-membership/
```

```bash
# On Ubuntu
cd /opt/eff-membership
git clone https://github.com/ntsowef/eff-membership-system.git .
```

### Phase 4: Deploy (5 min)

```bash
cd /opt/eff-membership
cp .env.postgres .env
nano .env  # Update passwords
docker network create membership-network
docker compose -f docker-compose.postgres.yml up -d
```

### Phase 5: Restore Database (5 min)

```bash
./backup-scripts/restore.sh eff_membership_backup_*.dump
./deployment/verify-deployment.sh
```

**Done!** Your system is now running on Ubuntu with Docker.

---

## 📋 Step-by-Step Process

### Step 1: Prepare Windows Machine

**What**: Create a backup of your current database

**How**:
```powershell
.\deployment\windows-backup.ps1
```

**Result**: 
- `eff_membership_backup_YYYYMMDD_HHMMSS.dump` (compressed)
- `eff_membership_backup_YYYYMMDD_HHMMSS.sql` (plain text)

**Time**: 2-5 minutes

---

### Step 2: Prepare Ubuntu Server

**What**: Install Docker and all required software

**How**:
```bash
./ubuntu-setup.sh
```

**What it installs**:
- Docker Engine & Docker Compose
- Node.js 18.x & NPM
- PM2 process manager
- Nginx web server
- Certbot for SSL
- fail2ban for security

**Result**: Ready-to-use Ubuntu server

**Time**: 10 minutes

---

### Step 3: Transfer Files

**What**: Move your application and database backup to Ubuntu

**Methods**:

**Option A: Git (Recommended)**
```bash
cd /opt/eff-membership
git clone https://github.com/ntsowef/eff-membership-system.git .
```

**Option B: SCP**
```powershell
scp -r .\backend username@server-ip:/opt/eff-membership/
scp -r .\frontend username@server-ip:/opt/eff-membership/
```

**Option C: SFTP**
- Use FileZilla or WinSCP
- Upload to `/opt/eff-membership/`

**Always transfer backup**:
```powershell
scp .\migration-backup\*.dump username@server-ip:/opt/eff-membership/
```

**Time**: 5-15 minutes (depends on connection speed)

---

### Step 4: Configure Environment

**What**: Setup production configuration

**How**:
```bash
cd /opt/eff-membership
cp .env.postgres .env
nano .env
```

**Critical settings to change**:
```bash
POSTGRES_PASSWORD=YourStrongPassword123!
DB_PASSWORD=YourStrongPassword123!
PGADMIN_DEFAULT_PASSWORD=YourStrongPassword123!
JWT_SECRET=your-random-32-char-secret-key
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

**Time**: 5 minutes

---

### Step 5: Deploy with Docker

**What**: Start all Docker services

**How**:
```bash
docker network create membership-network
docker compose -f docker-compose.postgres.yml up -d
```

**Services started**:
- PostgreSQL database (port 5432)
- pgAdmin web interface (port 5050)
- Redis cache (port 6379)

**Verify**:
```bash
docker compose -f docker-compose.postgres.yml ps
```

**Time**: 2 minutes

---

### Step 6: Restore Database

**What**: Import your data into PostgreSQL

**How**:
```bash
chmod +x backup-scripts/restore.sh
./backup-scripts/restore.sh eff_membership_backup_*.dump
```

**What happens**:
1. Copies backup to container
2. Terminates existing connections
3. Restores all tables and data
4. Verifies restoration
5. Shows statistics

**Time**: 3-10 minutes (depends on database size)

---

### Step 7: Deploy Applications

**Backend**:
```bash
cd /opt/eff-membership/backend
npm ci --production
npm run build
pm2 start dist/app.js --name eff-api
pm2 save
```

**Frontend**:
```bash
cd /opt/eff-membership/frontend
npm ci --production
npm run build
pm2 serve build 3000 --name eff-frontend --spa
pm2 save
```

**Time**: 10 minutes

---

### Step 8: Verify Deployment

**What**: Check everything is working

**How**:
```bash
cd /opt/eff-membership
./deployment/verify-deployment.sh
```

**Checks**:
- ✓ Docker running
- ✓ Containers healthy
- ✓ Database accessible
- ✓ Data restored
- ✓ Redis working
- ✓ Applications running

**Time**: 1 minute

---

## 🔐 Security Setup

### Essential Security Steps

1. **Change all passwords** in `.env`
2. **Configure firewall**:
   ```bash
   sudo ufw enable
   sudo ufw allow 22,80,443/tcp
   ```
3. **Install SSL certificate**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```
4. **Restrict pgAdmin** (edit docker-compose.postgres.yml):
   ```yaml
   ports:
     - "127.0.0.1:5050:80"  # Only localhost
   ```
5. **Setup automated backups**:
   ```bash
   crontab -e
   # Add: 0 2 * * * /opt/eff-membership/backup-scripts/backup.sh
   ```

---

## 📊 What Gets Migrated

### Database (PostgreSQL)

✅ **All tables**:
- members
- provinces, districts, municipalities, wards
- voting_districts, voting_stations
- users, roles, permissions
- leadership_appointments
- sms_logs, email_logs
- All other tables

✅ **All data**:
- Member records
- Geographic data
- User accounts
- Leadership assignments
- Communication logs
- System settings

✅ **Database objects**:
- Views
- Stored procedures
- Functions
- Triggers
- Indexes
- Constraints

### Application Files

✅ **Backend**:
- Source code
- Configuration
- Dependencies

✅ **Frontend**:
- React application
- Assets
- Build configuration

✅ **Configuration**:
- Environment variables
- Docker compose files
- Database scripts

---

## 🎯 Access Your Deployment

After successful deployment:

### Direct Access (Development)
- Frontend: `http://your-server-ip:3000`
- Backend API: `http://your-server-ip:5000/api`
- pgAdmin: `http://your-server-ip:5050`
- PostgreSQL: `your-server-ip:5432`

### With Nginx (Production)
- Frontend: `https://your-domain.com`
- Backend API: `https://your-domain.com/api`
- pgAdmin: `https://your-domain.com/pgadmin`

---

## 🆘 Common Issues

### Issue: Docker permission denied
**Solution**:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Issue: Port already in use
**Solution**:
```bash
sudo lsof -i :5432
sudo kill -9 <PID>
```

### Issue: Database restore fails
**Solution**:
```bash
docker compose -f docker-compose.postgres.yml restart postgres
./backup-scripts/restore.sh your-backup.dump
```

### Issue: Out of disk space
**Solution**:
```bash
docker system prune -a --volumes
sudo apt autoremove
```

---

## 📞 Getting Help

### Documentation
1. **Full Guide**: [UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md](./UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md)
2. **Quick Reference**: [QUICK_DEPLOYMENT_REFERENCE.md](./QUICK_DEPLOYMENT_REFERENCE.md)
3. **Script Docs**: [deployment/README.md](../deployment/README.md)

### Logs
```bash
# Docker logs
docker compose -f docker-compose.postgres.yml logs -f

# Application logs
pm2 logs

# System logs
tail -f /opt/eff-membership/logs/app.log
```

### Health Check
```bash
./deployment/verify-deployment.sh
```

---

## ✅ Success Criteria

Your deployment is successful when:

- [ ] All Docker containers are running
- [ ] Database has all tables and data
- [ ] Backend API responds to requests
- [ ] Frontend loads in browser
- [ ] pgAdmin can connect to database
- [ ] Redis is responding
- [ ] No errors in logs
- [ ] verify-deployment.sh passes all checks

---

## 🎉 Next Steps

After successful deployment:

1. **Test thoroughly** - Verify all features work
2. **Setup monitoring** - Install Prometheus/Grafana
3. **Configure backups** - Schedule automated backups
4. **Setup CI/CD** - Automate deployments
5. **Document** - Record your server details
6. **Train team** - Share access and procedures

---

## 📝 Deployment Checklist

Print this and check off as you go:

- [ ] Read UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md
- [ ] Run windows-backup.ps1 on Windows
- [ ] Verify backup files created
- [ ] Connect to Ubuntu server via SSH
- [ ] Run ubuntu-setup.sh
- [ ] Log out and back in
- [ ] Transfer backup file to server
- [ ] Clone/transfer application files
- [ ] Configure .env file
- [ ] Create Docker network
- [ ] Start Docker services
- [ ] Restore database
- [ ] Deploy backend with PM2
- [ ] Deploy frontend with PM2
- [ ] Run verify-deployment.sh
- [ ] Configure Nginx
- [ ] Install SSL certificate
- [ ] Setup automated backups
- [ ] Test all functionality
- [ ] Update documentation

---

**Estimated Total Time**: 30-60 minutes  
**Difficulty**: Intermediate  
**Prerequisites**: Basic Linux and Docker knowledge

---

**Good luck with your deployment! 🚀**

