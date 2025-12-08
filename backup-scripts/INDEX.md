# Backup Scripts - Complete Index

## 🎯 Start Here

**Your PostgreSQL is running in Docker?** → Use Docker scripts  
**Your PostgreSQL is native installation?** → Use native scripts

## 🐳 Docker Scripts (RECOMMENDED FOR YOUR SETUP)

Your setup uses Docker containers, so use these:

### Main Scripts
| Script | Platform | Purpose |
|--------|----------|---------|
| `docker-dump-and-restore.ps1` | Windows | Dump and restore via Docker |
| `docker-dump-and-restore.sh` | Linux/Mac | Dump and restore via Docker |

### Quick Commands
```powershell
# Windows - Full dump and restore
.\backup-scripts\docker-dump-and-restore.ps1

# Linux/Mac - Full dump and restore
./backup-scripts/docker-dump-and-restore.sh

# Dump only
.\backup-scripts\docker-dump-and-restore.ps1 -Action dump

# Restore only
.\backup-scripts\docker-dump-and-restore.ps1 -Action restore -DumpFile "filename.sql"
```

### Documentation
- **`DOCKER_GUIDE.md`** - Complete Docker guide (START HERE!)
- **`QUICK_START.md`** - Quick reference for all scripts

## 💻 Native PostgreSQL Scripts

For systems where PostgreSQL is installed directly (not Docker):

### Main Scripts
| Script | Platform | Purpose |
|--------|----------|---------|
| `dump-and-restore.ps1` | Windows | Native dump and restore |
| `dump-and-restore.sh` | Linux/Mac | Native dump and restore |
| `test-remote-connection.ps1` | Windows | Test connection |
| `test-remote-connection.sh` | Linux/Mac | Test connection |

### Documentation
- **`README.md`** - Complete native PostgreSQL guide
- **`INSTALLATION_GUIDE.md`** - Install PostgreSQL client tools

## 📚 General Documentation

| Document | Purpose |
|----------|---------|
| **`QUICK_START.md`** | Quick reference for all methods |
| **`INDEX.md`** | This file - navigation guide |

## 🗂️ Project Root Documentation

| Document | Purpose |
|----------|---------|
| **`DATABASE_DUMP_RESTORE_GUIDE.md`** | Main guide (covers both methods) |
| **`DOCKER_DUMP_RESTORE_SUMMARY.md`** | Docker quick summary |

## 🎯 Decision Tree

```
Do you have PostgreSQL in Docker?
│
├─ YES (Your case!)
│  └─ Use: docker-dump-and-restore.ps1 or .sh
│     Read: DOCKER_GUIDE.md
│
└─ NO (Native installation)
   └─ Use: dump-and-restore.ps1 or .sh
      Read: README.md and INSTALLATION_GUIDE.md
```

## 📋 Configuration

### Local Setup
- **Container**: `eff-membership-postgres`
- **Database**: `eff_membership_database`
- **User**: `eff_admin`
- **Config**: `.env` file in project root

### Remote Setup
- **Host**: `69.164.245.173`
- **Container**: `eff-membership-postgres`
- **Database**: `eff_membership_database`
- **User**: `eff_admin`
- **Access**: SSH required

## 🚀 Recommended Workflow

### First Time Setup
1. Read `DOCKER_GUIDE.md`
2. Verify local container is running
3. Test SSH access to remote server
4. Run dump-only first to test

### Regular Use
1. Run the script: `.\backup-scripts\docker-dump-and-restore.ps1`
2. Confirm when prompted
3. Provide SSH credentials
4. Verify on remote server

### Troubleshooting
1. Check `DOCKER_GUIDE.md` troubleshooting section
2. Verify Docker is running
3. Check SSH access
4. Review script output for errors

## 📊 Backup Storage

All backups are stored in:
```
backups/postgres/eff_membership_YYYYMMDD_HHMMSS.sql
```

Example:
```
backups/postgres/eff_membership_20250111_143022.sql
```

## 🔐 Security Notes

- Local passwords: Read from `.env` file
- Remote access: SSH authentication
- No passwords stored in scripts
- Temporary files cleaned automatically

## 🎓 Learning Path

1. **Beginner**: Start with `QUICK_START.md`
2. **Docker User**: Read `DOCKER_GUIDE.md`
3. **Native User**: Read `README.md` + `INSTALLATION_GUIDE.md`
4. **Advanced**: Explore script source code

## 📞 Support Resources

### Quick Issues
- Container not running → `docker-compose up -d`
- SSH issues → Test with `ssh user@69.164.245.173`
- Docker issues → Check Docker Desktop is running

### Documentation
- Docker-specific: `DOCKER_GUIDE.md`
- Native PostgreSQL: `README.md`
- Installation help: `INSTALLATION_GUIDE.md`
- Quick reference: `QUICK_START.md`

## 🔄 Related Scripts

### In This Directory
- `backup.sh` - Simple local backup (legacy)
- `restore.sh` - Simple local restore (legacy)

### In Project Root
- `docker-compose.postgres.yml` - Docker configuration
- `.env` - Environment configuration

## ✅ Quick Checklist

Before running scripts:
- [ ] Docker is running (for Docker scripts)
- [ ] Container is running (for Docker scripts)
- [ ] SSH access configured (for remote restore)
- [ ] Backup directory exists
- [ ] Sufficient disk space

## 🎉 You're Ready!

Choose your script based on your setup and follow the guide. Good luck!

