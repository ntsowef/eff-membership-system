# ============================================================================
# PostgreSQL Docker Database Dump and Remote Restore Script
# ============================================================================
# This script creates a database dump from Docker container and restores it
# on a remote Docker container
# 
# Usage:
#   .\docker-dump-and-restore.ps1 -Action dump          # Create dump only
#   .\docker-dump-and-restore.ps1 -Action restore       # Restore to remote only
#   .\docker-dump-and-restore.ps1 -Action both          # Dump and restore
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

# Local Docker container configuration
$LOCAL_CONTAINER = "eff-membership-postgres"
$LOCAL_DB_USER = $env:POSTGRES_USER
$LOCAL_DB_PASSWORD = $env:POSTGRES_PASSWORD
$LOCAL_DB_NAME = $env:POSTGRES_DB

# Remote server configuration
$REMOTE_HOST = "69.164.245.173"
$REMOTE_CONTAINER = "eff-membership-postgres"  # Update if different
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
    $DumpFile = "eff_membership_${TIMESTAMP}.sql"
}
$LOCAL_DUMP_PATH = Join-Path $BACKUP_DIR $DumpFile

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Docker Database Dump and Restore Utility" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

# Function to create database dump from Docker container
function Create-DockerDump {
    Write-Host "📦 Creating database dump from Docker container..." -ForegroundColor Yellow
    Write-Host "   Container: $LOCAL_CONTAINER" -ForegroundColor Gray
    Write-Host "   Database: $LOCAL_DB_NAME" -ForegroundColor Gray
    Write-Host "   Output: $LOCAL_DUMP_PATH" -ForegroundColor Gray
    
    # Check if container is running
    $containerRunning = docker ps --filter "name=$LOCAL_CONTAINER" --format "{{.Names}}"
    if ($containerRunning -ne $LOCAL_CONTAINER) {
        Write-Host "❌ Container '$LOCAL_CONTAINER' is not running!" -ForegroundColor Red
        Write-Host "   Start it with: docker-compose -f docker-compose.postgres.yml up -d" -ForegroundColor Yellow
        return $false
    }
    
    try {
        # Create dump inside container and copy to host
        Write-Host "   Creating dump inside container..." -ForegroundColor Gray
        
        $dumpCmd = "PGPASSWORD='$LOCAL_DB_PASSWORD' pg_dump -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -F c -b -v -f /tmp/$DumpFile"
        docker exec $LOCAL_CONTAINER sh -c $dumpCmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   Copying dump from container to host..." -ForegroundColor Gray
            docker cp "${LOCAL_CONTAINER}:/tmp/$DumpFile" $LOCAL_DUMP_PATH
            
            # Clean up dump from container
            docker exec $LOCAL_CONTAINER rm "/tmp/$DumpFile"
            
            $fileSize = (Get-Item $LOCAL_DUMP_PATH).Length / 1MB
            Write-Host "✅ Database dump created successfully!" -ForegroundColor Green
            Write-Host "   File: $LOCAL_DUMP_PATH" -ForegroundColor Green
            Write-Host "   Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Database dump failed!" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error creating dump: $_" -ForegroundColor Red
        return $false
    }
}

# Function to restore database on remote Docker container
function Restore-RemoteDockerDatabase {
    Write-Host "`n📤 Preparing to restore database on remote Docker container..." -ForegroundColor Yellow
    Write-Host "   Remote Host: $REMOTE_HOST" -ForegroundColor Gray
    Write-Host "   Remote Container: $REMOTE_CONTAINER" -ForegroundColor Gray
    Write-Host "   Database: $REMOTE_DB_NAME" -ForegroundColor Gray
    Write-Host "   Source: $LOCAL_DUMP_PATH" -ForegroundColor Gray
    
    if (-not (Test-Path $LOCAL_DUMP_PATH)) {
        Write-Host "❌ Dump file not found: $LOCAL_DUMP_PATH" -ForegroundColor Red
        return $false
    }
    
    Write-Host "`n⚠️  IMPORTANT: This will OVERWRITE the remote database!" -ForegroundColor Yellow
    Write-Host "   You will need SSH access to the remote server" -ForegroundColor Yellow
    
    $confirm = Read-Host "`nDo you want to continue? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "❌ Restore cancelled by user" -ForegroundColor Red
        return $false
    }
    
    $sshUser = Read-Host "Enter SSH username for $REMOTE_HOST"
    
    Write-Host "`n🔄 Restoring database to remote server..." -ForegroundColor Yellow
    
    try {
        # Copy dump file to remote server
        Write-Host "   1. Copying dump file to remote server..." -ForegroundColor Gray
        scp $LOCAL_DUMP_PATH "${sshUser}@${REMOTE_HOST}:/tmp/$DumpFile"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to copy file to remote server" -ForegroundColor Red
            return $false
        }
        
        # Copy dump into remote container and restore
        Write-Host "   2. Copying dump into remote container..." -ForegroundColor Gray
        ssh "${sshUser}@${REMOTE_HOST}" "docker cp /tmp/$DumpFile ${REMOTE_CONTAINER}:/tmp/$DumpFile"
        
        Write-Host "   3. Restoring database in remote container..." -ForegroundColor Gray
        $restoreCmd = "PGPASSWORD=`$POSTGRES_PASSWORD pg_restore -U $REMOTE_DB_USER -d $REMOTE_DB_NAME -c -v /tmp/$DumpFile"
        ssh "${sshUser}@${REMOTE_HOST}" "docker exec $REMOTE_CONTAINER sh -c '$restoreCmd'"
        
        # Clean up
        Write-Host "   4. Cleaning up temporary files..." -ForegroundColor Gray
        ssh "${sshUser}@${REMOTE_HOST}" "docker exec $REMOTE_CONTAINER rm /tmp/$DumpFile"
        ssh "${sshUser}@${REMOTE_HOST}" "rm /tmp/$DumpFile"
        
        Write-Host "✅ Database restored successfully on remote server!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Error restoring database: $_" -ForegroundColor Red
        return $false
    }
}

# Main execution
$success = $true

if ($Action -eq 'dump' -or $Action -eq 'both') {
    $success = Create-DockerDump
}

if ($success -and ($Action -eq 'restore' -or $Action -eq 'both')) {
    $success = Restore-RemoteDockerDatabase
}

Write-Host "`n============================================================================" -ForegroundColor Cyan
if ($success) {
    Write-Host "✅ Operation completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Operation failed!" -ForegroundColor Red
}
Write-Host "============================================================================`n" -ForegroundColor Cyan

