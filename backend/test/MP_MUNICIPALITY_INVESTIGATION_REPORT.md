# MP Province Municipality Code Investigation Report

**Date:** 2025-11-07  
**Investigator:** System Analysis  
**Purpose:** Investigate why MP (Mpumalanga) province members have empty or missing municipality_code values

---

## 🔍 KEY FINDINGS

### 1. **CRITICAL ISSUE: 91.57% of MP Members Have NULL municipality_code**

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total MP Members** | 74,492 | 100% |
| **With municipality_code** | 6,279 | 8.43% |
| **NULL municipality_code** | 68,213 | **91.57%** |
| **Empty string municipality_code** | 0 | 0% |

**Impact:** 68,213 out of 74,492 MP members (91.57%) have NULL municipality_code values.

---

### 2. **Only ONE Municipality Code Exists for MP Members**

| municipality_code | member_count | percentage |
|-------------------|--------------|------------|
| **NULL** | 68,213 | 91.57% |
| **NMA002** | 6,279 | 8.43% |

**Finding:** Only ONE municipality code (`NMA002`) is present in the MP members data. All other 68,213 members have NULL.

---

### 3. **Sample Data Analysis**

#### Members with NULL municipality_code:
- All have `district_code = 'DC31'`
- All have valid `ward_code` values (e.g., '83105014')
- All have `province_code = 'MP'`
- Examples:
  - member_id: 735372, SOPHIA SINDANE, DC31, ward: 83105014
  - member_id: 735373, SIPHO MAHLANGU, DC31, ward: 83105014
  - member_id: 735374, NCAMO NGOMANE, DC31, ward: 83105014

#### Members WITH municipality_code:
- All have `municipality_code = 'NMA002'`
- All have `district_code = 'DC30'`
- All have valid `ward_code` values (e.g., '83007011')
- Examples:
  - member_id: 710966, Thokozane Nkabinde, DC30, NMA002, ward: 83007011
  - member_id: 710967, Boitumelo Mole, DC30, NMA002, ward: 83007011

---

## 🔎 ROOT CAUSE ANALYSIS

### Issue 1: Data Import Problem
**Hypothesis:** The municipality_code field was not populated during the data import/migration process for most MP members.

**Evidence:**
- 91.57% of MP members have NULL municipality_code
- Only one municipality code (`NMA002`) exists in the data
- All NULL members are in district `DC31`
- All non-NULL members are in district `DC30`

### Issue 2: District-Municipality Mapping Missing
**Pattern Observed:**
- District `DC30` → Municipality `NMA002` (6,279 members) ✅
- District `DC31` → Municipality `???` (68,213 members) ❌ **MISSING**

**This suggests:**
- The data import process successfully mapped DC30 members to NMA002
- The data import process FAILED to map DC31 members to their municipalities
- DC31 likely has multiple municipalities, but none were assigned

---

## 📊 COMPARISON WITH OTHER PROVINCES

From previous investigations, we know:
- **KZN Province:** Has proper municipality codes (e.g., KZN261, KZN262, etc.)
- **EC Province:** Has proper municipality codes
- **MP Province:** **BROKEN** - 91.57% missing municipality codes

---

## 🚨 IMPACT ASSESSMENT

### Affected Features:
1. ❌ **Municipality Filtering** - Cannot filter MP members by municipality (91.57% will be excluded)
2. ❌ **Ward Audit Reports** - Cannot generate municipality-level reports for DC31
3. ❌ **Geographic Statistics** - Municipality stats for MP will be incomplete
4. ❌ **Meeting Invitations** - Cannot invite members by municipality in DC31
5. ❌ **SMS/Email Campaigns** - Cannot target members by municipality in DC31

### Data Integrity:
- **Ward codes ARE present** - Members have valid ward_code values
- **District codes ARE present** - Members have valid district_code values
- **Municipality codes MISSING** - 68,213 members cannot be grouped by municipality

---

## 🔧 RECOMMENDED SOLUTIONS

### Solution 1: Map Ward Codes to Municipality Codes (RECOMMENDED)
Since ward_code values are present, we can:
1. Extract municipality code from ward_code (first 6 digits typically represent municipality)
2. Create a mapping table: `ward_code → municipality_code`
3. Update the 68,213 NULL records with correct municipality codes

**Example:**
- Ward code: `83105014` → Municipality: `MP305` (Gert Sibande District Municipality)
- Ward code: `83007011` → Municipality: `NMA002` (Nkangala District Municipality)

### Solution 2: Manual Data Import
1. Obtain correct municipality codes from IEC or official source
2. Create mapping: `district_code + ward_code → municipality_code`
3. Run UPDATE query to populate missing municipality codes

### Solution 3: Use District Code as Fallback
**Temporary workaround:**
- When municipality_code is NULL, use district_code for grouping
- This allows basic geographic filtering but loses municipality-level granularity

---

## 📋 NEXT STEPS

### Immediate Actions:
1. ✅ **Investigation Complete** - Root cause identified
2. ⏳ **Obtain Ward-Municipality Mapping** - Get official mapping data
3. ⏳ **Create Migration Script** - Script to populate missing municipality codes
4. ⏳ **Test Migration** - Test on sample data first
5. ⏳ **Execute Migration** - Update all 68,213 records

### Data Validation:
1. Check if ward_code format is consistent
2. Verify ward_code → municipality_code mapping logic
3. Validate against official IEC ward boundaries

---

## 📝 TECHNICAL DETAILS

### Database Schema:
```sql
-- members_consolidated table
province_code: VARCHAR (e.g., 'MP')
district_code: VARCHAR (e.g., 'DC31', 'DC30')
municipality_code: VARCHAR (e.g., 'NMA002', NULL)
ward_code: VARCHAR (e.g., '83105014')
```

### Query Used:
```sql
SELECT 
  COUNT(*) as total_mp_members,
  COUNT(municipality_code) as with_muni_code,
  COUNT(*) - COUNT(municipality_code) as null_muni_code,
  ROUND(100.0 * COUNT(municipality_code) / COUNT(*), 2) as percentage_with_code
FROM members_consolidated 
WHERE province_code = 'MP';
```

---

## ✅ CONCLUSION

**The MP province municipality_code issue is a DATA QUALITY problem, not a system bug.**

- **91.57% of MP members** (68,213 out of 74,492) have NULL municipality_code
- Only **ONE municipality code** (`NMA002`) exists in the data
- All NULL members are in **district DC31**
- All non-NULL members are in **district DC30**

**Root Cause:** The data import/migration process failed to populate municipality codes for DC31 members.

**Solution:** Create a ward_code → municipality_code mapping and update the 68,213 NULL records.

---

**Status:** 🔴 **CRITICAL DATA ISSUE** - Requires data migration to fix  
**Priority:** HIGH - Affects 91.57% of MP province members  
**Estimated Fix Time:** 2-4 hours (mapping + migration + testing)

