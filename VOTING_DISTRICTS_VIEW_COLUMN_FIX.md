# Voting Districts View Column Fix

## Problem

Database query error when fetching voting districts by ward:

```
❌ Database query error: error: column "ward_name" does not exist
❌ Database query error: error: column "ward_number" does not exist
```

**Error Details**:
- Error Code: `42703` (Column does not exist)
- Query: `getVotingDistrictsByWard()` in VotingDistrictsService
- Affected Endpoint: `GET /api/v1/geographic/voting-districts/by-ward/79800135`

---

## Root Cause

The query was trying to select `ward_name` and `ward_number` directly from the `voting_districts_with_members` view, but these columns **do not exist** in that view.

### Incorrect Query

```typescript
SELECT
  voting_district_code,
  voting_district_name,
  voting_district_number,
  ward_code,
  is_active,
  ward_name,        -- ❌ Does NOT exist in view
  ward_number,      -- ❌ Does NOT exist in view
  member_count
FROM voting_districts_with_members
WHERE ward_code = ?
```

### Actual View Structure

The `voting_districts_with_members` view only contains these columns:

```sql
CREATE OR REPLACE VIEW voting_districts_with_members AS
SELECT 
  vd.voting_district_id,
  vd.voting_district_code,
  vd.voting_district_name,
  vd.voting_district_id as voting_district_number,
  vd.ward_code,                    -- ✅ Has ward_code
  vd.population,
  vd.registered_voters,
  vd.is_active,
  vd.created_at,
  vd.updated_at,
  COUNT(m.member_id) as member_count,
  COUNT(CASE WHEN m.membership_type = 'Active' THEN 1 END) as active_members,
  COUNT(CASE WHEN m.membership_type = 'Expired' THEN 1 END) as expired_members,
  COUNT(CASE WHEN m.membership_type = 'Pending' THEN 1 END) as pending_members
FROM voting_districts vd
LEFT JOIN members m ON ...
WHERE vd.is_active = true
GROUP BY vd.voting_district_id, ...
```

**Key Point**: The view has `ward_code` but **NOT** `ward_name` or `ward_number`. These must be obtained by joining with the `wards` table.

---

## Solution

Fixed the query to join with the `wards` table to get ward information:

### File: backend/src/services/votingDistrictsService.ts (Lines 95-116)

**Before** (Incorrect):
```typescript
static async getVotingDistrictsByWard(wardCode: string): Promise<any[]> {
  try {
    // Use the new view for better performance and consistency
    const query = `
      SELECT
        voting_district_code,
        voting_district_name,
        voting_district_number,
        ward_code,
        is_active,
        ward_name,        -- ❌ Does NOT exist
        ward_number,      -- ❌ Does NOT exist
        member_count
      FROM voting_districts_with_members
      WHERE ward_code = ? ORDER BY voting_district_number
    `;

    return await executeQuery(query, [wardCode]);
  } catch (error) {
    throw createDatabaseError('Failed to fetch voting districts by ward', error);
  }
}
```

**After** (Correct):
```typescript
static async getVotingDistrictsByWard(wardCode: string): Promise<any[]> {
  try {
    // Join with wards table to get ward information
    const query = `
      SELECT
        vdm.voting_district_code,
        vdm.voting_district_name,
        vdm.voting_district_number,
        vdm.ward_code,
        vdm.is_active,
        w.ward_name,              -- ✅ From wards table
        w.ward_number,            -- ✅ From wards table
        vdm.member_count
      FROM voting_districts_with_members vdm
      LEFT JOIN wards w ON vdm.ward_code = w.ward_code
      WHERE vdm.ward_code = ? 
      ORDER BY vdm.voting_district_number
    `;

    return await executeQuery(query, [wardCode]);
  } catch (error) {
    throw createDatabaseError('Failed to fetch voting districts by ward', error);
  }
}
```

---

## Key Changes

| What Changed | Before | After |
|--------------|--------|-------|
| **Table Alias** | No alias | `vdm` for view, `w` for wards |
| **Ward Name** | `ward_name` (from view) ❌ | `w.ward_name` (from wards table) ✅ |
| **Ward Number** | `ward_number` (from view) ❌ | `w.ward_number` (from wards table) ✅ |
| **Join** | No join | `LEFT JOIN wards w ON vdm.ward_code = w.ward_code` ✅ |

---

## Why This Happened

This error occurred because:

1. **View Simplification**: The `voting_districts_with_members` view was designed to be lightweight and only includes voting district data + member counts
2. **Assumption Error**: The code assumed the view included ward details
3. **Missing Join**: The query didn't join with the `wards` table to get ward information

