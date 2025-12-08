# Unified Financial System Migrations

## Overview

This migration package creates a comprehensive Financial Oversight System with views and tables for Financial Reviewers and National Admins.

## What These Migrations Do

### Migration 021: Financial Transaction Views
Creates 4 PostgreSQL views:

1. **`unified_financial_transactions`** - Main view combining all financial transactions
2. **`financial_transactions_summary`** - Summary statistics by transaction type
3. **`pending_financial_reviews`** - Transactions awaiting financial review
4. **`financial_audit_trail_view`** - Audit trail of reviewed transactions

### Migration 023: Financial Dashboard Tables
Creates 5 PostgreSQL tables:

1. **`daily_financial_summary`** - Daily financial metrics and statistics
2. **`monthly_financial_summary`** - Monthly trend analysis data
3. **`financial_reviewer_performance`** - Reviewer performance tracking
4. **`financial_dashboard_cache`** - Real-time dashboard caching
5. **`financial_kpi_tracking`** - KPI tracking with 13 initial KPIs

Plus performance indexes on underlying tables.

## Files Included

- `021_unified_financial_transactions_view_server.sql` - Financial views migration (REQUIRED)
- `023_financial_dashboard_summary_tables_server.sql` - Dashboard tables migration (REQUIRED)
- `run_unified_financial_views_migration.sh` - Bash script for Linux/Mac
- `run_unified_financial_views_migration.ps1` - PowerShell script for Windows
- `README_UNIFIED_FINANCIAL_VIEWS.md` - This file

**IMPORTANT:** Both migrations (021 and 023) must be run for the complete financial system to work.

---

## Installation Instructions

### Option 1: Using the Automated Script (Recommended)

#### On Linux/Mac:

```bash
# Navigate to migrations directory
cd backend/migrations

# Make script executable
chmod +x run_unified_financial_views_migration.sh

# Run the script
./run_unified_financial_views_migration.sh
```

#### On Windows (PowerShell):

```powershell
# Navigate to migrations directory
cd backend\migrations

# Run the script
.\run_unified_financial_views_migration.ps1
```

The script will prompt you for:
- Database Host (default: localhost)
- Database Port (default: 5432)
- Database Name (default: eff_membership_db)
- Database User (default: eff_admin)
- Database Password

---

### Option 2: Manual Execution

#### Using psql command line:

```bash
psql -h your_host -p 5432 -U your_user -d your_database -f 021_unified_financial_transactions_view_server.sql
```

#### Using pgAdmin:

1. Open pgAdmin
2. Connect to your database
3. Open Query Tool (Tools → Query Tool)
4. Open the file `021_unified_financial_transactions_view_server.sql`
5. Execute the script (F5 or click Execute button)

#### Using DBeaver:

1. Open DBeaver
2. Connect to your PostgreSQL database
3. Right-click on the database → SQL Editor → Open SQL Script
4. Select `021_unified_financial_transactions_view_server.sql`
5. Execute the script (Ctrl+Enter or click Execute button)

---

### Option 3: Remote Server Execution

If your PostgreSQL is on a remote server:

```bash
# Copy the SQL file to the server
scp 021_unified_financial_transactions_view_server.sql user@server:/tmp/

# SSH into the server
ssh user@server

# Run the migration
psql -h localhost -U eff_admin -d eff_membership_db -f /tmp/021_unified_financial_transactions_view_server.sql
```

---

## Verification

After running the migration, verify the views were created:

```sql
-- Check if views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN (
    'unified_financial_transactions',
    'financial_transactions_summary',
    'pending_financial_reviews',
    'financial_audit_trail_view'
  )
ORDER BY table_name;
```

Expected output:
```
financial_audit_trail_view
financial_transactions_summary
pending_financial_reviews
unified_financial_transactions
```

Test the main view:

```sql
-- Count transactions
SELECT COUNT(*) FROM unified_financial_transactions;

-- View summary
SELECT * FROM financial_transactions_summary;

-- Check pending reviews
SELECT COUNT(*) FROM pending_financial_reviews;
```

---

## Troubleshooting

### Error: "psql: command not found"

**Solution:** Install PostgreSQL client tools:

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**CentOS/RHEL:**
```bash
sudo yum install postgresql
```

