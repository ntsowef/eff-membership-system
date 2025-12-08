# Database Backup and Restore Scripts

This directory contains scripts for backing up and restoring the PostgreSQL database.

## Scripts Overview

### 1. `dump-and-restore.ps1` (Windows PowerShell)
### 2. `dump-and-restore.sh` (Linux/Mac Bash)

These scripts handle both local database dumps and remote server restoration.

## Prerequisites

### Required Software
- PostgreSQL client tools (`pg_dump` and `pg_restore`)
- Network access to the remote server (69.164.245.173)
- Appropriate database credentials

### Windows Installation
```powershell
# Install PostgreSQL client tools
# Download from: https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

### Linux Installation
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql
```

## Configuration

The scripts automatically read configuration from the `.env` file in the repository root.

### Local Database (Source)
- Host: `localhost` (from `DB_HOST`)
- Port: `5432` (from `DB_PORT`)
- User: `eff_admin` (from `DB_USER`)
- Password: `Frames!123` (from `DB_PASSWORD`)
- Database: `eff_membership_database` (from `DB_NAME`)

### Remote Database (Target)
- Host: `69.164.245.173`
- Port: `5432`
- User: `eff_admin` (update in script if different)
- Database: `eff_membership_database` (update in script if different)

## Usage

### Windows (PowerShell)

```powershell
# Navigate to the backup-scripts directory
cd backup-scripts

# Create dump only
.\dump-and-restore.ps1 -Action dump

# Restore to remote only (using existing dump)
.\dump-and-restore.ps1 -Action restore -DumpFile "path\to\dump.sql"

# Create dump AND restore to remote (default)
.\dump-and-restore.ps1 -Action both

# Or simply:
.\dump-and-restore.ps1
```

### Linux/Mac (Bash)

```bash
# Navigate to the backup-scripts directory
cd backup-scripts

# Make script executable (first time only)
chmod +x dump-and-restore.sh

# Create dump only
./dump-and-restore.sh dump

# Restore to remote only (using existing dump)
./dump-and-restore.sh restore path/to/dump.sql

# Create dump AND restore to remote (default)
./dump-and-restore.sh both

# Or simply:
./dump-and-restore.sh
```

## What the Scripts Do

### Dump Phase
1. Reads database configuration from `.env` file
2. Creates a compressed PostgreSQL dump using custom format (`-F c`)
3. Includes large objects (`-b`)
4. Saves to `backups/postgres/eff_membership_YYYYMMDD_HHMMSS.sql`
5. Reports file size and location

### Restore Phase
1. Verifies dump file exists
2. Prompts for confirmation (to prevent accidental overwrites)
3. Connects to remote server at 69.164.245.173
4. Drops existing database objects (`-c` flag)
5. Restores all data and schema
6. Reports success/warnings

## Dump File Format

The scripts use PostgreSQL's **custom format** (`-F c`):
- ✅ Compressed (smaller file size)
- ✅ Allows parallel restore
- ✅ Selective restore of specific tables
- ✅ More reliable than plain SQL format

## Security Notes

### Password Handling
- Local password is read from `.env` file
- Remote password is prompted interactively (not stored)
- Passwords are not logged or displayed

### Network Security
- Ensure firewall allows PostgreSQL port (5432) to remote server
- Consider using SSH tunnel for added security:
  ```bash
  # Create SSH tunnel
  ssh -L 5433:localhost:5432 user@69.164.245.173
  
  # Then update REMOTE_HOST in script to localhost
  # And REMOTE_DB_PORT to 5433
  ```

## Backup Storage

Dumps are stored in: `backups/postgres/`

### Naming Convention
```
eff_membership_YYYYMMDD_HHMMSS.sql
```

Example: `eff_membership_20250111_143022.sql`

## Troubleshooting

### Error: "pg_dump: command not found"
**Solution**: Install PostgreSQL client tools (see Prerequisites)

### Error: "Connection refused"
**Solution**: 
- Check if remote server allows connections from your IP
- Verify firewall rules on remote server
- Ensure PostgreSQL is listening on all interfaces

### Error: "Authentication failed"
**Solution**: 
- Verify remote database credentials
- Check `pg_hba.conf` on remote server allows your connection

### Warning: "role does not exist"
**Solution**: This is normal. The script will create necessary roles.

### Large Database Takes Long Time
**Solution**: 
- Use compression (already enabled)
- Consider using `--jobs` flag for parallel restore
- Ensure good network connection

## Advanced Options

### Manual pg_dump (if you need custom options)
```bash
pg_dump -h localhost -p 5432 -U eff_admin -d eff_membership_database \
  -F c -b -v -f backup.sql
```

### Manual pg_restore (if you need custom options)
```bash
pg_restore -h 69.164.245.173 -p 5432 -U eff_admin -d eff_membership_database \
  -c -v backup.sql
```

### Restore Specific Tables Only
```bash
pg_restore -h 69.164.245.173 -p 5432 -U eff_admin -d eff_membership_database \
  -t members -t membership_applications backup.sql
```

## Verification After Restore

After restoring, verify the data on the remote server:

```sql
-- Connect to remote database
psql -h 69.164.245.173 -p 5432 -U eff_admin -d eff_membership_database

-- Check table counts
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Check recent data
SELECT COUNT(*) FROM members;
SELECT COUNT(*) FROM membership_applications;
```

## Automated Backups

To schedule automated backups, use:

### Windows (Task Scheduler)
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
  -Argument "-File C:\path\to\dump-and-restore.ps1 -Action dump"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "EFF DB Backup" -Action $action -Trigger $trigger
```

### Linux (Cron)
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/dump-and-restore.sh dump
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review PostgreSQL logs on both servers
3. Verify network connectivity
4. Check database permissions

## Related Files

- `.env` - Database configuration
- `backup.sh` - Simple backup script (local only)
- `restore.sh` - Simple restore script (local only)

