# =====================================================
# Unified Financial Transactions View Migration Script (PowerShell)
# Purpose: Run the migration on the server PostgreSQL database
# =====================================================

# Script configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MigrationFile1 = "021_unified_financial_transactions_view_server.sql"
$MigrationFile2 = "023_financial_dashboard_summary_tables_server.sql"
$MigrationPath1 = Join-Path $ScriptDir $MigrationFile1
$MigrationPath2 = Join-Path $ScriptDir $MigrationFile2

Write-Host "=========================================" -ForegroundColor Blue
Write-Host "Unified Financial Views Migration Script" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue
Write-Host ""

# Check if migration files exist
if (-not (Test-Path $MigrationPath1)) {
    Write-Host "Error: Migration file 021 not found at $MigrationPath1" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $MigrationPath2)) {
    Write-Host "Error: Migration file 023 not found at $MigrationPath2" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Both migration files found" -ForegroundColor Green
Write-Host ""

# Prompt for database connection details
Write-Host "Please provide PostgreSQL connection details:" -ForegroundColor Yellow
Write-Host ""

$DB_HOST = Read-Host "Database Host (default: localhost)"
if ([string]::IsNullOrWhiteSpace($DB_HOST)) { $DB_HOST = "localhost" }

$DB_PORT = Read-Host "Database Port (default: 5432)"
if ([string]::IsNullOrWhiteSpace($DB_PORT)) { $DB_PORT = "5432" }

$DB_NAME = Read-Host "Database Name (default: eff_membership_db)"
if ([string]::IsNullOrWhiteSpace($DB_NAME)) { $DB_NAME = "eff_membership_db" }

$DB_USER = Read-Host "Database User (default: eff_admin)"
if ([string]::IsNullOrWhiteSpace($DB_USER)) { $DB_USER = "eff_admin" }

$SecurePassword = Read-Host "Database Password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

Write-Host ""

# Confirm before proceeding
Write-Host "Connection Details:" -ForegroundColor Yellow
Write-Host "  Host: $DB_HOST"
Write-Host "  Port: $DB_PORT"
Write-Host "  Database: $DB_NAME"
Write-Host "  User: $DB_USER"
Write-Host ""

$Confirm = Read-Host "Proceed with migration? (yes/no)"
if ($Confirm -ne "yes") {
    Write-Host "Migration cancelled." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Starting migrations..." -ForegroundColor Blue
Write-Host ""

# Set password environment variable
$env:PGPASSWORD = $DB_PASSWORD

# Run the migrations
try {
    # Run Migration 021 - Financial Views
    Write-Host "Running Migration 021: Financial Transaction Views..." -ForegroundColor Blue
    $psqlCommand1 = "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f `"$MigrationPath1`""

    Write-Host "Executing: $psqlCommand1" -ForegroundColor Gray
    Write-Host ""

    $result1 = Invoke-Expression $psqlCommand1

    if ($LASTEXITCODE -ne 0) {
        throw "Migration 021 failed with exit code $LASTEXITCODE"
    }

    Write-Host ""
    Write-Host "Migration 021 completed successfully!" -ForegroundColor Green
    Write-Host ""

    # Run Migration 023 - Dashboard Tables
    Write-Host "Running Migration 023: Financial Dashboard Tables..." -ForegroundColor Blue
    $psqlCommand2 = "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f `"$MigrationPath2`""

    Write-Host "Executing: $psqlCommand2" -ForegroundColor Gray
    Write-Host ""

    $result2 = Invoke-Expression $psqlCommand2

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "All migrations completed successfully!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Migration 021 - Financial Views:" -ForegroundColor Green
        Write-Host "  ✓ unified_financial_transactions" -ForegroundColor Green
        Write-Host "  ✓ financial_transactions_summary" -ForegroundColor Green
        Write-Host "  ✓ pending_financial_reviews" -ForegroundColor Green
        Write-Host "  ✓ financial_audit_trail_view" -ForegroundColor Green
        Write-Host ""
        Write-Host "Migration 023 - Dashboard Tables:" -ForegroundColor Green
        Write-Host "  ✓ daily_financial_summary" -ForegroundColor Green
        Write-Host "  ✓ monthly_financial_summary" -ForegroundColor Green
        Write-Host "  ✓ financial_reviewer_performance" -ForegroundColor Green
        Write-Host "  ✓ financial_dashboard_cache" -ForegroundColor Green
        Write-Host "  ✓ financial_kpi_tracking (with 13 initial KPIs)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Performance indexes have been created." -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Blue
        Write-Host "  1. Restart your backend application"
        Write-Host "  2. Test the financial dashboard endpoints"
        Write-Host "  3. Verify National Admin can access financial reviews"
        Write-Host ""
    } else {
        throw "psql command failed with exit code $LASTEXITCODE"
    }
}
catch {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "Migration failed!" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL client tools (psql) are installed"
    Write-Host "  2. psql is in your system PATH"
    Write-Host "  3. Database connection details are correct"
    Write-Host "  4. You have necessary permissions"
    Write-Host ""
    
    # Alternative: Show manual command
    Write-Host "Alternative: Run this command manually:" -ForegroundColor Yellow
    Write-Host "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f `"$MigrationPath`"" -ForegroundColor Cyan
    Write-Host ""
    
    exit 1
}
finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

exit 0

