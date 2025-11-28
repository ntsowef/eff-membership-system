# PowerShell Script to Create Membership Expiration Views
# This script executes the SQL file to create the views with metro municipality support

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Create Membership Expiration Views                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
$envFile = ".env.postgres"
if (Test-Path $envFile) {
    Write-Host "📋 Loading environment variables from $envFile..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "⚠️  Warning: $envFile not found" -ForegroundColor Yellow
}

# Get database credentials
$DB_HOST = $env:DB_HOST
if (-not $DB_HOST) { $DB_HOST = "localhost" }

$DB_PORT = $env:DB_PORT
if (-not $DB_PORT) { $DB_PORT = "5432" }

$DB_USER = $env:DB_USER
if (-not $DB_USER) { $DB_USER = "eff_admin" }

$DB_PASSWORD = $env:POSTGRES_PASSWORD
if (-not $DB_PASSWORD) { $DB_PASSWORD = $env:DB_PASSWORD }

$DB_NAME = $env:DB_NAME
if (-not $DB_NAME) { $DB_NAME = "eff_membership_db" }

Write-Host "🔧 Database Configuration:" -ForegroundColor Cyan
Write-Host "   Host: $DB_HOST" -ForegroundColor Gray
Write-Host "   Port: $DB_PORT" -ForegroundColor Gray
Write-Host "   User: $DB_USER" -ForegroundColor Gray
Write-Host "   Database: $DB_NAME" -ForegroundColor Gray
Write-Host ""

# SQL file path
$sqlFile = "database-recovery\create-membership-expiration-views.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Error: SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 SQL File: $sqlFile" -ForegroundColor Green
Write-Host ""

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "✅ psql found: $($psqlPath.Source)" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Executing SQL script..." -ForegroundColor Yellow
    Write-Host ""
    
    # Set PGPASSWORD environment variable
    $env:PGPASSWORD = $DB_PASSWORD
    
    # Execute SQL file
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $sqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ SQL script executed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Next Steps:" -ForegroundColor Cyan
        Write-Host "   1. Restart the backend server" -ForegroundColor Gray
        Write-Host "   2. Test the API endpoint" -ForegroundColor Gray
        Write-Host "   3. Verify the Enhanced Membership Overview dashboard" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Error executing SQL script (Exit code: $LASTEXITCODE)" -ForegroundColor Red
    }
    
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD
    
} else {
    Write-Host "⚠️  psql not found in PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Alternative Options:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 1: Using Docker" -ForegroundColor Yellow
    Write-Host "   docker cp $sqlFile postgres_container:/tmp/" -ForegroundColor Gray
    Write-Host "   docker exec -it postgres_container psql -U $DB_USER -d $DB_NAME -f /tmp/create-membership-expiration-views.sql" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Using pgAdmin" -ForegroundColor Yellow
    Write-Host "   1. Open pgAdmin (http://localhost:5050)" -ForegroundColor Gray
    Write-Host "   2. Connect to $DB_NAME" -ForegroundColor Gray
    Write-Host "   3. Open Query Tool" -ForegroundColor Gray
    Write-Host "   4. Load $sqlFile" -ForegroundColor Gray
    Write-Host "   5. Execute the script" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 3: Using Node.js" -ForegroundColor Yellow
    Write-Host "   node scripts/execute-sql-file.js $sqlFile" -ForegroundColor Gray
}

Write-Host ""

