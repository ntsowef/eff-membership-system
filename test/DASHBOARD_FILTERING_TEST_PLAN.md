# Dashboard Filtering Test Plan

## Overview
This document outlines the testing plan for geographic filtering on admin dashboards to ensure each admin level sees only their authorized data.

## Test Environment
- **Backend URL**: http://localhost:5000
- **Frontend URL**: http://localhost:3000
- **Database**: PostgreSQL (localhost)

---

## Test Scenarios

### 1. National Admin Dashboard
**Expected Behavior**: National admin should see ALL data across all provinces.

**Test Steps**:
1. Login as National Admin
2. Navigate to Dashboard (http://localhost:3000/admin/dashboard)
3. Verify displayed statistics

**Expected Result**:
- ✅ Total members: Shows ALL members nationwide
- ✅ Provinces card: Shows "9" provinces
- ✅ Sub-Regions card: Shows total municipalities nationwide
- ✅ Wards card: Shows total wards nationwide
- ✅ Province breakdown: Shows all 9 provinces
- ✅ Top wards: Shows top wards from all provinces
- ✅ No geographic filter applied
- ✅ Can select province filter dropdown (optional filtering)

**Verification Query**:
```sql
-- Should match dashboard total
SELECT COUNT(*) FROM members_consolidated;
```

---

### 2. Provincial Admin Dashboard (e.g., Gauteng)
**Expected Behavior**: Provincial admin should see ONLY their province data.

**Test Steps**:
1. Login as Provincial Admin (e.g., Gauteng - GP)
2. Navigate to Dashboard
3. Verify displayed statistics

**Expected Result**:
- ✅ Page title: "Gauteng Province Dashboard"
- ✅ Province context banner visible: "Viewing: Gauteng Province"
- ✅ Total members: Shows ONLY Gauteng members
- ✅ No "Provinces" card shown
- ✅ Sub-Regions card: Shows municipalities in Gauteng only
- ✅ Wards card: Shows wards in Gauteng only
- ✅ Sub-regional breakdown: Shows Gauteng municipalities only
- ✅ Top wards: Shows top wards from Gauteng only
- ✅ Expired members: Shows Gauteng data only
- ✅ Cannot see other provinces' data

**Verification Query**:
```sql
-- Should match dashboard total for Gauteng
SELECT COUNT(*) FROM members_consolidated 
WHERE province_code = 'GP';

-- Should match sub-regions count
SELECT COUNT(DISTINCT municipality_code) 
FROM municipalities 
WHERE province_code = 'GP';
```

---

### 3. Municipality Admin Dashboard (e.g., City of Tshwane)
**Expected Behavior**: Municipality admin should see ONLY their municipality data.

**Test Steps**:
1. Login as Municipality Admin (e.g., City of Tshwane - TSH)
2. Navigate to Dashboard
3. Verify displayed statistics

**Expected Result**:
- ✅ Page title: "City of Tshwane Sub-Region Dashboard"
- ✅ Municipality context banner visible: "Viewing: City of Tshwane"
- ✅ Total members: Shows ONLY Tshwane members
- ✅ No "Provinces" card shown
- ✅ No "Sub-Regions" card shown
- ✅ Wards card: Shows wards in Tshwane only
- ✅ Ward breakdown: Shows Tshwane wards only
- ✅ Municipality overview section visible
- ✅ Top wards: Shows top wards from Tshwane only
- ✅ Expired members: Shows Tshwane data only
- ✅ Cannot see other municipalities' data

**Verification Query**:
```sql
-- Should match dashboard total for Tshwane
SELECT COUNT(*) FROM members_consolidated 
WHERE municipality_code = 'TSH';

-- Should match wards count
SELECT COUNT(DISTINCT ward_code) 
FROM wards 
WHERE municipality_code = 'TSH';
```

---

### 4. Ward Admin Dashboard
**Expected Behavior**: Ward admin should see ONLY their ward data.

**Test Steps**:
1. Login as Ward Admin (e.g., Ward 12345678)
2. Navigate to Dashboard
3. Verify displayed statistics

**Expected Result**:
- ✅ Page title: "Ward Dashboard"
- ✅ Ward context visible
- ✅ Total members: Shows ONLY ward members
- ✅ No province/municipality/ward cards shown
- ✅ Ward-specific statistics only
- ✅ Cannot see other wards' data

**Verification Query**:
```sql
-- Should match dashboard total for ward
SELECT COUNT(*) FROM members_consolidated 
WHERE ward_code = '12345678';
```

---

## Expired Members Section Testing

### 5. National Admin - Expired Members
**Test Steps**:
1. Login as National Admin
2. Scroll to "Expired Members" section

**Expected Result**:
- ✅ National summary shows all expired members
- ✅ Province breakdown shows all 9 provinces
- ✅ Can see expired counts per province
- ✅ Shows top 5 provinces by expired members

---

### 6. Provincial Admin - Expired Members
**Test Steps**:
1. Login as Provincial Admin (e.g., Gauteng)
2. Scroll to "Expired Members" section

**Expected Result**:
- ✅ Summary shows ONLY Gauteng expired members
- ✅ Province breakdown shows ONLY Gauteng
- ✅ Sub-regional breakdown shows Gauteng municipalities
- ✅ Shows top 10 sub-regions by expired members
- ✅ No other provinces visible

**Verification Query**:
```sql
-- Should match expired count for Gauteng
SELECT COUNT(*) FROM members_consolidated 
WHERE province_code = 'GP' 
AND expiry_date < CURRENT_DATE;
```

---

### 7. Municipality Admin - Expired Members
**Test Steps**:
1. Login as Municipality Admin (e.g., Tshwane)
2. Scroll to "Expired Members" section

**Expected Result**:
- ✅ Summary shows ONLY Tshwane expired members
- ✅ Municipality breakdown shows ONLY Tshwane
- ✅ Ward breakdown shows Tshwane wards
- ✅ Shows wards sorted by expired count
- ✅ No other municipalities visible

**Verification Query**:
```sql
-- Should match expired count for Tshwane
SELECT COUNT(*) FROM members_consolidated 
WHERE municipality_code = 'TSH' 
AND expiry_date < CURRENT_DATE;
```

---

## API Endpoint Testing

### 8. Dashboard Statistics API
**Test for Provincial Admin**:
```bash
# Login as Provincial Admin and get token
TOKEN="<provincial_admin_token>"

# Test dashboard endpoint
curl -X GET "http://localhost:5000/api/v1/statistics/dashboard" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Result**:
- ✅ Returns only province-specific data
- ✅ No national data included
- ✅ Geographic filter automatically applied

---

### 9. Expired Members API
**Test for Municipality Admin**:
```bash
# Login as Municipality Admin and get token
TOKEN="<municipality_admin_token>"

# Test expired members endpoint
curl -X GET "http://localhost:5000/api/v1/statistics/expired-members" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Result**:
- ✅ Returns only municipality-specific data
- ✅ Ward breakdown included
- ✅ `filtered_by_municipality: true`
- ✅ No other municipalities' data

---

## Members List Testing

### 10. National Admin - Members List
**Test Steps**:
1. Login as National Admin
2. Navigate to Members page (http://localhost:3000/admin/members)

**Expected Result**:
- ✅ Shows ALL members from all provinces
- ✅ Can filter by province (optional)
- ✅ Can filter by municipality (optional)
- ✅ Pagination works correctly

---

### 11. Provincial Admin - Members List
**Test Steps**:
1. Login as Provincial Admin (e.g., Gauteng)
2. Navigate to Members page

**Expected Result**:
- ✅ Shows ONLY Gauteng members
- ✅ Cannot see members from other provinces
- ✅ Province filter pre-selected and locked
- ✅ Can filter by municipality within Gauteng
- ✅ Pagination works correctly

---

### 12. Municipality Admin - Members List
**Test Steps**:
1. Login as Municipality Admin (e.g., Tshwane)
2. Navigate to Members page

**Expected Result**:
- ✅ Shows ONLY Tshwane members
- ✅ Cannot see members from other municipalities
- ✅ Municipality filter pre-selected and locked
- ✅ Can filter by ward within Tshwane
- ✅ Pagination works correctly

---

## Success Criteria
- ✅ Each admin level sees only their authorized data
- ✅ No data leakage between geographic areas
- ✅ API endpoints respect geographic filtering
- ✅ Frontend displays correct context banners
- ✅ Database queries use correct WHERE clauses
- ✅ Middleware applies geographic filters automatically
- ✅ No errors in browser console
- ✅ No errors in backend logs

---

## Common Issues to Check
- ❌ Provincial admin seeing national data
- ❌ Municipality admin seeing other municipalities
- ❌ Ward admin seeing other wards
- ❌ Missing geographic context in API responses
- ❌ Incorrect member counts
- ❌ Missing sub-regional/ward breakdowns

