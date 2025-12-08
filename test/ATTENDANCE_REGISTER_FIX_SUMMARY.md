# Ward Attendance Register Fix - Summary

## Problem Statement

The "Download Ward Attendance Register" feature was incorrectly including members that should be excluded:

1. **Expired members** - Should only include Active members (membership_status_id = 1)
2. **Non-registered voters** - Should only include Registered voters (voter_status_id = 1)

### Affected Frontend Pages:
- `http://localhost:3000/admin/search/geographic` (Ward tab)
- `http://localhost:3000/admin/members` (Ward section)

## Root Cause

Two backend endpoints were fetching members without proper filtering:

1. **`GET /api/v1/members/ward/:wardCode/audit-export`** (backend/src/routes/members.ts)
   - SQL query at lines 2500-2560 was missing WHERE clause filters
   
2. **`GET /api/v1/views/members-with-voting-districts/export`** (backend/src/routes/views.ts)
   - Used `ViewsService.getMembersWithVotingDistricts()` which didn't filter by status IDs
   - Word document generation received unfiltered member list

## Solution Implemented

### 1. Fixed `/api/v1/members/ward/:wardCode/audit-export` endpoint

**File:** `backend/src/routes/members.ts` (lines 2498-2563)

**Changes:**
- Added `LEFT JOIN voter_statuses` to get voter status information
- Added WHERE clause filters:
  ```sql
  WHERE m.ward_code = ?
    AND m.membership_status_id = 1  -- Only Active members
    AND m.voter_status_id = 1        -- Only Registered voters
  ```

### 2. Fixed `/api/v1/views/members-with-voting-districts/export` endpoint

**File:** `backend/src/services/viewsService.ts` (lines 171-217)

**Changes:**
- Added `m.voter_status_id` and `m.membership_status_id` to SELECT statement
- These fields are now available for filtering in the route handler

**File:** `backend/src/routes/views.ts` (lines 341-356)

**Changes:**
- Added JavaScript filter before passing members to Word document service:
  ```javascript
  const attendanceMembers = members.filter((member: any) => {
    const isActive = member.membership_status_id === 1;
    const isRegistered = member.voter_status_id === 1;
    return isActive && isRegistered;
  });
  ```
- Added console logging to show filtering results

## Verification Results

**Test Ward:** 79800107 (Ward 107)

### Before Fix:
- Total members included: **2,119**
- Breakdown:
  - Expired: 1,898 (89.57%) ❌ Should be excluded
  - Active: 221 (10.43%)
  - All were Registered voters

### After Fix:
- Total members included: **221** (10.43%)
- All members meet criteria:
  - ✅ Membership Status: Active (status_id = 1)
  - ✅ Voter Status: Registered (status_id = 1)
- Members excluded: **1,898** (89.57%)

## Database Reference

### Membership Statuses (membership_statuses table)
- `status_id = 1`: Active ✅ (Include in attendance register)
- `status_id = 2`: Expired ❌ (Exclude)
- `status_id = 3`: Inactive ❌ (Exclude)
- `status_id = 4`: Grace Period ❌ (Exclude)

### Voter Statuses (voter_statuses table)
- `status_id = 1`: Registered ✅ (Include in attendance register)
- `status_id = 2`: Not Registered ❌ (Exclude)
- `status_id = 3`: Pending Verification ❌ (Exclude)
- `status_id = 4`: Verification Failed ❌ (Exclude)
- `status_id = 5`: Deceased ❌ (Exclude)
- `status_id = 6`: Other ❌ (Exclude)

## Testing

Run the verification script to test the fix:

```bash
node test/verify-attendance-register-fix.js
```

This script will:
1. Select a sample ward with >50 members
2. Show member counts BEFORE fix (all members)
3. Show member counts AFTER fix (filtered members)
4. Verify all filtered members meet the criteria
5. Display summary statistics

## Impact

### Positive Impact:
- ✅ Attendance registers now only include eligible members (Active & Registered)
- ✅ Accurate member counts for ward meetings
- ✅ Compliance with membership rules
- ✅ Reduced confusion from including expired/non-registered members

### Potential Concerns:
- ⚠️ Attendance register member counts will be significantly lower (in test ward: 2,119 → 221)
- ⚠️ Users may question why some members are missing
- 💡 Recommendation: Add a note in the Word document explaining the filtering criteria

## Files Modified

1. `backend/src/routes/members.ts` - Fixed SQL query with WHERE clause filters
2. `backend/src/services/viewsService.ts` - Added voter_status_id and membership_status_id to SELECT
3. `backend/src/routes/views.ts` - Added JavaScript filter for Word document generation

## Files Created (Testing)

1. `test/check-members-consolidated-columns.js` - Verify table structure
2. `test/check-voter-statuses.js` - Check voter status lookup table
3. `test/verify-attendance-register-fix.js` - Verify the fix works correctly
4. `test/ATTENDANCE_REGISTER_FIX_SUMMARY.md` - This document

## Next Steps

1. ✅ Test both frontend pages to confirm fix works in production
2. ✅ Verify Word document generation excludes expired/non-registered members
3. ✅ Check Excel export still includes all members (as intended)
4. 💡 Consider adding a summary note in Word document explaining filtering
5. 💡 Consider adding member status breakdown in the document header

## Conclusion

The fix successfully filters the Ward Attendance Register to include only:
- **Active members** (membership_status_id = 1)
- **Registered voters** (voter_status_id = 1)

This ensures attendance registers are accurate and compliant with membership rules.