**Mac (Homebrew):**
```bash
brew install postgresql
```

**Windows:**
- Download and install PostgreSQL from https://www.postgresql.org/download/windows/
- Or use the version bundled with pgAdmin

---

### Error: "relation does not exist"

**Possible causes:**
1. Required tables don't exist in your database
2. Wrong database selected

**Solution:** Verify required tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('membership_applications', 'membership_renewals', 'members')
ORDER BY table_name;
```

All three tables must exist.

---

### Error: "column does not exist"

**Possible cause:** Your database schema is different from expected.

**Solution:** Check your table structure:

```sql
-- Check membership_applications columns
\d membership_applications

-- Check membership_renewals columns
\d membership_renewals

-- Check members columns
\d members
```

Compare with the expected columns in the migration script and adjust if needed.

---

### Error: "permission denied"

**Solution:** Ensure your database user has necessary permissions:

```sql
-- Grant permissions (run as superuser)
GRANT CREATE ON SCHEMA public TO your_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO your_user;
```

---

## Rollback

If you need to remove the views:

```sql
-- Drop all views
DROP VIEW IF EXISTS financial_audit_trail_view CASCADE;
DROP VIEW IF EXISTS pending_financial_reviews CASCADE;
DROP VIEW IF EXISTS financial_transactions_summary CASCADE;
DROP VIEW IF EXISTS unified_financial_transactions CASCADE;

-- Drop indexes (optional)
DROP INDEX IF EXISTS idx_applications_payment_lookup;
DROP INDEX IF EXISTS idx_renewals_payment_lookup;
```

---

## Post-Migration Steps

1. **Restart Backend Application:**
   ```bash
   # If using PM2
   pm2 restart backend
   
   # If using systemd
   sudo systemctl restart eff-backend
   
   # If running manually
   # Stop the current process and restart
   ```

2. **Test Financial Dashboard:**
   - Login as National Admin
   - Navigate to Financial Dashboard
   - Verify data loads without errors
   - Check transaction statistics

3. **Test Financial Review:**
   - Navigate to Financial Review section
   - Verify pending transactions appear
   - Test financial review workflow

4. **Monitor Logs:**
   ```bash
   # Check for any errors
   tail -f /path/to/backend/logs/app.log
   ```

---

## Support

If you encounter issues:

1. Check the error messages in the script output
2. Verify database connection details
3. Ensure PostgreSQL client tools are installed
4. Check database user permissions
5. Review the troubleshooting section above

For additional help, contact the development team with:
- Error messages
- Database version (`SELECT version();`)
- Migration script output
- Backend application logs

---

## Technical Details

### View Structure

**unified_financial_transactions:**
- Combines data from `membership_applications` and `membership_renewals`
- Uses UNION ALL for performance
- Includes member info, payment details, and review status
- Generates unique transaction IDs (APP_xxx, REN_xxx)

**Performance:**
- Indexes created on frequently queried columns
- Views are materialized on query (not stored)
- Suitable for databases with < 1M transactions
- For larger datasets, consider materialized views

### Dependencies

Required tables:
- `membership_applications`
- `membership_renewals`
- `members`

Required columns in `membership_applications`:
- `application_id`, `first_name`, `last_name`, `email`, `cell_number`, `id_number`
- `payment_amount`, `payment_method`, `payment_reference`, `last_payment_date`
- `payment_status`, `payment_notes`, `status`, `created_at`, `updated_at`

Required columns in `membership_renewals`:
- `renewal_id`, `member_id`, `renewal_year`, `renewal_status`
- `renewal_amount`, `payment_method`, `payment_reference`, `payment_date`, `payment_status`
- `financial_status`, `financial_reviewed_at`, `financial_reviewed_by`
- `financial_rejection_reason`, `financial_admin_notes`, `created_at`, `updated_at`

Required columns in `members`:
- `member_id`, `firstname`, `surname`, `email`, `cell_number`, `id_number`

---

## Version History

- **v1.0** (2025-10-28) - Initial release
  - Created 4 financial views
  - Added performance indexes
  - PostgreSQL-compatible syntax

---

## License

Internal use only - EFF Membership Management System

