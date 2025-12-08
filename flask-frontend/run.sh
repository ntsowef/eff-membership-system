#!/bin/bash
# Quick start script for Flask frontend on Linux/Mac

echo "========================================"
echo "EFF Membership Flask Frontend"
echo "========================================"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo ""
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env file with your configuration"
    echo ""
fi

# Install/update dependencies
echo "Installing dependencies..."
pip install -r requirements.txt
echo ""

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    mkdir uploads
fi

# Start the application
echo "========================================"
echo "Starting Flask application on port 3001"
echo "Backend API should be running on port 5000"
echo "========================================"
echo ""
python app.py