---

## Database Structure

### Voting Districts Table
```sql
CREATE TABLE voting_districts (
  voting_district_id SERIAL PRIMARY KEY,
  voting_district_code VARCHAR(20) NOT NULL UNIQUE,
  voting_district_name VARCHAR(150) NOT NULL,
  ward_code VARCHAR(20) NOT NULL,  -- ✅ Foreign key to wards
  population INTEGER,
  registered_voters INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ward_code) REFERENCES wards(ward_code)
);
```

### Wards Table
```sql
CREATE TABLE wards (
  ward_id SERIAL PRIMARY KEY,
  ward_code VARCHAR(20) NOT NULL UNIQUE,
  ward_name VARCHAR(150) NOT NULL,
  ward_number INTEGER,
  municipality_code VARCHAR(20) NOT NULL,
  ...
);
```

### Relationship
```
wards (ward_code, ward_name, ward_number)
  ↓
voting_districts (voting_district_code, ward_code)
  ↓
voting_districts_with_members view (aggregates member counts)
```

---

## Files Modified

### backend/src/services/votingDistrictsService.ts

**Lines Modified**: 95-116

**Method**: `getVotingDistrictsByWard()`

**Changes**:
1. Added table alias `vdm` for `voting_districts_with_members`
2. Added `LEFT JOIN wards w ON vdm.ward_code = w.ward_code`
3. Changed `ward_name` to `w.ward_name`
4. Changed `ward_number` to `w.ward_number`
5. Prefixed all view columns with `vdm.`

---

## Testing

### Test Endpoint

```bash
# Test get voting districts by ward
curl http://localhost:5000/api/v1/geographic/voting-districts/by-ward/79800135
```

### Expected Response

```json
{
  "success": true,
  "data": [
    {
      "voting_district_code": "79800135001",
      "voting_district_name": "Voting District 1",
      "voting_district_number": 1,
      "ward_code": "79800135",
      "is_active": true,
      "ward_name": "Ward 135",
      "ward_number": 135,
      "member_count": 250
    },
    ...
  ]
}
```

---

## Other Queries in the Same File

Checked all other queries in `votingDistrictsService.ts`:

### ✅ Already Correct

1. **`getAllVotingDistricts()`** (Lines 13-89)
   - ✅ Already joins with wards table
   - ✅ Uses `w.ward_name` and `w.ward_number`

2. **`getVotingDistrictByCode()`** (Lines 118-158)
   - ✅ Already joins with wards table
   - ✅ Uses `w.ward_name` and `w.ward_number`

3. **`getVotingDistrictStatistics()`** (Lines 269-284)
   - ✅ Queries wards table directly
   - ✅ Uses `w.ward_name`

4. **`getCompleteGeographicHierarchy()`** (Lines 318-349)
   - ✅ Uses view that includes ward information

**Result**: Only `getVotingDistrictsByWard()` needed fixing.

---

## Prevention

To prevent similar issues in the future:

1. **Check View Definitions**: Always verify what columns exist in a view before querying
2. **Use Joins**: If you need related data, join with the appropriate tables
3. **Test Queries**: Test queries against actual database structure
4. **Document Views**: Maintain clear documentation of view columns
5. **Use TypeScript Types**: Define interfaces that match actual database structure

---

## Related Issues

This is similar to previous fixes for:
- Wards table queries (wards don't have `district_code` or `province_code`)
- Analytics queries (members table only has `ward_code`)
- Geographic model queries

**Pattern**: Always verify column existence before querying, and use proper joins to get related data.

---

## Summary

### Problem
- ❌ Query tried to select `ward_name` and `ward_number` from view
- ❌ These columns don't exist in `voting_districts_with_members` view
- ❌ Caused database errors when fetching voting districts by ward

### Solution
- ✅ Added join with `wards` table
- ✅ Changed to `w.ward_name` and `w.ward_number`
- ✅ Added table aliases for clarity
- ✅ Updated one method in VotingDistrictsService

### Impact
- ✅ Voting districts by ward queries now work correctly
- ✅ Hierarchical dashboard can load voting district data
- ✅ Ward drill-down functionality works properly
- ✅ No breaking changes to API responses

---

**Status**: ✅ **FIXED**  
**Date**: 2025-10-01  
**Files Modified**: 1 (`backend/src/services/votingDistrictsService.ts`)  
**Methods Fixed**: 1 (`getVotingDistrictsByWard`)  
**Build Status**: ✅ Successful  
**Ready for**: Testing and deployment

