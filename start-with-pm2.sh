#!/bin/bash

# Start EFF Membership System with PM2
# Usage: ./start-with-pm2.sh

echo ""
echo "🚀 Starting EFF Membership System with PM2"
echo "=========================================="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed!"
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install PM2"
        exit 1
    fi
    echo "✅ PM2 installed successfully!"
    echo ""
fi

# Navigate to root directory
cd "$(dirname "$0")"

# Check if ecosystem.config.cjs exists
if [ ! -f "ecosystem.config.cjs" ]; then
    echo "❌ ecosystem.config.cjs not found!"
    exit 1
fi

# Stop any existing processes
echo "🛑 Stopping existing PM2 processes..."
pm2 delete all 2>/dev/null || true
echo ""

# Start both backend and frontend
echo "🚀 Starting backend and frontend..."
pm2 start ecosystem.config.cjs

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Services started successfully!"
    echo ""
    echo "📊 Process Status:"
    pm2 list
    echo ""
    echo "🌐 Access URLs:"
    echo "   Frontend: http://$(hostname -I | awk '{print $1}'):3000"
    echo "   Backend:  http://$(hostname -I | awk '{print $1}'):5000"
    echo "   Membership Application: http://$(hostname -I | awk '{print $1}'):3000/application"
    echo ""
    echo "📝 Useful Commands:"
    echo "   View logs:    pm2 logs"
    echo "   Monitor:      pm2 monit"
    echo "   Restart:      pm2 restart all"
    echo "   Stop:         pm2 stop all"
    echo ""
    echo "💾 Saving PM2 configuration..."
    pm2 save
    echo ""
    echo "✅ Done! Your application is running with PM2! 🎉"
else
    echo ""
    echo "❌ Failed to start services!"
    echo "📝 Check the logs with: pm2 logs"
    exit 1
fi

