# =====================================================================================
# Windows PowerShell Script - PostgreSQL Database Backup
# EFF Membership Management System
# =====================================================================================

param(
    [string]$BackupDir = ".\migration-backup",
    [string]$ContainerName = "eff-membership-postgres",
    [string]$DbUser = "eff_admin",
    [string]$DbName = "eff_membership_db"
)

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

Write-Success "========================================================"
Write-Success "EFF Membership System - Database Backup Script"
Write-Success "========================================================"
Write-Host ""

# Check if Docker is running
Write-Info "Checking Docker status..."
try {
    docker ps | Out-Null
    Write-Success "✓ Docker is running"
} catch {
    Write-Error "✗ Docker is not running. Please start Docker Desktop."
    exit 1
}

# Check if container exists
Write-Info "Checking if container '$ContainerName' is running..."
$containerRunning = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Error "✗ Container '$ContainerName' is not running."
    Write-Info "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    exit 1
}
Write-Success "✓ Container is running"

# Create backup directory
Write-Info "Creating backup directory..."
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Write-Success "✓ Created directory: $BackupDir"
} else {
    Write-Success "✓ Directory exists: $BackupDir"
}

# Generate timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "eff_membership_backup_$timestamp"

Write-Host ""
Write-Info "Creating database backup..."
Write-Info "  Database: $DbName"
Write-Info "  Format: Custom (compressed)"
Write-Host ""

# Create backup in custom format (compressed)
Write-Info "Step 1: Creating compressed backup..."
try {
    docker exec $ContainerName pg_dump -U $DbUser -d $DbName -F c -f "/tmp/$backupFileName.dump"
    Write-Success "✓ Backup created in container"
} catch {
    Write-Error "✗ Failed to create backup"
    Write-Error $_.Exception.Message
    exit 1
}

# Copy backup from container
Write-Info "Step 2: Copying backup from container..."
try {
    docker cp "${ContainerName}:/tmp/$backupFileName.dump" "$BackupDir\$backupFileName.dump"
    Write-Success "✓ Backup copied to: $BackupDir\$backupFileName.dump"
} catch {
    Write-Error "✗ Failed to copy backup"
    Write-Error $_.Exception.Message
    exit 1
}

# Create SQL backup (plain text, easier to inspect)
Write-Info "Step 3: Creating SQL backup (plain text)..."
try {
    docker exec $ContainerName pg_dump -U $DbUser -d $DbName > "$BackupDir\$backupFileName.sql"
    Write-Success "✓ SQL backup created: $BackupDir\$backupFileName.sql"
} catch {
    Write-Warning "⚠ Failed to create SQL backup (non-critical)"
}

# Clean up container
Write-Info "Step 4: Cleaning up container..."
docker exec $ContainerName rm -f "/tmp/$backupFileName.dump" 2>$null

# Get backup file sizes
$dumpFile = Get-Item "$BackupDir\$backupFileName.dump"
$dumpSize = "{0:N2} MB" -f ($dumpFile.Length / 1MB)

Write-Host ""
Write-Success "========================================================"
Write-Success "Backup completed successfully!"
Write-Success "========================================================"
Write-Host ""
Write-Info "Backup files:"
Write-Host "  - Custom format: $BackupDir\$backupFileName.dump ($dumpSize)"
if (Test-Path "$BackupDir\$backupFileName.sql") {
    $sqlFile = Get-Item "$BackupDir\$backupFileName.sql"
    $sqlSize = "{0:N2} MB" -f ($sqlFile.Length / 1MB)
    Write-Host "  - SQL format: $BackupDir\$backupFileName.sql ($sqlSize)"
}
Write-Host ""

# Verify backup
Write-Info "Verifying backup integrity..."
try {
    $tableCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $memberCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM members;"
    
    Write-Success "✓ Database verification:"
    Write-Host "  - Total tables: $($tableCount.Trim())"
    Write-Host "  - Total members: $($memberCount.Trim())"
} catch {
    Write-Warning "⚠ Could not verify backup (non-critical)"
}

Write-Host ""
Write-Info "Next steps:"
Write-Host "  1. Transfer backup files to Ubuntu server using SCP:"
Write-Host "     scp $BackupDir\$backupFileName.dump username@server-ip:/opt/eff-membership/"
Write-Host ""
Write-Host "  2. Or use SFTP client (FileZilla, WinSCP) to upload files"
Write-Host ""
Write-Host "  3. On Ubuntu server, restore using:"
Write-Host "     ./backup-scripts/restore.sh $backupFileName.dump"
Write-Host ""

# List all backups
Write-Info "All available backups in ${BackupDir}:"
Get-ChildItem $BackupDir -Filter "*.dump" | Sort-Object LastWriteTime -Descending | ForEach-Object {
    $size = "{0:N2} MB" -f ($_.Length / 1MB)
    $age = (New-TimeSpan -Start $_.LastWriteTime -End (Get-Date)).Days
    Write-Host "  - $($_.Name) ($size, $age days old)"
}

Write-Host ""
Write-Success "Backup process completed!"

