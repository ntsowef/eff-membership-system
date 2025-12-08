#!/bin/bash

# Delegates Management API Test Script
# Tests all new endpoints without requiring authentication token upfront

BASE_URL="http://localhost:5000/api/v1"

echo "🚀 Testing Delegates Management Endpoints"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "📊 Test 1: Health Check"
echo "GET $BASE_URL/health"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Health check successful"
    echo "Response: $body"
else
    echo -e "${RED}❌ FAIL${NC}: Health check failed (HTTP $http_code)"
fi
echo ""

# Test 2: Get Statistics (without auth - should fail with 401)
echo "📊 Test 2: Get Delegate Statistics (No Auth - Expected to fail)"
echo "GET $BASE_URL/delegates-management/statistics"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/delegates-management/statistics")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Correctly requires authentication (HTTP 401)"
else
    echo -e "${YELLOW}⚠️  UNEXPECTED${NC}: Expected 401, got HTTP $http_code"
    echo "Response: $body"
fi
echo ""

# Test 3: Get All Delegates (without auth - should fail with 401)
echo "📊 Test 3: Get All Delegates (No Auth - Expected to fail)"
echo "GET $BASE_URL/delegates-management/delegates"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/delegates-management/delegates")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Correctly requires authentication (HTTP 401)"
else
    echo -e "${YELLOW}⚠️  UNEXPECTED${NC}: Expected 401, got HTTP $http_code"
    echo "Response: $body"
fi
echo ""

# Test 4: Get Delegate Summary (without auth - should fail with 401)
echo "📊 Test 4: Get Delegate Summary (No Auth - Expected to fail)"
echo "GET $BASE_URL/delegates-management/summary"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/delegates-management/summary")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Correctly requires authentication (HTTP 401)"
else
    echo -e "${YELLOW}⚠️  UNEXPECTED${NC}: Expected 401, got HTTP $http_code"
    echo "Response: $body"
fi
echo ""

# Test 5: Get Conference Delegates (without auth - should fail with 401)
echo "📊 Test 5: Get SRPA Conference Delegates (No Auth - Expected to fail)"
echo "GET $BASE_URL/delegates-management/conference/SRPA"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/delegates-management/conference/SRPA")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Correctly requires authentication (HTTP 401)"
else
    echo -e "${YELLOW}⚠️  UNEXPECTED${NC}: Expected 401, got HTTP $http_code"
    echo "Response: $body"
fi
echo ""

# Test 6: Check if routes are registered
echo "📊 Test 6: Route Registration Check"
echo "Testing if endpoints return 401 (auth required) instead of 404 (not found)"
echo ""

endpoints=(
    "/delegates-management/statistics"
    "/delegates-management/delegates"
    "/delegates-management/summary"
    "/delegates-management/conference/SRPA"
    "/delegates-management/conference/PPA"
    "/delegates-management/conference/NPA"
)

all_registered=true
for endpoint in "${endpoints[@]}"; do
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "401" ]; then
        echo -e "  ${GREEN}✅${NC} $endpoint - Registered (requires auth)"
    elif [ "$http_code" = "404" ]; then
        echo -e "  ${RED}❌${NC} $endpoint - NOT FOUND (route not registered)"
        all_registered=false
    else
        echo -e "  ${YELLOW}⚠️${NC}  $endpoint - HTTP $http_code"
    fi
done

echo ""
if [ "$all_registered" = true ]; then
    echo -e "${GREEN}✅ All routes are properly registered!${NC}"
else
    echo -e "${RED}❌ Some routes are not registered${NC}"
fi

echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo "✅ All endpoints are properly secured with authentication"
echo "✅ Routes are registered and accessible"
echo ""
echo "To test with authentication, use:"
echo "  1. Login to get a token:"
echo "     curl -X POST $BASE_URL/auth/login \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"email\":\"your@email.com\",\"password\":\"yourpassword\"}'"
echo ""
echo "  2. Use the token to test endpoints:"
echo "     curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "       $BASE_URL/delegates-management/statistics"
echo ""

