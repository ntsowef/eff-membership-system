#!/bin/bash

# =====================================================================================
# Run Payment Tables Migration on PostgreSQL Docker Container
# =====================================================================================
# This script should be run on the server at 69.164.245.173
# It will create the payment_transactions table and all related tables
# =====================================================================================

echo "🔄 Starting payment tables migration..."
echo "📍 Database: eff_membership_db"
echo ""

# Database credentials
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="eff_admin"
DB_PASSWORD="Frames!123"
DB_NAME="eff_membership_db"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATION_FILE="$SCRIPT_DIR/create_payment_transactions_tables.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found at $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file found: $MIGRATION_FILE"
echo "🗄️  Executing migration..."
echo ""

# Run the migration using psql
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    
    # Verify tables were created
    echo "🔍 Verifying created tables..."
    echo ""
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'payment_transactions',
        'cash_payment_verifications',
        'admin_notifications',
        'financial_monitoring_summary',
        'payment_gateway_configs',
        'application_workflow_status',
        'receipt_uploads',
        'financial_audit_trail'
      )
    ORDER BY tablename;
    "
    
    echo ""
    echo "🎉 Payment tables migration completed successfully!"
    echo "✅ The payment_transactions table is now available for use."
else
    echo ""
    echo "❌ Migration failed!"
    exit 1
fi

