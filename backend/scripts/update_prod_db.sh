#!/bin/bash

# Configuration
PROD_IP="69.164.245.173"
DB_NAME="eff_membership_database"
DB_USER="eff_admin"

echo "========================================"
echo "UPDATING PRODUCTION DATABASE"
echo "Target: $PROD_IP"
echo "⚠️  WARNING: This will apply pending migrations to production."
echo "========================================"

# Prompt for password
read -s -p "Enter Production DB Password for $DB_USER: " DB_PASSWORD
echo ""

# Construct Connection String
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$PROD_IP:5432/$DB_NAME"

echo "Checking status first..."
DATABASE_URL="$DATABASE_URL" npx prisma migrate status

read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo "Deploying migrations..."
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy

echo "========================================"
echo "Deployment Complete."
