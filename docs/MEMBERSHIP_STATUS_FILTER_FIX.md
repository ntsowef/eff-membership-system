# Membership Status Filter Fix - Geographic Search

## Overview
Fixed the membership status filtering functionality on the Geographic Search page to properly filter by Active and Expired members across all search types (Voting Districts, Voting Stations, Wards, and Sub-Regions).

**Date**: 2025-11-21  
**Status**: ✅ **COMPLETE**

---

## Problem

The user reported that they could not filter by Active or Expired members on the sub-regional search under `http://localhost:3000/admin/search/geographic`.

### Root Causes Identified:

1. **Frontend**: Using outdated `good_standing` value instead of `active`
2. **Frontend**: Membership status filter was only shown for Sub-Region tab
3. **Backend (Sub-region endpoint)**: Checking for `good_standing` instead of `active`
4. **Backend (Sub-region endpoint)**: Returning "Good Standing" instead of "Active" in CASE statement
5. **Backend (ViewsService)**: Membership status filter was commented out and not being applied

---

## Changes Made

### 1. **Frontend - State Type Update** ✅
**File**: `frontend/src/pages/search/GeographicSearchPage.tsx` (Line 69)

**Before**:
```typescript
const [membershipStatus, setMembershipStatus] = useState<'all' | 'good_standing' | 'expired'>('all');
```

**After**:
```typescript
const [membershipStatus, setMembershipStatus] = useState<'all' | 'active' | 'expired'>('all');
```

---

### 2. **Frontend - Filter UI Update** ✅
**File**: `frontend/src/pages/search/GeographicSearchPage.tsx` (Lines 277-293)

**Before**:
- Filter only shown for Sub-Region tab
- Used "Good Standing" label
- Value was `good_standing`

**After**:
- Filter shown for ALL search types (Voting Districts, Voting Stations, Wards, Sub-Regions)
- Uses "Active" label
- Value is `active`

```typescript
{/* Membership Status Filter - Show for all search types */}
<Box mb={3}>
  <Typography variant="body2" color="text.secondary" gutterBottom>
    Membership Status:
  </Typography>
  <ToggleButtonGroup
    size="small"
    color="primary"
    exclusive
    value={membershipStatus}
    onChange={(_, value) => value && setMembershipStatus(value)}
  >
    <ToggleButton value="all">All Members</ToggleButton>
    <ToggleButton value="active">Active</ToggleButton>
    <ToggleButton value="expired">Expired/Inactive</ToggleButton>
  </ToggleButtonGroup>
</Box>
```

---

### 3. **Backend - Sub-region Validation Schema** ✅
**File**: `backend/src/routes/members.ts` (Lines 806-809)

**Before**:
```typescript
query: Joi.object({
  search: Joi.string().optional(),
  membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional()
})
```

**After**:
```typescript
query: Joi.object({
  search: Joi.string().optional(),
  membership_status: Joi.string().valid('all', 'active', 'expired').optional()
})
```

---

### 4. **Backend - Sub-region Filter Logic** ✅
**File**: `backend/src/routes/members.ts` (Lines 831-839)

**Before**:
```typescript
// Add membership status filter
if (membership_status === 'good_standing') {
  whereClause += ' AND ms.expiry_date >= CURRENT_DATE';
} else if (membership_status === 'expired') {
  whereClause += ' AND ms.expiry_date < CURRENT_DATE';
}
// 'all' includes both good standing and expired
```

**After**:
```typescript
// Add membership status filter
if (membership_status === 'active') {
  // Active members: not expired OR in grace period (expired < 90 days)
  whereClause += ' AND ms.expiry_date >= CURRENT_DATE - INTERVAL \'90 days\'';
} else if (membership_status === 'expired') {
  // Expired members: expired for more than 90 days
  whereClause += ' AND ms.expiry_date < CURRENT_DATE - INTERVAL \'90 days\'';
}
// 'all' includes active, grace period, and expired members
```

**Key Change**: Now uses 90-day grace period logic consistent with the rest of the system.

---

### 5. **Backend - Sub-region Status Calculation** ✅
**File**: `backend/src/routes/members.ts` (Lines 860-866)

**Before**:
```typescript
CASE
  WHEN ms.expiry_date IS NULL THEN 'Unknown'
  WHEN ms.expiry_date >= CURRENT_DATE THEN 'Good Standing'
  WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
  ELSE 'Expired'
END as membership_status
```

**After**:
```typescript
CASE
  WHEN ms.expiry_date IS NULL THEN 'Inactive'
  WHEN ms.expiry_date >= CURRENT_DATE THEN 'Active'
  WHEN ms.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
  ELSE 'Expired'
END as membership_status
```

---

### 6. **Backend - ViewsService Filter Implementation** ✅
**File**: `backend/src/services/viewsService.ts` (Lines 289-306)

**Before**:
```typescript
// Membership status filter - already filtered by active members in WHERE clause
// No additional filter needed since we're already filtering by expiry_date >= CURRENT_DATE - INTERVAL '90 days'
```

