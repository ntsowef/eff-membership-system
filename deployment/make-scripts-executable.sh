#!/bin/bash
# Make all deployment scripts executable
# Run this script after cloning the repository

echo "Making deployment scripts executable..."

# Deployment scripts
chmod +x deployment/backend-server-setup.sh
chmod +x deployment/frontend-server-setup.sh
chmod +x deployment/configure-backend-firewall.sh
chmod +x deployment/configure-frontend-firewall.sh
chmod +x deployment/ubuntu-setup.sh
chmod +x deployment/verify-deployment.sh

# Backup scripts (if they exist)
if [ -d "backup-scripts" ]; then
    chmod +x backup-scripts/*.sh 2>/dev/null
fi

echo "✓ All scripts are now executable"
echo ""
echo "You can now run:"
echo "  ./deployment/backend-server-setup.sh"
echo "  ./deployment/frontend-server-setup.sh"
echo "  ./deployment/configure-backend-firewall.sh"
echo "  ./deployment/configure-frontend-firewall.sh"

