@echo off
echo ========================================
echo Geographic API Test Suite
echo ========================================
echo.

set BASE_URL=http://localhost:5000/api/v1

echo Testing basic endpoints...
echo.

echo 1. Testing Provinces:
curl -s "%BASE_URL%/geographic/provinces" | jq ".data | length" 2>nul || echo "Failed to get provinces"
echo.

echo 2. Testing Districts:
curl -s "%BASE_URL%/geographic/districts" | jq ".data | length" 2>nul || echo "Failed to get districts"
echo.

echo 3. Testing Municipalities:
curl -s "%BASE_URL%/geographic/municipalities" | jq ".data | length" 2>nul || echo "Failed to get municipalities"
echo.

echo 4. Testing Wards:
curl -s "%BASE_URL%/geographic/wards?limit=5" | jq ".data | length" 2>nul || echo "Failed to get wards"
echo.

echo ========================================
echo Testing Hierarchical Flow
echo ========================================
echo.

echo Step 1: Get first province
for /f "tokens=*" %%i in ('curl -s "%BASE_URL%/geographic/provinces" ^| jq -r ".data[0].province_code" 2^>nul') do set PROVINCE_CODE=%%i
echo Using province: %PROVINCE_CODE%
echo.

echo Step 2: Get districts for province %PROVINCE_CODE%
curl -s "%BASE_URL%/geographic/districts?province=%PROVINCE_CODE%" | jq ".data | length" 2>nul || echo "Failed to get districts for province"
echo.

echo Step 3: Get first district for province %PROVINCE_CODE%
for /f "tokens=*" %%i in ('curl -s "%BASE_URL%/geographic/districts?province=%PROVINCE_CODE%" ^| jq -r ".data[0].district_code" 2^>nul') do set DISTRICT_CODE=%%i
echo Using district: %DISTRICT_CODE%
echo.

echo Step 4: Get municipalities for district %DISTRICT_CODE%
curl -s "%BASE_URL%/geographic/municipalities?district=%DISTRICT_CODE%" | jq ".data | length" 2>nul || echo "Failed to get municipalities for district"
echo.

echo Step 5: Get first municipality for district %DISTRICT_CODE%
for /f "tokens=*" %%i in ('curl -s "%BASE_URL%/geographic/municipalities?district=%DISTRICT_CODE%" ^| jq -r ".data[0].municipality_code" 2^>nul') do set MUNICIPALITY_CODE=%%i
echo Using municipality: %MUNICIPALITY_CODE%
echo.

echo Step 6: Get wards for municipality %MUNICIPALITY_CODE%
curl -s "%BASE_URL%/geographic/wards?municipality=%MUNICIPALITY_CODE%" | jq ".data | length" 2>nul || echo "Failed to get wards for municipality"
echo.

echo Step 7: Get first ward for municipality %MUNICIPALITY_CODE%
for /f "tokens=*" %%i in ('curl -s "%BASE_URL%/geographic/wards?municipality=%MUNICIPALITY_CODE%" ^| jq -r ".data[0].ward_code" 2^>nul') do set WARD_CODE=%%i
echo Using ward: %WARD_CODE%
echo.

echo Step 8: Get voting districts for ward %WARD_CODE%
curl -s "%BASE_URL%/geographic/voting-districts/by-ward/%WARD_CODE%" | jq ".data | length" 2>nul || echo "Failed to get voting districts for ward"
echo.

echo ========================================
echo Test Complete
echo ========================================
pause
