# Windows Backup Script Usage Guide
## windows-backup.ps1

This guide explains how to use the Windows PowerShell backup script to create a backup of your PostgreSQL database.

---

## 🎯 Purpose

The `windows-backup.ps1` script creates a backup of your PostgreSQL database running in Docker on Windows, preparing it for migration to an Ubuntu server.

---

## ✅ Prerequisites

Before running the script, ensure:

1. **Docker Desktop is running** on Windows
2. **PostgreSQL container is running** (default: `eff-membership-postgres`)
3. **PowerShell 5.1 or later** is installed (comes with Windows 10/11)
4. **You have permissions** to run PowerShell scripts

---

## 🚀 Quick Start

### Basic Usage

```powershell
# Navigate to project directory
cd C:\Development\NewProj\Membership-new

# Run the backup script
.\deployment\windows-backup.ps1
```

This will:
- Create a backup directory: `.\migration-backup\`
- Export database in compressed format (`.dump`)
- Export database in SQL format (`.sql`)
- Verify the backup
- Show statistics

---

## 🔧 Advanced Usage

### Custom Backup Directory

```powershell
.\deployment\windows-backup.ps1 -BackupDir "C:\MyBackups"
```

### Custom Container Name

```powershell
.\deployment\windows-backup.ps1 -ContainerName "my-postgres-container"
```

### Custom Database Settings

```powershell
.\deployment\windows-backup.ps1 -DbUser "postgres" -DbName "my_database"
```

### All Parameters Combined

```powershell
.\deployment\windows-backup.ps1 `
    -BackupDir "C:\Backups\EFF" `
    -ContainerName "my-postgres" `
    -DbUser "admin" `
    -DbName "eff_db"
```

---

## 📋 Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-BackupDir` | String | `.\migration-backup` | Directory to store backups |
| `-ContainerName` | String | `eff-membership-postgres` | Docker container name |
| `-DbUser` | String | `eff_admin` | Database username |
| `-DbName` | String | `eff_membership_db` | Database name |

---

## 📂 Output Files

The script creates two backup files:

### 1. Custom Format (Compressed)
- **Filename**: `eff_membership_backup_YYYYMMDD_HHMMSS.dump`
- **Format**: PostgreSQL custom format (binary, compressed)
- **Use**: Best for restoration with `pg_restore`
- **Size**: Smaller (compressed)

### 2. SQL Format (Plain Text)
- **Filename**: `eff_membership_backup_YYYYMMDD_HHMMSS.sql`
- **Format**: Plain SQL statements
- **Use**: Human-readable, can be edited
- **Size**: Larger (uncompressed)

---

## 🔍 What the Script Does

### Step 1: Validation
- Checks if Docker is running
- Verifies container exists and is running
- Creates backup directory if needed

### Step 2: Backup Creation
- Creates compressed backup inside container
- Copies backup from container to local machine
- Creates SQL backup for inspection

### Step 3: Cleanup
- Removes temporary files from container
- Keeps local backup files

### Step 4: Verification
- Checks backup file sizes
- Queries database for statistics
- Shows table count and member count

### Step 5: Information
- Lists all available backups
- Shows file sizes and ages
- Provides next steps

---

## ✅ Success Indicators

The backup is successful when you see:

```
✓ Docker is running
✓ Container is running
✓ Created directory: .\migration-backup
✓ Backup created in container
✓ Backup copied to: .\migration-backup\eff_membership_backup_20251012_143022.dump
✓ SQL backup created: .\migration-backup\eff_membership_backup_20251012_143022.sql
✓ Database verification:
  - Total tables: 85
  - Total members: 15234
```

---

## 🆘 Troubleshooting

### Error: "Docker is not running"

**Problem**: Docker Desktop is not started

**Solution**:
```powershell
# Start Docker Desktop from Start Menu
# Wait for Docker to fully start (check system tray icon)
# Then run the script again
```

### Error: "Container 'eff-membership-postgres' is not running"

**Problem**: PostgreSQL container is not running

**Solution**:
```powershell
# Check running containers
docker ps

# If container is stopped, start it
docker start eff-membership-postgres

# Or start all services
docker compose -f docker-compose.postgres.yml up -d
```

### Error: "Execution Policy" or "Script cannot be loaded"

**Problem**: PowerShell execution policy prevents running scripts

