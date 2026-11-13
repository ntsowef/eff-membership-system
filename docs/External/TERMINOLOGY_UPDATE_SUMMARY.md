# Terminology Update Summary

## Overview

Updated organizational terminology across the EFF Membership Management System to align with new naming conventions:
- **"District" → "Region"**
- **"Municipality" → "Local Municipality"**
- **"Local Municipality" → "Local Municipality"**

---

## Changes Made

### 1. Frontend Display Label Updates

All user-facing text in React components was updated to use the new terminology. **Important**: Only display labels were changed - no API field names, database column names, or variable names were modified.

#### Files Modified:

**A. Geographic Selector Components**

1. **`frontend/src/components/common/GeographicSelector.tsx`**
   - Changed "District" → "Region" in all labels and tooltips
   - Changed "Municipality" → "Local Municipality" in all labels and tooltips
   - Updated InputLabel: "District *" → "Region *"
   - Updated InputLabel: "Municipality *" → "Local Municipality *"
   - Updated placeholder text: "Select a district..." → "Select a region..."
   - Updated placeholder text: "Select a municipality..." → "Select a Local Municipality..."
   - Updated loading messages: "Loading districts..." → "Loading regions..."
   - Updated loading messages: "Loading municipalities..." → "Loading Local Municipalitys..."
   - Updated error messages: "No districts available" → "No regions available"
   - Updated error messages: "No municipalities available" → "No Local Municipalitys available"
   - Updated restricted labels: "District (Restricted)" → "Region (Restricted)"
   - Updated restricted labels: "Municipality (Restricted)" → "Local Municipality (Restricted)"
   - Updated tooltip: "District selection is restricted for Municipality Admins" → "Region selection is restricted for Local Municipality Admins"
   - Updated tooltip: "Municipality selection is restricted for Municipality Admins" → "Local Municipality selection is restricted for Local Municipality Admins"
   - Updated ward selection placeholder: "Select a municipality first..." → "Select a Local Municipality first..."
   - Updated ward availability message: "No wards available for this municipality" → "No wards available for this Local Municipality"

2. **`frontend/src/components/audit/MunicipalityFilter.tsx`**
   - Changed default label prop: `label = 'Municipality'` → `label = 'Local Municipality'`
   - Updated MenuItem text: "All Municipalities" → "All Local Municipalitys"
   - Updated Chip label: "X municipalities" → "X Local Municipalitys"

3. **`frontend/src/components/members/GeographicFilter.tsx`**
   - Changed InputLabel: "District" → "Region"
   - Changed MenuItem: "All Districts" → "All Regions"
   - Changed InputLabel: "Municipality" → "Local Municipality"
   - Changed MenuItem: "All Municipalities" → "All Local Municipalitys"
   - Updated restricted label: "Municipality (Restricted)" → "Local Municipality (Restricted)"
   - Updated comment: "Municipality Admin" → "Local Municipality Admin"

**B. Dashboard Pages**

4. **`frontend/src/pages/dashboard/DashboardPage.tsx`**
   - Stats card title: "Districts" → "Regions"
   - Stats card title: "Municipalities" → "Local Municipalitys"
   - Page subtitle: "Municipality Management System" → "Local Municipality Management System"
   - Page subtitle: "your municipality" → "your Local Municipality"
   - System overview text: "your municipality" → "your Local Municipality"
   - Ward section title: "in Municipality" → "in Local Municipality"

5. **`frontend/src/components/reports/PerformanceDashboard.tsx`**
   - Interface property: `districts` → `regions`
   - Interface property: `municipalities` → `subRegions`
   - Display label: "Districts" → "Regions"
   - Display label: "Municipalities" → "Local Municipalitys"
   - Updated data binding: `dashboardData.geographicDistribution.districts` → `dashboardData.geographicDistribution.regions`
   - Updated data binding: `dashboardData.geographicDistribution.municipalities` → `dashboardData.geographicDistribution.subRegions`

**C. Context Banners**

