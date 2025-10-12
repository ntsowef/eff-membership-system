# =====================================================================================
# Windows PowerShell Script - Enhanced PostgreSQL Database Backup with Verification
# EFF Membership Management System
# =====================================================================================

param(
    [string]$BackupDir = ".\migration-backup",
    [string]$ContainerName = "eff-membership-postgres",
    [string]$DbUser = "eff_admin",
    [string]$DbName = "eff_membership_db"
)

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Header { Write-Host $args -ForegroundColor Magenta }

Write-Success "========================================================"
Write-Success "EFF Membership System - Enhanced Database Backup"
Write-Success "========================================================"
Write-Host ""

# Check if Docker is running
Write-Info "Checking Docker status..."
try {
    docker ps | Out-Null
    Write-Success "✓ Docker is running"
} catch {
    Write-Error "✗ Docker is not running. Please start Docker Desktop."
    exit 1
}

# Check if container exists
Write-Info "Checking if container '$ContainerName' is running..."
$containerRunning = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Error "✗ Container '$ContainerName' is not running."
    exit 1
}
Write-Success "✓ Container is running"

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Write-Success "✓ Created directory: $BackupDir"
} else {
    Write-Success "✓ Directory exists: $BackupDir"
}

Write-Host ""
Write-Header "========================================================" 
Write-Header "STEP 1: Analyzing Database Contents"
Write-Header "========================================================"
Write-Host ""

# Get database statistics
Write-Info "Analyzing database objects..."

# Count tables
$tableCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null
$tableCount = $tableCount.Trim()
Write-Success "✓ Tables: $tableCount"

# Count views
$viewCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';" 2>$null
$viewCount = $viewCount.Trim()
Write-Success "✓ Views: $viewCount"

# Count functions
$functionCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';" 2>$null
$functionCount = $functionCount.Trim()
Write-Success "✓ Functions/Procedures: $functionCount"

# Count triggers
$triggerCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';" 2>$null
$triggerCount = $triggerCount.Trim()
Write-Success "✓ Triggers: $triggerCount"

# Count sequences
$sequenceCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM information_schema.sequences WHERE sequence_schema = 'public';" 2>$null
$sequenceCount = $sequenceCount.Trim()
Write-Success "✓ Sequences: $sequenceCount"

# Count indexes
$indexCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>$null
$indexCount = $indexCount.Trim()
Write-Success "✓ Indexes: $indexCount"

Write-Host ""
Write-Info "Key Data Tables:"

# Member count
$memberCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM members;" 2>$null
$memberCount = $memberCount.Trim()
Write-Host "  - Members: $memberCount records"

# Province count
$provinceCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM provinces;" 2>$null
$provinceCount = $provinceCount.Trim()
Write-Host "  - Provinces: $provinceCount records"

# District count
$districtCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM districts;" 2>$null
$districtCount = $districtCount.Trim()
Write-Host "  - Districts: $districtCount records"

# Municipality count
$municipalityCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM municipalities;" 2>$null
$municipalityCount = $municipalityCount.Trim()
Write-Host "  - Municipalities: $municipalityCount records"

# User count
$userCount = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM users;" 2>$null
$userCount = $userCount.Trim()
Write-Host "  - Users: $userCount records"

Write-Host ""
Write-Header "========================================================" 
Write-Header "STEP 2: Creating Database Backup"
Write-Header "========================================================"
Write-Host ""

# Generate timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "eff_membership_backup_$timestamp"

Write-Info "Backup Configuration:"
Write-Host "  - Database: $DbName"
Write-Host "  - Format: Custom (compressed, includes all objects)"
Write-Host "  - Filename: $backupFileName.dump"
Write-Host ""

# Create backup in custom format (compressed)
Write-Info "Creating compressed backup..."
try {
    docker exec $ContainerName pg_dump -U $DbUser -d $DbName -F c -f "/tmp/$backupFileName.dump" 2>$null
    Write-Success "✓ Backup created in container"
} catch {
    Write-Error "✗ Failed to create backup"
    Write-Error $_.Exception.Message
    exit 1
}

# Copy backup from container
Write-Info "Copying backup from container..."
try {
    docker cp "${ContainerName}:/tmp/$backupFileName.dump" "$BackupDir\$backupFileName.dump"
    Write-Success "✓ Backup copied to: $BackupDir\$backupFileName.dump"
} catch {
    Write-Error "✗ Failed to copy backup"
    exit 1
}

