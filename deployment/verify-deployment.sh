#!/bin/bash
# =====================================================================================
# Deployment Verification Script
# EFF Membership Management System
# =====================================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

# Test functions
test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

test_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

test_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo -e "${BLUE}========================================================"
echo "EFF Membership System - Deployment Verification"
echo -e "========================================================${NC}"
echo ""

# 1. Check Docker
echo -e "${BLUE}[1/10] Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    test_pass "Docker installed: $DOCKER_VERSION"
    
    if docker ps &> /dev/null; then
        test_pass "Docker daemon is running"
    else
        test_fail "Docker daemon is not running"
    fi
else
    test_fail "Docker is not installed"
fi
echo ""

# 2. Check Docker Compose
echo -e "${BLUE}[2/10] Checking Docker Compose...${NC}"
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    test_pass "Docker Compose installed: $COMPOSE_VERSION"
else
    test_fail "Docker Compose is not installed"
fi
echo ""

# 3. Check Docker Network
echo -e "${BLUE}[3/10] Checking Docker Network...${NC}"
if docker network ls | grep -q "membership-network"; then
    test_pass "Docker network 'membership-network' exists"
else
    test_warn "Docker network 'membership-network' not found"
    test_info "Create it with: docker network create membership-network"
fi
echo ""

# 4. Check Docker Containers
echo -e "${BLUE}[4/10] Checking Docker Containers...${NC}"
CONTAINERS=("eff-membership-postgres" "eff-membership-pgadmin" "eff-membership-redis")
for container in "${CONTAINERS[@]}"; do
    if docker ps | grep -q "$container"; then
        STATUS=$(docker ps --filter "name=$container" --format "{{.Status}}")
        test_pass "$container is running ($STATUS)"
    else
        test_fail "$container is not running"
    fi
done
echo ""

# 5. Check PostgreSQL
echo -e "${BLUE}[5/10] Checking PostgreSQL Database...${NC}"
if docker ps | grep -q "eff-membership-postgres"; then
    # Test connection
    if docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "SELECT 1;" &> /dev/null; then
        test_pass "PostgreSQL connection successful"
        
        # Check tables
        TABLE_COUNT=$(docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        if [ "$TABLE_COUNT" -gt 0 ]; then
            test_pass "Database has $TABLE_COUNT tables"
        else
            test_warn "Database has no tables"
        fi
        
        # Check members
        if docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "\dt members" &> /dev/null; then
            MEMBER_COUNT=$(docker exec eff-membership-postgres psql -U eff_admin -d eff_membership_db -t -c "SELECT COUNT(*) FROM members;" 2>/dev/null | xargs)
            test_pass "Members table exists with $MEMBER_COUNT records"
        else
            test_warn "Members table not found"
        fi
    else
        test_fail "Cannot connect to PostgreSQL"
    fi
else
    test_fail "PostgreSQL container not running"
fi
echo ""

# 6. Check Redis
echo -e "${BLUE}[6/10] Checking Redis...${NC}"
if docker ps | grep -q "eff-membership-redis"; then
    if docker exec eff-membership-redis redis-cli ping &> /dev/null; then
        test_pass "Redis is responding"
    else
        test_fail "Redis is not responding"
    fi
else
    test_warn "Redis container not running (optional)"
fi
echo ""

# 7. Check Node.js and PM2
echo -e "${BLUE}[7/10] Checking Node.js and PM2...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    test_pass "Node.js installed: $NODE_VERSION"
else
    test_warn "Node.js not installed"
fi

if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    test_pass "PM2 installed: $PM2_VERSION"
    
    # Check PM2 processes
    if pm2 list | grep -q "online"; then
        PM2_COUNT=$(pm2 list | grep -c "online" || echo "0")
        test_pass "PM2 has $PM2_COUNT process(es) running"
    else
        test_warn "No PM2 processes running"
    fi
else
    test_warn "PM2 not installed"
fi
echo ""

# 8. Check Nginx
echo -e "${BLUE}[8/10] Checking Nginx...${NC}"
if command -v nginx &> /dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1)
    test_pass "Nginx installed: $NGINX_VERSION"
    
    if systemctl is-active --quiet nginx; then
        test_pass "Nginx is running"
    else
        test_warn "Nginx is not running"
    fi
else
    test_warn "Nginx not installed"
fi
echo ""

# 9. Check Firewall
echo -e "${BLUE}[9/10] Checking Firewall...${NC}"
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        test_pass "UFW firewall is active"
        
        # Check important ports
        PORTS=("22" "80" "443" "5432")
        for port in "${PORTS[@]}"; do
            if sudo ufw status | grep -q "$port"; then
                test_pass "Port $port is allowed"
            else
                test_warn "Port $port is not explicitly allowed"
            fi
        done
    else
        test_warn "UFW firewall is not active"
    fi
else
    test_warn "UFW not installed"
fi
echo ""

# 10. Check Application Files
echo -e "${BLUE}[10/10] Checking Application Files...${NC}"
APP_DIR="/opt/eff-membership"
if [ -d "$APP_DIR" ]; then
    test_pass "Application directory exists: $APP_DIR"
    
    # Check important files/directories
    FILES=(".env" "docker-compose.postgres.yml" "backend" "frontend" "database-recovery")
    for file in "${FILES[@]}"; do
        if [ -e "$APP_DIR/$file" ]; then
            test_pass "$file exists"
        else
            test_warn "$file not found"
        fi
    done
    
    # Check data directories
    DIRS=("data/postgres" "backups/postgres" "logs" "uploads")
    for dir in "${DIRS[@]}"; do
        if [ -d "$APP_DIR/$dir" ]; then
            test_pass "$dir directory exists"
        else
            test_warn "$dir directory not found"
        fi
    done
else
    test_fail "Application directory not found: $APP_DIR"
fi
echo ""

# Summary
echo -e "${BLUE}========================================================"
echo "Verification Summary"
echo -e "========================================================${NC}"
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC} $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    if [ $WARN -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed! Deployment is healthy.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ Deployment is functional but has warnings.${NC}"
        exit 0
    fi
else
    echo -e "${RED}✗ Deployment has critical issues that need attention.${NC}"
    exit 1
fi

