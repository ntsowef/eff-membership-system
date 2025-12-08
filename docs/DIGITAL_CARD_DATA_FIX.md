# Digital Membership Card Data Fix

## Issue Summary

The digital membership card was displaying incorrect data for members, specifically:

1. **Missing/Incorrect Expiry Date**: Card was calculating expiry as `member_created_at + 365 days` instead of using the actual `expiry_date` from the `memberships` table
2. **Incorrect Membership Status**: Card was showing "Active" status even for expired memberships because it was hardcoding `membership_type` as 'Standard' instead of checking the actual status

## Root Cause Analysis

### Problem 1: Backend Query Override

**File**: `backend/src/models/optimizedMembers.ts`

The backend query was **overriding** the correct data from the database view with calculated/hardcoded values:

```typescript
// ❌ OLD QUERY (INCORRECT)
const query = `
  SELECT
    member_id,
    membership_number,
    firstname as first_name,
    COALESCE(surname, '') as last_name,
    province_code,
    province_name,
    municipality_name,
    ward_code,
    voting_station_name,
    'Standard' as membership_type,  -- ❌ HARDCODED
    member_created_at as join_date,
    (member_created_at + INTERVAL '365 days') as expiry_date,  -- ❌ CALCULATED WRONG
    id_number
  FROM vw_member_details_optimized
  WHERE id_number = $1
  LIMIT 1
`;
```

### Problem 2: View Has Correct Data

The `vw_member_details_optimized` view **already includes** the correct fields:

```sql
CREATE OR REPLACE VIEW vw_member_details_optimized AS
SELECT 
    m.member_id,
    m.id_number,
    -- ... other fields ...
    
    -- ✅ CORRECT: Actual membership status from memberships table
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN ms.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Inactive'
    END as membership_status,
    
    -- ✅ CORRECT: Actual expiry date from memberships table
    ms.expiry_date,
    ms.membership_amount,
    
    -- ✅ CORRECT: Calculated days until expiry
    CASE 
        WHEN ms.expiry_date >= CURRENT_DATE THEN 
            (ms.expiry_date - CURRENT_DATE)::INTEGER
        ELSE 0 
    END as days_until_expiry

FROM members m
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id;
```

## Solution Implemented

### 1. Updated Backend Interface

**File**: `backend/src/models/optimizedMembers.ts`

Added missing fields to the interface:

```typescript
export interface OptimizedMemberData {
  member_id: string;
  membership_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  province_code: string;
  province_name: string;
  municipality_name: string;
  ward_code: string;
  voting_station_name: string;
  membership_type: string;
  membership_status?: string; // ✅ ADDED
  join_date: string;
  expiry_date: string;
  membership_amount?: string; // ✅ ADDED
  days_until_expiry?: number; // ✅ ADDED
  id_number?: string;
}
```

### 2. Fixed Backend Queries

**File**: `backend/src/models/optimizedMembers.ts`

Updated all 4 queries in the file to use actual database values:

```typescript
// ✅ NEW QUERY (CORRECT)
const query = `
  SELECT
    member_id,
    membership_number,
    firstname as first_name,
    COALESCE(surname, '') as last_name,
    COALESCE(email, '') as email,
    COALESCE(cell_number, '') as phone_number,
    province_code,
    province_name,
    municipality_name,
    ward_code,
    voting_station_name,
    COALESCE(membership_status, 'Inactive') as membership_type,  -- ✅ USE ACTUAL STATUS
    membership_status,  -- ✅ ADDED
    member_created_at as join_date,
    expiry_date,  -- ✅ USE ACTUAL EXPIRY DATE
    membership_amount,  -- ✅ ADDED
    days_until_expiry,  -- ✅ ADDED
    id_number
  FROM vw_member_details_optimized
  WHERE id_number = $1
  LIMIT 1
`;
```

