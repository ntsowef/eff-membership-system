# Digital Membership Card - View Fix Documentation

## Issue Summary

**Error**: `column "voting_station_name" does not exist`

**Location**: Digital membership card generation endpoint

**Root Cause**: The `vw_member_details_optimized` view in the production database is missing the `voting_station_name` column that is required by the digital membership card generation query.

---

## Error Details

### Error Message
```
error: column "voting_station_name" does not exist
code: '42703'
position: '379'
```

### Affected Endpoint
```
POST /api/v1/digital-cards/generate-data/:memberId
```

### Query That Failed
```sql
SELECT
  member_id,
  'MEM' || LPAD(member_id::TEXT, 6, '0') as membership_number,
  firstname as first_name,
  COALESCE(surname, '') as last_name,
  COALESCE(email, '') as email,
  COALESCE(cell_number, '') as phone_number,
  province_name,
  municipality_name,
  ward_number,
  COALESCE(voting_station_name, 'Not Available') as voting_station_name,  -- ❌ This column doesn't exist
  'Standard' as membership_type,
  member_created_at as join_date,
  (member_created_at + INTERVAL '365 day') as expiry_date
FROM vw_member_details_optimized
WHERE member_id = $1
```

### Stack Trace
```
at Function.generateMembershipCard (/root/Applications/backend/src/models/digitalMembershipCard.ts:70:26)
at /root/Applications/backend/src/routes/digitalMembershipCards.ts:60:24
```

---

## Root Cause Analysis

### 1. View Definition Mismatch
The `vw_member_details_optimized` view in the production database was created with a limited set of columns for performance optimization, but it's missing several columns that are now required by the application:

**Missing Columns:**
- `voting_station_name`
- `voting_station_code`
- `voting_station_id`
- `voting_district_name`
- `voter_status`
- `is_eligible_to_vote`

### 2. Schema Evolution
The application code was updated to use these columns, but the database view was not updated accordingly.

### 3. Migration Gap
The view creation/update script was not included in the migration sequence or was not executed on the production database.

---

## Solution

### Option 1: Run SQL Fix Script (Recommended)

#### For Linux/Mac:
```bash
cd /path/to/project
chmod +x scripts/fix-optimized-view.sh
./scripts/fix-optimized-view.sh
```

#### For Windows (PowerShell):
```powershell
cd C:\path\to\project
.\scripts\fix-optimized-view.ps1
```

#### Manual Execution:
```bash
psql -h localhost -p 5432 -U postgres -d eff_membership_db -f database-recovery/fix_optimized_view_voting_station.sql
```

### Option 2: Direct SQL Execution

Connect to your PostgreSQL database and run:

```sql
-- Drop the existing view
DROP VIEW IF EXISTS vw_member_details_optimized CASCADE;

-- Recreate with all necessary columns
CREATE OR REPLACE VIEW vw_member_details_optimized AS
SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    COALESCE(m.surname, '') as surname,
    COALESCE(m.email, '') as email,
    COALESCE(m.cell_number, '') as cell_number,
    m.created_at as member_created_at,
    
    -- Pre-calculated membership number
    CONCAT('MEM', LPAD(m.member_id::TEXT, 6, '0')) as membership_number,
    
    -- Geographic data
    p.province_code,
    p.province_name,
    d.district_code,
    d.district_name,
    mu.municipality_code,
    mu.municipality_name,
    w.ward_code,
    w.ward_number,
    w.ward_name,
    
    -- Voting station information (ADDED)
    COALESCE(vs.station_name, 'Not Available') as voting_station_name,
    COALESCE(vs.station_code, '') as voting_station_code,
    m.voting_station_id,
    
    -- Voting district information
    m.voting_district_code,
    COALESCE(vd.voting_district_name, '') as voting_district_name,
    
    -- Demographic information
    COALESCE(g.gender_name, 'Unknown') as gender_name,
    COALESCE(r.race_name, 'Unknown') as race_name,
    COALESCE(c.citizenship_name, 'Unknown') as citizenship_name,
    COALESCE(l.language_name, 'Unknown') as language_name,
    
    -- Voter status
    COALESCE(vs_status.is_eligible, FALSE) as is_eligible_to_vote,
    COALESCE(vs_status.status_name, 'Unknown') as voter_status,
    
    -- Membership status
    COALESCE(ms_status.status_name, 'Pending') as membership_status,
    COALESCE(ms_status.is_active, FALSE) as membership_active
    
FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
LEFT JOIN voting_stations vs ON m.voting_station_id = vs.voting_station_id
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN voter_statuses vs_status ON m.voter_status_id = vs_status.voter_status_id
LEFT JOIN membership_statuses ms_status ON m.membership_status_id = ms_status.membership_status_id;

-- Grant permissions
GRANT SELECT ON vw_member_details_optimized TO PUBLIC;
```

