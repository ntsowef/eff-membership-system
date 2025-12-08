#!/bin/bash

###############################################################################
# Fix Logo for Ward Register PDF in Production
# 
# This script ensures the logo file is in the correct location for PDF generation
# Run this on your production server
#
# Usage: sudo bash fix-logo-production.sh
###############################################################################

set -e  # Exit on error

echo "======================================================================================================"
echo "Fixing Logo for Ward Register PDF Generation"
echo "======================================================================================================"
echo ""

# Configuration
BACKEND_DIR="/var/www/eff-membership-system/backend"
ASSETS_DIR="$BACKEND_DIR/assets"
LOGO_FILE="$ASSETS_DIR/logo.png"
SOURCE_LOGO="$BACKEND_DIR/src/assets/images/EFF_Reglogo.png"
PM2_APP_NAME="eff-api"

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ ERROR: Backend directory not found at $BACKEND_DIR"
    echo "   Please update the BACKEND_DIR variable in this script"
    exit 1
fi

echo "✅ Backend directory found: $BACKEND_DIR"
echo ""

# Navigate to backend directory
cd "$BACKEND_DIR"

# Create assets directory if it doesn't exist
if [ ! -d "$ASSETS_DIR" ]; then
    echo "📁 Creating assets directory..."
    mkdir -p "$ASSETS_DIR"
    echo "✅ Assets directory created"
else
    echo "✅ Assets directory exists"
fi
echo ""

# Check if logo already exists
if [ -f "$LOGO_FILE" ]; then
    echo "⚠️  Logo file already exists at: $LOGO_FILE"
    echo "   File size: $(du -h "$LOGO_FILE" | cut -f1)"
    read -p "   Do you want to replace it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Keeping existing logo file"
        SKIP_COPY=true
    fi
fi

# Copy logo from source if available and not skipped
if [ "$SKIP_COPY" != "true" ]; then
    if [ -f "$SOURCE_LOGO" ]; then
        echo "📋 Copying logo from: $SOURCE_LOGO"
        cp "$SOURCE_LOGO" "$LOGO_FILE"
        echo "✅ Logo copied successfully"
    else
        echo "⚠️  Source logo not found at: $SOURCE_LOGO"
        echo ""
        echo "   Please manually upload your logo file to:"
        echo "   $LOGO_FILE"
        echo ""
        echo "   Logo requirements:"
        echo "   - Format: PNG (recommended)"
        echo "   - Size: 300x300 pixels or similar square aspect ratio"
        echo "   - Filename: logo.png"
        echo ""
        read -p "   Press Enter after you've uploaded the logo file..."
    fi
fi
echo ""

# Verify logo file exists
if [ ! -f "$LOGO_FILE" ]; then
    echo "❌ ERROR: Logo file not found at: $LOGO_FILE"
    echo "   Please upload the logo file and run this script again"
    exit 1
fi

echo "✅ Logo file verified: $LOGO_FILE"
echo "   File size: $(du -h "$LOGO_FILE" | cut -f1)"
echo ""

# Set proper permissions
echo "🔒 Setting file permissions..."
chmod 755 "$ASSETS_DIR"
chmod 644 "$LOGO_FILE"
echo "✅ Permissions set (755 for directory, 644 for logo)"
echo ""

# Set ownership (detect the user running Node.js/PM2)
if command -v pm2 &> /dev/null; then
    PM2_USER=$(pm2 jlist | grep -o '"user":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$PM2_USER" ]; then
        echo "🔒 Setting ownership to PM2 user: $PM2_USER"
        chown -R "$PM2_USER:$PM2_USER" "$ASSETS_DIR"
        echo "✅ Ownership set"
    else
        echo "⚠️  Could not detect PM2 user, skipping ownership change"
        echo "   You may need to manually run: sudo chown -R <user>:<user> $ASSETS_DIR"
    fi
else
    echo "⚠️  PM2 not found, skipping ownership change"
    echo "   You may need to manually run: sudo chown -R <user>:<user> $ASSETS_DIR"
fi
echo ""

# Restart PM2 application
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting PM2 application: $PM2_APP_NAME"
    pm2 restart "$PM2_APP_NAME"
    echo "✅ Application restarted"
else
    echo "⚠️  PM2 not found, please manually restart your Node.js application"
fi
echo ""

echo "======================================================================================================"
echo "✅ Logo Setup Complete!"
echo "======================================================================================================"
echo ""
echo "Logo location: $LOGO_FILE"
echo ""
echo "Next steps:"
echo "1. Test by downloading a ward register PDF"
echo "2. Verify the logo appears at the top of the PDF"
echo "3. If issues persist, check PM2 logs:"
echo "   pm2 logs $PM2_APP_NAME"
echo ""
echo "======================================================================================================"