**Solution**:
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy for current user (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run with bypass (one-time)
PowerShell -ExecutionPolicy Bypass -File .\deployment\windows-backup.ps1
```

### Error: "Failed to create backup"

**Problem**: Database connection or permission issues

**Solution**:
```powershell
# Test database connection
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT 1;"

# Check container logs
docker logs eff-membership-postgres

# Verify credentials in .env file
```

### Backup file is 0 bytes or very small

**Problem**: Database might be empty or backup failed

**Solution**:
```powershell
# Check if database has data
docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT COUNT(*) FROM members;"

# Check container disk space
docker exec eff-membership-postgres df -h

# Try creating backup manually
docker exec eff-membership-postgres pg_dump -U eff_admin -d eff_membership_db -F c -f /tmp/test.dump
```

---

## 📊 Example Output

```
========================================================
EFF Membership System - Database Backup Script
========================================================

Checking Docker status...
✓ Docker is running
Checking if container 'eff-membership-postgres' is running...
✓ Container is running
Creating backup directory...
✓ Directory exists: .\migration-backup

Creating database backup...
  Database: eff_membership_db
  Format: Custom (compressed)

Step 1: Creating compressed backup...
✓ Backup created in container
Step 2: Copying backup from container...
✓ Backup copied to: .\migration-backup\eff_membership_backup_20251012_143022.dump
Step 3: Creating SQL backup (plain text)...
✓ SQL backup created: .\migration-backup\eff_membership_backup_20251012_143022.sql
Step 4: Cleaning up container...

========================================================
Backup completed successfully!
========================================================

Backup files:
  - Custom format: .\migration-backup\eff_membership_backup_20251012_143022.dump (45.23 MB)
  - SQL format: .\migration-backup\eff_membership_backup_20251012_143022.sql (128.45 MB)

Verifying backup integrity...
✓ Database verification:
  - Total tables: 85
  - Total members: 15234

Next steps:
  1. Transfer backup files to Ubuntu server using SCP:
     scp .\migration-backup\eff_membership_backup_20251012_143022.dump username@server-ip:/opt/eff-membership/

  2. Or use SFTP client (FileZilla, WinSCP) to upload files

  3. On Ubuntu server, restore using:
     ./backup-scripts/restore.sh eff_membership_backup_20251012_143022.dump

All available backups in .\migration-backup:
  - eff_membership_backup_20251012_143022.dump (45.23 MB, 0 days old)
  - eff_membership_backup_20251011_020000.dump (44.89 MB, 1 days old)

Backup process completed!
```

---

## 🔐 Security Notes

1. **Backup files contain sensitive data** - Store securely
2. **Don't commit backups to Git** - Already in `.gitignore`
3. **Use secure transfer methods** - SCP/SFTP with SSH keys
4. **Delete old backups** - After successful migration
5. **Encrypt backups** - If storing long-term

---

## 📝 Best Practices

1. **Test the backup** - Restore to a test database first
2. **Verify data** - Check table counts and sample records
3. **Keep multiple backups** - Don't rely on a single backup
4. **Document the process** - Note backup date and size
5. **Transfer securely** - Use encrypted connections

---

## 🔄 Next Steps After Backup

1. **Verify backup files exist** and have reasonable sizes
2. **Transfer to Ubuntu server** using SCP or SFTP
3. **Follow deployment guide** - See UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md
4. **Restore on Ubuntu** - Use `backup-scripts/restore.sh`
5. **Verify restoration** - Check data integrity

---

## 📞 Getting Help

If you encounter issues:

1. **Check this guide** - Review troubleshooting section
2. **Check Docker logs** - `docker logs eff-membership-postgres`
3. **Test database connection** - Use `psql` commands
4. **Review main guide** - See UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md
5. **Run syntax test** - `.\deployment\test-windows-backup.ps1`

---

## 📚 Related Documentation

- [UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md](../docs/UBUNTU_DOCKER_DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [QUICK_DEPLOYMENT_REFERENCE.md](../docs/QUICK_DEPLOYMENT_REFERENCE.md) - Quick reference
- [DEPLOYMENT_SUMMARY.md](../docs/DEPLOYMENT_SUMMARY.md) - Overview
- [deployment/README.md](./README.md) - All scripts documentation

---

**Script Version**: 1.0  
**Last Updated**: 2025-10-12  
**Status**: Ready to use ✅