**Queries Updated**:
1. `getMemberByIdNumberOptimized()` - Main query
2. `getMemberByIdOptimized()` - Query by member_id
3. `getMemberByIdNumberFallback()` - Fallback query by ID number
4. `getMemberByIdFallback()` - Fallback query by member_id

### 3. Updated Frontend Interface

**File**: `frontend/src/components/cards/MemberCardDisplay.tsx`

Added missing fields to the interface:

```typescript
interface MemberCardData {
  member_id: string;
  membership_number: string;
  id_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  province_code: string;
  province_name: string;
  municipality_name: string;
  ward_code: string;
  voting_station_name: string;
  membership_type: string;
  membership_status?: string; // ✅ ADDED
  join_date: string;
  expiry_date: string;
  membership_amount?: string; // ✅ ADDED
  days_until_expiry?: number; // ✅ ADDED
  card_data?: any;
  qr_code_url?: string;
}
```

### 4. Updated Status Display

**File**: `frontend/src/components/cards/MemberCardDisplay.tsx`

Updated the status chip to use actual `membership_status` from database:

```typescript
<Chip
  label={memberData.membership_status || (new Date() <= new Date(memberData.expiry_date) ? 'Active' : 'Expired')}
  color={
    memberData.membership_status === 'Active' || 
    (!memberData.membership_status && new Date() <= new Date(memberData.expiry_date)) 
      ? 'success' 
      : 'error'
  }
  size="small"
/>
```

## Testing

### Test Case: Member ID 6610190713081

Run the investigation script to verify the fix:

```bash
psql -U your_user -d eff_membership_db -f database-recovery/investigate_member_6610190713081.sql
```

### Expected Results

**Before Fix**:
- Expiry Date: Calculated as `member_created_at + 365 days` (incorrect)
- Status: Always "Standard" (incorrect)

**After Fix**:
- Expiry Date: Actual `expiry_date` from `memberships` table (correct)
- Status: Actual status based on `expiry_date < CURRENT_DATE` check (correct)

### Verification Query

```sql
SELECT 
    member_id,
    id_number,
    firstname,
    surname,
    membership_number,
    member_created_at,
    (member_created_at + INTERVAL '365 days') as old_calculated_expiry,
    expiry_date as actual_expiry,
    membership_status,
    CASE 
        WHEN expiry_date >= CURRENT_DATE THEN 'Active'
        WHEN expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Unknown'
    END as correct_status
FROM vw_member_details_optimized
WHERE id_number = '6610190713081';
```

## Impact

### Affected Components

1. ✅ Digital Membership Card Display
2. ✅ Member Lookup by ID Number
3. ✅ Member Lookup by Member ID
4. ✅ Card Generation API
5. ✅ Cached Member Data

### Cache Invalidation

The fix will automatically apply to new queries. For cached data, the cache will expire after 1 hour (default TTL), or you can manually invalidate:

```typescript
await OptimizedMemberModel.invalidateMemberCache(memberId, idNumber);
```

## Files Modified

1. `backend/src/models/optimizedMembers.ts` - Fixed all 4 queries
2. `frontend/src/components/cards/MemberCardDisplay.tsx` - Updated interface and status display
3. `database-recovery/investigate_member_6610190713081.sql` - Investigation script (new)
4. `database-recovery/fix_digital_card_data_issues.sql` - Fix verification script (new)
5. `docs/DIGITAL_CARD_DATA_FIX.md` - This documentation (new)

## Conclusion

The fix ensures that:
- ✅ Digital cards display the **actual expiry date** from the memberships table
- ✅ Digital cards display the **correct membership status** (Active/Expired/Inactive)
- ✅ Status is calculated based on actual expiry date, not hardcoded
- ✅ All member data comes from the database view, not calculated in queries
- ✅ Frontend correctly displays the membership status from the backend

The root cause was that the backend query was overriding correct database values with calculated/hardcoded values. The fix removes these overrides and uses the actual data from the `vw_member_details_optimized` view.

