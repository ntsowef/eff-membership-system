#!/bin/bash

# Configuration
PROD_IP="69.164.245.173"
DB_NAME="eff_membership_database" # inferred from deploy-production.sh
DB_USER="eff_admin" # inferred from deploy-production.sh
# DB_PASSWORD will be prompted

echo "========================================"
echo "Checking Production Database Status"
echo "Target: $PROD_IP"
echo "========================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found in current directory."
    echo "Please run this script from the backend directory."
    exit 1
fi

# Prompt for password
read -s -p "Enter Production DB Password for $DB_USER: " DB_PASSWORD
echo ""

# Construct Connection String
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$PROD_IP:5432/$DB_NAME"

echo "Running prisma migrate status..."
DATABASE_URL="$DATABASE_URL" npx prisma migrate status

echo "========================================"
echo "Done."
