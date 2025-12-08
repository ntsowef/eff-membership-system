# ============================================================================
# Test Docker Setup for Database Dump and Restore
# ============================================================================
# This script verifies that your Docker environment is ready for
# database dump and restore operations
# ============================================================================

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "Docker Setup Verification for Database Dump and Restore" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

$allGood = $true

# Test 1: Docker is installed and running
Write-Host "Test 1: Docker Installation and Status" -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Docker is installed: $dockerVersion" -ForegroundColor Green
        
        # Check if Docker daemon is running
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Docker daemon is running" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Docker daemon is not running" -ForegroundColor Red
            Write-Host "  Start Docker Desktop and try again" -ForegroundColor Red
            $allGood = $false
        }
    } else {
        Write-Host "  ❌ Docker is not installed" -ForegroundColor Red
        Write-Host "  Install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  ❌ Docker check failed: $_" -ForegroundColor Red
    $allGood = $false
}

# Test 2: Local PostgreSQL container
Write-Host "`nTest 2: Local PostgreSQL Container" -ForegroundColor Yellow
$containerName = "eff-membership-postgres"
$containerRunning = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>&1

if ($containerRunning -eq $containerName) {
    Write-Host "  ✅ Container '$containerName' is running" -ForegroundColor Green
    
    # Get container details
    $containerStatus = docker ps --filter "name=$containerName" --format "{{.Status}}" 2>&1
    Write-Host "  Status: $containerStatus" -ForegroundColor Gray
    
    # Test database connection
    Write-Host "  Testing database connection..." -ForegroundColor Gray
    $testQuery = docker exec $containerName psql -U eff_admin -d eff_membership_database -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Database is accessible" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Database connection test failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Container '$containerName' is not running" -ForegroundColor Red
    Write-Host "  Start it with: docker-compose -f docker-compose.postgres.yml up -d" -ForegroundColor Yellow
    $allGood = $false
}

# Test 3: Environment file
Write-Host "`nTest 3: Environment Configuration" -ForegroundColor Yellow
$envFile = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envFile) {
    Write-Host "  ✅ .env file exists" -ForegroundColor Green
    
    # Check for required variables
    $envContent = Get-Content $envFile
    $requiredVars = @("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB")
    $missingVars = @()
    
    foreach ($var in $requiredVars) {
        if (-not ($envContent | Select-String -Pattern "^$var=")) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -eq 0) {
        Write-Host "  ✅ All required variables are present" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Missing variables: $($missingVars -join ', ')" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ .env file not found" -ForegroundColor Red
    Write-Host "  Copy .env.postgres to .env and configure it" -ForegroundColor Yellow
    $allGood = $false
}

# Test 4: Backup directory
Write-Host "`nTest 4: Backup Directory" -ForegroundColor Yellow
$backupDir = Join-Path $PSScriptRoot ".." "backups" "postgres"
if (Test-Path $backupDir) {
    Write-Host "  ✅ Backup directory exists: $backupDir" -ForegroundColor Green
    
    # Check write permissions
    try {
        $testFile = Join-Path $backupDir "test_write.tmp"
        "test" | Out-File -FilePath $testFile -ErrorAction Stop
        Remove-Item $testFile -ErrorAction SilentlyContinue
        Write-Host "  ✅ Directory is writable" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Directory is not writable" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "  ⚠️  Backup directory doesn't exist (will be created)" -ForegroundColor Yellow
}

# Test 5: SSH client (for remote restore)
Write-Host "`nTest 5: SSH Client (for remote restore)" -ForegroundColor Yellow
try {
    $sshVersion = ssh -V 2>&1
    Write-Host "  ✅ SSH client is available: $sshVersion" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  SSH client not found" -ForegroundColor Yellow
    Write-Host "  SSH is required for remote restore" -ForegroundColor Gray
}

# Test 6: SCP (for file transfer)
Write-Host "`nTest 6: SCP (for file transfer)" -ForegroundColor Yellow
try {
    $scpTest = Get-Command scp -ErrorAction Stop
    Write-Host "  ✅ SCP is available" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  SCP not found" -ForegroundColor Yellow
    Write-Host "  SCP is required for remote restore" -ForegroundColor Gray
}

# Test 7: Remote server connectivity (optional)
Write-Host "`nTest 7: Remote Server Connectivity (Optional)" -ForegroundColor Yellow
$remoteHost = "69.164.245.173"
try {
    $ping = Test-Connection -ComputerName $remoteHost -Count 2 -Quiet
    if ($ping) {
        Write-Host "  ✅ Remote server is reachable" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Remote server is not reachable" -ForegroundColor Yellow
        Write-Host "  This may be normal if ICMP is blocked" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  Connectivity test failed" -ForegroundColor Yellow
}

# Summary
Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "✅ All critical tests passed!" -ForegroundColor Green
    Write-Host "Your system is ready for database dump and restore operations." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: .\backup-scripts\docker-dump-and-restore.ps1 -Action dump" -ForegroundColor Gray
    Write-Host "  2. Verify the dump file was created" -ForegroundColor Gray
    Write-Host "  3. Run full dump and restore when ready" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Some critical tests failed." -ForegroundColor Yellow
    Write-Host "Please address the issues above before proceeding." -ForegroundColor Yellow
    Write-Host "`nCommon fixes:" -ForegroundColor Cyan
    Write-Host "  - Start Docker Desktop" -ForegroundColor Gray
    Write-Host "  - Run: docker-compose -f docker-compose.postgres.yml up -d" -ForegroundColor Gray
    Write-Host "  - Ensure .env file exists and is configured" -ForegroundColor Gray
}

Write-Host "`n============================================================================`n" -ForegroundColor Cyan

