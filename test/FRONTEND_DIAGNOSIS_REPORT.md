# Frontend Data Display Issue - Diagnosis Report

**Date:** 2025-11-17  
**Issue:** Members directory shows 0 members when filtering by Municipality/Local Municipality

---

## 🔍 Investigation Summary

Using Playwright browser automation, I navigated through the members directory filtering hierarchy:
1. **Province Selection:** Gauteng (273,287 members) ✅ Works
2. **Region/District Selection:** West Rand (DC48) - Auto-selected, showed 0 members ❌ **FAILS HERE**
3. **Municipality/Local Municipality Selection:** All show (0) members ❌ **FAILS HERE**

---

## 🎯 Root Cause Identified

### **PRIMARY ISSUE: Missing District Codes in Database**

**All 273,287 members in Gauteng province have `district_code = NULL` in the database!**

### Database Evidence:

```sql
SELECT district_code, COUNT(*) as member_count 
FROM members_consolidated 
WHERE province_code = 'GP' 
GROUP BY district_code;
```

**Result:**
| district_code | member_count |
|---------------|--------------|
| NULL          | 273,287      |

### Sample Member Data:

```
id_number       | province_code | district_code | municipality_code | ward_code
----------------|---------------|---------------|-------------------|----------
0010130770840   | GP            | NULL          | JHB               | 79800002
0010132150800   | GP            | NULL          | JHB               | 79800054
0010409630820   | GP            | NULL          | JHB               | 79800119
```

### Expected District Codes in Gauteng:

| district_code | district_name          |
|---------------|------------------------|
| JHB           | City of Johannesburg   |
| TSH           | City of Tshwane        |
| EKU           | Ekurhuleni             |
| DC42          | Sedibeng               |
| DC48          | West Rand              |

---

## 🐛 Secondary Issue: Incorrect Data Mapping

**The `municipality_code` column contains DISTRICT codes instead of MUNICIPALITY codes!**

### What's in the database:
- `municipality_code = 'JHB'` (This is a DISTRICT code, not a municipality code!)
- `municipality_code = 'TSH'` (This is a DISTRICT code, not a municipality code!)
- `municipality_code = 'EKU'` (This is a DISTRICT code, not a municipality code!)

### What SHOULD be in the database:
- `district_code = 'DC48'`
- `municipality_code = 'GT481'` (Mogale City)
- `municipality_code = 'GT484'` (Merafong City)
- `municipality_code = 'GT485'` (Rand West City)

---

## 📊 API Response Analysis

### API Endpoint: `/api/v1/members/stats/municipalities?district=DC48`

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "municipality_code": "GT484",
        "municipality_name": "Merafong City Local Municipality",
        "municipality_type": "Local",
        "member_count": "0"  ← Correct! There are 0 members with district_code='DC48'
      },
      {
        "municipality_code": "GT481",
        "municipality_name": "Mogale City Local Municipality",
        "municipality_type": "Local",
        "member_count": "0"  ← Correct! There are 0 members with district_code='DC48'
      },
      {
        "municipality_code": "GT485",
        "municipality_name": "Rand West City Local Municipality",
        "municipality_type": "Local",
        "member_count": "0"  ← Correct! There are 0 members with district_code='DC48'
      }
    ]
  }
}
```

**Note:** The API is working correctly! It's returning 0 because there are genuinely 0 members with `district_code='DC48'` in the database.

---

## 🔧 Additional Issue: Data Type Problem

**The `member_count` is returned as a STRING instead of a NUMBER:**

```javascript
typeof row.member_count === 'string'  // true
row.member_count === "0"              // true (string)
row.member_count === 0                // false (not a number)
```

This is a minor issue but should be fixed in the backend API to return numbers instead of strings.

---

## ✅ What's Working

1. ✅ Frontend rendering and filtering UI
2. ✅ API endpoints and responses
3. ✅ Province-level filtering (shows 273,287 members correctly)
4. ✅ Database queries (returning correct results based on available data)

---

## ❌ What's NOT Working

1. ❌ **District codes are NULL** for all Gauteng members
2. ❌ **Municipality codes contain district codes** instead of actual municipality codes
3. ❌ **Data ingestion script** is not correctly mapping district and municipality codes

---

## 🛠️ Solution Required

### **Root Cause Analysis - Complete Picture**

After extensive investigation, here's what's happening:

1. **Ward Mapping Issue:**
   - Ward codes like `79800001` are mapped to **Local Municipality municipalities** (e.g., `JHB007`, `JHB004`)
   - Local Municipality municipalities have `district_code = NULL` in the database
   - Local Municipality municipalities have a `parent_municipality_id` pointing to the parent metro (e.g., JHB)

2. **Database Structure:**
   ```
   Ward 79800001 → Municipality JHB007 (district_code=NULL, parent=JHB)
                                ↓
                   Parent Municipality JHB (district_code='JHB')
   ```

3. **Current Ingestion Logic:**
   - `resolve_geographic_hierarchy()` looks up ward → gets municipality `JHB007`
   - Tries to get district from `JHB007.district_code` → gets `NULL`
   - Result: Members end up with `district_code = NULL`

### **Fix Required in `flexible_membership_ingestionV2.py`**

The `resolve_geographic_hierarchy()` function (around line 413) needs to be updated to:

1. **Check if the municipality is a Local Municipality** (has `parent_municipality_id`)
2. **If it's a Local Municipality, look up the parent municipality** to get the district code
3. **Use the parent's district code** for the member record

### **Specific Code Changes Needed:**

In the `load_geographic_mappings()` method (around line 343-355), add logic to:
- Load parent municipality information for Local Municipalitys
- Store parent municipality's district code in the mapping

In the `resolve_geographic_hierarchy()` method (around line 413-452), add logic to:
- Check if municipality has a parent
- If yes, use parent's district code instead of the Local Municipality's NULL district code

### **Alternative Solution (Simpler):**

Update the `municipalities` table to populate `district_code` for all Local Municipalitys:

```sql
-- Update all JHB Local Municipalitys to have district_code='JHB'
UPDATE municipalities
SET district_code = 'JHB'
WHERE municipality_code LIKE 'JHB%' AND district_code IS NULL;

-- Update all TSH Local Municipalitys to have district_code='TSH'
UPDATE municipalities
SET district_code = 'TSH'
WHERE municipality_code LIKE 'TSH%' AND district_code IS NULL;

-- Update all EKU Local Municipalitys to have district_code='EKU'
UPDATE municipalities
SET district_code = 'EKU'
WHERE municipality_code LIKE 'EKU%' AND district_code IS NULL;
```

Then re-run the ingestion script to populate the `district_code` for all existing members.

### **Data Correction Required**

After fixing the issue (either by updating the script OR updating the database), you'll need to:

1. **Re-process all existing Excel files** to populate the `district_code` column for existing members
2. **Verify the data** after re-ingestion by checking:
   - Members in Gauteng should have `district_code` values (JHB, TSH, EKU, DC42, DC48)
   - The frontend filtering should work correctly

---

## 📝 Conclusion

**This is NOT a frontend issue!** The frontend is working correctly and displaying the data that exists in the database.

**This is a DATA ISSUE** caused by incorrect mapping in the data ingestion script. The `district_code` column is NULL for all members, which causes the filtering to fail at the district level.

**Impact:** Any filtering by District or Municipality will show 0 members until the data is corrected.

**Priority:** HIGH - This affects the core functionality of the members directory.

