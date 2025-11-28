# Leadership Assignment Sub-Region Fix

## 📋 Overview

This document describes the fix applied to the leadership assignment functionality to properly handle sub-regions (local municipalities) when selecting members for leadership positions.

## 🐛 Problem Description

### Issue
When trying to assign leaders from sub-regions (local municipalities), the assignment process was not working properly. Specifically:

1. **Selecting a parent municipality (metro)** would only return members directly associated with the parent municipality code, missing all members from sub-regions
2. This resulted in missing thousands of eligible members from metropolitan areas

### Example
- **City of Johannesburg Metropolitan Municipality** has 7 sub-regions (JHB-A through JHB-G)
- **Before Fix**: Selecting "City of Johannesburg" returned only 42 members
- **After Fix**: Selecting "City of Johannesburg" returns 26,084 members (includes all sub-regions)

### Root Cause
The `getEligibleLeadershipMembers()` method in `backend/src/services/leadershipService.ts` used a simple equality check for municipality filtering:

```typescript
case 'Municipality':
  query += ' AND m.municipality_code = (SELECT municipality_code FROM municipalities WHERE municipality_id = ? )';
  params.push(filters.entity_id);
  break;
```

This approach:
- ❌ Only matched exact municipality codes
- ❌ Didn't account for parent-child municipality relationships
- ❌ Missed members in sub-regions of metropolitan municipalities

## ✅ Solution

### Fix Applied
Updated the municipality filtering logic to include both the selected municipality AND all its sub-regions:

```typescript
case 'Municipality':
  // FIXED: Include both the selected municipality AND all its sub-regions (for metros)
  // This handles parent-child municipality relationships via parent_municipality_id
  query += ` AND m.municipality_code IN (
    -- Include the selected municipality itself
    SELECT municipality_code FROM municipalities WHERE municipality_id = ?
    UNION
    -- Include all sub-regions if this is a parent municipality
    SELECT municipality_code FROM municipalities WHERE parent_municipality_id = ?
  )`;
  params.push(filters.entity_id, filters.entity_id);
  break;
```

### How It Works

1. **For Parent Municipalities (Metros)**:
   - Includes the parent municipality code
   - Includes all sub-region municipality codes via `parent_municipality_id`
   - Example: Selecting "City of Johannesburg" includes JHB, JHB001, JHB002, ..., JHB007

2. **For Sub-Regions**:
   - Works correctly as before
   - Returns members from the specific sub-region

3. **For Regular Municipalities**:
   - Works correctly as before
   - Returns members from the specific municipality

## 📊 Test Results

### Test Case 1: Parent Municipality (Metro)
```
Municipality: City of Cape Town Metropolitan Municipality
Sub-regions: 10
Expected members: 23,289
Actual members: 23,289
Status: ✅ PASSED
```

### Test Case 2: Sub-Region
```
Municipality: EKU - South
Parent: Ekurhuleni Metropolitan Municipality
Expected members: 7,353
Actual members: 7,353
Status: ✅ PASSED
```

### Test Case 3: Regular Municipality
```
Municipality: Emfuleni Sub-Region
Type: Local
Expected members: 10,503
Actual members: 10,503
Status: ✅ PASSED
```

### Test Case 4: No Duplicates
```
Duplicate members found: 0
Status: ✅ PASSED
```

## 🗂️ Files Modified

### Backend
- **`backend/src/services/leadershipService.ts`**
  - Method: `getEligibleLeadershipMembers()`
  - Lines: 554-566
  - Change: Updated Municipality case to include sub-regions

## 🧪 Testing

### Diagnostic Scripts
1. **`test/leadership/diagnose-subregion-assignment-issue.js`**
   - Investigates parent-child municipality relationships
   - Shows member distribution in sub-regions
   - Compares current vs fixed logic

2. **`test/leadership/test-parent-municipality-filtering.js`**
   - Tests parent municipality filtering specifically
   - Demonstrates the issue with concrete examples
   - Shows the difference between current and fixed logic

3. **`test/leadership/test-leadership-subregion-fix.js`**
   - Comprehensive test suite for the fix
   - Tests all scenarios: parent, sub-region, regular municipality
   - Verifies no duplicate members

