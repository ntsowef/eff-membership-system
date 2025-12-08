#!/bin/bash

# Fix Redis Replica Configuration
# This script converts a Redis replica back to a standalone master

echo "🔧 Fixing Redis Replica Configuration..."
echo "========================================"
echo ""

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running or not accessible"
    echo "   Please start Redis first"
    exit 1
fi

echo "📊 Current Redis Role:"
redis-cli ROLE

echo ""
echo "🔄 Converting replica to master..."

# Remove replication (make this instance a master)
redis-cli REPLICAOF NO ONE

echo ""
echo "✅ Redis is now a standalone MASTER"
echo ""

echo "📊 New Redis Role:"
redis-cli ROLE

echo ""
echo "🧪 Testing write operation..."
if redis-cli SET test:write_check "success" EX 10 > /dev/null 2>&1; then
    echo "✅ Write operation successful!"
    redis-cli DEL test:write_check > /dev/null 2>&1
else
    echo "❌ Write operation failed"
fi

echo ""
echo "✅ Done! Your Redis is now configured as a master."
echo ""
echo "💡 To make this permanent, update your Redis configuration file:"
echo "   1. Find redis.conf (usually in /etc/redis/ or /usr/local/etc/redis/)"
echo "   2. Comment out or remove the line: replicaof <masterip> <masterport>"
echo "   3. Restart Redis service"

