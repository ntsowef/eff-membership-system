# Payment Tables Migration Guide

## Problem
The application is throwing errors because the `payment_transactions` table and related payment system tables do not exist in the PostgreSQL database.

```
error: relation "payment_transactions" does not exist
```

## Solution
Create the missing payment system tables in the PostgreSQL database running on Docker at `69.164.245.173`.

---

## Tables to be Created

This migration creates 8 essential payment system tables:

1. **payment_transactions** - Main payment transactions table
2. **cash_payment_verifications** - Cash payment verification tracking
3. **admin_notifications** - Admin notifications for payments
4. **financial_monitoring_summary** - Daily financial summaries
5. **payment_gateway_configs** - Payment gateway configurations
6. **application_workflow_status** - Application workflow tracking
7. **receipt_uploads** - Receipt file uploads
8. **financial_audit_trail** - Financial operations audit trail

---

## Migration Methods

### Method 1: Run on Server (Recommended)

**Step 1:** SSH into your server
```bash
ssh user@69.164.245.173
```

**Step 2:** Navigate to the application directory
```bash
cd /root/Applications/backend
```

**Step 3:** Run the migration script
```bash
node create-payment-tables-direct.js
```

This will:
- Connect to localhost PostgreSQL
- Create all 8 payment tables
- Set up triggers and indexes
- Verify the tables were created successfully

---

### Method 2: Using Docker Exec

**Step 1:** Copy the SQL file to the server

**Step 2:** Run the migration via Docker
```bash
docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < /path/to/create_payment_transactions_tables.sql
```

---

### Method 3: Using psql Command

**Step 1:** On the server, run:
```bash
PGPASSWORD='Frames!123' psql -h localhost -p 5432 -U eff_admin -d eff_membership_db -f /path/to/create_payment_transactions_tables.sql
```

---

### Method 4: Interactive psql Session

**Step 1:** Connect to PostgreSQL
```bash
docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db
```

**Step 2:** Copy and paste the SQL from `database-recovery/create_payment_transactions_tables.sql`

---

## Verification

After running the migration, verify the tables were created:

### Check Tables
```sql
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
```

Expected result: 8 tables

### Check payment_transactions Structure
```sql
\d payment_transactions
```

### Check Triggers
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'payment_transactions';
```

Expected triggers:
- `trg_update_workflow_status_after_payment_insert`
- `trg_update_workflow_status_after_payment_update`

### Check Indexes
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'payment_transactions';
```

Expected indexes:
- `payment_transactions_pkey`
- `idx_payment_application`
- `idx_payment_status`
- `idx_payment_method`
- `idx_payment_created`
- `idx_payment_verification`

---

## Files Created

1. **database-recovery/create_payment_transactions_tables.sql**
   - Complete PostgreSQL migration script
   - Creates all 8 tables with proper constraints
   - Sets up triggers and indexes
   - Includes verification queries

2. **backend/create-payment-tables-direct.js**
   - Node.js script to run the migration
   - Connects to localhost PostgreSQL
   - Provides detailed verification output
   - Should be run on the server

3. **database-recovery/run_payment_migration.sh**
   - Bash script for Linux/Unix systems
   - Runs the migration using psql
   - Includes verification steps

4. **backend/run-payment-migration-docker.ps1**
   - PowerShell script with instructions
   - Provides multiple migration options
   - Can display SQL content for copy-paste

---

## Post-Migration Steps

1. **Restart Backend Server**
   ```bash
   # On the server
   pm2 restart backend
   # or
   npm run dev
   ```

2. **Test Payment Endpoints**
   - Try accessing the payment endpoints that were failing
   - Check for application ID 28 payments: `GET /api/v1/payments/application/28/payments`

3. **Verify Application Workflow**
   - Test the membership approval workflow
   - Ensure payment status checks work correctly

---

## Troubleshooting

### Error: "relation already exists"
This means the tables are already created. You can safely ignore this error or drop the tables first:
```sql
DROP TABLE IF EXISTS financial_audit_trail CASCADE;
DROP TABLE IF EXISTS receipt_uploads CASCADE;
DROP TABLE IF EXISTS application_workflow_status CASCADE;
DROP TABLE IF EXISTS payment_gateway_configs CASCADE;
DROP TABLE IF EXISTS financial_monitoring_summary CASCADE;
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS cash_payment_verifications CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
```

### Error: "permission denied"
Make sure you're using the correct database user (`eff_admin`) with proper permissions.

### Error: "connection refused"
- Ensure PostgreSQL is running: `docker ps | grep postgres`
- Check if the port is correct: `5432`
- Verify you're running the script on the server

### Error: "foreign key constraint"
The migration requires the `membership_applications` table to exist. Verify:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'membership_applications'
);
```

---

## Database Schema Details

### payment_transactions Table
```sql
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  transaction_id VARCHAR(100) NULL,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ZAR',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  gateway_response TEXT NULL,
  receipt_number VARCHAR(50) NULL,
  receipt_image_path VARCHAR(255) NULL,
  verified_by INTEGER NULL,
  verified_at TIMESTAMP NULL,
  verification_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_payment_application 
    FOREIGN KEY (application_id) 
    REFERENCES membership_applications(id) 
    ON DELETE CASCADE
);
```

### Key Features
- **Auto-incrementing ID** using SERIAL
- **Foreign key** to membership_applications
- **Check constraints** for payment_method and status
- **Indexes** for performance optimization
- **Triggers** for automatic workflow status updates
- **JSONB columns** for flexible data storage

---

## Support

If you encounter any issues:

1. Check the backend logs: `pm2 logs backend`
2. Check PostgreSQL logs: `docker logs eff-membership-postgres`
3. Verify database connection: `docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db -c '\conninfo'`

---

## Summary

This migration creates a complete payment system infrastructure in PostgreSQL, including:
- ✅ Payment transaction tracking
- ✅ Cash payment verification workflow
- ✅ Admin notifications system
- ✅ Financial monitoring and reporting
- ✅ Payment gateway configuration
- ✅ Application workflow status tracking
- ✅ Receipt upload management
- ✅ Financial audit trail

After running this migration, your application will be able to:
- Process card and cash payments
- Track payment verification status
- Monitor financial metrics
- Manage payment workflows
- Audit financial operations

