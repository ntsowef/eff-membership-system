#!/bin/bash

# 502 Bad Gateway Diagnostic Script
# This script helps diagnose why Nginx cannot connect to the backend

echo "=========================================="
echo "  502 Bad Gateway Diagnostic Tool"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "Running diagnostics..."
echo ""

# 1. Check PM2 Status
echo "1. Checking PM2 Backend Status..."
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"eff-api"' | wc -l)
    if [ "$PM2_STATUS" -gt 0 ]; then
        PM2_ONLINE=$(pm2 jlist 2>/dev/null | grep -A 5 '"name":"eff-api"' | grep -o '"status":"online"' | wc -l)
        if [ "$PM2_ONLINE" -gt 0 ]; then
            check_pass "Backend is running in PM2"
        else
            check_fail "Backend is in PM2 but not online"
            echo "   Run: pm2 restart eff-api"
        fi
    else
        check_fail "Backend not found in PM2"
        echo "   Run: cd /opt/eff-membership/backend && pm2 start dist/app.js --name eff-api"
    fi
else
    check_fail "PM2 not installed"
fi
echo ""

# 2. Check Port 5000
echo "2. Checking if port 5000 is listening..."
if netstat -tlnp 2>/dev/null | grep -q ":5000"; then
    check_pass "Port 5000 is listening"
    netstat -tlnp 2>/dev/null | grep ":5000"
else
    check_fail "Port 5000 is NOT listening"
    echo "   Backend is not running or running on different port"
fi
echo ""

# 3. Test Backend Directly
echo "3. Testing backend directly (localhost:5000)..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/health 2>/dev/null)
if [ "$BACKEND_RESPONSE" = "200" ]; then
    check_pass "Backend responds on localhost:5000"
    echo "   Response: $(curl -s http://localhost:5000/api/v1/health 2>/dev/null)"
elif [ "$BACKEND_RESPONSE" = "000" ]; then
    check_fail "Cannot connect to backend on localhost:5000"
    echo "   Backend is not running or not accessible"
else
    check_warn "Backend responded with HTTP $BACKEND_RESPONSE"
fi
echo ""

# 4. Check Docker Containers
echo "4. Checking Docker containers..."
if command -v docker &> /dev/null; then
    # Check PostgreSQL
    if docker ps | grep -q postgres; then
        check_pass "PostgreSQL container is running"
    else
        check_fail "PostgreSQL container is NOT running"
        echo "   Run: cd /opt/eff-membership && docker-compose up -d postgres"
    fi
    
    # Check Redis
    if docker ps | grep -q redis; then
        check_pass "Redis container is running"
    else
        check_warn "Redis container is NOT running"
        echo "   Run: cd /opt/eff-membership && docker-compose up -d redis"
    fi
else
    check_warn "Docker not installed or not accessible"
fi
echo ""

# 5. Check Nginx Status
echo "5. Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    check_pass "Nginx is running"
else
    check_fail "Nginx is NOT running"
    echo "   Run: sudo systemctl start nginx"
fi
echo ""

# 6. Check Nginx Configuration
echo "6. Checking Nginx configuration..."
if nginx -t &> /dev/null; then
    check_pass "Nginx configuration is valid"
else
    check_fail "Nginx configuration has errors"
    echo "   Run: sudo nginx -t"
fi
echo ""

# 7. Check Nginx Upstream Configuration
echo "7. Checking Nginx upstream configuration..."
if [ -f /etc/nginx/sites-available/eff-api ]; then
    if grep -q "127.0.0.1:5000\|localhost:5000" /etc/nginx/sites-available/eff-api; then
        check_pass "Nginx upstream points to port 5000"
    else
        check_fail "Nginx upstream configuration may be incorrect"
        echo "   Check: sudo cat /etc/nginx/sites-available/eff-api | grep upstream -A 5"
    fi
else
    check_warn "Nginx config file not found at expected location"
fi
echo ""

