# PostgreSQL Client Tools Installation Guide

Before you can use the database dump and restore scripts, you need to install PostgreSQL client tools (`pg_dump`, `pg_restore`, and `psql`).

## 🪟 Windows Installation

### Option 1: Download PostgreSQL Installer (Recommended)

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the latest version (16.x recommended)
   - Or direct link: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. **Run the Installer:**
   - Double-click the downloaded `.exe` file
   - Follow the installation wizard
   - **Important:** When asked which components to install, make sure "Command Line Tools" is checked
   - You can uncheck "PostgreSQL Server" if you only need the client tools

3. **Add to PATH:**
   The installer usually adds PostgreSQL to PATH automatically. If not:
   
   ```powershell
   # Add PostgreSQL to PATH (adjust version number as needed)
   $pgPath = "C:\Program Files\PostgreSQL\16\bin"
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$pgPath", "Machine")
   ```

4. **Verify Installation:**
   ```powershell
   # Close and reopen PowerShell, then run:
   pg_dump --version
   pg_restore --version
   psql --version
   ```

### Option 2: Using Chocolatey

If you have Chocolatey installed:

```powershell
# Install PostgreSQL (includes client tools)
choco install postgresql

# Or install only client tools
choco install postgresql-client
```

### Option 3: Using Scoop

If you have Scoop installed:

```powershell
scoop install postgresql
```

## 🐧 Linux Installation

### Ubuntu/Debian

```bash
# Update package list
sudo apt-get update

# Install PostgreSQL client tools
sudo apt-get install postgresql-client

# Verify installation
pg_dump --version
pg_restore --version
psql --version
```

### CentOS/RHEL/Fedora

```bash
# Install PostgreSQL client
sudo yum install postgresql

# Or for newer versions
sudo dnf install postgresql

# Verify installation
pg_dump --version
pg_restore --version
psql --version
```

### Arch Linux

```bash
# Install PostgreSQL
sudo pacman -S postgresql

# Verify installation
pg_dump --version
pg_restore --version
psql --version
```

## 🍎 macOS Installation

### Option 1: Using Homebrew (Recommended)

```bash
# Install PostgreSQL
brew install postgresql

# Verify installation
pg_dump --version
pg_restore --version
psql --version
```

### Option 2: Using Postgres.app

1. Download from: https://postgresapp.com/
2. Drag to Applications folder
3. Open Postgres.app
4. Add to PATH:
   ```bash
   echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

## ✅ Verify Installation

After installation, verify that all required tools are available:

### Windows (PowerShell)
```powershell
# Check if tools are installed
Get-Command pg_dump, pg_restore, psql | Select-Object Name, Source

# Check versions
pg_dump --version
pg_restore --version
psql --version
```

### Linux/Mac (Bash)
```bash
# Check if tools are installed
which pg_dump pg_restore psql

# Check versions
pg_dump --version
pg_restore --version
psql --version
```

## 🔧 Troubleshooting

### "Command not found" after installation

**Windows:**
1. Close and reopen PowerShell/Command Prompt
2. Check if PostgreSQL is in PATH:
   ```powershell
   $env:Path -split ';' | Select-String -Pattern 'PostgreSQL'
   ```
3. If not found, manually add to PATH (see Option 1 above)

**Linux/Mac:**
1. Reload shell configuration:
   ```bash
   source ~/.bashrc  # or ~/.zshrc for zsh
   ```
2. Check PATH:
   ```bash
   echo $PATH | grep postgres
   ```

### Wrong version installed

If you need a specific PostgreSQL version:

**Windows:**
- Uninstall current version
- Download specific version from: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

**Linux:**
```bash
# Ubuntu/Debian - Install specific version
sudo apt-get install postgresql-client-16
```

**Mac:**
```bash
# Homebrew - Install specific version
brew install postgresql@16
```

## 📦 What Gets Installed

The PostgreSQL client tools package includes:

| Tool | Purpose |
|------|---------|
| `pg_dump` | Create database backups |
| `pg_restore` | Restore database backups |
| `psql` | Interactive PostgreSQL terminal |
| `pg_dumpall` | Dump all databases |
| `createdb` | Create databases |
| `dropdb` | Drop databases |

## 🎯 Next Steps

After successful installation:

1. **Test the installation:**
   ```powershell
   # Windows
   .\backup-scripts\test-remote-connection.ps1
   
   # Linux/Mac
   ./backup-scripts/test-remote-connection.sh
   ```

2. **Run the dump and restore:**
   ```powershell
   # Windows
   .\backup-scripts\dump-and-restore.ps1
   
   # Linux/Mac
   ./backup-scripts/dump-and-restore.sh
   ```

## 📚 Additional Resources

- [PostgreSQL Downloads](https://www.postgresql.org/download/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore Documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)

