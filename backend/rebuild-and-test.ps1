# PowerShell script to rebuild backend and run test
# Usage: .\rebuild-and-test.ps1

Write-Host "`n🔨 Rebuilding Backend TypeScript..." -ForegroundColor Cyan
Write-Host "=" * 80

# Navigate to backend directory
Set-Location $PSScriptRoot

# Build TypeScript
Write-Host "`n📦 Running: npm run build" -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Build successful!" -ForegroundColor Green
    
    Write-Host "`n⚠️  Please restart your backend server now:" -ForegroundColor Yellow
    Write-Host "   1. Stop the current server (Ctrl+C)" -ForegroundColor White
    Write-Host "   2. Run: npm start" -ForegroundColor White
    Write-Host "   3. Or run: npm run dev (for development mode)" -ForegroundColor White
    
    Write-Host "`n📝 After restarting, run the test:" -ForegroundColor Cyan
    Write-Host "   node ../test/api/quick-test-application.js" -ForegroundColor White
    
} else {
    Write-Host "`n❌ Build failed! Check the errors above." -ForegroundColor Red
    exit 1
}

Write-Host "`n" + ("=" * 80)
Write-Host "✅ Done!" -ForegroundColor Green
Write-Host ("=" * 80) + "`n"

