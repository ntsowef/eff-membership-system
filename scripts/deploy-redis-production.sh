#!/bin/bash

# Redis Production Deployment Script
# This script sets up Redis caching infrastructure for the membership system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REDIS_PASSWORD=${REDIS_PASSWORD:-"your_secure_redis_password_here"}
SENTINEL_PASSWORD=${SENTINEL_PASSWORD:-"your_secure_sentinel_password_here"}
REDIS_COMMANDER_PASSWORD=${REDIS_COMMANDER_PASSWORD:-"secure_password_change_me"}

echo -e "${BLUE}🚀 Redis Production Deployment for Membership System${NC}"
echo -e "${BLUE}====================================================${NC}"

# Check if Docker and Docker Compose are installed
check_dependencies() {
    echo -e "${YELLOW}📋 Checking dependencies...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Create necessary directories
create_directories() {
    echo -e "${YELLOW}📁 Creating directories...${NC}"
    
    mkdir -p redis/logs
    mkdir -p redis/data
    mkdir -p logs
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Generate secure passwords if not provided
generate_passwords() {
    echo -e "${YELLOW}🔐 Generating secure passwords...${NC}"
    
    if [ "$REDIS_PASSWORD" = "your_secure_redis_password_here" ]; then
        REDIS_PASSWORD=$(openssl rand -base64 32)
        echo -e "${YELLOW}⚠️  Generated Redis password: ${REDIS_PASSWORD}${NC}"
        echo -e "${YELLOW}⚠️  Please save this password securely!${NC}"
    fi
    
    if [ "$SENTINEL_PASSWORD" = "your_secure_sentinel_password_here" ]; then
        SENTINEL_PASSWORD=$(openssl rand -base64 32)
        echo -e "${YELLOW}⚠️  Generated Sentinel password: ${SENTINEL_PASSWORD}${NC}"
        echo -e "${YELLOW}⚠️  Please save this password securely!${NC}"
    fi
    
    if [ "$REDIS_COMMANDER_PASSWORD" = "secure_password_change_me" ]; then
        REDIS_COMMANDER_PASSWORD=$(openssl rand -base64 16)
        echo -e "${YELLOW}⚠️  Generated Redis Commander password: ${REDIS_COMMANDER_PASSWORD}${NC}"
        echo -e "${YELLOW}⚠️  Please save this password securely!${NC}"
    fi
}

# Update configuration files with generated passwords
update_config_files() {
    echo -e "${YELLOW}⚙️  Updating configuration files...${NC}"
    
    # Update Redis master config
    sed -i "s/your_secure_redis_password_here/$REDIS_PASSWORD/g" redis/redis-master.conf
    
    # Update Redis replica config
    sed -i "s/your_secure_redis_password_here/$REDIS_PASSWORD/g" redis/redis-replica.conf
    
    # Update Sentinel config
    sed -i "s/your_secure_redis_password_here/$REDIS_PASSWORD/g" redis/sentinel.conf
    sed -i "s/your_secure_sentinel_password_here/$SENTINEL_PASSWORD/g" redis/sentinel.conf
    
    echo -e "${GREEN}✅ Configuration files updated${NC}"
}

# Create Docker network
create_network() {
    echo -e "${YELLOW}🌐 Creating Docker network...${NC}"
    
    if ! docker network ls | grep -q membership-network; then
        docker network create membership-network
        echo -e "${GREEN}✅ Docker network 'membership-network' created${NC}"
    else
        echo -e "${GREEN}✅ Docker network 'membership-network' already exists${NC}"
    fi
}

# Deploy Redis infrastructure
deploy_redis() {
    echo -e "${YELLOW}🚀 Deploying Redis infrastructure...${NC}"
    
    # Set environment variables for docker-compose
    export REDIS_PASSWORD
    export SENTINEL_PASSWORD
    export REDIS_COMMANDER_PASSWORD
    
    # Start Redis services
    docker-compose -f docker-compose.redis.yml up -d
    
    echo -e "${GREEN}✅ Redis infrastructure deployed${NC}"
}

# Wait for services to be ready
wait_for_services() {
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    
    # Wait for Redis master
    echo -e "${BLUE}Waiting for Redis master...${NC}"
    timeout 60 bash -c 'until docker exec membership-redis-master redis-cli ping; do sleep 2; done'
    
    # Wait for Redis replica
    echo -e "${BLUE}Waiting for Redis replica...${NC}"
    timeout 60 bash -c 'until docker exec membership-redis-replica redis-cli ping; do sleep 2; done'
    
    # Wait for Sentinel
    echo -e "${BLUE}Waiting for Redis Sentinel...${NC}"
    timeout 60 bash -c 'until docker exec membership-redis-sentinel redis-cli -p 26379 ping; do sleep 2; done'
    
    echo -e "${GREEN}✅ All services are ready${NC}"
}

# Test Redis connectivity
test_redis() {
    echo -e "${YELLOW}🧪 Testing Redis connectivity...${NC}"
    
    # Test master
    echo -e "${BLUE}Testing Redis master...${NC}"
    docker exec membership-redis-master redis-cli -a "$REDIS_PASSWORD" set test_key "test_value"
    RESULT=$(docker exec membership-redis-master redis-cli -a "$REDIS_PASSWORD" get test_key)
    
    if [ "$RESULT" = "test_value" ]; then
        echo -e "${GREEN}✅ Redis master test passed${NC}"
    else
        echo -e "${RED}❌ Redis master test failed${NC}"
        exit 1
    fi
    
    # Test replica
    echo -e "${BLUE}Testing Redis replica...${NC}"
    sleep 2  # Allow replication
    RESULT=$(docker exec membership-redis-replica redis-cli -a "$REDIS_PASSWORD" get test_key)
    
    if [ "$RESULT" = "test_value" ]; then
        echo -e "${GREEN}✅ Redis replica test passed${NC}"
    else
        echo -e "${RED}❌ Redis replica test failed${NC}"
        exit 1
    fi
    
    # Clean up test key
    docker exec membership-redis-master redis-cli -a "$REDIS_PASSWORD" del test_key
    
    echo -e "${GREEN}✅ Redis connectivity tests passed${NC}"
}

# Display deployment information
show_deployment_info() {
    echo -e "${GREEN}🎉 Redis deployment completed successfully!${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}Deployment Information:${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "Redis Master: localhost:6379"
    echo -e "Redis Replica: localhost:6380"
    echo -e "Redis Sentinel: localhost:26379"
    echo -e "Redis Commander: http://localhost:8081"
    echo -e "  Username: admin"
    echo -e "  Password: $REDIS_COMMANDER_PASSWORD"
    echo -e "${BLUE}================================================${NC}"
    echo -e "${YELLOW}⚠️  Important: Update your .env.production file with:${NC}"
    echo -e "REDIS_PASSWORD=$REDIS_PASSWORD"
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}Next steps:${NC}"
    echo -e "1. Update your application's Redis configuration"
    echo -e "2. Test your application's cache functionality"
    echo -e "3. Set up monitoring and alerting"
    echo -e "4. Configure backup procedures"
    echo -e "${BLUE}================================================${NC}"
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    # Add any cleanup tasks here
}

# Main deployment process
main() {
    echo -e "${BLUE}Starting Redis production deployment...${NC}"
    
    check_dependencies
    create_directories
    generate_passwords
    update_config_files
    create_network
    deploy_redis
    wait_for_services
    test_redis
    show_deployment_info
    
    echo -e "${GREEN}🚀 Deployment completed successfully!${NC}"
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
