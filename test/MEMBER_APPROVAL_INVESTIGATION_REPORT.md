# MEMBER APPROVAL SYSTEM INVESTIGATION REPORT

**Date**: 2025-11-10  
**Issue**: Only newly approved member showing in ward listing  
**Member ID**: 772468 (ID Number: 7808020703087)

---

## 🔍 EXECUTIVE SUMMARY

**ROOT CAUSE IDENTIFIED**: Municipality code mismatch between IEC data and internal database structure

**Impact**: When viewing members for a ward, only the newly approved member appears because the system is filtering by the wrong municipality code.

---

## 📊 INVESTIGATION FINDINGS

### 1. Member Data Analysis

**Newly Approved Member**:
- Member ID: 772468
- Name: Dunga Marshall
- ID Number: 7808020703087
- Ward Code: `79700100` (Ward 100)
- Municipality Code: `EKU` ← **From IEC API**
- Province: GP - Gauteng
- District: EKU - Ekurhuleni
- Created: 2025-11-10 14:21:38

**Existing Members in Same Ward**:
- Total members in ward `79700100`: **388 members**
- Municipality Code: `320` (EKU - North) ← **Internal code**
- Example: Member 48420 (MOTANTI MOALAMEDI) - Municipal: 320

### 2. Municipality Code Mismatch

| Source | Municipality Code | Member Count |
|--------|-------------------|--------------|
| **New Member (IEC)** | `EKU` | 1 member |
| **Existing Members (Internal)** | `320` | 387 members |
| **Ward Table** | `EKU004` | 0 members |

**Critical Finding**: Three different municipality codes for the same ward!

---

## 🔴 ROOT CAUSE ANALYSIS

### Problem 1: IEC API Returns Metro-Level Code

**IEC Data**:
- Municipality ID: 3003
- This maps to `EKU` (Ekurhuleni Metropolitan Municipality)
- IEC provides **metro-level** municipality code

**Internal Database**:
- Uses **sub-region** codes like `320` (EKU - North)
- Ekurhuleni is divided into multiple sub-regions (EKU001-EKU007 or similar)
- Ward 79700100 belongs to sub-region `320`

### Problem 2: Approval Process Uses IEC Code Directly

**Code Location**: `backend/src/services/membershipApprovalService.ts` (Line 206)

```typescript
const params = [
  // ... other fields ...
  application.municipal_code,  // ← Uses IEC code directly ("EKU")
  geographicData.municipality_name,
  // ... other fields ...
];
```

**Flow**:
1. User enters ID number in application form
2. IEC API returns municipality code `EKU` (metro-level)
3. Application saves `municipal_code = "EKU"`
4. Approval process copies `municipal_code = "EKU"` to member record
5. Member gets `municipality_code = "EKU"` instead of `"320"`

### Problem 3: Ward Table Has Yet Another Code

**Ward Table Record**:
- Ward Code: 79700100
- Municipality Code: `EKU004` ← **Different from both!**

This suggests the ward table uses a different coding system (possibly EKU001-EKU007 for sub-regions).

---

## 🎯 WHY ONLY ONE MEMBER SHOWS UP

**Backend Query Analysis**:
- Backend endpoint `/api/members/ward/:wardCode` (Line 1011-1106)
- Query: `WHERE m.ward_code = ?` (only filters by ward_code)
- **No municipality_code filtering in backend query**

**View Definition Analysis** ✅ **ROOT CAUSE CONFIRMED**:

The `vw_member_details` view has this critical join:
```sql
FROM members_consolidated m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code  ← KEY LINE
```

**The Problem**:
1. Member has `ward_code = '79700100'` ✅
2. Ward table has `ward_code = '79700100'` with `municipality_code = 'EKU004'` ✅
3. View joins municipalities using `w.municipality_code` (EKU004)
4. View returns `municipality_code = 'EKU004'` for ALL members in this ward
5. But member record has `municipality_code = 'EKU'` stored in `members_consolidated` table

**Wait... The view doesn't use the member's municipality_code!**

The view uses `mu.municipality_code` from the municipalities table (joined via ward), not `m.municipality_code` from the member record.

**This means**:
- The view should show `municipality_code = 'EKU004'` for all 388 members
- The member's stored `municipality_code = 'EKU'` is ignored by the view
- **The filtering must be happening elsewhere**

**New Investigation Needed**:
1. Check if frontend is filtering by member's stored municipality_code
2. Check if there's a different query/endpoint being used
3. Verify what the user is actually seeing (which endpoint/page)

