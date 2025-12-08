# Database Dump and Restore to Remote Server

## 📋 Overview

This guide provides complete instructions for dumping your local PostgreSQL database and restoring it on the remote server at **69.164.245.173**.

## 🐳 For Docker Deployments (RECOMMENDED)

Since your PostgreSQL is running in Docker containers, use the Docker-specific scripts:

### Quick Start

**Windows:**
```powershell
# Navigate to project root
cd C:\Development\NewProj\Membership-newV2

# Run the Docker script
.\backup-scripts\docker-dump-and-restore.ps1
```

**Linux/Mac:**
```bash
# Navigate to project root
cd /path/to/Membership-newV2

# Make executable (first time only)
chmod +x backup-scripts/docker-dump-and-restore.sh

# Run the Docker script
./backup-scripts/docker-dump-and-restore.sh
```

**What it does:**
1. Creates a compressed backup from your local Docker container
2. Asks for confirmation
3. Copies backup to remote server via SSH
4. Restores it in the remote Docker container

**See `backup-scripts/DOCKER_GUIDE.md` for detailed Docker instructions.**

## 💻 For Native PostgreSQL Installations

If PostgreSQL is installed directly on the host (not Docker):

### Step 1: Test Remote Connection (Recommended)

**Windows:**
```powershell
.\backup-scripts\test-remote-connection.ps1
```

**Linux/Mac:**
```bash
chmod +x backup-scripts/test-remote-connection.sh
./backup-scripts/test-remote-connection.sh
```

### Step 2: Run Dump and Restore

**Windows:**
```powershell
.\backup-scripts\dump-and-restore.ps1
```

**Linux/Mac:**
```bash
chmod +x backup-scripts/dump-and-restore.sh
./backup-scripts/dump-and-restore.sh
```

## 📁 Files Created

All scripts are located in the `backup-scripts/` directory:

| File | Purpose |
|------|---------|
| **Docker Scripts (Use These!)** | |
| `docker-dump-and-restore.ps1` | Docker script for Windows |
| `docker-dump-and-restore.sh` | Docker script for Linux/Mac |
| `DOCKER_GUIDE.md` | Detailed Docker documentation |
| **Native PostgreSQL Scripts** | |
| `dump-and-restore.ps1` | Native script for Windows |
| `dump-and-restore.sh` | Native script for Linux/Mac |
| `test-remote-connection.ps1` | Connection test for Windows |
| `test-remote-connection.sh` | Connection test for Linux/Mac |
| `INSTALLATION_GUIDE.md` | PostgreSQL client tools installation |
| **General Documentation** | |
| `README.md` | Complete documentation |
| `QUICK_START.md` | Quick reference guide |

## 🔧 Configuration

### Local Database (Source)
- **Host:** localhost
- **Port:** 5432
- **Database:** eff_membership_database
- **User:** eff_admin
- **Password:** (from .env file)

