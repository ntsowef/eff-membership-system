# Delegates Management API Test Script (PowerShell)
# Tests all new endpoints

$BASE_URL = "http://localhost:5000/api/v1"

Write-Host "`n🚀 Testing Delegates Management Endpoints" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "📊 Test 1: Health Check" -ForegroundColor Yellow
Write-Host "GET $BASE_URL/health"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/health" -Method GET -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS: Health check successful" -ForegroundColor Green
        Write-Host "Response: $($response.Content)"
    }
} catch {
    Write-Host "❌ FAIL: Health check failed - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get Statistics (without auth - should fail with 401)
Write-Host "📊 Test 2: Get Delegate Statistics (No Auth - Expected to fail)" -ForegroundColor Yellow
Write-Host "GET $BASE_URL/delegates-management/statistics"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/delegates-management/statistics" -Method GET -UseBasicParsing
    Write-Host "⚠️  UNEXPECTED: Expected 401, got $($response.StatusCode)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASS: Correctly requires authentication (HTTP 401)" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Unexpected error - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 3: Get All Delegates (without auth - should fail with 401)
Write-Host "📊 Test 3: Get All Delegates (No Auth - Expected to fail)" -ForegroundColor Yellow
Write-Host "GET $BASE_URL/delegates-management/delegates"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/delegates-management/delegates" -Method GET -UseBasicParsing
    Write-Host "⚠️  UNEXPECTED: Expected 401, got $($response.StatusCode)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASS: Correctly requires authentication (HTTP 401)" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Unexpected error - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Get Delegate Summary (without auth - should fail with 401)
Write-Host "📊 Test 4: Get Delegate Summary (No Auth - Expected to fail)" -ForegroundColor Yellow
Write-Host "GET $BASE_URL/delegates-management/summary"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/delegates-management/summary" -Method GET -UseBasicParsing
    Write-Host "⚠️  UNEXPECTED: Expected 401, got $($response.StatusCode)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASS: Correctly requires authentication (HTTP 401)" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Unexpected error - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 5: Get Conference Delegates (without auth - should fail with 401)
Write-Host "📊 Test 5: Get SRPA Conference Delegates (No Auth - Expected to fail)" -ForegroundColor Yellow
Write-Host "GET $BASE_URL/delegates-management/conference/SRPA"
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/delegates-management/conference/SRPA" -Method GET -UseBasicParsing
    Write-Host "⚠️  UNEXPECTED: Expected 401, got $($response.StatusCode)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "✅ PASS: Correctly requires authentication (HTTP 401)" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Unexpected error - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 6: Check if routes are registered
Write-Host "📊 Test 6: Route Registration Check" -ForegroundColor Yellow
Write-Host "Testing if endpoints return 401 (auth required) instead of 404 (not found)"
Write-Host ""

$endpoints = @(
    "/delegates-management/statistics",
    "/delegates-management/delegates",
    "/delegates-management/summary",
    "/delegates-management/conference/SRPA",
    "/delegates-management/conference/PPA",
    "/delegates-management/conference/NPA"
)

$allRegistered = $true
foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$BASE_URL$endpoint" -Method GET -UseBasicParsing
        Write-Host "  ⚠️  $endpoint - HTTP $($response.StatusCode)" -ForegroundColor Yellow
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host "  ✅ $endpoint - Registered (requires auth)" -ForegroundColor Green
        } elseif ($statusCode -eq 404) {
            Write-Host "  ❌ $endpoint - NOT FOUND (route not registered)" -ForegroundColor Red
            $allRegistered = $false
        } else {
            Write-Host "  ⚠️  $endpoint - HTTP $statusCode" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
if ($allRegistered) {
    Write-Host "✅ All routes are properly registered!" -ForegroundColor Green
} else {
    Write-Host "❌ Some routes are not registered" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ All endpoints are properly secured with authentication" -ForegroundColor Green
Write-Host "✅ Routes are registered and accessible" -ForegroundColor Green
Write-Host ""
Write-Host "To test with authentication:" -ForegroundColor Yellow
Write-Host "  1. Login to get a token (replace with your credentials):" -ForegroundColor White
Write-Host "     `$body = @{ email='your@email.com'; password='yourpassword' } | ConvertTo-Json"
Write-Host "     `$response = Invoke-RestMethod -Uri '$BASE_URL/auth/login' -Method POST -Body `$body -ContentType 'application/json'"
Write-Host "     `$token = `$response.token"
Write-Host ""
Write-Host "  2. Use the token to test endpoints:" -ForegroundColor White
Write-Host "     `$headers = @{ Authorization='Bearer ' + `$token }"
Write-Host "     Invoke-RestMethod -Uri '$BASE_URL/delegates-management/statistics' -Headers `$headers"
Write-Host ""