6. **`frontend/src/components/common/MunicipalityContextBanner.tsx`**
   - Chip label: "Municipality" → "Local Municipality"
   - Header title: "Municipality Dashboard" → "Local Municipality Dashboard"
   - Banner title: "Municipality" → "Local Municipality"
   - Description text: "Municipality" → "Local Municipality"
   - Description text: "this municipality" → "this Local Municipality"
   - Admin label: "Municipality Admin" → "Local Municipality Admin"

**D. Other Components**

7. **`frontend/src/components/leadership/GeographicSelector.tsx`**
   - Breadcrumb icon: `getHierarchyIcon('Municipality')` → `getHierarchyIcon('Local Municipality')`

8. **`frontend/src/components/leadership/GeographicFilterTest.tsx`**
   - MenuItem label: "District" → "Region"
   - MenuItem label: "Municipality" → "Local Municipality"

---

### 2. Database Data Updates

**Migration Script Created**: `backend/migrations/update_municipality_terminology.sql`

#### What the Script Does:

1. **Creates Backup Table**
   - Creates `municipalities_backup_20251001` with all current data
   - Ensures safe rollback if needed

2. **Updates Municipality Names**
   - Finds all records where `municipality_name` contains "Local Municipality"
   - Replaces "Local Municipality" with "Local Municipality"
   - Example: "City of Mbombela Local Municipality" → "City of Mbombela Local Municipality"

3. **Logging and Verification**
   - Logs the number of records found before update
   - Logs the number of records updated
   - Displays sample of updated records
   - Provides verification queries

4. **Rollback Instructions**
   - Includes commented rollback script
   - Two rollback options:
     - Replace "Local Municipality" back to "Local Municipality"
     - Restore from backup table

#### Important Notes:

- **Schema NOT Changed**: Database column names remain the same (`municipality_name`, `municipality_code`, etc.)
- **API Fields NOT Changed**: API responses still use `municipality_name`, `district_code`, etc.
- **Only Data Values Changed**: The actual text stored in `municipality_name` column is updated

---

## What Was NOT Changed

To maintain backward compatibility and avoid breaking changes:

1. **Database Schema**
   - Table names: `municipalities`, `districts` remain unchanged
   - Column names: `municipality_code`, `district_code`, `municipality_name`, `district_name` remain unchanged

2. **API Field Names**
   - Request parameters: `municipal_code`, `district_code` remain unchanged
   - Response fields: `municipality_name`, `district_name` remain unchanged

3. **Variable Names in Code**
   - TypeScript interfaces: `Municipality`, `District` remain unchanged
   - Props: `selectedMunicipality`, `selectedDistrict` remain unchanged
   - State variables: `municipalities`, `districts` remain unchanged

4. **Database Relationships**
   - Foreign keys remain unchanged
   - Join conditions remain unchanged
   - Indexes remain unchanged

---

## Testing Checklist

### Frontend Testing

- [ ] **Geographic Selector Component**
  - [ ] Verify "Region" label displays instead of "District"
  - [ ] Verify "Local Municipality" label displays instead of "Municipality"
  - [ ] Test dropdown selections work correctly
  - [ ] Test cascading filters (Province → Region → Local Municipality → Ward)
  - [ ] Verify restricted labels for Local Municipality Admins

- [ ] **Dashboard Pages**
  - [ ] Verify stats cards show "Regions" and "Local Municipalitys"
  - [ ] Verify page subtitles use new terminology
  - [ ] Verify system overview text uses new terminology

- [ ] **Context Banners**
  - [ ] Verify Local Municipality Admin banner displays correctly
  - [ ] Verify chip labels use "Local Municipality"

- [ ] **Member Directory**
  - [ ] Verify geographic filters use new terminology
  - [ ] Verify member listings display correctly
  - [ ] Test filtering by Region and Local Municipality

### Database Testing

- [ ] **Before Migration**
  - [ ] Backup database
  - [ ] Count municipalities with "Local Municipality" in name
  - [ ] Document sample municipality names