### Running Tests
```bash
# Diagnose the issue
node test/leadership/diagnose-subregion-assignment-issue.js

# Test parent municipality filtering
node test/leadership/test-parent-municipality-filtering.js

# Verify the fix
node test/leadership/test-leadership-subregion-fix.js
```

## 📈 Impact

### Metropolitan Municipalities Affected
- **City of Johannesburg**: +26,042 members
- **Ekurhuleni**: +23,719 members
- **City of Tshwane**: +23,508 members
- **City of Cape Town**: +23,289 members
- **Buffalo City**: +50 members

### Total Impact
- **96,608 members** now correctly included when selecting metropolitan municipalities for leadership assignment

## 🔗 Related Systems

### Database Schema
- **`municipalities` table**: Contains `parent_municipality_id` field for sub-region relationships
- **`vw_member_details` view**: Provides member data with geographic information

### Geographic Hierarchy
```
Province
  └── District (Region)
      └── Municipality (Sub-Region)
          ├── Parent Municipality (Metropolitan)
          └── Sub-Regions (Local Municipalities)
              └── Ward
                  └── Voting District
```

### Related Features
- **Membership Directory**: Already handles parent-child relationships correctly
- **Member Search**: Already handles parent-child relationships correctly (see `backend/src/models/members.ts`)
- **Birthday SMS**: Uses geographic data for language selection
- **Ward Audit**: Uses geographic filtering

## 🎯 Best Practices

### When Filtering by Municipality
Always consider parent-child relationships:

```sql
-- ✅ CORRECT: Includes sub-regions
WHERE municipality_code IN (
  SELECT municipality_code FROM municipalities WHERE municipality_id = ?
  UNION
  SELECT municipality_code FROM municipalities WHERE parent_municipality_id = ?
)

-- ❌ INCORRECT: Misses sub-regions
WHERE municipality_code = (
  SELECT municipality_code FROM municipalities WHERE municipality_id = ?
)
```

### When Adding New Features
If your feature filters members by municipality:
1. Check if it needs to handle parent-child relationships
2. Use the pattern from `backend/src/models/members.ts` (lines 167-192)
3. Test with metropolitan municipalities
4. Verify no duplicate members

## 📝 Notes

### Why This Matters
- **Leadership Assignment**: Ensures all eligible members are available for selection
- **Data Integrity**: Maintains consistency with other parts of the system
- **User Experience**: Users can now properly assign leaders from metropolitan areas
- **Multilingual Birthday SMS**: Correct geographic data ensures proper language selection

### Future Considerations
- Consider creating a reusable function for municipality filtering with parent-child support
- Add database indexes on `parent_municipality_id` if performance becomes an issue
- Document this pattern in developer guidelines

## 🔄 Rollback

If needed, the fix can be rolled back by reverting the change in `backend/src/services/leadershipService.ts`:

```typescript
// Rollback to original (broken) logic
case 'Municipality':
  query += ' AND m.municipality_code = (SELECT municipality_code FROM municipalities WHERE municipality_id = ? )';
  params.push(filters.entity_id);
  break;
```

However, this is **not recommended** as it will break leadership assignment for metropolitan municipalities.

## ✅ Verification Checklist

- [x] Issue diagnosed and root cause identified
- [x] Fix applied to `leadershipService.ts`
- [x] All test cases pass
- [x] No duplicate members in results
- [x] Parent municipalities include sub-regions
- [x] Sub-regions work correctly
- [x] Regular municipalities work correctly
- [x] Documentation created
- [x] Test scripts created

## 📞 Support

If you encounter issues with leadership assignment:
1. Run the diagnostic script: `node test/leadership/diagnose-subregion-assignment-issue.js`
2. Check the test results: `node test/leadership/test-leadership-subregion-fix.js`
3. Review this documentation
4. Check related systems (member search, membership directory)

---

**Status**: ✅ FIXED AND VERIFIED  
**Date**: 2025-10-08  
**Impact**: 96,608 members now correctly included in leadership assignment  
**Files Modified**: 1 (backend/src/services/leadershipService.ts)  
**Tests Created**: 3 diagnostic/test scripts

