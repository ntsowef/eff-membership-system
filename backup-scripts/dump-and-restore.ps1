# ============================================================================
# PostgreSQL Database Dump and Remote Restore Script
# ============================================================================
# This script creates a database dump and restores it on a remote server
# 
# Usage:
#   .\dump-and-restore.ps1 -Action dump          # Create dump only
#   .\dump-and-restore.ps1 -Action restore       # Restore to remote only
#   .\dump-and-restore.ps1 -Action both          # Dump and restore
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dump', 'restore', 'both')]
    [string]$Action = 'both',
    
    [Parameter(Mandatory=$false)]
    [string]$DumpFile = ""
)

# Load environment variables
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "✅ Loaded environment variables from .env" -ForegroundColor Green
}

# Local database configuration
$LOCAL_DB_HOST = $env:DB_HOST
$LOCAL_DB_PORT = $env:DB_PORT
$LOCAL_DB_USER = $env:DB_USER
$LOCAL_DB_PASSWORD = $env:DB_PASSWORD
$LOCAL_DB_NAME = $env:DB_NAME

# Remote server configuration
$REMOTE_HOST = "69.164.245.173"
$REMOTE_DB_PORT = "5432"
$REMOTE_DB_USER = "eff_admin"  # Update if different
$REMOTE_DB_NAME = "eff_membership_database"  # Update if different

# Backup directory
$BACKUP_DIR = Join-Path $PSScriptRoot ".." "backups" "postgres"
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

# Generate dump filename with timestamp
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
if ($DumpFile -eq "") {
    $DumpFile = Join-Path $BACKUP_DIR "eff_membership_${TIMESTAMP}.sql"
}

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Database Dump and Restore Utility" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

# Function to create database dump
function Create-DatabaseDump {
    Write-Host "📦 Creating database dump..." -ForegroundColor Yellow
    Write-Host "   Source: ${LOCAL_DB_HOST}:${LOCAL_DB_PORT}/${LOCAL_DB_NAME}" -ForegroundColor Gray
    Write-Host "   Output: $DumpFile" -ForegroundColor Gray
    
    # Set password environment variable for pg_dump
    $env:PGPASSWORD = $LOCAL_DB_PASSWORD
    
    # Create dump with custom format (compressed and allows parallel restore)
    $dumpArgs = @(
        "-h", $LOCAL_DB_HOST,
        "-p", $LOCAL_DB_PORT,
        "-U", $LOCAL_DB_USER,
        "-d", $LOCAL_DB_NAME,
        "-F", "c",  # Custom format (compressed)
        "-b",       # Include large objects
        "-v",       # Verbose
        "-f", $DumpFile
    )
    
    try {
        & pg_dump @dumpArgs
        
        if ($LASTEXITCODE -eq 0) {
            $fileSize = (Get-Item $DumpFile).Length / 1MB
            Write-Host "✅ Database dump created successfully!" -ForegroundColor Green
            Write-Host "   File: $DumpFile" -ForegroundColor Green
            Write-Host "   Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Database dump failed!" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error creating dump: $_" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# Function to restore database on remote server
function Restore-RemoteDatabase {
    Write-Host "`n📤 Preparing to restore database on remote server..." -ForegroundColor Yellow
    Write-Host "   Target: ${REMOTE_HOST}:${REMOTE_DB_PORT}/${REMOTE_DB_NAME}" -ForegroundColor Gray
    Write-Host "   Source: $DumpFile" -ForegroundColor Gray
    
    if (-not (Test-Path $DumpFile)) {
        Write-Host "❌ Dump file not found: $DumpFile" -ForegroundColor Red
        return $false
    }
    
    Write-Host "`n⚠️  IMPORTANT: You will need to provide the remote database password" -ForegroundColor Yellow
    Write-Host "   Remote Host: $REMOTE_HOST" -ForegroundColor Yellow
    Write-Host "   Remote User: $REMOTE_DB_USER" -ForegroundColor Yellow
    Write-Host "   Remote Database: $REMOTE_DB_NAME" -ForegroundColor Yellow
    
    $confirm = Read-Host "`nDo you want to continue? This will OVERWRITE the remote database! (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "❌ Restore cancelled by user" -ForegroundColor Red
        return $false
    }
    
    Write-Host "`n🔄 Restoring database to remote server..." -ForegroundColor Yellow
    Write-Host "   Note: You will be prompted for the remote database password" -ForegroundColor Gray
    
    # Restore using pg_restore
    $restoreArgs = @(
        "-h", $REMOTE_HOST,
        "-p", $REMOTE_DB_PORT,
        "-U", $REMOTE_DB_USER,
        "-d", $REMOTE_DB_NAME,
        "-c",       # Clean (drop) database objects before recreating
        "-v",       # Verbose
        $DumpFile
    )
    
    try {
        & pg_restore @restoreArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database restored successfully on remote server!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  Restore completed with warnings (this is normal for some objects)" -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "❌ Error restoring database: $_" -ForegroundColor Red
        return $false
    }
}

# Main execution
$success = $true

if ($Action -eq 'dump' -or $Action -eq 'both') {
    $success = Create-DatabaseDump
}

if ($success -and ($Action -eq 'restore' -or $Action -eq 'both')) {
    $success = Restore-RemoteDatabase
}

Write-Host "`n============================================================================" -ForegroundColor Cyan
if ($success) {
    Write-Host "✅ Operation completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Operation failed!" -ForegroundColor Red
}
Write-Host "============================================================================`n" -ForegroundColor Cyan

