# Wards Table Join Fix - Database Schema Issue

## Problem

Database query error when fetching wards by municipality:

```
❌ Database query error: error: column w.district_code does not exist
❌ Database query error: error: column w.province_code does not exist
```

**Error Details**:
- Error Code: `42703` (Column does not exist)
- Query: `getWardsByMunicipality()` in GeographicModel
- Affected Endpoint: `GET /api/v1/geographic/wards?municipality=EKU`

---

## Root Cause

The queries in `backend/src/models/geographic.ts` were attempting to select columns that **do not exist** in the `wards` table:

### Incorrect Assumption
```sql
SELECT
  w.district_code,  -- ❌ Does NOT exist in wards table
  w.province_code   -- ❌ Does NOT exist in wards table
FROM wards w
LEFT JOIN districts d ON w.district_code = d.district_code  -- ❌ Invalid join
LEFT JOIN provinces p ON w.province_code = p.province_code  -- ❌ Invalid join
```

### Actual Wards Table Schema

According to the Prisma schema and database structure:

```typescript
model Ward {
  ward_id           Int       @id
  ward_code         String    @unique
  ward_name         String
  ward_number       Int?
  municipality_code String    // ✅ ONLY geographic link
  // NO district_code ❌
  // NO province_code ❌
  municipality      Municipality @relation(...)
}
```

**Key Point**: The `wards` table **ONLY** has `municipality_code` as a foreign key. It does NOT have direct links to districts or provinces.

---

## Correct Database Hierarchy

```
provinces (province_code)
    ↓
districts (district_code, province_code)
    ↓
municipalities (municipality_code, district_code)
    ↓
wards (ward_code, municipality_code)  ← ONLY links to municipality
```

**Join Path**: To get district and province information for a ward, you must join through municipalities:

```
wards → municipalities → districts → provinces
```

---

## Solution

Fixed three methods in `backend/src/models/geographic.ts` to use the correct join path:

### 1. getAllWards() - Lines 212-238

**Before** (Incorrect):
```typescript
SELECT
  w.ward_code,
  w.ward_number,
  w.ward_name,
  w.municipality_code,
  w.district_code,      -- ❌ Does not exist
  w.province_code,      -- ❌ Does not exist
  m.municipality_name,
  d.district_name,
  p.province_name
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON w.district_code = d.district_code  -- ❌ Invalid
LEFT JOIN provinces p ON w.province_code = p.province_code  -- ❌ Invalid
```

**After** (Correct):
```typescript
SELECT
  w.ward_code,
  w.ward_number,
  w.ward_name,
  w.municipality_code,
  m.district_code,      -- ✅ From municipalities table
  d.province_code,      -- ✅ From districts table
  m.municipality_name,
  d.district_name,
  p.province_name
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code  -- ✅ Join through municipalities
LEFT JOIN provinces p ON d.province_code = p.province_code  -- ✅ Join through districts
```

### 2. getWardByCode() - Lines 240-267

**Before** (Incorrect):
```typescript
SELECT 
  w.ward_id,
  w.ward_code,
  w.ward_number,
  w.ward_name,
  w.municipality_code,
  w.district_code,      -- ❌ Does not exist
  w.province_code,      -- ❌ Does not exist
  m.municipality_name,
  d.district_name,
  p.province_name,
  w.created_at,
  w.updated_at
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON w.district_code = d.district_code  -- ❌ Invalid
LEFT JOIN provinces p ON w.province_code = p.province_code  -- ❌ Invalid
WHERE w.ward_code = ?
```

**After** (Correct):
```typescript
SELECT 
  w.ward_id,
  w.ward_code,
  w.ward_number,
  w.ward_name,
  w.municipality_code,
  m.district_code,      -- ✅ From municipalities table
  d.province_code,      -- ✅ From districts table
  m.municipality_name,
  d.district_name,
  p.province_name,
  w.created_at,
  w.updated_at
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code  -- ✅ Join through municipalities
LEFT JOIN provinces p ON d.province_code = p.province_code  -- ✅ Join through districts
WHERE w.ward_code = ?
```

### 3. getWardsByMunicipality() - Lines 269-297

**Before** (Incorrect):
```typescript
SELECT
  w.id,
  w.ward_code,
  w.ward_number,
  w.ward_name,
  w.municipality_code,
  w.district_code,      -- ❌ Does not exist
  w.province_code,      -- ❌ Does not exist
  m.municipality_name,
  d.district_name,
  p.province_name,
  w.created_at,
  w.updated_at
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON w.district_code = d.district_code  -- ❌ Invalid
LEFT JOIN provinces p ON w.province_code = p.province_code  -- ❌ Invalid
WHERE w.municipality_code = ?
ORDER BY w.ward_number
```

