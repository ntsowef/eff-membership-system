# Backup & Recovery Guide
## EFF Membership Management System - Split Architecture

**Version:** 1.0  
**Last Updated:** 2025-10-24

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Database Backups](#database-backups)
4. [File System Backups](#file-system-backups)
5. [Automated Backup Setup](#automated-backup-setup)
6. [Recovery Procedures](#recovery-procedures)
7. [Disaster Recovery](#disaster-recovery)
8. [Backup Verification](#backup-verification)

---

## 🔍 Overview

This guide covers backup and recovery procedures for the EFF Membership Management System deployed in a split architecture (separate backend and frontend servers).

### What to Backup

**Backend Server:**
- PostgreSQL database
- Redis data (optional)
- Uploaded files (documents, images)
- Configuration files (.env)
- SSL certificates
- Application code

**Frontend Server:**
- Nginx configuration
- SSL certificates
- Built application files (optional - can rebuild)

---

## 📊 Backup Strategy

### Backup Schedule

**Daily Backups:**
- PostgreSQL database (full backup)
- Uploaded files (incremental)

**Weekly Backups:**
- Full system backup
- Configuration files
- SSL certificates

**Monthly Backups:**
- Archive to off-site storage
- Long-term retention

### Retention Policy

- **Daily backups:** Keep for 7 days
- **Weekly backups:** Keep for 4 weeks
- **Monthly backups:** Keep for 12 months
- **Critical backups:** Keep indefinitely

---

## 🗄️ Database Backups

### Manual Database Backup

**Using pg_dump (recommended):**
```bash
# Connect to backend server
ssh username@backend-server-ip

# Create backup directory
mkdir -p /opt/eff-membership/backups/database

# Backup in custom format (compressed)
docker exec eff-membership-postgres pg_dump \
  -U eff_admin \
  -d eff_membership_db \
  -F c \
  -f /tmp/backup.dump

# Copy from container to host
docker cp eff-membership-postgres:/tmp/backup.dump \
  /opt/eff-membership/backups/database/eff_membership_$(date +%Y%m%d_%H%M%S).dump

# Backup in SQL format (plain text)
docker exec eff-membership-postgres pg_dump \
  -U eff_admin \
  -d eff_membership_db \
  -F p \
  -f /tmp/backup.sql

docker cp eff-membership-postgres:/tmp/backup.sql \
  /opt/eff-membership/backups/database/eff_membership_$(date +%Y%m%d_%H%M%S).sql
```

**Using the backup script:**
```bash
cd /opt/eff-membership
./backup-scripts/backup.sh
```

### Automated Database Backup

**Create backup script:**
```bash
cat > /opt/eff-membership/backup-scripts/auto-backup.sh <<'EOF'
#!/bin/bash
# Automated Database Backup Script

BACKUP_DIR="/opt/eff-membership/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="eff_membership_${TIMESTAMP}.dump"
LOG_FILE="/opt/eff-membership/logs/backup.log"
RETENTION_DAYS=7

echo "=== Backup started at $(date) ===" >> $LOG_FILE

# Create backup
docker exec eff-membership-postgres pg_dump \
  -U eff_admin \
  -d eff_membership_db \
  -F c \
  -f /tmp/${BACKUP_FILE}

# Copy to host
docker cp eff-membership-postgres:/tmp/${BACKUP_FILE} ${BACKUP_DIR}/${BACKUP_FILE}

# Verify backup
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "Backup successful: ${BACKUP_FILE} (${SIZE})" >> $LOG_FILE
    
    # Remove old backups
    find ${BACKUP_DIR} -name "eff_membership_*.dump" -mtime +${RETENTION_DAYS} -delete
    echo "Old backups removed (older than ${RETENTION_DAYS} days)" >> $LOG_FILE
else
    echo "Backup failed!" >> $LOG_FILE
    exit 1
fi

echo "=== Backup completed at $(date) ===" >> $LOG_FILE
echo "" >> $LOG_FILE
EOF

chmod +x /opt/eff-membership/backup-scripts/auto-backup.sh
```

**Schedule with cron (daily at 2 AM):**
```bash
crontab -e

# Add this line:
0 2 * * * /opt/eff-membership/backup-scripts/auto-backup.sh
```

### Database Backup to Remote Server

**Using rsync:**
```bash
# Install rsync
sudo apt install rsync -y

# Create sync script
cat > /opt/eff-membership/backup-scripts/sync-to-remote.sh <<'EOF'
#!/bin/bash
# Sync backups to remote server

BACKUP_DIR="/opt/eff-membership/backups"
REMOTE_USER="backup-user"
REMOTE_HOST="backup-server-ip"
REMOTE_DIR="/backups/eff-membership"
LOG_FILE="/opt/eff-membership/logs/backup-sync.log"

echo "=== Sync started at $(date) ===" >> $LOG_FILE

rsync -avz --delete \
  -e "ssh -i /home/user/.ssh/backup_key" \
  ${BACKUP_DIR}/ \
  ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

if [ $? -eq 0 ]; then
    echo "Sync successful" >> $LOG_FILE
else
    echo "Sync failed!" >> $LOG_FILE
fi

echo "=== Sync completed at $(date) ===" >> $LOG_FILE
echo "" >> $LOG_FILE
EOF

chmod +x /opt/eff-membership/backup-scripts/sync-to-remote.sh
```

**Schedule with cron (daily at 3 AM):**
```bash
crontab -e

# Add this line:
0 3 * * * /opt/eff-membership/backup-scripts/sync-to-remote.sh
```

---

## 📁 File System Backups

### Uploaded Files Backup

**Manual backup:**
```bash
# Create backup of uploads directory
cd /opt/eff-membership
tar -czf backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# Verify backup
tar -tzf backups/uploads_*.tar.gz | head -20
```

**Automated backup script:**
```bash
cat > /opt/eff-membership/backup-scripts/backup-files.sh <<'EOF'
#!/bin/bash
# Backup uploaded files

BACKUP_DIR="/opt/eff-membership/backups/files"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/eff-membership/logs/file-backup.log"
RETENTION_DAYS=30

mkdir -p ${BACKUP_DIR}

echo "=== File backup started at $(date) ===" >> $LOG_FILE

# Backup uploads directory
tar -czf ${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz \
  -C /opt/eff-membership uploads/

if [ $? -eq 0 ]; then
    SIZE=$(du -h "${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz" | cut -f1)
    echo "File backup successful: uploads_${TIMESTAMP}.tar.gz (${SIZE})" >> $LOG_FILE
    
    # Remove old backups
    find ${BACKUP_DIR} -name "uploads_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
else
    echo "File backup failed!" >> $LOG_FILE
fi

echo "=== File backup completed at $(date) ===" >> $LOG_FILE
echo "" >> $LOG_FILE
EOF

chmod +x /opt/eff-membership/backup-scripts/backup-files.sh
```

### Configuration Files Backup

**Backup important configuration files:**
```bash
cat > /opt/eff-membership/backup-scripts/backup-config.sh <<'EOF'
#!/bin/bash
# Backup configuration files

BACKUP_DIR="/opt/eff-membership/backups/config"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONFIG_BACKUP="${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz"

mkdir -p ${BACKUP_DIR}

# Create backup
tar -czf ${CONFIG_BACKUP} \
  /opt/eff-membership/backend/.env \
  /opt/eff-membership/frontend/.env.production \
  /opt/eff-membership/docker-compose.postgres.yml \
  /opt/eff-membership/nginx-config/ \
  /etc/nginx/sites-available/eff-membership \
  /opt/eff-membership/deployment/ecosystem.config.js \
  2>/dev/null

echo "Configuration backup created: ${CONFIG_BACKUP}"

# Keep only last 10 config backups
ls -t ${BACKUP_DIR}/config_*.tar.gz | tail -n +11 | xargs rm -f 2>/dev/null
EOF

chmod +x /opt/eff-membership/backup-scripts/backup-config.sh
```

---

## ⚙️ Automated Backup Setup

### Complete Backup Script

**Create comprehensive backup script:**
```bash
cat > /opt/eff-membership/backup-scripts/full-backup.sh <<'EOF'
#!/bin/bash
# Complete system backup script

BACKUP_BASE="/opt/eff-membership/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/eff-membership/logs/full-backup.log"

echo "========================================" >> $LOG_FILE
echo "Full backup started at $(date)" >> $LOG_FILE
echo "========================================" >> $LOG_FILE

# 1. Database backup
echo "Backing up database..." >> $LOG_FILE
/opt/eff-membership/backup-scripts/auto-backup.sh >> $LOG_FILE 2>&1

# 2. Files backup
echo "Backing up files..." >> $LOG_FILE
/opt/eff-membership/backup-scripts/backup-files.sh >> $LOG_FILE 2>&1

# 3. Configuration backup
echo "Backing up configuration..." >> $LOG_FILE
/opt/eff-membership/backup-scripts/backup-config.sh >> $LOG_FILE 2>&1

# 4. Create backup manifest
MANIFEST="${BACKUP_BASE}/manifest_${TIMESTAMP}.txt"
cat > ${MANIFEST} <<MANIFEST_EOF
EFF Membership System Backup Manifest
Generated: $(date)
Hostname: $(hostname)
Server Type: Backend

Database Backup:
$(ls -lh ${BACKUP_BASE}/database/eff_membership_*.dump 2>/dev/null | tail -1)

Files Backup:
$(ls -lh ${BACKUP_BASE}/files/uploads_*.tar.gz 2>/dev/null | tail -1)

Configuration Backup:
$(ls -lh ${BACKUP_BASE}/config/config_*.tar.gz 2>/dev/null | tail -1)

Disk Usage:
$(df -h /opt/eff-membership)

Total Backup Size:
$(du -sh ${BACKUP_BASE})
MANIFEST_EOF

echo "Backup manifest created: ${MANIFEST}" >> $LOG_FILE

# 5. Sync to remote (if configured)
if [ -f "/opt/eff-membership/backup-scripts/sync-to-remote.sh" ]; then
    echo "Syncing to remote server..." >> $LOG_FILE
    /opt/eff-membership/backup-scripts/sync-to-remote.sh >> $LOG_FILE 2>&1
fi

echo "========================================" >> $LOG_FILE
echo "Full backup completed at $(date)" >> $LOG_FILE
echo "========================================" >> $LOG_FILE
echo "" >> $LOG_FILE
EOF

chmod +x /opt/eff-membership/backup-scripts/full-backup.sh
```

**Schedule full backup (weekly on Sunday at 1 AM):**
```bash
crontab -e

# Add this line:
0 1 * * 0 /opt/eff-membership/backup-scripts/full-backup.sh
```

---

## 🔄 Recovery Procedures

### Database Recovery

**Restore from backup:**
```bash
# Connect to backend server
ssh username@backend-server-ip

# Stop the API (optional but recommended)
pm2 stop eff-api

# Restore database
cd /opt/eff-membership
./backup-scripts/restore.sh backups/database/eff_membership_YYYYMMDD_HHMMSS.dump

# Or manually:
docker exec -i eff-membership-postgres pg_restore \
  -U eff_admin \
  -d eff_membership_db \
  -c \
  -v \
  /tmp/backup.dump

# Restart API
pm2 start eff-api
```

### Files Recovery

**Restore uploaded files:**
```bash
# Extract backup
cd /opt/eff-membership
tar -xzf backups/files/uploads_YYYYMMDD_HHMMSS.tar.gz

# Verify
ls -lh uploads/
```

### Configuration Recovery

**Restore configuration files:**
```bash
# Extract backup
cd /
sudo tar -xzf /opt/eff-membership/backups/config/config_YYYYMMDD_HHMMSS.tar.gz

# Restart services
pm2 restart all
sudo systemctl reload nginx
docker compose -f /opt/eff-membership/docker-compose.postgres.yml restart
```

---

## 🚨 Disaster Recovery

### Complete Server Recovery

**Backend Server Recovery:**

1. **Setup new server:**
   ```bash
   ./deployment/backend-server-setup.sh
   ```

2. **Transfer backups:**
   ```bash
   scp -r backups/ username@new-backend-server:/opt/eff-membership/
   ```

3. **Restore database:**
   ```bash
   cd /opt/eff-membership
   docker compose -f docker-compose.postgres.yml up -d
   ./backup-scripts/restore.sh backups/database/latest.dump
   ```

4. **Restore files and configuration:**
   ```bash
   tar -xzf backups/files/uploads_latest.tar.gz
   tar -xzf backups/config/config_latest.tar.gz
   ```

5. **Deploy application:**
   ```bash
   cd backend
   npm ci --production
   npm run build
   pm2 start ecosystem.config.js --env production
   ```

**Frontend Server Recovery:**

1. **Setup new server:**
   ```bash
   ./deployment/frontend-server-setup.sh
   ```

2. **Deploy application:**
   ```bash
   cd frontend
   npm ci
   npm run build
   ```

3. **Configure Nginx:**
   ```bash
   sudo cp nginx-config/eff-membership.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/eff-membership.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Setup SSL:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

---

## ✅ Backup Verification

### Verify Database Backup

```bash
# Test restore to temporary database
docker exec eff-membership-postgres createdb -U eff_admin test_restore
docker exec eff-membership-postgres pg_restore \
  -U eff_admin \
  -d test_restore \
  /tmp/backup.dump

# Check tables
docker exec eff-membership-postgres psql -U eff_admin -d test_restore -c "\dt"

# Drop test database
docker exec eff-membership-postgres dropdb -U eff_admin test_restore
```

### Verify File Backup

```bash
# List contents without extracting
tar -tzf backups/files/uploads_latest.tar.gz | head -20

# Verify integrity
tar -tzf backups/files/uploads_latest.tar.gz > /dev/null && echo "OK" || echo "CORRUPTED"
```

### Backup Monitoring Script

```bash
cat > /opt/eff-membership/backup-scripts/verify-backups.sh <<'EOF'
#!/bin/bash
# Verify backups exist and are recent

BACKUP_DIR="/opt/eff-membership/backups"
MAX_AGE_HOURS=48
ALERT_EMAIL="admin@your-domain.com"

# Check database backup
DB_BACKUP=$(find ${BACKUP_DIR}/database -name "*.dump" -mtime -2 | head -1)
if [ -z "$DB_BACKUP" ]; then
    echo "WARNING: No recent database backup found!" | mail -s "Backup Alert" $ALERT_EMAIL
fi

# Check files backup
FILES_BACKUP=$(find ${BACKUP_DIR}/files -name "*.tar.gz" -mtime -7 | head -1)
if [ -z "$FILES_BACKUP" ]; then
    echo "WARNING: No recent files backup found!" | mail -s "Backup Alert" $ALERT_EMAIL
fi

echo "Backup verification completed at $(date)"
EOF

chmod +x /opt/eff-membership/backup-scripts/verify-backups.sh
```

---

## 📞 Support

For backup and recovery issues:
1. Check backup logs: `/opt/eff-membership/logs/backup.log`
2. Verify backup files exist and are not corrupted
3. Test restore procedure in a test environment first
4. Contact system administrator for assistance

---

**End of Backup & Recovery Guide**

