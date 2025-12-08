# Fix Upload Directory Location
# Moves files from backend/_upload_file_directory to root _upload_file_directory
# and ensures Python processor watches the correct location

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 119) -ForegroundColor Cyan
Write-Host "FIXING UPLOAD DIRECTORY LOCATION" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 119) -ForegroundColor Cyan
Write-Host ""

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendUploadDir = Join-Path $repoRoot "backend\_upload_file_directory"
$rootUploadDir = Join-Path $repoRoot "_upload_file_directory"

Write-Host "Repository root: $repoRoot" -ForegroundColor Cyan
Write-Host "Backend upload dir: $backendUploadDir" -ForegroundColor Cyan
Write-Host "Root upload dir: $rootUploadDir" -ForegroundColor Cyan
Write-Host ""

# Step 1: Ensure root upload directory exists
Write-Host "Step 1: Ensuring root upload directory exists..." -ForegroundColor Yellow
if (-not (Test-Path $rootUploadDir)) {
    New-Item -ItemType Directory -Path $rootUploadDir -Force | Out-Null
    Write-Host "  Created: $rootUploadDir" -ForegroundColor Green
} else {
    Write-Host "  Already exists: $rootUploadDir" -ForegroundColor Green
}
Write-Host ""

# Step 2: Check for files in backend directory
Write-Host "Step 2: Checking for files in backend directory..." -ForegroundColor Yellow
if (Test-Path $backendUploadDir) {
    $files = Get-ChildItem -Path $backendUploadDir -File
    
    if ($files.Count -gt 0) {
        Write-Host "  Found $($files.Count) file(s) in backend directory" -ForegroundColor Cyan
        Write-Host ""
        
        # Step 3: Move files
        Write-Host "Step 3: Moving files to root directory..." -ForegroundColor Yellow
        foreach ($file in $files) {
            $destPath = Join-Path $rootUploadDir $file.Name
            
            # Check if file already exists in destination
            if (Test-Path $destPath) {
                Write-Host "  SKIP: $($file.Name) (already exists in root)" -ForegroundColor Yellow
            } else {
                Move-Item -Path $file.FullName -Destination $destPath -Force
                Write-Host "  MOVED: $($file.Name)" -ForegroundColor Green
            }
        }
        Write-Host ""
        
        # Step 4: Remove backend directory if empty
        Write-Host "Step 4: Checking if backend directory is empty..." -ForegroundColor Yellow
        $remainingFiles = Get-ChildItem -Path $backendUploadDir -File
        if ($remainingFiles.Count -eq 0) {
            Remove-Item -Path $backendUploadDir -Force -Recurse
            Write-Host "  REMOVED: Empty backend upload directory" -ForegroundColor Green
        } else {
            Write-Host "  KEPT: Backend directory still has $($remainingFiles.Count) file(s)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  No files found in backend directory" -ForegroundColor Gray
        
        # Remove empty backend directory
        Remove-Item -Path $backendUploadDir -Force -Recurse
        Write-Host "  REMOVED: Empty backend upload directory" -ForegroundColor Green
    }
} else {
    Write-Host "  Backend upload directory does not exist" -ForegroundColor Gray
}
Write-Host ""

# Step 5: Verify final state
Write-Host "Step 5: Verifying final state..." -ForegroundColor Yellow
$rootFiles = Get-ChildItem -Path $rootUploadDir -File -ErrorAction SilentlyContinue
Write-Host "  Files in root upload directory: $($rootFiles.Count)" -ForegroundColor Cyan

if ($rootFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "  Files:" -ForegroundColor Cyan
    foreach ($file in $rootFiles) {
        $sizeKB = [math]::Round($file.Length / 1KB, 2)
        Write-Host "    - $($file.Name) ($sizeKB KB)" -ForegroundColor Gray
    }
}
Write-Host ""

# Step 6: Check database for pending files
Write-Host "Step 6: Checking database for pending files..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = "Frames!123"
    $query = "SELECT file_id, filename, original_filename, status FROM uploaded_files WHERE status = 'pending' ORDER BY upload_timestamp DESC LIMIT 5;"
    $result = & psql -h localhost -U eff_admin -d eff_membership_database -t -A -F "|" -c $query 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $result) {
        $lines = $result -split "`n" | Where-Object { $_ -match '\|' }
        if ($lines.Count -gt 0) {
            Write-Host "  Found $($lines.Count) pending file(s) in database:" -ForegroundColor Cyan
            foreach ($line in $lines) {
                $parts = $line -split '\|'
                if ($parts.Count -ge 4) {
                    Write-Host "    - ID: $($parts[0]), File: $($parts[2]), Status: $($parts[3])" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "  No pending files in database" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Could not query database (psql not available or connection failed)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Could not query database: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 119) -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 119) -ForegroundColor Cyan
Write-Host ""
Write-Host "  Root upload directory: $rootUploadDir" -ForegroundColor Green
Write-Host "  Files in root directory: $($rootFiles.Count)" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Restart the backend API server (to use new upload path)" -ForegroundColor Cyan
Write-Host "  2. Restart the Python bulk upload processor" -ForegroundColor Cyan
Write-Host "  3. Test file upload from frontend" -ForegroundColor Cyan
Write-Host ""
Write-Host "The Python processor will now watch: $rootUploadDir" -ForegroundColor Green
Write-Host ""

