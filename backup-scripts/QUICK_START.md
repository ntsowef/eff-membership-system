# Quick Start: Database Dump and Restore

## 🐳 For Docker Deployments (RECOMMENDED)

If your PostgreSQL is running in Docker containers (both local and remote), use these scripts:

### Windows (PowerShell)
```powershell
# Navigate to project root
cd C:\Development\NewProj\Membership-newV2

# Run the Docker script (creates dump AND restores to remote)
.\backup-scripts\docker-dump-and-restore.ps1
```

### Linux/Mac (Bash)
```bash
# Navigate to project root
cd /path/to/Membership-newV2

# Make executable (first time only)
chmod +x backup-scripts/docker-dump-and-restore.sh

# Run the Docker script (creates dump AND restores to remote)
./backup-scripts/docker-dump-and-restore.sh
```

## 💻 For Native PostgreSQL Installations

If PostgreSQL is installed directly on the host (not Docker), use these scripts:

### Windows (PowerShell)
```powershell
.\backup-scripts\dump-and-restore.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x backup-scripts/dump-and-restore.sh
./backup-scripts/dump-and-restore.sh
```

## 📋 What Will Happen

1. **Dump Phase** (30 seconds - 5 minutes depending on database size)
   - Reads your local database configuration from `.env`
   - Creates compressed backup file
   - Saves to `backups/postgres/eff_membership_YYYYMMDD_HHMMSS.sql`
   - Shows file size

2. **Restore Phase** (1-10 minutes depending on database size)
   - Asks for confirmation (type `yes` to continue)
   - Prompts for remote database password
   - Connects to `69.164.245.173:5432`
   - Drops existing objects on remote database
   - Restores all data and schema
   - Shows completion status

## ⚠️ Important Notes

### Before Running (Docker Version)
- ✅ Ensure Docker is running on your local machine
- ✅ Ensure local PostgreSQL container is running (`eff-membership-postgres`)
- ✅ Have SSH access to remote server (69.164.245.173)
- ✅ Verify remote Docker container is running
- ✅ Confirm you want to OVERWRITE the remote database

### Before Running (Native Version)
- ✅ Ensure PostgreSQL client tools are installed (`pg_dump`, `pg_restore`)
- ✅ Verify network access to remote server (69.164.245.173)
- ✅ Have remote database password ready
- ✅ Confirm you want to OVERWRITE the remote database

### Remote Server Details
- **Host**: 69.164.245.173
- **Port**: 5432
- **Database**: eff_membership_database
- **User**: eff_admin

### Local Database (Source)
- **Host**: localhost
- **Port**: 5432
- **Database**: eff_membership_database
- **User**: eff_admin
- **Password**: (from .env file)

## 🎯 Common Scenarios

### Scenario 1: Just Create a Backup
```powershell
# Windows
.\backup-scripts\dump-and-restore.ps1 -Action dump

# Linux/Mac
./backup-scripts/dump-and-restore.sh dump
```

### Scenario 2: Restore Existing Backup
```powershell
# Windows
.\backup-scripts\dump-and-restore.ps1 -Action restore -DumpFile "backups\postgres\eff_membership_20250111_143022.sql"

# Linux/Mac
./backup-scripts/dump-and-restore.sh restore backups/postgres/eff_membership_20250111_143022.sql
```

### Scenario 3: Full Dump and Restore (Default)
```powershell
# Windows
.\backup-scripts\dump-and-restore.ps1

# Linux/Mac
./backup-scripts/dump-and-restore.sh
```

## 🔍 Verify After Restore

Connect to remote database and check:

```bash
# Connect to remote database
psql -h 69.164.245.173 -p 5432 -U eff_admin -d eff_membership_database

# Check table counts
SELECT COUNT(*) FROM members;
SELECT COUNT(*) FROM membership_applications;
SELECT COUNT(*) FROM users;

# Check recent records
SELECT * FROM members ORDER BY created_at DESC LIMIT 5;
```

## 🛠️ Troubleshooting

### "pg_dump: command not found"
Install PostgreSQL client tools:
```powershell
# Windows (using Chocolatey)
choco install postgresql

# Or download from: https://www.postgresql.org/download/windows/
```

### "Connection refused" to remote server
- Check firewall allows port 5432
- Verify remote server IP is correct
- Ensure PostgreSQL is running on remote server

### "Authentication failed"
- Verify remote database password
- Check user has proper permissions
- Ensure `pg_hba.conf` allows your connection

## 📊 Expected Output

```
============================================================================
PostgreSQL Database Dump and Restore Utility
============================================================================

📦 Creating database dump...
   Source: localhost:5432/eff_membership_database
   Output: backups/postgres/eff_membership_20250111_143022.sql
✅ Database dump created successfully!
   File: backups/postgres/eff_membership_20250111_143022.sql
   Size: 45.3 MB

📤 Preparing to restore database on remote server...
   Target: 69.164.245.173:5432/eff_membership_database
   Source: backups/postgres/eff_membership_20250111_143022.sql

⚠️  IMPORTANT: You will need to provide the remote database password
   Remote Host: 69.164.245.173
   Remote User: eff_admin
   Remote Database: eff_membership_database

Do you want to continue? This will OVERWRITE the remote database! (yes/no): yes

🔄 Restoring database to remote server...
   Note: You will be prompted for the remote database password
Password: ********

✅ Database restored successfully on remote server!

============================================================================
✅ Operation completed successfully!
============================================================================
```

## 🔐 Security Tips

1. **Use SSH Tunnel** (recommended for production):
   ```bash
   # Create tunnel
   ssh -L 5433:localhost:5432 user@69.164.245.173
   
   # Update script to use localhost:5433 instead
   ```

2. **Backup Encryption** (for sensitive data):
   ```bash
   # Encrypt backup
   gpg -c backups/postgres/eff_membership_20250111_143022.sql
   
   # Decrypt before restore
   gpg backups/postgres/eff_membership_20250111_143022.sql.gpg
   ```

3. **Verify Checksums**:
   ```bash
   # Create checksum
   sha256sum backups/postgres/eff_membership_20250111_143022.sql > backup.sha256
   
   # Verify checksum
   sha256sum -c backup.sha256
   ```

## 📞 Need Help?

See the full documentation in `backup-scripts/README.md` for:
- Advanced options
- Automated backups
- Selective table restore
- Performance tuning
- Detailed troubleshooting

