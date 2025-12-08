# Fix vw_member_details_optimized view to include voting_station_name column
# This script applies the SQL fix to the production database

Write-Host "🔧 Fixing vw_member_details_optimized view..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Database connection details (update these if needed)
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "eff_membership_db" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }

# SQL file path
$SQL_FILE = "database-recovery/fix_optimized_view_voting_station.sql"

# Check if SQL file exists
if (-not (Test-Path $SQL_FILE)) {
    Write-Host "❌ Error: SQL file not found: $SQL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "📋 SQL File: $SQL_FILE" -ForegroundColor Yellow
Write-Host "🗄️  Database: $DB_NAME" -ForegroundColor Yellow
Write-Host "🖥️  Host: ${DB_HOST}:${DB_PORT}" -ForegroundColor Yellow
Write-Host "👤 User: $DB_USER" -ForegroundColor Yellow
Write-Host ""

# Prompt for password
$DB_PASSWORD = Read-Host "🔐 Enter PostgreSQL password for user '$DB_USER'" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
$PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
Write-Host ""

# Set environment variable for psql
$env:PGPASSWORD = $PlainPassword

# Execute the SQL file
Write-Host "⚙️  Executing SQL script..." -ForegroundColor Cyan
$result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_FILE 2>&1

# Check if the command was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ View fixed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Verifying the fix..." -ForegroundColor Cyan
    
    # Test query to verify voting_station_name column exists
    $verifyQuery = @"
SELECT 
    member_id,
    membership_number,
    firstname,
    surname,
    voting_station_name
FROM vw_member_details_optimized
LIMIT 3;
"@
    
    $verifyResult = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $verifyQuery 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Verification successful! The voting_station_name column is now accessible." -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Digital membership card generation should now work correctly!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Warning: Verification query failed. Please check the view manually." -ForegroundColor Yellow
        Write-Host $verifyResult
    }
} else {
    Write-Host ""
    Write-Host "❌ Error: Failed to execute SQL script." -ForegroundColor Red
    Write-Host "Please check the error messages above and try again." -ForegroundColor Red
    Write-Host $result
    
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD
    exit 1
}

# Clear password from environment
Remove-Item Env:\PGPASSWORD

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Script completed!" -ForegroundColor Green

