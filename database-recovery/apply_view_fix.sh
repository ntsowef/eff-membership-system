#!/bin/bash

# Script to apply the vw_member_details_optimized view fix
# This fixes the missing expiry_date column error

echo "🔧 Applying vw_member_details_optimized view fix..."
echo ""

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-eff_membership_db}"
DB_USER="${DB_USER:-postgres}"

echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Apply the fix
echo "📝 Applying SQL fix..."
PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "fix_optimized_view_expiry_date.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ View fix applied successfully!"
    echo ""
    echo "🔍 Verifying view columns..."
    
    # Verify the view has the required columns
    PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'vw_member_details_optimized' 
          AND column_name IN ('expiry_date', 'membership_status', 'days_until_expiry', 'membership_amount', 'last_payment_date', 'date_joined')
        ORDER BY column_name;
    "
    
    echo ""
    echo "✨ Done! The view now includes all required columns."
    echo ""
    echo "📋 Next steps:"
    echo "   1. Restart your backend server"
    echo "   2. Clear Redis cache if applicable"
    echo "   3. Test the digital card functionality"
else
    echo ""
    echo "❌ Error applying view fix. Please check the error messages above."
    exit 1
fi