**After** (Correct):
```typescript
SELECT
  w.ward_id as id,      -- ✅ Fixed: use ward_id instead of id
  w.ward_code,
  w.ward_number,
  w.ward_name,
  w.municipality_code,
  m.district_code,      -- ✅ From municipalities table
  d.province_code,      -- ✅ From districts table
  m.municipality_name,
  d.district_name,
  p.province_name,
  w.created_at,
  w.updated_at
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code  -- ✅ Join through municipalities
LEFT JOIN provinces p ON d.province_code = p.province_code  -- ✅ Join through districts
WHERE w.municipality_code = ?
ORDER BY w.ward_number
```

---

## Files Modified

### backend/src/models/geographic.ts

**Lines Modified**:
- Lines 212-238: `getAllWards()` method
- Lines 240-267: `getWardByCode()` method
- Lines 269-297: `getWardsByMunicipality()` method

**Changes**:
1. Removed references to `w.district_code` and `w.province_code`
2. Changed to `m.district_code` and `d.province_code`
3. Fixed join conditions to go through municipalities
4. Fixed `w.id` to `w.ward_id as id` in getWardsByMunicipality

---

## Key Changes Summary

| What Changed | Before | After |
|--------------|--------|-------|
| **District Code** | `w.district_code` ❌ | `m.district_code` ✅ |
| **Province Code** | `w.province_code` ❌ | `d.province_code` ✅ |
| **District Join** | `ON w.district_code = d.district_code` ❌ | `ON m.district_code = d.district_code` ✅ |
| **Province Join** | `ON w.province_code = p.province_code` ❌ | `ON d.province_code = p.province_code` ✅ |
| **Ward ID** | `w.id` ❌ | `w.ward_id as id` ✅ |

---

## Why This Happened

This error occurred because:

1. **Schema Migration**: The database was migrated from MySQL to PostgreSQL, and the schema structure changed
2. **Assumption Error**: The code assumed wards had direct foreign keys to districts and provinces
3. **Normalization**: The actual schema is properly normalized with wards only linking to municipalities

---

## Testing

### Test Endpoints

```bash
# Test get wards by municipality
curl http://localhost:5000/api/v1/geographic/wards?municipality=EKU

# Test get all wards
curl http://localhost:5000/api/v1/geographic/wards

# Test get ward by code
curl http://localhost:5000/api/v1/geographic/wards/79700001
```

### Expected Results

All queries should now:
- ✅ Execute without errors
- ✅ Return ward data with correct district and province information
- ✅ Include proper joins through the municipality table

---

## Related Issues

This is similar to previous fixes for:
- Analytics queries (members table also only has `ward_code`)
- District performance queries
- Municipality queries

**Pattern**: Always remember the correct join path:
```
members → wards → municipalities → districts → provinces
```

---

## Prevention

To prevent similar issues in the future:

1. **Always check the schema** before writing queries
2. **Use Prisma schema** as the source of truth
3. **Test queries** with actual database structure
4. **Document join paths** in code comments
5. **Use database views** for complex joins (e.g., `vw_member_details`)

---

## Database Schema Reference

### Wards Table (Actual Structure)

```sql
CREATE TABLE wards (
  ward_id SERIAL PRIMARY KEY,
  ward_code VARCHAR(20) NOT NULL UNIQUE,
  ward_name VARCHAR(150) NOT NULL,
  ward_number INTEGER,
  municipality_code VARCHAR(20) NOT NULL,  -- ✅ ONLY foreign key
  population INTEGER,
  area_km2 DECIMAL(10,2),
  member_count INTEGER DEFAULT 0,
  is_in_good_standing BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (municipality_code) REFERENCES municipalities(municipality_code)
);
```

**Note**: No `district_code` or `province_code` columns exist.

---

## Summary

### Problem
- ❌ Queries tried to access `w.district_code` and `w.province_code`
- ❌ These columns don't exist in the wards table
- ❌ Caused database errors when fetching ward data

### Solution
- ✅ Changed to `m.district_code` and `d.province_code`
- ✅ Fixed join path: wards → municipalities → districts → provinces
- ✅ Updated three methods in GeographicModel
- ✅ Backend rebuilt successfully

### Impact
- ✅ Ward queries now work correctly
- ✅ Hierarchical dashboard can load ward data
- ✅ Geographic filtering works properly
- ✅ No breaking changes to API responses

---

**Status**: ✅ **FIXED**  
**Date**: 2025-10-01  
**Files Modified**: 1 (`backend/src/models/geographic.ts`)  
**Methods Fixed**: 3 (getAllWards, getWardByCode, getWardsByMunicipality)  
**Build Status**: ✅ Successful  
**Ready for**: Testing and deployment

