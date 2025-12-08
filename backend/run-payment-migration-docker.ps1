# =====================================================================================
# Run Payment Tables Migration via Docker
# =====================================================================================
# This PowerShell script runs the migration on the remote PostgreSQL Docker container
# =====================================================================================

Write-Host "🔄 Starting payment tables migration via Docker..." -ForegroundColor Cyan
Write-Host "📍 Remote Server: 69.164.245.173" -ForegroundColor Gray
Write-Host ""

# Configuration
$REMOTE_HOST = "69.164.245.173"
$DB_USER = "eff_admin"
$DB_PASSWORD = "Frames!123"
$DB_NAME = "eff_membership_db"
$MIGRATION_FILE = "create_payment_transactions_tables.sql"

# Get the script directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR
$MIGRATION_PATH = Join-Path $PROJECT_ROOT "database-recovery\$MIGRATION_FILE"

# Check if migration file exists
if (-not (Test-Path $MIGRATION_PATH)) {
    Write-Host "❌ Error: Migration file not found at $MIGRATION_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Migration file found: $MIGRATION_FILE" -ForegroundColor Green
Write-Host ""

# Instructions for running on the server
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  MIGRATION INSTRUCTIONS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Since we cannot connect directly from Windows to the Docker PostgreSQL," -ForegroundColor White
Write-Host "please run the following commands on your server (69.164.245.173):" -ForegroundColor White
Write-Host ""
Write-Host "Option 1: Using Docker exec" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "# Copy the migration file to the server first, then:" -ForegroundColor Gray
Write-Host "docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < /path/to/create_payment_transactions_tables.sql" -ForegroundColor Green
Write-Host ""
Write-Host "Option 2: Using psql directly on the server" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "PGPASSWORD='Frames!123' psql -h localhost -p 5432 -U eff_admin -d eff_membership_db -f /path/to/create_payment_transactions_tables.sql" -ForegroundColor Green
Write-Host ""
Write-Host "Option 3: Copy-paste SQL directly" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db" -ForegroundColor Green
Write-Host "# Then copy and paste the SQL from: $MIGRATION_PATH" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Ask if user wants to see the SQL content
$showSQL = Read-Host "Would you like to see the SQL content to copy? (Y/N)"

if ($showSQL -eq "Y" -or $showSQL -eq "y") {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  SQL MIGRATION CONTENT" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Get-Content $MIGRATION_PATH | Write-Host -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📋 Migration file location: $MIGRATION_PATH" -ForegroundColor Yellow
Write-Host ""
Write-Host "After running the migration on the server, verify with:" -ForegroundColor White
Write-Host "docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db -c '\dt payment*'" -ForegroundColor Green
Write-Host ""

