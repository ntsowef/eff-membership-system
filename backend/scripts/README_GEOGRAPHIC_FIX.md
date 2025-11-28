# Geographic Data Integrity Fix Guide

## Problem Summary

A critical data integrity issue has been identified in the membership database where **94 municipalities** from various provinces are incorrectly linked to the **Bojanala district (DC37)** in North West province. This breaks the geographic hierarchy used by the membership directory's filtering system.

### Impact
- Geographic filtering (Province → District → Municipality → Ward → Voting District) is broken
- Many districts show 0 municipalities 
- Membership analytics by region are inaccurate
- Ward audit functionality may be affected

## Solution Overview

The fix involves:
1. **Backup** all geographic data tables
2. **Correct** municipality-district mappings based on official South African municipal codes
3. **Validate** the corrections
4. **Test** the membership directory functionality

## Files Created

| File | Purpose |
|------|---------|
| `backup-geographic-data.js` | Creates comprehensive backups before fixes |
| `fix-geographic-data-integrity.js` | Main correction script with municipality-district mappings |
| `test-geographic-integrity-fix.js` | Validation and testing script |
| `README_GEOGRAPHIC_FIX.md` | This guide |

## Step-by-Step Execution

### Step 1: Create Backups (CRITICAL - DO NOT SKIP)

```bash
cd backend
node scripts/backup-geographic-data.js
```

**Expected Output:**
- Creates backup tables with timestamp suffix
- Exports SQL files to `backend/backups/` directory
- Generates restore script
- Validates all backups

**Verify Success:**
- Check that backup tables exist in database
- Confirm SQL export files are created
- Review backup report JSON file

### Step 2: Run the Geographic Data Fix

```bash
node scripts/fix-geographic-data-integrity.js
```

**Expected Output:**
- Analyzes current state (should show 94 municipalities in Bojanala)
- Creates additional backup
- Corrects municipality-district mappings
- Shows correction summary

**Success Indicators:**
- Bojanala district should have ~5 municipalities (all NW prefixed)
- Other districts should gain their correct municipalities
- Correction count should be ~89 municipalities

### Step 3: Validate the Fix

```bash
node scripts/test-geographic-integrity-fix.js
```

**Expected Output:**
- Tests geographic hierarchy integrity
- Validates membership directory queries
- Generates integrity report with score

**Success Criteria:**
- Bojanala district has only NW municipalities
- Empty districts count is minimal (< 10)
- Member integrity score > 90%
- Overall integrity score > 90/100

### Step 4: Test Frontend Functionality

After running the scripts, test the membership directory:

1. **Province Selection**: Should show all 9 provinces with correct counts
2. **District Drill-down**: North West should show 4 districts with municipalities
3. **Municipality Filtering**: Bojanala should show only NW municipalities
4. **Ward Filtering**: Should work correctly within municipalities
5. **Member Counts**: Should be accurate at all levels

## Rollback Procedure (If Needed)

If something goes wrong, you can restore the original data:

```bash
# Connect to PostgreSQL
docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db

# Run the restore script (replace TIMESTAMP with actual timestamp)
\i /path/to/backend/backups/restore_geographic_data_YYYY-MM-DD.sql
```

Or manually restore from backup tables:
```sql
BEGIN;
DELETE FROM municipalities;
INSERT INTO municipalities SELECT * FROM municipalities_backup_YYYY-MM-DD;
COMMIT;
```

## Expected Results

### Before Fix
- Bojanala district: 94 municipalities (from 6 provinces)
- Empty districts: ~40+ districts
- Geographic filtering: Broken

### After Fix
- Bojanala district: 5 municipalities (all from North West)
- Empty districts: < 10 districts
- Geographic filtering: Working correctly

## Verification Queries

Run these queries to verify the fix:

```sql
-- Check Bojanala district municipalities
SELECT 
    municipality_code,
    municipality_name,
    LEFT(municipality_code, 2) as province_prefix
FROM municipalities 
WHERE district_code = 'DC37'
ORDER BY municipality_code;

-- Count municipalities by province in Bojanala
SELECT 
    LEFT(municipality_code, 2) as province_prefix,
    COUNT(*) as count
FROM municipalities 
WHERE district_code = 'DC37'
GROUP BY LEFT(municipality_code, 2);

-- Check for empty districts
SELECT 
    d.district_code,
    d.district_name,
    d.province_code,
    COUNT(m.municipality_id) as municipality_count
FROM districts d
LEFT JOIN municipalities m ON d.district_code = m.district_code
GROUP BY d.district_code, d.district_name, d.province_code
HAVING COUNT(m.municipality_id) = 0
ORDER BY d.province_code;
```

## Troubleshooting

### Common Issues

1. **Script fails with connection error**
   - Verify PostgreSQL is running: `docker ps`
   - Check .env file database credentials
   - Ensure database name is correct

2. **Backup creation fails**
   - Check disk space
   - Verify write permissions to backend/backups/
   - Ensure database user has CREATE TABLE permissions

3. **Some municipalities not corrected**
   - Check the MUNICIPALITY_DISTRICT_MAPPING in the fix script
   - Some municipalities may need manual mapping
   - Review error messages in script output

4. **Frontend still shows incorrect data**
   - Clear browser cache
   - Restart backend server
   - Check if frontend is caching geographic data

### Manual Corrections

If some municipalities need manual correction:

```sql
-- Example: Move a municipality to correct district
UPDATE municipalities 
SET district_code = 'CORRECT_DISTRICT_CODE', 
    updated_at = CURRENT_TIMESTAMP
WHERE municipality_code = 'MUNICIPALITY_CODE';
```

## Post-Fix Tasks

1. **Clear Application Caches**
   - Redis cache (if used)
   - Application-level caches
   - Browser caches

2. **Update Documentation**
   - Update any hardcoded geographic references
   - Review API documentation
   - Update user guides if needed

3. **Monitor System**
   - Watch for any geographic-related errors
   - Monitor membership directory performance
   - Check audit reports for accuracy

## Support

If you encounter issues:

1. Check the backup report JSON file for details
2. Review script output logs carefully
3. Use the rollback procedure if needed
4. Run validation queries to understand current state

## Files Location

All scripts are located in: `backend/scripts/`
All backups are stored in: `backend/backups/`

## Safety Notes

- ⚠️ **ALWAYS run backups first**
- ⚠️ **Test in development environment if possible**
- ⚠️ **Have rollback plan ready**
- ⚠️ **Verify results before declaring success**

This fix addresses a critical data integrity issue that affects the core functionality of the membership directory system. Following this guide carefully will restore proper geographic hierarchy and ensure accurate membership reporting.
