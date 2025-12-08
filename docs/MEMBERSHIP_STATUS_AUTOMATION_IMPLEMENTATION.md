# Membership Status Automation - Implementation Guide

## Overview

This document provides step-by-step instructions for implementing the automated membership status management system.

**Problem**: 5,946 members (1.17%) have incorrect membership statuses, with expired members showing as "Good Standing".

**Solution**: Hybrid approach using both database triggers and scheduled jobs to automatically update membership statuses based on expiry dates.

---

## Prerequisites

- PostgreSQL database access
- Node.js backend running
- Backup of the database (recommended)

---

## Implementation Steps

### Step 1: Create Database Trigger (5 minutes)

The trigger will automatically update membership statuses in real-time when expiry dates change.

**File**: `backend/migrations/create-membership-status-trigger.sql`

**Execute**:
```bash
# Option 1: Using psql (if available)
psql -h localhost -U eff_admin -d eff_membership_database -f backend/migrations/create-membership-status-trigger.sql

# Option 2: Using Node.js
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});
const sql = fs.readFileSync('backend/migrations/create-membership-status-trigger.sql', 'utf8');
pool.query(sql).then(() => {
  console.log('✅ Trigger created successfully');
  pool.end();
}).catch(err => {
  console.error('❌ Error:', err);
  pool.end();
});
"
```

**Verification**:
```sql
-- Check if trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'tr_auto_update_membership_status';

-- Check if function exists
SELECT 
  routine_name, 
  routine_type
FROM information_schema.routines
WHERE routine_name = 'fn_auto_update_membership_status';
```

---

### Step 2: Fix Existing Data (10 minutes)

This one-time script will correct the 5,946 members with incorrect statuses.

**File**: `backend/migrations/fix-existing-membership-statuses.sql`

**Execute**:
```bash
# Option 1: Using psql (interactive - recommended)
psql -h localhost -U eff_admin -d eff_membership_database -f backend/migrations/fix-existing-membership-statuses.sql

# Review the changes shown
# Then run: COMMIT; (to apply) or ROLLBACK; (to cancel)

# Option 2: Using Node.js (auto-commit)
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({
  host: 'localhost',
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});
const sql = fs.readFileSync('backend/migrations/fix-existing-membership-statuses.sql', 'utf8');
pool.query(sql + ' COMMIT;').then(() => {
  console.log('✅ Data fix completed');
  pool.end();
}).catch(err => {
  console.error('❌ Error:', err);
  pool.end();
});
"
```

**Expected Results**:
- ~4,047 members: Good Standing → Grace Period
- ~1,899 members: Good Standing → Expired
- ~146 members: (various) → Inactive

**Verification**:
```sql
-- Check status distribution after fix
SELECT 
  ms.status_name,
  COUNT(*) as member_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM members m
LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
GROUP BY ms.status_name
ORDER BY member_count DESC;
```

---

### Step 3: Deploy Scheduled Job (5 minutes)

The scheduled job runs daily at midnight as a safety net.

**Files Modified**:
- `backend/src/jobs/membershipStatusJob.ts` (created)
- `backend/src/app.ts` (modified)

**Build and Deploy**:
```bash
# Navigate to backend directory
cd backend

# Install dependencies (if needed)
npm install

# Build TypeScript
npm run build

# Restart the backend service
pm2 restart eff-backend

# Or if not using PM2
npm run start
```

**Verification**:
```bash
# Check PM2 logs
pm2 logs eff-backend --lines 50

# Look for this message:
# "👥 Membership Status Update Job: Active (daily at midnight)"
```

---

### Step 4: Test the System (15 minutes)

#### Test 1: Trigger Test
```sql
-- Create a test member with expired membership
INSERT INTO members (
  id_number, firstname, surname, ward_code, 
  expiry_date, membership_status_id
) VALUES (
  '9999999999999', 'Test', 'User', 'WD001',
  CURRENT_DATE - INTERVAL '100 days', 8 -- Expired but marked as Good Standing
);

-- Check if trigger updated the status
SELECT 
  member_id, firstname, surname, expiry_date,
  membership_status_id, 
  (SELECT status_name FROM membership_statuses WHERE status_id = membership_status_id) as status
FROM members
WHERE id_number = '9999999999999';

-- Expected: membership_status_id should be 2 (Expired)

-- Clean up
DELETE FROM members WHERE id_number = '9999999999999';
```

#### Test 2: Scheduled Job Test
```bash
# Run the job manually
node -e "
const { MembershipStatusJob } = require('./dist/jobs/membershipStatusJob');
MembershipStatusJob.runNow().then(result => {
  console.log('Job result:', result);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
"
```

---

### Step 5: Monitor and Validate (Ongoing)

#### Daily Monitoring
```sql
-- Check for members with mismatched statuses
SELECT 
  COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE AND membership_status_id != 8) as should_be_good_standing,
  COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE - INTERVAL '90 days' AND expiry_date < CURRENT_DATE AND membership_status_id != 7) as should_be_grace,
  COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE - INTERVAL '90 days' AND membership_status_id != 2) as should_be_expired
FROM members
WHERE membership_status_id NOT IN (3, 4, 5); -- Exclude manual statuses
```

#### Weekly Report
```sql
-- Membership status distribution
SELECT 
  ms.status_name,
  COUNT(*) as member_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM members m
LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
GROUP BY ms.status_name
ORDER BY member_count DESC;
```

---

## Rollback Plan

If issues arise, you can disable the automation:

### Disable Trigger
```sql
-- Disable the trigger (keeps it but stops execution)
ALTER TABLE members DISABLE TRIGGER tr_auto_update_membership_status;

-- Or drop it completely
DROP TRIGGER IF EXISTS tr_auto_update_membership_status ON members;
DROP FUNCTION IF EXISTS fn_auto_update_membership_status();
```

### Stop Scheduled Job
```bash
# Edit backend/src/app.ts and comment out:
# MembershipStatusJob.start();

# Rebuild and restart
npm run build
pm2 restart eff-backend
```

---

## Troubleshooting

### Issue: Trigger not firing
**Solution**: Check if trigger is enabled
```sql
SELECT * FROM pg_trigger WHERE tgname = 'tr_auto_update_membership_status';
```

### Issue: Job not running
**Solution**: Check PM2 logs
```bash
pm2 logs eff-backend --lines 100 | grep "Membership Status"
```

### Issue: Performance degradation
**Solution**: Monitor trigger execution time
```sql
-- Add timing to trigger function (for debugging)
-- See trigger code for details
```

---

## Success Criteria

✅ Trigger created and active  
✅ 5,946 members' statuses corrected  
✅ Scheduled job running daily  
✅ No members with mismatched statuses  
✅ System performance unchanged  

---

**Document Version**: 1.0  
**Date**: 2025-11-20  
**Next Review**: 2025-11-27