### Remote Database (Target)
- **Host:** 69.164.245.173
- **Port:** 5432
- **Database:** eff_membership_database
- **User:** eff_admin
- **Password:** (you'll be prompted)

## 📊 What Happens During Execution

### Phase 1: Database Dump (Local)
```
📦 Creating database dump...
   Source: localhost:5432/eff_membership_database
   Output: backups/postgres/eff_membership_20250111_143022.sql
✅ Database dump created successfully!
   File: backups/postgres/eff_membership_20250111_143022.sql
   Size: 45.3 MB
```

### Phase 2: Remote Restore
```
📤 Preparing to restore database on remote server...
   Target: 69.164.245.173:5432/eff_membership_database

⚠️  IMPORTANT: This will OVERWRITE the remote database!
Do you want to continue? (yes/no): yes

🔄 Restoring database to remote server...
Password: ********

✅ Database restored successfully on remote server!
```

## 🎛️ Advanced Usage

### Create Dump Only
```powershell
# Windows
.\backup-scripts\dump-and-restore.ps1 -Action dump

# Linux/Mac
./backup-scripts/dump-and-restore.sh dump
```

### Restore Existing Dump
```powershell
# Windows
.\backup-scripts\dump-and-restore.ps1 -Action restore -DumpFile "path\to\backup.sql"

# Linux/Mac
./backup-scripts/dump-and-restore.sh restore path/to/backup.sql
```

### Specify Custom Remote Server
Edit the scripts and change these variables:
- `REMOTE_HOST`
- `REMOTE_DB_PORT`
- `REMOTE_DB_USER`
- `REMOTE_DB_NAME`

## ✅ Verification After Restore

Connect to the remote database and verify:

```bash
# Connect to remote database
psql -h 69.164.245.173 -p 5432 -U eff_admin -d eff_membership_database

# Check table counts
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;

# Check specific tables
SELECT COUNT(*) FROM members;
SELECT COUNT(*) FROM membership_applications;
SELECT COUNT(*) FROM users;

# Check recent data
SELECT * FROM members ORDER BY created_at DESC LIMIT 5;
```

## 🛠️ Prerequisites

### Required Software

**PostgreSQL Client Tools** must be installed:

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- Or use Chocolatey: `choco install postgresql`

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

**CentOS/RHEL:**
```bash
sudo yum install postgresql
```

**macOS:**
```bash
brew install postgresql
```

### Network Requirements
- Firewall must allow outbound connections to port 5432
- Remote server must allow connections from your IP address
- Stable internet connection (for large databases)

## 🔐 Security Considerations

### Password Security
- Local password is read from `.env` file (never displayed)
- Remote password is prompted interactively (not stored)
- Passwords are never logged

### Network Security
For production environments, consider using an SSH tunnel:

```bash
# Create SSH tunnel
ssh -L 5433:localhost:5432 user@69.164.245.173

# Then update script to use:
# REMOTE_HOST="localhost"
# REMOTE_DB_PORT="5433"
```

### Backup Encryption
For sensitive data, encrypt backups:

```bash
# Encrypt
gpg -c backups/postgres/eff_membership_20250111_143022.sql

# Decrypt
gpg backups/postgres/eff_membership_20250111_143022.sql.gpg
```

## 🐛 Troubleshooting

### Error: "pg_dump: command not found"
**Solution:** Install PostgreSQL client tools (see Prerequisites)

### Error: "Connection refused"
**Possible causes:**
- Remote server firewall blocking port 5432
- PostgreSQL not running on remote server
- Wrong IP address or port

**Solution:** Run the connection test script first

### Error: "Authentication failed"
**Possible causes:**
- Wrong password
- User doesn't have proper permissions
- `pg_hba.conf` doesn't allow your connection

**Solution:** Verify credentials and check remote server configuration

### Warning: "role does not exist"
**This is normal.** The restore process will create necessary roles.

### Large Database Takes Too Long
**Solutions:**
- Ensure good network connection
- Consider compressing the dump (already enabled)
- Use parallel restore (add `--jobs=4` to pg_restore)

## 📈 Performance Tips

### For Large Databases (>1GB)

1. **Use parallel dump:**
   ```bash
   pg_dump -j 4 -F d -f backup_dir ...
   ```

2. **Use parallel restore:**
   ```bash
   pg_restore -j 4 ...
   ```

3. **Disable triggers during restore:**
   ```bash
   pg_restore --disable-triggers ...
   ```

## 📅 Automated Backups

### Windows Task Scheduler
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
  -Argument "-File C:\Development\NewProj\Membership-newV2\backup-scripts\dump-and-restore.ps1 -Action dump"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "EFF DB Backup" -Action $action -Trigger $trigger
```

### Linux Cron
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-scripts/dump-and-restore.sh dump
```

## 📞 Support

For detailed information, see:
- `backup-scripts/README.md` - Complete documentation
- `backup-scripts/QUICK_START.md` - Quick reference
- PostgreSQL documentation: https://www.postgresql.org/docs/

## 🎓 Additional Resources

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [pg_dump Manual](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore Manual](https://www.postgresql.org/docs/current/app-pgrestore.html)

