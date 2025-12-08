#!/bin/bash

###############################################################################
# Install Chromium Dependencies for Puppeteer/html-pdf-node
# 
# This script installs all required system libraries for Puppeteer to run
# Chromium for PDF generation on Ubuntu/Debian Linux servers.
#
# Usage: sudo bash install-chromium-dependencies.sh
###############################################################################

set -e  # Exit on error

echo "======================================================================================================"
echo "Installing Chromium Dependencies for Puppeteer/html-pdf-node"
echo "======================================================================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ ERROR: This script must be run as root (use sudo)"
  exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo "❌ ERROR: Cannot detect OS"
    exit 1
fi

echo "✅ Detected OS: $OS $VERSION"
echo ""

# Update package list
echo "📦 Updating package list..."
apt-get update -qq

echo ""
echo "📦 Installing Chromium dependencies..."
echo "This may take a few minutes..."
echo ""

# Install all required dependencies for Chromium/Puppeteer
apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils \
  libdrm2 \
  libgbm-dev \
  libnss3-dev \
  libxshmfence1

echo ""
echo "======================================================================================================"
echo "✅ Installation Complete!"
echo "======================================================================================================"
echo ""
echo "Next steps:"
echo "1. Restart your Node.js application:"
echo "   cd /var/www/eff-membership-system/backend"
echo "   pm2 restart eff-api"
echo ""
echo "2. Test PDF generation:"
echo "   Try exporting a ward audit report as PDF"
echo ""
echo "3. Check logs if issues persist:"
echo "   pm2 logs eff-api"
echo ""
echo "======================================================================================================"

