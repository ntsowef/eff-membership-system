# Python Virtual Environment Setup Script
# EFF Membership System

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Python Virtual Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "1. Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Python not found. Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

# Check if venv already exists
if (Test-Path "venv") {
    Write-Host ""
    Write-Host "Virtual environment 'venv' already exists." -ForegroundColor Yellow
    $response = Read-Host "Do you want to recreate it? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "   Removing existing virtual environment..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force venv
    } else {
        Write-Host "   Keeping existing virtual environment." -ForegroundColor Green
        Write-Host ""
        Write-Host "To activate the virtual environment, run:" -ForegroundColor Cyan
        Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor White
        exit 0
    }
}

# Create virtual environment
Write-Host ""
Write-Host "2. Creating virtual environment..." -ForegroundColor Yellow
python -m venv venv
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Virtual environment created successfully" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to create virtual environment" -ForegroundColor Red
    exit 1
}

# Activate virtual environment
Write-Host ""
Write-Host "3. Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
Write-Host "   ✓ Virtual environment activated" -ForegroundColor Green

# Upgrade pip
Write-Host ""
Write-Host "4. Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ pip upgraded successfully" -ForegroundColor Green
} else {
    Write-Host "   ✗ Failed to upgrade pip" -ForegroundColor Red
}

# Install dependencies
Write-Host ""
Write-Host "5. Installing dependencies..." -ForegroundColor Yellow

# Check which requirements file to use
if (Test-Path "requirements.txt") {
    Write-Host "   Installing from root requirements.txt..." -ForegroundColor Cyan
    pip install -r requirements.txt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Root dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Failed to install root dependencies" -ForegroundColor Red
    }
}

if (Test-Path "backend\python\requirements.txt") {
    Write-Host "   Installing from backend/python/requirements.txt..." -ForegroundColor Cyan
    pip install -r backend\python\requirements.txt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Backend Python dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Failed to install backend Python dependencies" -ForegroundColor Red
    }
}

# List installed packages
Write-Host ""
Write-Host "6. Installed packages:" -ForegroundColor Yellow
pip list

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Virtual environment is now active." -ForegroundColor Green
Write-Host ""
Write-Host "To activate in the future, run:" -ForegroundColor Cyan
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host ""
Write-Host "To deactivate, run:" -ForegroundColor Cyan
Write-Host "   deactivate" -ForegroundColor White
Write-Host ""
Write-Host "To test the Python scripts:" -ForegroundColor Cyan
Write-Host "   python flexible_membership_ingestionV2.py" -ForegroundColor White
Write-Host "   python backend\python\bulk_upload_processor.py" -ForegroundColor White
Write-Host ""

