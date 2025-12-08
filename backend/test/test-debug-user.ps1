# Login and get token
$loginResponse = curl -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" --data-binary "@test/login-test.json" 2>&1 | Out-String
$loginData = $loginResponse | ConvertFrom-Json
$token = $loginData.data.token

Write-Host "Token: $($token.Substring(0, 50))..."

# Test debug endpoint
$debugResponse = curl "http://localhost:5000/api/v1/hierarchical-meetings/debug-user" -H "Authorization: Bearer $token" 2>&1 | Out-String
Write-Host "`nDebug Response:"
Write-Host $debugResponse