---

## Verification

### 1. Check View Columns
```sql
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'vw_member_details_optimized' 
ORDER BY ordinal_position;
```

**Expected Output** should include:
- `voting_station_name` (character varying)
- `voting_station_code` (character varying)
- `voting_station_id` (integer)
- `voting_district_name` (character varying)

### 2. Test Query
```sql
SELECT 
    member_id,
    membership_number,
    firstname,
    surname,
    province_name,
    municipality_name,
    ward_code,
    voting_station_name,  -- Should work now
    voting_station_code,
    member_created_at
FROM vw_member_details_optimized
LIMIT 5;
```

### 3. Test Digital Card Generation
```bash
# Test the endpoint
curl -X POST https://api.effmemberportal.org/api/v1/digital-cards/generate-data/93087 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"template": "standard", "issued_by": "self_service"}'
```

**Expected Response**: Success with card data (no database error)

---

## Files Involved

### SQL Scripts
- `database-recovery/fix_optimized_view_voting_station.sql` - Main fix script
- `database-recovery/complete_eff_membership_schema.sql` - Complete schema with correct view definition

### Execution Scripts
- `scripts/fix-optimized-view.sh` - Bash script for Linux/Mac
- `scripts/fix-optimized-view.ps1` - PowerShell script for Windows

### Application Code
- `backend/src/models/digitalMembershipCard.ts` - Uses the view (line 66)
- `backend/src/routes/digitalMembershipCards.ts` - Endpoint that calls the model

---

## Prevention

### 1. Add to Migration Sequence
Ensure this view update is included in the migration sequence:
```sql
-- migrations/XXX_update_optimized_view.sql
```

### 2. Schema Validation
Add automated tests to verify view columns match application requirements:
```typescript
// tests/database/views.test.ts
describe('vw_member_details_optimized', () => {
  it('should have voting_station_name column', async () => {
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vw_member_details_optimized' 
      AND column_name = 'voting_station_name'
    `);
    expect(result.rows.length).toBe(1);
  });
});
```

### 3. Documentation
Keep view definitions documented and version-controlled:
- Document all columns in the view
- Track changes to view definitions
- Include view updates in migration notes

---

## Impact

### Before Fix
- ❌ Digital membership card generation fails
- ❌ Members cannot download their cards
- ❌ Error logs filled with database errors

### After Fix
- ✅ Digital membership card generation works
- ✅ Members can download their cards
- ✅ All required member information is accessible
- ✅ No database errors

---

## Related Issues

### Similar View Issues
If you encounter similar errors with other views, check:
1. `vw_member_details` - Main member details view
2. `vw_member_voting_location_search` - Voting location search view
3. `vw_leadership_hierarchy` - Leadership hierarchy view

### Column Naming Conventions
Ensure consistency between:
- Database column names
- View column names
- Application code expectations

---

## Support

### If the Fix Doesn't Work

1. **Check PostgreSQL Version**
   ```sql
   SELECT version();
   ```
   Ensure you're running PostgreSQL 12+

2. **Check View Exists**
   ```sql
   SELECT * FROM pg_views WHERE viewname = 'vw_member_details_optimized';
   ```

3. **Check Permissions**
   ```sql
   SELECT grantee, privilege_type 
   FROM information_schema.role_table_grants 
   WHERE table_name = 'vw_member_details_optimized';
   ```

4. **Check Dependencies**
   ```sql
   -- Ensure all referenced tables exist
   SELECT tablename FROM pg_tables 
   WHERE tablename IN ('members', 'voting_stations', 'voting_districts', 'wards');
   ```

### Contact
For additional support, contact the development team or check the project documentation.

---

**Last Updated**: 2025-11-03
**Status**: ✅ Fix Available and Tested
**Priority**: 🔴 Critical (Blocks digital card generation)

