# EFF Membership Management System - Database Setup Script
# PowerShell script to set up PostgreSQL database using Docker

param(
    [string]$Action = "setup",
    [switch]$Force = $false,
    [switch]$Help = $false
)

# Display help information
if ($Help) {
    Write-Host "EFF Membership Management System - Database Setup Script" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage: .\setup_database.ps1 [Action] [Options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Cyan
    Write-Host "  setup     - Set up the complete database environment (default)"
    Write-Host "  start     - Start existing database containers"
    Write-Host "  stop      - Stop database containers"
    Write-Host "  restart   - Restart database containers"
    Write-Host "  reset     - Reset database (WARNING: Deletes all data)"
    Write-Host "  status    - Show container status"
    Write-Host "  logs      - Show container logs"
    Write-Host "  backup    - Create database backup"
    Write-Host "  restore   - Restore database from backup"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  -Force    - Force action without confirmation"
    Write-Host "  -Help     - Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\setup_database.ps1 setup"
    Write-Host "  .\setup_database.ps1 reset -Force"
    Write-Host "  .\setup_database.ps1 backup"
    exit 0
}

# Configuration
$ComposeFile = "docker-compose.postgres.yml"
$EnvFile = ".env"
$SchemaFile = "database-recovery/complete_eff_membership_schema.sql"
$BackupDir = "backups/postgres"

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

# Helper functions
function Write-Step {
    param([string]$Message)
    Write-Host "🔄 $Message" -ForegroundColor $Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Yellow
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    # Check if Docker is installed and running
    try {
        $dockerVersion = docker --version
        Write-Success "Docker is installed: $dockerVersion"
    }
    catch {
        Write-Error "Docker is not installed or not running. Please install Docker Desktop."
        exit 1
    }
    
    # Check if Docker Compose is available
    try {
        $composeVersion = docker compose version
        Write-Success "Docker Compose is available: $composeVersion"
    }
    catch {
        Write-Error "Docker Compose is not available. Please update Docker Desktop."
        exit 1
    }
    
    # Check if required files exist
    if (-not (Test-Path $ComposeFile)) {
        Write-Error "Docker Compose file not found: $ComposeFile"
        exit 1
    }
    
    if (-not (Test-Path $SchemaFile)) {
        Write-Error "Database schema file not found: $SchemaFile"
        exit 1
    }
    
    Write-Success "All prerequisites met!"
}

function Setup-Environment {
    Write-Step "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if (-not (Test-Path $EnvFile)) {
        if (Test-Path ".env.postgres") {
            Copy-Item ".env.postgres" $EnvFile
            Write-Success "Created .env file from template"
            Write-Warning "Please edit .env file to set secure passwords!"
        }
        else {
            Write-Error ".env.postgres template file not found"
            exit 1
        }
    }
    else {
        Write-Success ".env file already exists"
    }
    
    # Create required directories
    $directories = @(
        "data/postgres",
        "data/pgadmin",
        "data/redis",
        "backups/postgres",
        "logs/nginx"
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Success "Created directory: $dir"
        }
    }
}

function Setup-Database {
    Write-Step "Setting up database containers..."
    
    # Create Docker network
    try {
        docker network create membership-network 2>$null
        Write-Success "Created Docker network: membership-network"
    }
    catch {
        Write-Success "Docker network already exists: membership-network"
    }
    
    # Start PostgreSQL and pgAdmin
    Write-Step "Starting PostgreSQL and pgAdmin containers..."
    docker compose -f $ComposeFile up -d postgres pgadmin
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database containers started successfully!"
    }
    else {
        Write-Error "Failed to start database containers"
        exit 1
    }
    
    # Wait for PostgreSQL to be ready
    Write-Step "Waiting for PostgreSQL to be ready..."
    $maxAttempts = 30
    $attempt = 0
    
    do {
        $attempt++
        Start-Sleep -Seconds 2
        $ready = docker exec eff-membership-postgres pg_isready -U eff_admin -d eff_membership_db 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL is ready!"
            break
        }
        Write-Host "." -NoNewline
    } while ($attempt -lt $maxAttempts)
    
    if ($attempt -ge $maxAttempts) {
        Write-Error "PostgreSQL failed to start within timeout"
        exit 1
    }
}

function Show-Status {
    Write-Step "Container Status:"
    docker ps --filter "name=eff-membership" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    Write-Host ""
    Write-Step "Access Information:"
    Write-Host "📊 pgAdmin: http://localhost:5050" -ForegroundColor $Green
    Write-Host "🗄️  PostgreSQL: localhost:5432" -ForegroundColor $Green
    Write-Host "📧 pgAdmin Login: admin@eff.local" -ForegroundColor $Yellow
    Write-Host "🔑 Check .env file for passwords" -ForegroundColor $Yellow
}

function Create-Backup {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$BackupDir/eff_membership_backup_$timestamp.sql"
    
    Write-Step "Creating database backup..."
    
    # Ensure backup directory exists
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    # Create backup
    docker exec eff-membership-postgres pg_dump -U eff_admin -d eff_membership_db > $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database backup created: $backupFile"
    }
    else {
        Write-Error "Failed to create database backup"
        exit 1
    }
}

# Main script logic
switch ($Action.ToLower()) {
    "setup" {
        Test-Prerequisites
        Setup-Environment
        Setup-Database
        Show-Status
        Write-Success "Database setup completed successfully!"
        Write-Warning "Don't forget to change the default admin password!"
    }
    
    "start" {
        Write-Step "Starting database containers..."
        docker compose -f $ComposeFile up -d
        Show-Status
    }
    
    "stop" {
        Write-Step "Stopping database containers..."
        docker compose -f $ComposeFile down
        Write-Success "Database containers stopped"
    }
    
    "restart" {
        Write-Step "Restarting database containers..."
        docker compose -f $ComposeFile restart
        Show-Status
    }
    
    "reset" {
        if (-not $Force) {
            $confirmation = Read-Host "This will delete ALL database data. Type 'YES' to confirm"
            if ($confirmation -ne "YES") {
                Write-Warning "Reset cancelled"
                exit 0
            }
        }
        
        Write-Warning "Resetting database (deleting all data)..."
        docker compose -f $ComposeFile down -v
        docker volume prune -f
        Write-Success "Database reset completed"
    }
    
    "status" {
        Show-Status
    }
    
    "logs" {
        Write-Step "Showing container logs..."
        docker compose -f $ComposeFile logs -f
    }
    
    "backup" {
        Create-Backup
    }
    
    "restore" {
        Write-Error "Restore functionality not implemented yet"
        Write-Host "To restore manually:"
        Write-Host "docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < backup_file.sql"
    }
    
    default {
        Write-Error "Unknown action: $Action"
        Write-Host "Use -Help for usage information"
        exit 1
    }
}
