# Playwright Test Setup Script for Windows PowerShell

Write-Host "=====================================================================================================" -ForegroundColor Cyan
Write-Host "PLAYWRIGHT TEST SETUP - EFF MEMBERSHIP SYSTEM" -ForegroundColor Cyan
Write-Host "=====================================================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm is not installed!" -ForegroundColor Red
    exit 1
}
Write-Host "npm version: $npmVersion" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install npm dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""

# Install Playwright browsers
Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
npx playwright install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install Playwright browsers!" -ForegroundColor Red
    exit 1
}
Write-Host "Playwright browsers installed successfully!" -ForegroundColor Green
Write-Host ""

# Check if backend is running
Write-Host "Checking if backend is running on port 5000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Backend is not running on port 5000" -ForegroundColor Yellow
    Write-Host "Please start the backend before running tests:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor Cyan
}
Write-Host ""

# Check if frontend is running
Write-Host "Checking if frontend is running on port 3000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "Frontend is running!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Frontend is not running on port 3000" -ForegroundColor Yellow
    Write-Host "Please start the frontend before running tests:" -ForegroundColor Yellow
    Write-Host "  cd frontend" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor Cyan
}
Write-Host ""

# Setup complete
Write-Host "=====================================================================================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "=====================================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now run tests using:" -ForegroundColor Yellow
Write-Host "  npm run test:manual    - Manual interactive test (RECOMMENDED)" -ForegroundColor Cyan
Write-Host "  npm run test:headed    - Automated test with visible browser" -ForegroundColor Cyan
Write-Host "  npm test               - Automated test in headless mode" -ForegroundColor Cyan
Write-Host "  npm run test:debug     - Debug mode with Playwright Inspector" -ForegroundColor Cyan
Write-Host "  npm run test:ui        - UI mode for interactive debugging" -ForegroundColor Cyan
Write-Host ""
Write-Host "For more information, see README.md" -ForegroundColor Yellow
Write-Host ""

