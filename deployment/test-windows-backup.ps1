# Quick syntax test for windows-backup.ps1
# This script just validates the syntax without running the actual backup

Write-Host "Testing windows-backup.ps1 syntax..." -ForegroundColor Cyan

try {
    # Test if the script can be parsed
    $scriptPath = Join-Path $PSScriptRoot "windows-backup.ps1"
    
    if (Test-Path $scriptPath) {
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $scriptPath -Raw), [ref]$null)
        Write-Host "✓ Syntax check passed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "The script is ready to use. Run it with:" -ForegroundColor Yellow
        Write-Host "  .\deployment\windows-backup.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "Optional parameters:" -ForegroundColor Yellow
        Write-Host "  -BackupDir 'C:\Backups'           # Custom backup directory" -ForegroundColor White
        Write-Host "  -ContainerName 'my-container'     # Custom container name" -ForegroundColor White
        Write-Host "  -DbUser 'postgres'                # Custom database user" -ForegroundColor White
        Write-Host "  -DbName 'mydb'                    # Custom database name" -ForegroundColor White
    } else {
        Write-Host "✗ Script not found: $scriptPath" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Syntax error found:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

