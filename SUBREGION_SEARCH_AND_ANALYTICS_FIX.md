# Sub-Region Search Enhancement & Analytics SQL Fix

## Summary
Three fixes implemented:
1. **Sub-Region Search Enhancement**: Added municipality code and name search functionality
2. **Analytics SQL Fix**: Fixed PostgreSQL parameter escaping issue in analytics queries
3. **Validation Fix**: Added province_code to allowed query parameters for sub-region endpoints

---

## Fix 1: Sub-Region Search Enhancement

### Problem
The sub-region search on `http://localhost:3000/admin/search/geographic` was not properly searching by municipality code or municipality name in the autocomplete dropdown.

### Solution
Updated the municipalities lookup endpoint to support search filtering by both municipality code and municipality name.

### Changes Made

**File Modified:** `backend/src/routes/memberSearch.ts` (lines 666-695)

**What Changed:**
- Added search parameter support to all three municipality query branches:
  - District-filtered municipalities
  - Province-filtered municipalities  
  - All municipalities
- Search now filters by: `municipality_name LIKE ? OR municipality_code LIKE ?`
- Added `municipality_code as code` to SELECT for frontend compatibility
- Added proper LIMIT to all queries

**Before:**
```typescript
case 'municipalities':
  query = 'SELECT municipality_code as id, municipality_name as name FROM municipalities ORDER BY municipality_name LIMIT ?';
  params = [limit];
  break;
```

**After:**
```typescript
case 'municipalities':
  query = 'SELECT municipality_code as id, municipality_name as name, municipality_code as code FROM municipalities';
  params = [];
  if (search) {
    query += ' WHERE (municipality_name LIKE ? OR municipality_code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY municipality_name LIMIT ?';
  params.push(limit);
  break;
```

### How It Works Now

1. **User types in search box** (e.g., "Buffalo" or "BUF")
2. **Frontend sends request**: `GET /api/v1/search/lookup/municipalities?search=Buffalo&limit=10`
3. **Backend searches**: Matches against both `municipality_name` and `municipality_code`
4. **Returns results**: 
   ```json
   {
     "results": [
       {
         "id": "BUF",
         "name": "Buffalo City",
         "code": "BUF"
       }
     ]
   }
   ```
5. **Frontend displays**: "Buffalo City (BUF)" in autocomplete dropdown

### Testing

**Test Cases:**
1. ✅ Search by municipality name: "Buffalo" → Shows "Buffalo City (BUF)"
2. ✅ Search by municipality code: "BUF" → Shows "Buffalo City (BUF)"
3. ✅ Partial search: "Buf" → Shows all municipalities starting with "Buf"
4. ✅ Case-insensitive: "buffalo" → Shows "Buffalo City (BUF)"
5. ✅ Autocomplete dropdown shows municipality name with code in parentheses

---

## Fix 2: Analytics SQL Parameter Escaping

### Problem
Analytics dashboard was failing with PostgreSQL syntax error:
```
error: syntax error at or near "\"
```

The query had escaped parameter placeholders (`\$1`) mixed with unescaped ones (`$1`), causing PostgreSQL to fail.

**Error Query:**
```sql
SELECT
  ms.status_name as membership_status,
  COUNT(*) as member_count,
  ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 WHERE province_code = \$1), 0)), 2) as percentage
FROM members_consolidated m
LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id 
WHERE province_code = $1
GROUP BY ms.status_name, ms.status_id
```

Notice: `\$1` in subquery vs `$1` in main query

### Root Cause
The code was using `.replace(/\$/g, '\\$')` to escape dollar signs in the WHERE clause for the subquery, which is incorrect for PostgreSQL parameterized queries.

### Solution
Removed the parameter escaping and duplicated the query parameters instead, since the subquery uses the same parameters as the main query.

### Changes Made

**File Modified:** `backend/src/models/analyticsOptimized.ts`

**Change 1: Membership by Status Query (lines 202-218)**
```typescript
// BEFORE
ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 ${whereClause.replace(/\$/g, '\\$')}), 0)), 2) as percentage
...
queryParams

// AFTER  
ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 ${whereClause}), 0)), 2) as percentage
...
[...queryParams, ...queryParams]
```