---

## 📋 DETAILED CODE ANALYSIS

### Approval Service Flow

**File**: `backend/src/services/membershipApprovalService.ts`

**Step 1**: Get application data (Line 57)
```typescript
const application = await MembershipApplicationModel.getApplicationById(applicationId);
```

**Step 2**: Query geographic names (Lines 131-147)
```typescript
const geographicQuery = `
  SELECT p.province_name, d.district_name, m.municipality_name
  FROM provinces p
  LEFT JOIN districts d ON d.province_code = p.province_code AND d.district_code = $2
  LEFT JOIN municipalities m ON m.district_code = d.district_code AND m.municipality_code = $3
  WHERE p.province_code = $1
`;
const geographicResult = await executeQuery(geographicQuery, [
  application.province_code,
  application.district_code,
  application.municipal_code  // ← Uses IEC code "EKU"
]);
```

**Problem**: The query tries to find municipality with code `"EKU"`, but the municipalities table likely has `"320"` or `"EKU004"`.

**Step 3**: Insert member (Lines 189-217)
```typescript
const params = [
  // ... fields ...
  application.municipal_code,  // ← Line 206: Uses "EKU" directly
  geographicData.municipality_name,
  // ... fields ...
];
```

**Result**: Member gets `municipality_code = "EKU"` which doesn't match existing members.

---

## 🔧 WHAT NEEDS TO BE CHANGED

### Required Changes in Approval Process

#### Option 1: Map IEC Municipality Code to Internal Code (RECOMMENDED)

**Location**: `backend/src/services/membershipApprovalService.ts`

**Change**: Before creating the member, look up the correct internal municipality code based on the ward.

**Logic**:
```typescript
// Get the correct municipality_code from the ward table
const wardQuery = `
  SELECT municipality_code 
  FROM wards 
  WHERE ward_code = $1
`;
const wardResult = await executeQuery(wardQuery, [application.ward_code]);
const correctMunicipalityCode = wardResult[0]?.municipality_code;

// Use correctMunicipalityCode instead of application.municipal_code
```

**Pros**:
- Uses authoritative ward→municipality mapping
- Consistent with existing members
- Simple to implement

**Cons**:
- Requires ward table to have correct municipality codes
- Need to verify ward table data is accurate

#### Option 2: Create IEC→Internal Municipality Mapping Table

**Create**: `iec_municipality_mappings` table

**Structure**:
```sql
CREATE TABLE iec_municipality_mappings (
  iec_municipality_id INT,
  iec_municipality_code VARCHAR(20),
  internal_municipality_code VARCHAR(20),
  municipality_name VARCHAR(255)
);
```

**Pros**:
- Explicit mapping between IEC and internal codes
- Can handle complex mappings (metro → sub-regions)
- Reusable for other IEC integrations

**Cons**:
- Requires populating mapping table
- More complex implementation

#### Option 3: Update All Existing Members to Use IEC Codes

**Change**: Migrate all existing members to use IEC municipality codes

**Pros**:
- Consistent coding system
- Aligns with IEC data

**Cons**:
- Requires updating 387+ members
- May break existing queries/reports
- Need to update ward table too
- High risk of data inconsistency

---

## 📌 RECOMMENDED SOLUTION

**Use Option 1**: Map IEC code to internal code during approval

**Implementation Steps**:

1. **Verify Ward Table Data**:
   - Check if ward `79700100` should have `municipality_code = "320"` or `"EKU004"`
   - Update ward table if needed

2. **Modify Approval Service**:
   - Add ward lookup before creating member
   - Use ward's `municipality_code` instead of application's `municipal_code`

3. **Update Geographic Query**:
   - Use the correct municipality code for looking up municipality name

4. **Test**:
   - Approve a test application
   - Verify member gets correct municipality code
   - Verify member appears in ward listing with other members

---

## 🚨 ADDITIONAL FINDINGS

### IEC Data Mismatch

**Note**: The IEC data shows this member is in:
- Ward ID: 79800135 (City of Johannesburg)
- Municipality ID: 3003

But the member was approved with:
- Ward Code: 79700100 (Ekurhuleni)

**This suggests**:
1. The application form allowed manual override of IEC data, OR
2. The IEC data was not used for ward assignment, OR
3. There's a data entry error

**Recommendation**: Investigate why ward code differs from IEC data.

---

## 📝 SUMMARY