# 8. Check Recent Nginx Errors
echo "8. Checking recent Nginx errors..."
if [ -f /var/log/nginx/error.log ]; then
    ERROR_COUNT=$(tail -20 /var/log/nginx/error.log | grep -c "upstream")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        check_warn "Found $ERROR_COUNT upstream errors in Nginx log"
        echo "   Last errors:"
        tail -5 /var/log/nginx/error.log | grep "upstream"
    else
        check_pass "No recent upstream errors in Nginx log"
    fi
else
    check_warn "Nginx error log not found"
fi
echo ""

# 9. Check Backend Logs
echo "9. Checking backend logs..."
if command -v pm2 &> /dev/null; then
    echo "   Last 10 lines of backend log:"
    pm2 logs eff-api --lines 10 --nostream 2>/dev/null || echo "   Could not retrieve logs"
else
    check_warn "PM2 not available to check logs"
fi
echo ""

# 10. Test HTTPS Endpoint
echo "10. Testing HTTPS endpoint..."
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.effmemberportal.org/api/v1/health 2>/dev/null)
if [ "$HTTPS_RESPONSE" = "200" ]; then
    check_pass "HTTPS endpoint is working!"
    echo "   Response: $(curl -s https://api.effmemberportal.org/api/v1/health 2>/dev/null)"
elif [ "$HTTPS_RESPONSE" = "502" ]; then
    check_fail "HTTPS endpoint returns 502 Bad Gateway"
    echo "   This confirms the issue - Nginx cannot reach backend"
elif [ "$HTTPS_RESPONSE" = "000" ]; then
    check_fail "Cannot connect to HTTPS endpoint"
    echo "   Check DNS and firewall"
else
    check_warn "HTTPS endpoint responded with HTTP $HTTPS_RESPONSE"
fi
echo ""

# Summary
echo "=========================================="
echo "  DIAGNOSTIC SUMMARY"
echo "=========================================="
echo ""

# Determine the issue
if [ "$PM2_ONLINE" -eq 0 ] 2>/dev/null; then
    echo -e "${RED}PRIMARY ISSUE: Backend is not running${NC}"
    echo ""
    echo "SOLUTION:"
    echo "  cd /opt/eff-membership/backend"
    echo "  pm2 start dist/app.js --name eff-api"
    echo "  pm2 save"
elif [ "$BACKEND_RESPONSE" != "200" ]; then
    echo -e "${RED}PRIMARY ISSUE: Backend is not responding on port 5000${NC}"
    echo ""
    echo "SOLUTION:"
    echo "  1. Check backend logs: pm2 logs eff-api"
    echo "  2. Ensure dependencies are running: docker-compose up -d"
    echo "  3. Restart backend: pm2 restart eff-api"
elif [ "$HTTPS_RESPONSE" = "502" ]; then
    echo -e "${RED}PRIMARY ISSUE: Nginx cannot connect to backend${NC}"
    echo ""
    echo "SOLUTION:"
    echo "  1. Check Nginx config: sudo nginx -t"
    echo "  2. Check Nginx error log: sudo tail -20 /var/log/nginx/error.log"
    echo "  3. Restart Nginx: sudo systemctl restart nginx"
elif [ "$HTTPS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}SUCCESS: Everything is working!${NC}"
    echo ""
    echo "Your API is accessible at: https://api.effmemberportal.org"
else
    echo -e "${YELLOW}UNCLEAR ISSUE: Multiple problems detected${NC}"
    echo ""
    echo "RECOMMENDED ACTIONS:"
    echo "  1. Start dependencies: cd /opt/eff-membership && docker-compose up -d"
    echo "  2. Restart backend: pm2 restart eff-api"
    echo "  3. Restart Nginx: sudo systemctl restart nginx"
    echo "  4. Check logs: pm2 logs eff-api && sudo tail -20 /var/log/nginx/error.log"
fi

echo ""
echo "=========================================="
echo "For detailed troubleshooting, see:"
echo "  deployment/TROUBLESHOOT_502_ERROR.md"
echo "=========================================="

