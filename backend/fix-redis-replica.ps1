# Fix Redis Replica Configuration
# This script converts a Redis replica back to a standalone master

Write-Host "Fixing Redis Replica Configuration..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if redis-cli is available
try {
    $null = redis-cli --version
} catch {
    Write-Host "ERROR: redis-cli is not found in PATH" -ForegroundColor Red
    Write-Host "   Please install Redis or add it to your PATH" -ForegroundColor Yellow
    exit 1
}

# Check if Redis is running
try {
    $pingResult = redis-cli ping 2>&1
    if ($pingResult -ne "PONG") {
        throw "Redis not responding"
    }
} catch {
    Write-Host "ERROR: Redis is not running or not accessible" -ForegroundColor Red
    Write-Host "   Please start Redis first" -ForegroundColor Yellow
    exit 1
}

Write-Host "Current Redis Role:" -ForegroundColor Yellow
redis-cli ROLE

Write-Host ""
Write-Host "Converting replica to master..." -ForegroundColor Cyan

# Remove replication (make this instance a master)
$result = redis-cli REPLICAOF NO ONE

Write-Host ""
Write-Host "SUCCESS: Redis is now a standalone MASTER" -ForegroundColor Green
Write-Host ""

Write-Host "New Redis Role:" -ForegroundColor Yellow
redis-cli ROLE

Write-Host ""
Write-Host "Testing write operation..." -ForegroundColor Cyan
try {
    $writeResult = redis-cli SET test:write_check "success" EX 10
    if ($writeResult -eq "OK") {
        Write-Host "SUCCESS: Write operation successful!" -ForegroundColor Green
        redis-cli DEL test:write_check | Out-Null
    } else {
        Write-Host "ERROR: Write operation failed" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: Write operation failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done! Your Redis is now configured as a master." -ForegroundColor Green
Write-Host ""
Write-Host "To make this permanent, update your Redis configuration file:" -ForegroundColor Yellow
Write-Host "   1. Find redis.conf (usually in C:\Program Files\Redis\ or where Redis is installed)" -ForegroundColor White
Write-Host "   2. Comment out or remove the line: replicaof <masterip> <masterport>" -ForegroundColor White
Write-Host "   3. Restart Redis service" -ForegroundColor White
Write-Host ""
Write-Host "   Or run this command to restart Redis service:" -ForegroundColor Yellow
Write-Host "   Restart-Service Redis" -ForegroundColor Cyan

