# Docker Database Dump and Restore Guide

## 🐳 Overview

This guide is specifically for PostgreSQL databases running in Docker containers. The scripts handle all Docker-specific operations automatically.

## 📋 Prerequisites

### Local Machine
- ✅ Docker installed and running
- ✅ PostgreSQL container running (`eff-membership-postgres`)
- ✅ SSH client installed (for remote restore)

### Remote Server (69.164.245.173)
- ✅ Docker installed and running
- ✅ PostgreSQL container running (`eff-membership-postgres`)
- ✅ SSH access configured

## 🚀 Quick Start

### Step 1: Verify Local Container is Running

```powershell
# Windows
docker ps | Select-String "eff-membership-postgres"

# Linux/Mac
docker ps | grep eff-membership-postgres
```

If not running, start it:
```bash
docker-compose -f docker-compose.postgres.yml up -d
```

### Step 2: Run the Dump and Restore Script

**Windows:**
```powershell
.\backup-scripts\docker-dump-and-restore.ps1
```

**Linux/Mac:**
```bash
chmod +x backup-scripts/docker-dump-and-restore.sh
./backup-scripts/docker-dump-and-restore.sh
```

### Step 3: Provide SSH Credentials

When prompted:
1. Type `yes` to confirm
2. Enter SSH username for remote server
3. Enter SSH password when prompted (by SSH)

## 🎯 How It Works

### Dump Phase (Local)
1. **Checks** if local Docker container is running
2. **Executes** `pg_dump` inside the container
3. **Creates** compressed backup in `/tmp` inside container
4. **Copies** backup from container to host machine
5. **Saves** to `backups/postgres/eff_membership_YYYYMMDD_HHMMSS.sql`
6. **Cleans up** temporary files in container

### Restore Phase (Remote)
1. **Copies** dump file to remote server via SCP
2. **Copies** dump file into remote Docker container
3. **Executes** `pg_restore` inside remote container
4. **Cleans up** temporary files on remote server and container

## 📊 Expected Output

```
============================================================================
PostgreSQL Docker Database Dump and Restore Utility
============================================================================

✅ Loaded environment variables from .env

📦 Creating database dump from Docker container...
   Container: eff-membership-postgres
   Database: eff_membership_database
   Output: backups/postgres/eff_membership_20250111_143022.sql
   Creating dump inside container...
   Copying dump from container to host...
✅ Database dump created successfully!
   File: backups/postgres/eff_membership_20250111_143022.sql
   Size: 45.3 MB

📤 Preparing to restore database on remote Docker container...
   Remote Host: 69.164.245.173
   Remote Container: eff-membership-postgres
   Database: eff_membership_database
   Source: backups/postgres/eff_membership_20250111_143022.sql

⚠️  IMPORTANT: This will OVERWRITE the remote database!
   You will need SSH access to the remote server

Do you want to continue? (yes/no): yes
Enter SSH username for 69.164.245.173: root

🔄 Restoring database to remote server...
   1. Copying dump file to remote server...
   2. Copying dump into remote container...
   3. Restoring database in remote container...
   4. Cleaning up temporary files...
✅ Database restored successfully on remote server!

============================================================================
✅ Operation completed successfully!
============================================================================
```

## 🎛️ Advanced Usage

### Dump Only
```powershell
# Windows
.\backup-scripts\docker-dump-and-restore.ps1 -Action dump

# Linux/Mac
./backup-scripts/docker-dump-and-restore.sh dump
```

### Restore Only (using existing dump)
```powershell
# Windows
.\backup-scripts\docker-dump-and-restore.ps1 -Action restore -DumpFile "eff_membership_20250111_143022.sql"

# Linux/Mac
./backup-scripts/docker-dump-and-restore.sh restore eff_membership_20250111_143022.sql
```

### Custom Container Names

Edit the scripts and update these variables:
```bash
LOCAL_CONTAINER="your-local-container-name"
REMOTE_CONTAINER="your-remote-container-name"
```

## 🔍 Verification

### Verify Local Dump
```bash
# Check dump file exists
ls -lh backups/postgres/

# Verify dump file integrity
docker exec eff-membership-postgres pg_restore --list backups/postgres/eff_membership_20250111_143022.sql
```

### Verify Remote Restore
```bash
# SSH into remote server
ssh user@69.164.245.173

# Check container is running
docker ps | grep eff-membership-postgres

# Connect to database
docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_database

# Check table counts
SELECT COUNT(*) FROM members;
SELECT COUNT(*) FROM membership_applications;
```

## 🛠️ Troubleshooting

### Error: "Container is not running"
**Solution:**
```bash
# Start the container
docker-compose -f docker-compose.postgres.yml up -d

# Check status
docker ps
```

### Error: "Permission denied" during SCP
**Solution:**
- Verify SSH access: `ssh user@69.164.245.173`
- Check SSH key is configured
- Ensure user has write permissions to `/tmp`

### Error: "docker: command not found"
**Solution:**
- Install Docker Desktop (Windows/Mac)
- Or install Docker Engine (Linux)
- Ensure Docker is in PATH

### Error: "Cannot connect to Docker daemon"
**Solution:**
```bash
# Windows/Mac: Start Docker Desktop

# Linux: Start Docker service
sudo systemctl start docker
```

## 🔐 Security Best Practices

### SSH Key Authentication (Recommended)
Instead of password authentication, use SSH keys:

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t rsa -b 4096

# Copy public key to remote server
ssh-copy-id user@69.164.245.173

# Test connection (should not ask for password)
ssh user@69.164.245.173
```

### Encrypt Backups
For sensitive data:
```bash
# Encrypt backup
gpg -c backups/postgres/eff_membership_20250111_143022.sql

# Transfer encrypted file
scp backups/postgres/eff_membership_20250111_143022.sql.gpg user@69.164.245.173:/tmp/

# Decrypt on remote
ssh user@69.164.245.173 "gpg backups/postgres/eff_membership_20250111_143022.sql.gpg"
```

## 📈 Performance Tips

### For Large Databases

1. **Use compression** (already enabled with `-F c`)
2. **Increase Docker resources** (CPU/Memory in Docker Desktop settings)
3. **Use faster network** for remote transfer
4. **Consider parallel dump/restore:**
   ```bash
   # Inside container
   pg_dump -j 4 -F d -f /backup_dir ...
   pg_restore -j 4 ...
   ```

## 🔄 Automated Backups

### Using Docker Compose

The `docker-compose.postgres.yml` already includes a backup service. To enable:

1. Uncomment the backup service
2. Set schedule in `.env`: `BACKUP_SCHEDULE=0 2 * * *`
3. Restart: `docker-compose -f docker-compose.postgres.yml up -d`

### Manual Cron Job

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/project && ./backup-scripts/docker-dump-and-restore.sh dump
```

## 📞 Support

For issues:
1. Check Docker logs: `docker logs eff-membership-postgres`
2. Verify container health: `docker inspect eff-membership-postgres`
3. Test SSH connection: `ssh -v user@69.164.245.173`
4. See main README.md for detailed troubleshooting