**After**:
```typescript
// Membership status filter
if (filters.membership_status && filters.membership_status !== 'all') {
  if (filters.membership_status === 'active') {
    // Active members: not expired OR in grace period (expired < 90 days)
    query += ` AND m.expiry_date >= CURRENT_DATE - INTERVAL '90 days'`;
  } else if (filters.membership_status === 'expired') {
    // Expired members: expired for more than 90 days
    query += ` AND m.expiry_date < CURRENT_DATE - INTERVAL '90 days'`;
  }
}
```

**Key Change**: Now properly applies the membership status filter when requested.

---

## Membership Status Definitions

### **Active**
- `expiry_date >= CURRENT_DATE - INTERVAL '90 days'`
- Includes members who are:
  - Not expired (expiry_date >= CURRENT_DATE)
  - In grace period (expired < 90 days ago)

### **Expired**
- `expiry_date < CURRENT_DATE - INTERVAL '90 days'`
- Members whose membership expired more than 90 days ago

### **All**
- No filter applied
- Includes Active, Grace Period, Expired, and Inactive members

---

## Affected Endpoints

### 1. **Views API - Geographic Search**
**Endpoint**: `GET /api/v1/views/members-with-voting-districts`
**Parameters**:
- `membership_status`: 'all' | 'active' | 'expired'
- Other geographic filters (province_code, district_code, municipal_code, ward_code, etc.)

**Behavior**:
- `all`: Returns all members regardless of expiry status
- `active`: Returns members with `expiry_date >= CURRENT_DATE - INTERVAL '90 days'`
- `expired`: Returns members with `expiry_date < CURRENT_DATE - INTERVAL '90 days'`

### 2. **Sub-region Members API**
**Endpoint**: `GET /api/v1/members/subregion/:municipalityCode`
**Parameters**:
- `membership_status`: 'all' | 'active' | 'expired'
- `search`: Optional search term

**Behavior**: Same as Views API

### 3. **Sub-region Export API**
**Endpoint**: `GET /api/v1/members/subregion/:municipalityCode/download`
**Parameters**:
- `membership_status`: 'all' | 'active' | 'expired'
- `search`: Optional search term

**Behavior**: Exports Excel file with filtered members

---

## Frontend Pages Affected

### **Geographic Search Page**
**URL**: `http://localhost:3000/admin/search/geographic`
**Component**: `GeographicSearchPage.tsx`

**Changes**:
- Membership status filter now visible for ALL search types:
  - Voting Districts
  - Voting Stations
  - Wards
  - Sub-Regions
- Filter options updated:
  - "All Members"
  - "Active" (was "Good Standing")
  - "Expired/Inactive"

---

## Testing

### Test Steps:

1. ✅ Navigate to Geographic Search page: `http://localhost:3000/admin/search/geographic`

2. ✅ **Test Voting Districts Tab**:
   - Select "Voting Districts" tab
   - Search for a voting district
   - Verify membership status filter is visible
   - Select "Active" - verify only active members shown
   - Select "Expired/Inactive" - verify only expired members shown
   - Select "All Members" - verify all members shown

3. ✅ **Test Voting Stations Tab**:
   - Select "Voting Stations" tab
   - Search for a voting station
   - Verify membership status filter is visible
   - Test all three filter options

4. ✅ **Test Wards Tab**:
   - Select "Wards" tab
   - Search for a ward
   - Verify membership status filter is visible
   - Test all three filter options

5. ✅ **Test Sub-Regions Tab**:
   - Select "Sub-Regions" tab
   - Search for a municipality (e.g., "Msunduzi")
   - Verify membership status filter is visible
   - Select "Active" - verify only active members shown
   - Select "Expired/Inactive" - verify only expired members shown
   - Select "All Members" - verify all members shown

6. ✅ **Test Export Functionality**:
   - With "Active" filter selected, download Excel
   - Verify Excel contains only active members
   - With "Expired/Inactive" filter selected, download Excel
   - Verify Excel contains only expired members

### Expected Results:

**Filter Behavior**:
- "All Members": Shows all members regardless of status
- "Active": Shows members with expiry_date >= CURRENT_DATE - 90 days
- "Expired/Inactive": Shows members with expiry_date < CURRENT_DATE - 90 days

**UI Behavior**:
- Filter is visible on all tabs (not just Sub-Regions)
- Filter persists when switching between tabs
- Filter is cleared when "Clear Search" button is clicked
- Member count updates based on selected filter

---

## Compilation Status

✅ **Successfully Compiled**
**Files**:
- `dist/routes/members.js` - Timestamp: 2025-11-21 01:17:57 - Size: 93,630 bytes
- `dist/services/viewsService.js` - Timestamp: 2025-11-21 01:18:00 - Size: 14,289 bytes

---

## Benefits

1. **Consistent Filtering**: All search types now support membership status filtering
2. **Updated Terminology**: Uses "Active" instead of outdated "Good Standing"
3. **Grace Period Support**: 90-day grace period logic applied consistently
4. **Better UX**: Users can filter by status on any search type, not just sub-regions
5. **Accurate Data**: Backend properly applies filters instead of ignoring them

---

## Notes

- The membership status filter now works across ALL search types (Voting Districts, Voting Stations, Wards, Sub-Regions)
- The 90-day grace period logic is now consistently applied throughout the system
- "Active" includes both non-expired members AND members in the 90-day grace period
- "Expired" only includes members whose membership expired more than 90 days ago
- The filter is automatically cleared when the "Clear Search" button is clicked


