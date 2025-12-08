# PowerShell script to apply the vw_member_details_optimized view fix
# This fixes the missing expiry_date column error

Write-Host "🔧 Applying vw_member_details_optimized view fix..." -ForegroundColor Cyan
Write-Host ""

# Database connection details
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "eff_membership_db" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "postgres" }

Write-Host "Database: $DB_NAME" -ForegroundColor Yellow
Write-Host "Host: ${DB_HOST}:${DB_PORT}" -ForegroundColor Yellow
Write-Host "User: $DB_USER" -ForegroundColor Yellow
Write-Host ""

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $DB_PASSWORD

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ Error: psql command not found. Please install PostgreSQL client." -ForegroundColor Red
    Write-Host "   Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir "fix_optimized_view_expiry_date.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Error: SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

# Apply the fix
Write-Host "📝 Applying SQL fix..." -ForegroundColor Cyan
$result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $sqlFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ View fix applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Verifying view columns..." -ForegroundColor Cyan
    
    # Verify the view has the required columns
    $verifyQuery = @"
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vw_member_details_optimized' 
  AND column_name IN ('expiry_date', 'membership_status', 'days_until_expiry', 'membership_amount', 'last_payment_date', 'date_joined')
ORDER BY column_name;
"@
    
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $verifyQuery
    
    Write-Host ""
    Write-Host "✨ Done! The view now includes all required columns." -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Restart your backend server (pm2 restart eff-api)" -ForegroundColor White
    Write-Host "   2. Clear Redis cache: redis-cli FLUSHALL" -ForegroundColor White
    Write-Host "   3. Test the digital card functionality" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Error applying view fix. Error details:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "   1. Check if PostgreSQL is running" -ForegroundColor White
    Write-Host "   2. Verify database credentials" -ForegroundColor White
    Write-Host "   3. Ensure you have permissions to modify views" -ForegroundColor White
    exit 1
}

# Clean up
Remove-Item Env:\PGPASSWORD