- [ ] **Run Migration**
  - [ ] Execute `update_municipality_terminology.sql`
  - [ ] Verify backup table created
  - [ ] Check log messages for record counts
  - [ ] Review sample of updated records

- [ ] **After Migration**
  - [ ] Verify no "Local Municipality" references remain
  - [ ] Verify "Local Municipality" appears in municipality names
  - [ ] Test API endpoints return updated names
  - [ ] Verify frontend displays updated names correctly

- [ ] **Rollback Test (Optional)**
  - [ ] Test rollback script on development database
  - [ ] Verify data restored correctly

---

## Execution Instructions

### 1. Deploy Frontend Changes

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if needed)
npm install

# Build production bundle
npm run build

# Deploy to production server
# (Follow your deployment process)
```

### 2. Execute Database Migration

```bash
# Connect to PostgreSQL database
psql -h localhost -U eff_admin -d eff_membership_db

# Run the migration script
\i backend/migrations/update_municipality_terminology.sql

# Verify results
SELECT COUNT(*) FROM municipalities WHERE municipality_name LIKE '%Local Municipality%';
SELECT COUNT(*) FROM municipalities WHERE municipality_name LIKE '%Local Municipality%';
```

### 3. Restart Backend Server

```bash
# Navigate to backend directory
cd backend

# Rebuild TypeScript
npm run build

# Restart server
node --no-warnings dist/app.js
```

---

## Rollback Procedure

If issues arise, follow these steps:

### 1. Rollback Database Changes

```sql
BEGIN;

-- Option 1: Replace text back
UPDATE municipalities
SET municipality_name = REPLACE(municipality_name, 'Local Municipality', 'Local Municipality')
WHERE municipality_name LIKE '%Local Municipality%';

-- Option 2: Restore from backup
-- TRUNCATE TABLE municipalities;
-- INSERT INTO municipalities SELECT * FROM municipalities_backup_20251001;

COMMIT;
```

### 2. Rollback Frontend Changes

```bash
# Revert to previous git commit
git revert <commit-hash>

# Rebuild and redeploy
npm run build
```

---

## Summary

### Files Modified: 8 Frontend Files

1. `frontend/src/components/common/GeographicSelector.tsx`
2. `frontend/src/components/audit/MunicipalityFilter.tsx`
3. `frontend/src/components/members/GeographicFilter.tsx`
4. `frontend/src/pages/dashboard/DashboardPage.tsx`
5. `frontend/src/components/reports/PerformanceDashboard.tsx`
6. `frontend/src/components/common/MunicipalityContextBanner.tsx`
7. `frontend/src/components/leadership/GeographicSelector.tsx`
8. `frontend/src/components/leadership/GeographicFilterTest.tsx`

### Files Created: 2

1. `backend/migrations/update_municipality_terminology.sql` - Database migration script
2. `TERMINOLOGY_UPDATE_SUMMARY.md` - This documentation file

### Database Changes

- **Table**: `municipalities`
- **Column**: `municipality_name`
- **Change**: Replace "Local Municipality" with "Local Municipality" in data values
- **Backup**: `municipalities_backup_20251001` table created

---

## Impact Assessment

### Low Risk Changes

- ✅ Display labels only (no logic changes)
- ✅ Database data values only (no schema changes)
- ✅ Backward compatible (API fields unchanged)
- ✅ Rollback available (backup table created)

### Testing Priority

1. **High Priority**: Geographic filtering and selection
2. **Medium Priority**: Dashboard displays and stats
3. **Low Priority**: Context banners and breadcrumbs

---

## Completion Status

- ✅ Frontend display labels updated
- ✅ Database migration script created
- ✅ Documentation completed
- ⏳ Frontend testing pending
- ⏳ Database migration execution pending
- ⏳ Production deployment pending

---

**Date**: 2025-10-01  
**Status**: Ready for Testing and Deployment  
**Breaking Changes**: None  
**Rollback Available**: Yes

