#!/bin/bash

# Bulk Upload Processor Startup Script
# This script installs dependencies and starts the processor

set -e

echo "🚀 Starting Bulk Upload Processor..."
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python version: $(python3 --version)"
echo ""

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3."
    exit 1
fi

echo "✅ pip version: $(pip3 --version)"
echo ""

# Install dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

echo ""
echo "✅ Dependencies installed successfully"
echo ""

# Check if .env file exists
ENV_FILE="../../.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  Warning: .env file not found at $ENV_FILE"
    echo "   Using default configuration values"
fi

# Create upload directory if it doesn't exist
UPLOAD_DIR="../../_upload_file_directory"
if [ ! -d "$UPLOAD_DIR" ]; then
    echo "📁 Creating upload directory: $UPLOAD_DIR"
    mkdir -p "$UPLOAD_DIR"
fi

echo ""
echo "🔄 Starting processor..."
echo "   Press Ctrl+C to stop"
echo ""

# Run the processor
python3 bulk_upload_processor.py

