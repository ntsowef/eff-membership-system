#!/bin/bash

# Fix vw_member_details_optimized view to include voting_station_name column
# This script applies the SQL fix to the production database

echo "🔧 Fixing vw_member_details_optimized view..."
echo "================================================"
echo ""

# Database connection details (update these if needed)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-eff_membership_db}"
DB_USER="${DB_USER:-postgres}"

# SQL file path
SQL_FILE="database-recovery/fix_optimized_view_voting_station.sql"

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: SQL file not found: $SQL_FILE"
    exit 1
fi

echo "📋 SQL File: $SQL_FILE"
echo "🗄️  Database: $DB_NAME"
echo "🖥️  Host: $DB_HOST:$DB_PORT"
echo "👤 User: $DB_USER"
echo ""

# Prompt for password
echo "🔐 Enter PostgreSQL password for user '$DB_USER':"
read -s DB_PASSWORD
echo ""

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Execute the SQL file
echo "⚙️  Executing SQL script..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ View fixed successfully!"
    echo ""
    echo "📊 Verifying the fix..."
    
    # Test query to verify voting_station_name column exists
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            member_id,
            membership_number,
            firstname,
            surname,
            voting_station_name
        FROM vw_member_details_optimized
        LIMIT 3;
    "
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Verification successful! The voting_station_name column is now accessible."
        echo ""
        echo "🎉 Digital membership card generation should now work correctly!"
    else
        echo ""
        echo "⚠️  Warning: Verification query failed. Please check the view manually."
    fi
else
    echo ""
    echo "❌ Error: Failed to execute SQL script."
    echo "Please check the error messages above and try again."
    exit 1
fi

# Clear password from environment
unset PGPASSWORD

echo ""
echo "================================================"
echo "✅ Script completed!"