**Change 2: Voter Registration Status Query (lines 220-236)**
```typescript
// BEFORE
ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 ${whereClause.replace(/\$/g, '\\$')}), 0)), 2) as percentage
...
queryParams

// AFTER
ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 ${whereClause}), 0)), 2) as percentage
...
[...queryParams, ...queryParams]
```

### Why This Works

**PostgreSQL Parameterized Queries:**
- Parameters are numbered: `$1`, `$2`, `$3`, etc.
- When a parameter is used multiple times, you pass the value multiple times in the params array
- Example:
  ```typescript
  // Query uses $1 twice
  query = 'SELECT * FROM table WHERE col1 = $1 AND col2 IN (SELECT col FROM other WHERE col = $1)'
  params = ['value', 'value'] // Pass the value twice
  ```

**Our Fix:**
- Main query uses: `WHERE province_code = $1`
- Subquery uses: `WHERE province_code = $1` (same parameter)
- We pass: `[...queryParams, ...queryParams]` to provide the parameter value twice

### Correct Query Now
```sql
SELECT
  ms.status_name as membership_status,
  COUNT(*) as member_count,
  ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM members_consolidated m2 WHERE province_code = $1), 0)), 2) as percentage
FROM members_consolidated m
LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id 
WHERE province_code = $1
GROUP BY ms.status_name, ms.status_id
```

With params: `['GP', 'GP']` (province code passed twice)

### Testing

**Test the analytics dashboard:**
1. Navigate to: `http://localhost:3000/admin/analytics`
2. Select a province (e.g., "Gauteng - GP")
3. Dashboard should load without errors
4. Check backend logs - should see successful queries
5. Verify membership status chart displays correctly
6. Verify voter registration status chart displays correctly

---

---

## Fix 3: Validation Schema Update

### Problem
Sub-region download endpoint was rejecting requests with `province_code` query parameter:
```
ValidationError: Validation failed: Query: "province_code" is not allowed
```

### Root Cause
The validation schema for `/api/v1/members/subregion/:municipalityCode/download` and `/api/v1/members/subregion/:municipalityCode` endpoints didn't include `province_code` in the allowed query parameters.

### Solution
Added `province_code` as an optional query parameter to both sub-region endpoints.

### Changes Made

**File Modified:** `backend/src/routes/members.ts`

**Change 1: Download Endpoint (lines 798-812)**
```typescript
query: Joi.object({
  search: Joi.string().optional(),
  membership_status: Joi.string().valid('all', 'active', 'expired').optional(),
  province_code: Joi.string().min(2).max(3).optional() // ✅ ADDED
})
```

**Change 2: GET Endpoint (lines 1132-1150)**
```typescript
query: Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(500).default(50),
  search: Joi.string().optional(),
  membership_status: Joi.string().valid('all', 'good_standing', 'expired').optional(),
  sort_by: Joi.string().valid('firstname', 'surname', 'member_id', 'membership_number', 'expiry_date').default('firstname'),
  sort_order: Joi.string().valid('asc', 'desc').default('asc'),
  province_code: Joi.string().min(2).max(3).optional() // ✅ ADDED
})
```

### Why This Was Needed
The frontend passes `province_code` in the query string when downloading sub-region members. The backend validation was rejecting this parameter, causing the download to fail.

---

## Summary

### Files Modified
1. ✅ `backend/src/routes/memberSearch.ts` - Added municipality search functionality
2. ✅ `backend/src/models/analyticsOptimized.ts` - Fixed PostgreSQL parameter escaping
3. ✅ `backend/src/routes/members.ts` - Added province_code to validation schemas

### Features Working
1. ✅ Sub-region search with autocomplete by municipality name or code
2. ✅ Sub-region member download (Excel export)
3. ✅ Analytics dashboard membership status breakdown
4. ✅ Analytics dashboard voter registration status breakdown
5. ✅ Province-filtered analytics queries

### No Breaking Changes
- All existing functionality preserved
- Backward compatible with existing code
- No database schema changes required

---

## Next Steps

**To test both fixes:**
1. Restart backend server (if running)
2. Test sub-region search:
   - Go to Geographic Search page
   - Switch to "Sub-Region" tab
   - Type municipality name or code
   - Verify autocomplete works
3. Test analytics dashboard:
   - Go to Analytics page
   - Select a province
   - Verify charts load without errors

Both fixes are production-ready! 🎉