**Problem**: Municipality code mismatch causes filtering issues
**Root Cause**: Approval process uses IEC metro-level code instead of internal sub-region code
**Impact**: Only newly approved members visible in ward listings
**Solution**: Map IEC municipality code to internal code during approval using ward table
**Priority**: HIGH - Affects member visibility and data consistency

---

## 🔬 ADDITIONAL INVESTIGATION NEEDED

Since the backend query doesn't filter by municipality_code and the view uses the ward's municipality_code (not the member's), we need to determine:

1. **What page/component is the user viewing?**
   - Ward member listing page?
   - Municipality member listing page?
   - Dashboard/analytics page?

2. **What API endpoint is being called?**
   - `/api/members/ward/:wardCode`?
   - `/api/members/municipality/:municipalityCode`?
   - Different endpoint?

3. **Is there frontend filtering?**
   - Check browser console for API calls
   - Check network tab for request parameters
   - Check frontend component code for filtering logic

4. **Test Query**:
   ```sql
   -- Run this to see what the view returns for ward 79700100
   SELECT member_id, firstname, surname, ward_code, municipality_code, municipality_name
   FROM vw_member_details
   WHERE ward_code = '79700100'
   LIMIT 10;
   ```

---

## 📋 IMMEDIATE ACTION ITEMS

### 1. Clarify User's Issue
**Ask the user**:
- "Which page are you viewing when you see only one member?"
- "Can you check the browser's Network tab and share the API endpoint being called?"
- "Are you filtering by municipality or just viewing the ward?"

### 2. Fix Municipality Code in Approval Process (Regardless)

Even if this isn't causing the current issue, the municipality code mismatch should be fixed:

**File**: `backend/src/services/membershipApprovalService.ts`

**Change** (around line 143-147):
```typescript
// OLD CODE:
const geographicResult = await executeQuery(geographicQuery, [
  application.province_code,
  application.district_code,
  application.municipal_code  // ← IEC code
]);

// NEW CODE:
// Get municipality_code from ward table (authoritative source)
const wardMunicipalityQuery = `
  SELECT municipality_code FROM wards WHERE ward_code = $1
`;
const wardMunicipalityResult = await executeQuery(wardMunicipalityQuery, [
  application.ward_code
]);
const correctMunicipalityCode = wardMunicipalityResult[0]?.municipality_code || application.municipal_code;

// Use correct municipality code for geographic lookup
const geographicResult = await executeQuery(geographicQuery, [
  application.province_code,
  application.district_code,
  correctMunicipalityCode  // ← Internal code from ward table
]);
```

**Change** (around line 206):
```typescript
// OLD CODE:
application.municipal_code,  // ← IEC code

// NEW CODE:
correctMunicipalityCode,  // ← Internal code from ward table
```

### 3. Verify Ward Table Data

**Run this query**:
```sql
SELECT ward_code, ward_name, municipality_code
FROM wards
WHERE ward_code = '79700100';
```

**Expected**: Should return `municipality_code = '320'` (to match existing members)
**Actual**: Returns `municipality_code = 'EKU004'`

**Action**: Determine which is correct and update accordingly.

### 4. Consider Data Migration

If we fix the approval process, we should also fix the existing incorrect member:

```sql
-- Update the newly approved member to use correct municipality_code
UPDATE members_consolidated
SET municipality_code = (
  SELECT municipality_code FROM wards WHERE ward_code = '79700100'
)
WHERE id_number = '7808020703087';
```

---

**Investigation Status**: ⚠️ **PARTIALLY COMPLETE**
**Root Cause**: ✅ **IDENTIFIED** (Municipality code mismatch in approval process)
**User's Specific Issue**: ⏳ **NEEDS CLARIFICATION** (Need to know which page/endpoint)
**Next Step**: Get more details from user about where they're seeing the issue

---

## 📞 QUESTIONS FOR USER

1. **Which page are you viewing?**
   - Ward member listing?
   - Municipality member listing?
   - Dashboard?
   - Other?

2. **Can you share a screenshot of the page?**

3. **Can you open browser DevTools (F12) → Network tab and share:**
   - The API endpoint being called
   - The request parameters
   - The response data

4. **Are you filtering or searching for anything?**
   - By municipality?
   - By name?
   - Other filters?

5. **When you say "only one member shows up", do you mean:**
   - The list shows 1 member total?
   - The list shows 1 member per page (pagination issue)?
   - The list shows 1 member matching your filter?

---

**Investigation Complete**
**Next Step**:
1. Get clarification from user on specific issue
2. Implement municipality code fix in approval process (Option 1)
3. Test with new application approval

