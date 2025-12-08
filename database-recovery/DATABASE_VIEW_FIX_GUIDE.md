# Database View Fix Guide - Missing expiry_date Column

## 🔴 Problem

The backend is throwing this error:
```
error: column "expiry_date" does not exist
```

This occurs when querying `vw_member_details_optimized` view because the view is missing critical columns:
- `expiry_date`
- `membership_status`
- `days_until_expiry`
- `membership_amount`
- `last_payment_date`
- `date_joined`

## 🎯 Root Cause

The `vw_member_details_optimized` view in your database doesn't include the `memberships` table join, which contains the expiry date and membership status information. The backend code expects these columns to exist in the view.

## ✅ Solution

Apply the SQL fix to recreate the view with all necessary columns.

---

## 📋 Step-by-Step Fix Instructions

### Option 1: Using PowerShell (Windows - Recommended)

1. **Open PowerShell as Administrator**

2. **Navigate to the database-recovery directory**:
   ```powershell
   cd C:\Development\NewProj\Membership-new\database-recovery
   ```

3. **Set your database password** (if different from default):
   ```powershell
   $env:DB_PASSWORD = "your_password_here"
   ```

4. **Run the fix script**:
   ```powershell
   .\apply_view_fix.ps1
   ```

5. **Verify the output** - you should see:
   ```
   ✅ View fix applied successfully!
   
   🔍 Verifying view columns...
   
   column_name        | data_type
   -------------------+-----------
   date_joined        | date
   days_until_expiry  | integer
   expiry_date        | date
   last_payment_date  | date
   membership_amount  | numeric
   membership_status  | text
   ```

### Option 2: Using psql Directly

1. **Open Command Prompt or PowerShell**

2. **Navigate to the database-recovery directory**:
   ```bash
   cd C:\Development\NewProj\Membership-new\database-recovery
   ```

3. **Run psql with the SQL file**:
   ```bash
   psql -h localhost -p 5432 -U postgres -d eff_membership_db -f fix_optimized_view_expiry_date.sql
   ```

4. **Enter your PostgreSQL password when prompted**

### Option 3: Using pgAdmin

1. **Open pgAdmin**

2. **Connect to your database** (`eff_membership_db`)

3. **Open Query Tool** (Tools → Query Tool)

4. **Open the SQL file**:
   - Click File → Open
   - Navigate to: `C:\Development\NewProj\Membership-new\database-recovery\fix_optimized_view_expiry_date.sql`

5. **Execute the query** (F5 or click Execute button)

6. **Verify success** - you should see messages like:
   ```
   DROP VIEW
   CREATE VIEW
   CREATE INDEX
   ...
   ```

---

## 🔄 Post-Fix Steps

After applying the database fix, you need to restart services and clear caches:

### 1. Clear Redis Cache

```bash
redis-cli FLUSHALL
```

Or if Redis requires authentication:
```bash
redis-cli -a your_password FLUSHALL
```

### 2. Restart Backend Server

If using PM2:
```bash
pm2 restart eff-api
```

Or if running manually:
```bash
# Stop the current process (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

### 3. Verify the Fix

Test the digital card functionality:

1. Navigate to: `http://localhost:3000/my-card`
2. Enter ID number: `7501165402082` (or any valid member ID)
3. Click "View My Card"
4. Card should load without errors

Check backend logs - you should no longer see the "column expiry_date does not exist" error.

---

## 🔍 What the Fix Does

The SQL script:

1. **Drops the existing view** (if it exists)
2. **Recreates the view** with proper joins to the `memberships` table
3. **Adds all required columns**:
   - `expiry_date` - Actual expiry date from memberships table
   - `membership_status` - Calculated status (Active/Expired/Inactive)
   - `days_until_expiry` - Calculated days remaining
   - `membership_amount` - Membership fee amount
   - `last_payment_date` - Last payment date
   - `date_joined` - Membership start date
4. **Creates performance indexes** for faster queries
5. **Includes metro support** for municipalities directly under provinces
6. **Handles voting district code cleanup** (removes '.0' suffixes)

---

## 🧪 Verification Queries

After applying the fix, run these queries to verify:

### Check if view exists:
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_name = 'vw_member_details_optimized';
```

### Check view columns:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vw_member_details_optimized' 
ORDER BY ordinal_position;
```

### Test the view with a sample query:
```sql
SELECT 
    member_id,
    firstname,
    surname,
    membership_status,
    expiry_date,
    days_until_expiry,
    membership_amount
FROM vw_member_details_optimized 
WHERE id_number = '7501165402082';
```

Expected result: Should return member data with all columns populated (no errors).

---

## ⚠️ Troubleshooting

### Error: "psql: command not found"

**Solution**: Install PostgreSQL client tools
- Download from: https://www.postgresql.org/download/windows/
- Or install via Chocolatey: `choco install postgresql`

### Error: "permission denied for relation"

**Solution**: Ensure you're connecting as a user with sufficient privileges
```bash
psql -h localhost -p 5432 -U postgres -d eff_membership_db
```

### Error: "database does not exist"

**Solution**: Check your database name
```bash
# List all databases
psql -h localhost -p 5432 -U postgres -l
```

### Error: "relation memberships does not exist"

**Solution**: The memberships table is missing. You need to run the full database schema setup first.
```bash
psql -h localhost -p 5432 -U postgres -d eff_membership_db -f database-recovery/complete_eff_membership_schema.sql
```

---

## 📝 Related Files

- **SQL Fix**: `database-recovery/fix_optimized_view_expiry_date.sql`
- **PowerShell Script**: `database-recovery/apply_view_fix.ps1`
- **Bash Script**: `database-recovery/apply_view_fix.sh`
- **Backend Model**: `backend/src/models/optimizedMembers.ts`
- **Complete Schema**: `database-recovery/complete_eff_membership_schema.sql`

---

## 🎯 Summary

This fix ensures that the `vw_member_details_optimized` view includes all columns required by the backend, specifically:
- ✅ Joins with `memberships` table
- ✅ Includes `expiry_date` column
- ✅ Calculates `membership_status`
- ✅ Calculates `days_until_expiry`
- ✅ Includes payment and date information
- ✅ Maintains metro support for geographic data
- ✅ Optimized with proper indexes

After applying this fix, the digital membership card functionality should work correctly without database errors.

---

**Date**: 2025-11-04  
**Status**: Ready to Apply  
**Priority**: HIGH - Blocks digital card functionality