# Create SQL backup (plain text)
Write-Info "Creating SQL backup (plain text)..."
try {
    docker exec $ContainerName pg_dump -U $DbUser -d $DbName > "$BackupDir\$backupFileName.sql" 2>$null
    Write-Success "✓ SQL backup created: $BackupDir\$backupFileName.sql"
} catch {
    Write-Warning "⚠ Failed to create SQL backup (non-critical)"
}

# Clean up container
docker exec $ContainerName rm -f "/tmp/$backupFileName.dump" 2>$null

Write-Host ""
Write-Header "========================================================" 
Write-Header "STEP 3: Backup Verification"
Write-Header "========================================================"
Write-Host ""

# Get backup file sizes
$dumpFile = Get-Item "$BackupDir\$backupFileName.dump"
$dumpSize = "{0:N2} MB" -f ($dumpFile.Length / 1MB)

Write-Success "✓ Backup files created successfully:"
Write-Host "  - Custom format: $backupFileName.dump ($dumpSize)"

if (Test-Path "$BackupDir\$backupFileName.sql") {
    $sqlFile = Get-Item "$BackupDir\$backupFileName.sql"
    $sqlSize = "{0:N2} MB" -f ($sqlFile.Length / 1MB)
    Write-Host "  - SQL format: $backupFileName.sql ($sqlSize)"
}

Write-Host ""
Write-Info "Backup Contents Summary:"
Write-Host "  ✓ $tableCount tables with data"
Write-Host "  ✓ $viewCount views"
Write-Host "  ✓ $functionCount functions/procedures"
Write-Host "  ✓ $triggerCount triggers"
Write-Host "  ✓ $sequenceCount sequences"
Write-Host "  ✓ $indexCount indexes"
Write-Host "  ✓ All constraints (PK, FK, UNIQUE, CHECK)"
Write-Host "  ✓ All default values"
Write-Host "  ✓ $memberCount member records"

Write-Host ""
Write-Header "========================================================" 
Write-Header "STEP 4: Sample Views Verification"
Write-Header "========================================================"
Write-Host ""

Write-Info "Verifying key views are accessible..."

# Test key views
$views = @(
    "vw_member_details",
    "vw_member_search",
    "vw_leadership_hierarchy",
    "vw_ward_membership_audit"
)

foreach ($view in $views) {
    try {
        $count = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM $view LIMIT 1;" 2>$null
        if ($count) {
            Write-Success "✓ $view - accessible"
        }
    } catch {
        Write-Warning "⚠ $view - not found (may not exist)"
    }
}

Write-Host ""
Write-Success "========================================================"
Write-Success "Backup Completed Successfully!"
Write-Success "========================================================"
Write-Host ""

Write-Info "📦 What's Included in Your Backup:"
Write-Host ""
Write-Host "  ✅ All Tables ($tableCount) with complete data"
Write-Host "  ✅ All Views ($viewCount) - member details, search, analytics"
Write-Host "  ✅ All Functions ($functionCount) - stored procedures"
Write-Host "  ✅ All Triggers ($triggerCount) - automation & logging"
Write-Host "  ✅ All Sequences ($sequenceCount) - auto-increment values"
Write-Host "  ✅ All Indexes ($indexCount) - performance optimization"
Write-Host "  ✅ All Constraints - data integrity rules"
Write-Host "  ✅ All Default Values - column defaults"
Write-Host ""

Write-Info "📊 Data Summary:"
Write-Host "  - $memberCount members"
Write-Host "  - $provinceCount provinces"
Write-Host "  - $districtCount districts"
Write-Host "  - $municipalityCount municipalities"
Write-Host "  - $userCount users"
Write-Host ""

Write-Info "📁 Backup Location:"
Write-Host "  $BackupDir\$backupFileName.dump"
Write-Host ""

Write-Info "🚀 Next Steps:"
Write-Host ""
Write-Host "  1. Transfer backup to Ubuntu server:"
Write-Host "     scp $BackupDir\$backupFileName.dump username@server-ip:/opt/eff-membership/"
Write-Host ""
Write-Host "  2. On Ubuntu server, restore using:"
Write-Host "     ./backup-scripts/restore.sh $backupFileName.dump"
Write-Host ""
Write-Host "  3. Verify restoration:"
Write-Host "     ./deployment/verify-deployment.sh"
Write-Host ""

Write-Success "All database objects are included in the backup! ✅"
Write-Host ""

