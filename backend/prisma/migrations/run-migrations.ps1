# PowerShell Script to Run Database Migrations
# Date: 2025-10-21
# Purpose: Automate running all database migrations for blocked services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Database Migrations Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Database credentials
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "eff_membership_db"
$DB_USER = "eff_admin"
$DB_PASSWORD = "Frames!123"

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $DB_PASSWORD

Write-Host "Database Configuration:" -ForegroundColor Yellow
Write-Host "  Host: $DB_HOST" -ForegroundColor Gray
Write-Host "  Port: $DB_PORT" -ForegroundColor Gray
Write-Host "  Database: $DB_NAME" -ForegroundColor Gray
Write-Host "  User: $DB_USER" -ForegroundColor Gray
Write-Host ""

# Check if psql is available
Write-Host "Checking PostgreSQL client..." -ForegroundColor Yellow
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "ERROR: psql command not found!" -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL client tools are installed and in your PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Run migrations manually using:" -ForegroundColor Yellow
    Write-Host "  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f prisma/migrations/run_all_migrations.sql" -ForegroundColor Gray
    Write-Host "  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f prisma/migrations/run_iec_migrations.sql" -ForegroundColor Gray
    exit 1
}

Write-Host "✓ PostgreSQL client found: $($psqlPath.Source)" -ForegroundColor Green
Write-Host ""

# Test database connection
Write-Host "Testing database connection..." -ForegroundColor Yellow
$testConnection = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot connect to database!" -ForegroundColor Red
    Write-Host "Error: $testConnection" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL is running" -ForegroundColor Gray
    Write-Host "  2. Database credentials are correct" -ForegroundColor Gray
    Write-Host "  3. Database '$DB_NAME' exists" -ForegroundColor Gray
    exit 1
}

Write-Host "✓ Database connection successful" -ForegroundColor Green
Write-Host ""

# Prompt user to continue
Write-Host "This script will run the following migrations:" -ForegroundColor Yellow
Write-Host "  001-005: Workflow and audit tables" -ForegroundColor Gray
Write-Host "  006-009: IEC mapping and ballot results tables" -ForegroundColor Gray
Write-Host ""
$continue = Read-Host "Do you want to continue? (Y/N)"

if ($continue -ne "Y" -and $continue -ne "y") {
    Write-Host "Migration cancelled by user." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Running Migrations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Run workflow migrations (001-005)
Write-Host ">>> Running Workflow Migrations (001-005)..." -ForegroundColor Cyan
Write-Host ""

$workflowMigrationFile = "prisma/migrations/run_all_migrations.sql"

if (-not (Test-Path $workflowMigrationFile)) {
    Write-Host "ERROR: Migration file not found: $workflowMigrationFile" -ForegroundColor Red
    exit 1
}

$result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $workflowMigrationFile 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Workflow migrations failed!" -ForegroundColor Red
    Write-Host "Error: $result" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Workflow migrations completed successfully" -ForegroundColor Green
Write-Host ""

# Run IEC mapping migrations (006-009)
Write-Host ">>> Running IEC Mapping Migrations (006-009)..." -ForegroundColor Cyan
Write-Host ""

$iecMigrationFile = "prisma/migrations/run_iec_migrations.sql"

if (-not (Test-Path $iecMigrationFile)) {
    Write-Host "ERROR: Migration file not found: $iecMigrationFile" -ForegroundColor Red
    exit 1
}

$result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $iecMigrationFile 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: IEC mapping migrations failed!" -ForegroundColor Red
    Write-Host "Error: $result" -ForegroundColor Red
    exit 1
}

Write-Host "✓ IEC mapping migrations completed successfully" -ForegroundColor Green
Write-Host ""

# Verify tables were created
Write-Host ">>> Verifying tables..." -ForegroundColor Cyan
Write-Host ""

$verifyQuery = @"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'approval_audit_trail',
    'workflow_notifications',
    'renewal_financial_audit_trail',
    'financial_operations_audit',
    'iec_province_mappings',
    'iec_municipality_mappings',
    'iec_ward_mappings',
    'iec_lge_ballot_results'
)
ORDER BY table_name;
"@

$tables = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c $verifyQuery 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not verify tables" -ForegroundColor Yellow
} else {
    Write-Host "Tables created:" -ForegroundColor Green
    $tables | ForEach-Object { 
        $tableName = $_.Trim()
        if ($tableName) {
            Write-Host "  ✓ $tableName" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Migrations Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update Prisma schema from database:" -ForegroundColor Gray
Write-Host "     npx prisma db pull" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Generate Prisma client:" -ForegroundColor Gray
Write-Host "     npx prisma generate" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Complete migration of blocked services:" -ForegroundColor Gray
Write-Host "     - twoTierApprovalService.ts" -ForegroundColor Cyan
Write-Host "     - iecGeographicMappingService.ts" -ForegroundColor Cyan
Write-Host "     - iecLgeBallotResultsService.ts" -ForegroundColor Cyan
Write-Host ""

# Clean up environment variable
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

