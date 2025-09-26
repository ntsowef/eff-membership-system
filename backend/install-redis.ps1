# Redis Installation Script for Windows
# This script downloads and installs Redis for Windows

Write-Host "🔧 Installing Redis for Windows..." -ForegroundColor Green

# Check if Redis is already installed
$redisPath = "C:\Redis"
$redisExe = "$redisPath\redis-server.exe"

if (Test-Path $redisExe) {
    Write-Host "✅ Redis is already installed at $redisPath" -ForegroundColor Green
    
    # Check if Redis is running
    $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    if ($redisProcess) {
        Write-Host "✅ Redis is already running (PID: $($redisProcess.Id))" -ForegroundColor Green
    } else {
        Write-Host "🚀 Starting Redis server..." -ForegroundColor Yellow
        Start-Process -FilePath $redisExe -WorkingDirectory $redisPath -WindowStyle Minimized
        Start-Sleep -Seconds 2
        
        $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
        if ($redisProcess) {
            Write-Host "✅ Redis started successfully (PID: $($redisProcess.Id))" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to start Redis" -ForegroundColor Red
        }
    }
    exit 0
}

# Create Redis directory
Write-Host "📁 Creating Redis directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $redisPath -Force | Out-Null

# Download Redis for Windows
$redisUrl = "https://github.com/microsoftarchive/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.zip"
$zipPath = "$env:TEMP\redis.zip"

Write-Host "⬇️  Downloading Redis from GitHub..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $redisUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "✅ Redis downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download Redis: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Extract Redis
Write-Host "📦 Extracting Redis..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $zipPath -DestinationPath $redisPath -Force
    Write-Host "✅ Redis extracted successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to extract Redis: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Clean up
Remove-Item $zipPath -Force

# Create Redis configuration file
$redisConf = @"
# Redis Configuration for Membership System
port 6379
bind 127.0.0.1
timeout 0
tcp-keepalive 300
daemonize no
supervised no
pidfile redis.pid
loglevel notice
logfile ""
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir ./
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly no
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
lua-time-limit 5000
slowlog-log-slower-than 10000
slowlog-max-len 128
latency-monitor-threshold 0
notify-keyspace-events ""
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
aof-rewrite-incremental-fsync yes
"@

$configPath = "$redisPath\redis.conf"
$redisConf | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "✅ Redis configuration created at $configPath" -ForegroundColor Green

# Add Redis to PATH (optional)
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$redisPath*") {
    Write-Host "🔧 Adding Redis to PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$redisPath", "User")
    Write-Host "✅ Redis added to PATH (restart terminal to use 'redis-server' command)" -ForegroundColor Green
}

# Start Redis server
Write-Host "🚀 Starting Redis server..." -ForegroundColor Yellow
try {
    Start-Process -FilePath $redisExe -ArgumentList $configPath -WorkingDirectory $redisPath -WindowStyle Minimized
    Start-Sleep -Seconds 3
    
    # Check if Redis is running
    $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    if ($redisProcess) {
        Write-Host "✅ Redis started successfully (PID: $($redisProcess.Id))" -ForegroundColor Green
        Write-Host "📍 Redis is running on localhost:6379" -ForegroundColor Green
        Write-Host "🔧 Configuration file: $configPath" -ForegroundColor Cyan
        Write-Host "📁 Installation directory: $redisPath" -ForegroundColor Cyan
        
        # Test Redis connection
        Write-Host "🧪 Testing Redis connection..." -ForegroundColor Yellow
        try {
            $testResult = & "$redisPath\redis-cli.exe" ping
            if ($testResult -eq "PONG") {
                Write-Host "✅ Redis connection test successful!" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Redis connection test returned: $testResult" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️  Could not test Redis connection: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "🎉 Redis installation completed successfully!" -ForegroundColor Green
        Write-Host "💡 To stop Redis: Get-Process redis-server | Stop-Process" -ForegroundColor Cyan
        Write-Host "💡 To start Redis manually: & '$redisExe' '$configPath'" -ForegroundColor Cyan
        
    } else {
        Write-Host "❌ Redis failed to start" -ForegroundColor Red
        Write-Host "💡 Try running manually: & '$redisExe' '$configPath'" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to start Redis: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try running manually: & '$redisExe' '$configPath'" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Redis Installation Summary:" -ForegroundColor Cyan
Write-Host "   Installation Path: $redisPath" -ForegroundColor White
Write-Host "   Configuration: $configPath" -ForegroundColor White
Write-Host "   Server: localhost:6379" -ForegroundColor White
Write-Host "   Memory Limit: 256MB" -ForegroundColor White
