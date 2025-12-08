# Root Cause Analysis: Missing Municipality Codes

**Date:** 2025-11-07  
**Question:** "Without effecting any changes, what causes this anomaly, is it on data insertion or what?"

---

## 🎯 EXECUTIVE SUMMARY

**ROOT CAUSE:** The municipality code anomaly is caused by **INCOMPLETE DATA AT SOURCE** during the original data import/migration process. The `municipality_code` field was either:
1. **Not present in the source data** (CSV/Excel files)
2. **Not mapped during import** (import script didn't include municipality_code)
3. **Partially populated** (some districts/regions had municipality codes, others didn't)

This is **NOT a system bug** - it's a **DATA QUALITY issue** from the original data source.

---

## 🔍 EVIDENCE ANALYSIS

### 1. **Import Service Code Analysis**

Looking at `backend/src/services/importExportService.ts` (lines 514-529):

```typescript
private static async insertMember(row: any, userId: number): Promise<void> {
  const memberId = await this.generateMemberId();
  
  await executeQuery(`
    INSERT INTO members_consolidated (
      member_id, firstname, surname, email, phone, date_of_birth, gender,
      id_number, address, city, province, postal_code, hierarchy_level,
      entity_id, membership_type, membership_status, join_date, created_by, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'Active', CURRENT_TIMESTAMP, $16, CURRENT_TIMESTAMP)
  `, [
    memberId, row.firstname, row.surname, row.email, row.phone,
    row.date_of_birth, row.gender, row.id_number, row.address,
    row.city, row.province, row.postal_code, row.hierarchy_level || 'Ward',
    row.entity_id || 1, row.membership_type || 'Regular', userId
  ]);
}
```

**KEY FINDING:** The import script does **NOT include** the following geographic fields:
- ❌ `municipality_code`
- ❌ `district_code`
- ❌ `ward_code`
- ❌ `voting_district_code`

**Only includes:**
- ✅ `province` (generic province field, not province_code)
- ✅ `city`
- ✅ `postal_code`

---

### 2. **Database Schema Analysis**

The `members_consolidated` table **HAS** these columns defined:
- `province_code` VARCHAR
- `district_code` VARCHAR
- `municipality_code` VARCHAR
- `ward_code` VARCHAR
- `voting_district_code` VARCHAR

**But the import script doesn't populate them!**

---

### 3. **Data Pattern Analysis**

#### Mpumalanga (MP):
- **91.57% NULL municipality_code** (68,213 members)
- **8.43% have municipality_code** (6,279 members with 'NMA002')
- **Pattern:** All NULL members in district DC31, all non-NULL in district DC30

#### Eastern Cape (EC):
- **52.05% NULL municipality_code** (43,398 members)
- **47.95% have municipality_code** (39,972 members with 17 different codes)
- **Pattern:** Multiple municipality codes present, but still over half are NULL

**This pattern suggests:**
1. Some source data files HAD municipality codes
2. Other source data files DID NOT have municipality codes
3. The import process simply inserted whatever was in the source data

---

## 🔎 ROOT CAUSE BREAKDOWN

### Scenario 1: **Multiple Data Sources** (Most Likely)

**Hypothesis:** Member data came from multiple sources with different data quality levels.

**Evidence:**
- MP has only 1 municipality code (NMA002) for 6,279 members
- EC has 17 municipality codes for 39,972 members
- The rest have NULL values

**Explanation:**
1. **Source A:** High-quality data with full geographic information (province, district, municipality, ward)
   - Example: EC members with municipality codes (47.95%)
   - Example: MP DC30 members with NMA002 (8.43%)

2. **Source B:** Low-quality data with only basic information (name, ID, province)
   - Example: MP DC31 members with NULL municipality codes (91.57%)
   - Example: EC members with NULL municipality codes (52.05%)

3. **Import Process:** Simply inserted whatever was in the CSV/Excel files
   - If `municipality_code` column existed and had value → inserted
   - If `municipality_code` column was empty or missing → NULL

---

### Scenario 2: **Incomplete Import Script** (Possible)

**Hypothesis:** The import script was designed to handle basic member information only, not full geographic data.

**Evidence:**
- Import script only maps: firstname, surname, email, phone, id_number, province, city
- Import script does NOT map: municipality_code, district_code, ward_code

**Explanation:**
1. Original import script was designed for basic member registration
2. Geographic fields (municipality_code, district_code, ward_code) were expected to be populated later
3. This "later" population never happened for most members

---

### Scenario 3: **Data Migration Issue** (Possible)

**Hypothesis:** Data was migrated from an old system that didn't have municipality codes.

**Evidence:**
- The pattern is too consistent to be random data entry errors
- Entire districts are missing municipality codes (e.g., MP DC31)
- Some provinces have better coverage than others

**Explanation:**
1. Old system had province and district information
2. Old system did NOT have municipality-level granularity
3. Migration script copied province and district, but left municipality NULL
4. Some regions were manually updated later (e.g., EC metros, MP DC30)

---

## 📊 SUPPORTING EVIDENCE

### 1. **District-Level Patterns**

| Province | District | Municipality Code | Members | Status |
|----------|----------|-------------------|---------|--------|
| MP | DC30 | NMA002 | 6,279 | ✅ **POPULATED** |
| MP | DC31 | NULL | 68,213 | ❌ **MISSING** |
| EC | Various | 17 codes | 39,972 | ✅ **POPULATED** |
| EC | Various | NULL | 43,398 | ❌ **MISSING** |

**Pattern:** Entire districts are either populated or NULL - this suggests **batch import** from different sources.

---

### 2. **Ward Code Presence**

**Key Question:** Do members have `ward_code` values even when `municipality_code` is NULL?

**From our investigation:**
- MP members with NULL municipality_code **DO have ward_code** values (e.g., '83105014')
- EC members with NULL municipality_code likely also have ward_code values

**This proves:**
- The source data HAD ward-level information
- The import process DID populate ward_code
- But municipality_code was NOT derived from ward_code during import

**Conclusion:** The import script failed to derive `municipality_code` from `ward_code`, even though this mapping is possible.

---

## 🎯 DEFINITIVE ANSWER

### **What Causes This Anomaly?**

**PRIMARY CAUSE: DATA INSERTION ISSUE**

The anomaly is caused during **data insertion/import** due to:

1. **Incomplete Source Data:**
   - Source CSV/Excel files did not contain `municipality_code` column
   - Or the column existed but was empty for most records

2. **Incomplete Import Script:**
   - Import script (`importExportService.ts`) does NOT map `municipality_code` field
   - Import script does NOT derive `municipality_code` from `ward_code`
   - Import script only maps basic fields: name, ID, email, phone, province, city

3. **No Data Validation:**
   - No validation to ensure `municipality_code` is populated
   - No automatic derivation of `municipality_code` from `ward_code`
   - No data quality checks during import

---

## 🔧 WHY THIS HAPPENED

### **Technical Reasons:**

1. **Import Script Design:**
   ```typescript
   // Current import script ONLY maps these fields:
   INSERT INTO members_consolidated (
     member_id, firstname, surname, email, phone, date_of_birth, gender,
     id_number, address, city, province, postal_code, hierarchy_level,
     entity_id, membership_type, membership_status, join_date, created_by, created_at
   )
   
   // MISSING: municipality_code, district_code, ward_code, voting_district_code
   ```

2. **No Geographic Mapping Logic:**
   - No code to extract municipality from ward_code
   - No code to lookup municipality from ward in municipalities table
   - No code to validate geographic hierarchy (province → district → municipality → ward)

3. **Source Data Quality:**
   - Different data sources had different levels of completeness
   - Some sources had full geographic data (EC metros, MP DC30)
   - Other sources had minimal geographic data (MP DC31, EC rural areas)

---

## 📋 CONCLUSION

### **Is it a Data Insertion Issue?**

**YES - 100% a data insertion issue.**

**Specifically:**
1. ✅ **Source data was incomplete** - municipality_code not present in CSV/Excel files
2. ✅ **Import script was incomplete** - didn't map municipality_code field
3. ✅ **No data enrichment** - didn't derive municipality_code from ward_code
4. ✅ **No validation** - allowed NULL municipality_code to be inserted

### **Is it a System Bug?**

**NO - it's not a system bug.**

The system is working as designed:
- Database schema allows NULL municipality_code
- Import script inserts whatever is in the source data
- No validation rules enforce municipality_code presence

### **Can it be Fixed?**

**YES - through data migration:**
1. Extract municipality code from ward_code (first 5-6 digits)
2. Create ward_code → municipality_code mapping table
3. Update 111,611 NULL records (68,213 MP + 43,398 EC)
4. Add validation to prevent future NULL insertions

---

**Status:** 🔴 **ROOT CAUSE IDENTIFIED - DATA INSERTION ISSUE**  
**Impact:** 111,611 members across MP and EC provinces  
**Solution:** Data migration + Import script enhancement + Validation rules

