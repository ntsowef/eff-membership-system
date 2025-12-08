# PowerShell script to start the React frontend
# Usage: .\start-frontend.ps1

Write-Host "`n🚀 Starting React Frontend..." -ForegroundColor Cyan
Write-Host "=" * 80

# Navigate to frontend directory
$frontendPath = Join-Path $PSScriptRoot "frontend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "`n❌ Frontend directory not found!" -ForegroundColor Red
    Write-Host "Expected path: $frontendPath" -ForegroundColor Yellow
    exit 1
}

Set-Location $frontendPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "`n⚠️  node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ npm install failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n📦 Starting Vite development server..." -ForegroundColor Green
Write-Host "`n💡 Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "💡 Membership application: http://localhost:3000/application" -ForegroundColor Cyan
Write-Host "`n⚠️  Make sure backend is running on port 5000!" -ForegroundColor Yellow
Write-Host "`n" + ("=" * 80) + "`n"

# Start the development server
npm run dev

