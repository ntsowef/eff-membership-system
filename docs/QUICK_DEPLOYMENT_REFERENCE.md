# Quick Deployment Reference
## EFF Membership System - Ubuntu Server with Docker

This is a condensed quick-reference guide. For detailed instructions, see [UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md](./UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md)

---

## 🚀 Quick Start (5 Steps)

### Step 1: Prepare Windows Machine (5 minutes)

```powershell
# Navigate to project directory
cd C:\Development\NewProj\Membership-new

# Run backup script
.\deployment\windows-backup.ps1

# Backup will be created in: .\migration-backup\
```

### Step 2: Setup Ubuntu Server (10 minutes)

```bash
# Connect to Ubuntu server
ssh username@your-server-ip

# Download and run setup script
wget https://raw.githubusercontent.com/ntsowef/eff-membership-system/main/deployment/ubuntu-setup.sh
chmod +x ubuntu-setup.sh
./ubuntu-setup.sh

# Log out and back in (for Docker group changes)
exit
ssh username@your-server-ip
```

### Step 3: Transfer Files (5 minutes)

```powershell
# From Windows PowerShell
# Transfer backup
scp .\migration-backup\eff_membership_backup_*.dump username@server-ip:/opt/eff-membership/

# Transfer via Git (recommended)
# On Ubuntu server:
cd /opt/eff-membership
git clone https://github.com/ntsowef/eff-membership-system.git .
```

### Step 4: Deploy with Docker (5 minutes)

```bash
# On Ubuntu server
cd /opt/eff-membership

# Copy and configure environment
cp .env.postgres .env
nano .env  # Update passwords and settings

# Create Docker network
docker network create membership-network

# Start services
docker compose -f docker-compose.postgres.yml up -d

# Check status
docker compose -f docker-compose.postgres.yml ps
```

### Step 5: Restore Database (5 minutes)

```bash
# Wait for PostgreSQL to initialize (30 seconds)
docker compose -f docker-compose.postgres.yml logs -f postgres

# Restore database
./backup-scripts/restore.sh eff_membership_backup_*.dump

# Verify
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT COUNT(*) FROM members;"
```

---

## 📋 Essential Commands

### Docker Management

```bash
# Start all services
docker compose -f docker-compose.postgres.yml up -d

# Stop all services
docker compose -f docker-compose.postgres.yml down

# View logs
docker compose -f docker-compose.postgres.yml logs -f

# Restart a service
docker compose -f docker-compose.postgres.yml restart postgres

# Check status
docker compose -f docker-compose.postgres.yml ps
```

### Database Operations

```bash
# Connect to database
docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db

# Create backup
./backup-scripts/backup.sh

# Restore backup
./backup-scripts/restore.sh /path/to/backup.dump

# View database size
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT pg_size_pretty(pg_database_size('eff_membership_db'));"
```

### Application Management

```bash
# Backend
cd /opt/eff-membership/backend
npm ci --production
npm run build
pm2 start dist/app.js --name eff-api
pm2 logs eff-api

# Frontend
cd /opt/eff-membership/frontend
npm ci --production
npm run build
pm2 serve build 3000 --name eff-frontend --spa
pm2 logs eff-frontend

# PM2 commands
pm2 list
pm2 restart all
pm2 stop all
pm2 save
```

### System Monitoring

```bash
# Docker resource usage
docker stats

# Disk usage
df -h
docker system df

# View logs
tail -f /opt/eff-membership/logs/app.log
docker logs -f eff-membership-postgres

# System resources
htop
```

---

## 🔧 Configuration Files

### Critical Files to Update

1. **`.env`** - Main configuration
   - Update all passwords
   - Set `NODE_ENV=production`
   - Configure CORS_ORIGIN
   - Set JWT_SECRET

2. **`docker-compose.postgres.yml`** - Docker services
   - Usually no changes needed

3. **Nginx config** - `/etc/nginx/sites-available/eff-membership`
   - Update domain name
   - Configure SSL

---

## 🔐 Security Checklist

```bash
# Change default passwords
nano .env  # Update POSTGRES_PASSWORD, PGADMIN_DEFAULT_PASSWORD, JWT_SECRET

# Configure firewall
sudo ufw status
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Setup SSL certificate
sudo certbot --nginx -d your-domain.com

# Restrict pgAdmin access (optional)
# Edit docker-compose.postgres.yml to bind pgAdmin to localhost only
# ports:
#   - "127.0.0.1:5050:80"

# Setup automated backups
crontab -e
# Add: 0 2 * * * /opt/eff-membership/backup-scripts/backup.sh
```

---

## 🌐 Access Points

After deployment, access your services at:

- **Frontend**: http://your-server-ip:3000
- **Backend API**: http://your-server-ip:5000/api
- **pgAdmin**: http://your-server-ip:5050
- **PostgreSQL**: your-server-ip:5432

With Nginx configured:
- **Frontend**: https://your-domain.com
- **Backend API**: https://your-domain.com/api
- **pgAdmin**: https://your-domain.com/pgadmin

---

## 🆘 Troubleshooting Quick Fixes

### Container won't start
```bash
docker compose -f docker-compose.postgres.yml logs postgres
docker compose -f docker-compose.postgres.yml down
docker compose -f docker-compose.postgres.yml up -d
```

### Database connection refused
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs eff-membership-postgres

# Restart container
docker restart eff-membership-postgres
```

### Out of disk space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Remove old logs
sudo find /var/log -type f -name "*.log" -mtime +30 -delete
```

### Port already in use
```bash
# Find process using port
sudo lsof -i :5432

# Kill process
sudo kill -9 <PID>

# Or change port in .env
```

### Permission denied
```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/eff-membership

# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

---

## 📊 Health Checks

```bash
# Quick health check script
cat > /opt/eff-membership/health-check.sh << 'EOF'
#!/bin/bash
echo "=== EFF Membership System Health Check ==="
echo ""
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Database Connection:"
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT version();" | head -n 3
echo ""
echo "Member Count:"
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -t -c "SELECT COUNT(*) FROM members;"
echo ""
echo "Disk Usage:"
df -h /opt/eff-membership
echo ""
echo "Memory Usage:"
free -h
EOF

chmod +x /opt/eff-membership/health-check.sh
./health-check.sh
```

---

## 🔄 Update Procedure

```bash
# Pull latest changes
cd /opt/eff-membership
git pull origin main

# Update backend
cd backend
npm ci --production
npm run build
pm2 restart eff-api

# Update frontend
cd ../frontend
npm ci --production
npm run build
pm2 restart eff-frontend

# Run database migrations (if any)
cd ../backend
npm run migrate
```

---

## 📞 Support Resources

- **Full Guide**: [UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md](./UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md)
- **Docker Docs**: https://docs.docker.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **PM2 Docs**: https://pm2.keymetrics.io/docs/

---

## 📝 Deployment Checklist

- [ ] Ubuntu server prepared and updated
- [ ] Docker and Docker Compose installed
- [ ] Application files transferred
- [ ] `.env` file configured with production values
- [ ] Docker network created
- [ ] Services started with Docker Compose
- [ ] Database backup restored
- [ ] Database verified (table count, member count)
- [ ] Backend application deployed with PM2
- [ ] Frontend application deployed with PM2
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Automated backups scheduled
- [ ] Health checks passing
- [ ] All passwords changed from defaults
- [ ] Documentation updated with server details

---

**Last Updated**: 2025-10-12  
**Version**: 1.0

