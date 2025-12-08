# ============================================================================
# Test Remote PostgreSQL Connection
# ============================================================================
# This script tests connectivity to the remote PostgreSQL server
# Run this before attempting a restore to verify everything is set up correctly
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$RemoteHost = "69.164.245.173",
    
    [Parameter(Mandatory=$false)]
    [string]$RemotePort = "5432",
    
    [Parameter(Mandatory=$false)]
    [string]$RemoteUser = "eff_admin",
    
    [Parameter(Mandatory=$false)]
    [string]$RemoteDatabase = "eff_membership_database"
)

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "Remote PostgreSQL Connection Test" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

Write-Host "Testing connection to:" -ForegroundColor Yellow
Write-Host "  Host: $RemoteHost" -ForegroundColor Gray
Write-Host "  Port: $RemotePort" -ForegroundColor Gray
Write-Host "  User: $RemoteUser" -ForegroundColor Gray
Write-Host "  Database: $RemoteDatabase`n" -ForegroundColor Gray

# Test 1: Network connectivity (ping)
Write-Host "Test 1: Network Connectivity (Ping)" -ForegroundColor Yellow
try {
    $ping = Test-Connection -ComputerName $RemoteHost -Count 2 -Quiet
    if ($ping) {
        Write-Host "  ✅ Host is reachable" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Host is not reachable" -ForegroundColor Red
        Write-Host "  Check your network connection and firewall settings" -ForegroundColor Red
    }
} catch {
    Write-Host "  ⚠️  Ping test failed: $_" -ForegroundColor Yellow
    Write-Host "  This may be normal if ICMP is blocked" -ForegroundColor Gray
}

# Test 2: Port connectivity
Write-Host "`nTest 2: PostgreSQL Port Connectivity" -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connect = $tcpClient.BeginConnect($RemoteHost, $RemotePort, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne(5000, $false)
    
    if ($wait) {
        try {
            $tcpClient.EndConnect($connect)
            Write-Host "  ✅ Port $RemotePort is open and accepting connections" -ForegroundColor Green
            $tcpClient.Close()
        } catch {
            Write-Host "  ❌ Port $RemotePort is not accessible" -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ Connection timeout - port $RemotePort may be blocked" -ForegroundColor Red
        Write-Host "  Check firewall rules on remote server" -ForegroundColor Red
        $tcpClient.Close()
    }
} catch {
    Write-Host "  ❌ Port test failed: $_" -ForegroundColor Red
}

# Test 3: PostgreSQL client tools
Write-Host "`nTest 3: PostgreSQL Client Tools" -ForegroundColor Yellow
$pgDumpExists = Get-Command pg_dump -ErrorAction SilentlyContinue
$pgRestoreExists = Get-Command pg_restore -ErrorAction SilentlyContinue
$psqlExists = Get-Command psql -ErrorAction SilentlyContinue

if ($pgDumpExists) {
    Write-Host "  ✅ pg_dump is installed" -ForegroundColor Green
} else {
    Write-Host "  ❌ pg_dump is not installed" -ForegroundColor Red
    Write-Host "  Install PostgreSQL client tools from: https://www.postgresql.org/download/" -ForegroundColor Red
}

if ($pgRestoreExists) {
    Write-Host "  ✅ pg_restore is installed" -ForegroundColor Green
} else {
    Write-Host "  ❌ pg_restore is not installed" -ForegroundColor Red
}

if ($psqlExists) {
    Write-Host "  ✅ psql is installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  psql is not installed (optional)" -ForegroundColor Yellow
}

# Test 4: Database connection
Write-Host "`nTest 4: PostgreSQL Database Connection" -ForegroundColor Yellow
Write-Host "  You will be prompted for the database password..." -ForegroundColor Gray

if ($psqlExists) {
    $testQuery = "SELECT version();"
    
    try {
        $result = & psql -h $RemoteHost -p $RemotePort -U $RemoteUser -d $RemoteDatabase -c $testQuery -t 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Successfully connected to database" -ForegroundColor Green
            Write-Host "  PostgreSQL Version: $($result.Trim())" -ForegroundColor Gray
            
            # Get database size
            $sizeQuery = "SELECT pg_size_pretty(pg_database_size('$RemoteDatabase'));"
            $size = & psql -h $RemoteHost -p $RemotePort -U $RemoteUser -d $RemoteDatabase -c $sizeQuery -t 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Database Size: $($size.Trim())" -ForegroundColor Gray
            }
            
            # Get table count
            $tableQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
            $tables = & psql -h $RemoteHost -p $RemotePort -U $RemoteUser -d $RemoteDatabase -c $tableQuery -t 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Table Count: $($tables.Trim())" -ForegroundColor Gray
            }
        } else {
            Write-Host "  ❌ Failed to connect to database" -ForegroundColor Red
            Write-Host "  Error: $result" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ Connection test failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️  Skipped (psql not installed)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

$allGood = $ping -and $pgDumpExists -and $pgRestoreExists

if ($allGood) {
    Write-Host "✅ All critical tests passed!" -ForegroundColor Green
    Write-Host "You can proceed with the database dump and restore." -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Please address the issues above before proceeding." -ForegroundColor Yellow
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. If all tests passed, run: .\dump-and-restore.ps1" -ForegroundColor Gray
Write-Host "  2. If tests failed, fix the issues and run this test again" -ForegroundColor Gray
Write-Host "  3. See README.md for detailed troubleshooting" -ForegroundColor Gray

Write-Host "`n============================================================================`n" -ForegroundColor Cyan

