# Hierarchy Level Validation Fix

## Issue

**Error Message:**
```
ValidationError: "hierarchy_level" must be one of [National, Provincial, Regional, Municipal, Ward]
```

**Request Body:**
```json
{
  "meeting_type_id": 24,
  "hierarchy_level": "Province",  // ❌ Wrong format
  "entity_id": 3
}
```

**Endpoint:** `POST /api/v1/hierarchical-meetings/invitation-preview`

---

## Root Cause

There are **two different hierarchy level formats** used in the system:

### 1. **API/Frontend Format** (Used by validation schemas)
- `'National'`
- `'Provincial'` ✅
- `'Regional'` ✅
- `'Municipal'` ✅
- `'Ward'`

### 2. **Database Format** (Used internally after mapping)
- `'National'`
- `'Province'` ❌
- `'Region'` ❌
- `'Municipality'` ❌
- `'Ward'`

The old `MeetingCreatePage.tsx` was using the **database format** (`'Province'`, `'Region'`, `'Municipality'`) in the dropdown menu, which caused validation errors when sending requests to the API.

---

## Solution

### Fixed File: `frontend/src/pages/meetings/MeetingCreatePage.tsx`

**Before (Lines 183-188):**
```tsx
<MenuItem value="National">National</MenuItem>
<MenuItem value="Province">Province</MenuItem>          // ❌ Wrong
<MenuItem value="Region">Region</MenuItem>              // ❌ Wrong
<MenuItem value="Municipality">Municipality</MenuItem>  // ❌ Wrong
<MenuItem value="Ward">Ward</MenuItem>
```

**After (Lines 183-188):**
```tsx
<MenuItem value="National">National</MenuItem>
<MenuItem value="Provincial">Provincial</MenuItem>      // ✅ Fixed
<MenuItem value="Regional">Regional</MenuItem>          // ✅ Fixed
<MenuItem value="Municipal">Municipal</MenuItem>        // ✅ Fixed
<MenuItem value="Ward">Ward</MenuItem>
```

---

## How the Mapping Works

The backend automatically maps the API format to the database format:

**File:** `backend/src/routes/hierarchicalMeetings.ts` (Lines 263-270)

```typescript
const hierarchyLevelMap: Record<string, string> = {
  'National': 'National',
  'Provincial': 'Province',      // API → Database
  'Regional': 'Region',           // API → Database
  'Municipal': 'Municipality',    // API → Database
  'Ward': 'Ward',
  'Branch': 'Branch'
};
```

---

## Validation Schema

**File:** `backend/src/routes/hierarchicalMeetings.ts` (Line 89)

```typescript
const invitationPreviewSchema = Joi.object({
  meeting_type_id: Joi.number().integer().positive().required(),
  hierarchy_level: Joi.string().valid('National', 'Provincial', 'Regional', 'Municipal', 'Ward').required(),
  entity_id: Joi.number().integer().positive().optional(),
  entity_type: Joi.string().valid('National', 'Province', 'Region', 'Municipality', 'Ward').optional(),
  province_code: Joi.string().allow('').optional(),
  municipality_code: Joi.string().allow('').optional(),
  ward_code: Joi.string().allow('').optional()
});
```

**Note:** 
- `hierarchy_level` accepts: `'National'`, `'Provincial'`, `'Regional'`, `'Municipal'`, `'Ward'` (API format)
- `entity_type` accepts: `'National'`, `'Province'`, `'Region'`, `'Municipality'`, `'Ward'` (Database format)

---

## Other Pages (Already Correct)

### ✅ `HierarchicalMeetingCreatePage.tsx` (Lines 513-517)
```tsx
<MenuItem value="National">National</MenuItem>
<MenuItem value="Provincial">Provincial</MenuItem>      // ✅ Correct
<MenuItem value="Regional">Regional</MenuItem>          // ✅ Correct
<MenuItem value="Municipal">Municipal</MenuItem>        // ✅ Correct
<MenuItem value="Ward">Ward</MenuItem>
```

This page was already using the correct API format.

---

## Testing

After the fix, the following request should work correctly:

```json
POST /api/v1/hierarchical-meetings/invitation-preview
{
  "meeting_type_id": 24,
  "hierarchy_level": "Provincial",  // ✅ Now correct
  "entity_id": 3
}
```

---

## Summary

- ✅ Fixed `MeetingCreatePage.tsx` to use API format (`'Provincial'`, `'Regional'`, `'Municipal'`)
- ✅ Backend validation expects API format and maps to database format internally
- ✅ `HierarchicalMeetingCreatePage.tsx` was already correct
- ✅ Error should no longer occur when creating meetings or previewing invitations

---

**Date Fixed:** 2025-11-07  
**Files Modified:** `frontend/src/pages/meetings/MeetingCreatePage.tsx`

