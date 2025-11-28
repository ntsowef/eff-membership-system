# Ward Audit System - Testing Guide

## 🎯 Overview

This guide provides step-by-step instructions for testing the Ward Audit System, including database setup, API testing, and UI testing.

---

## 📋 Prerequisites

1. **Backend server running** on `http://localhost:5000`
2. **Frontend server running** on `http://localhost:3000`
3. **PostgreSQL database** running with all migrations applied
4. **Valid authentication token** for API testing
5. **User account** with National or Provincial Admin role

---

## 🗄️ Step 1: Database Setup

### 1.1 Apply Permissions Migration

```bash
# Copy the permissions SQL file to the Docker container
docker cp backend/migrations/ward_audit_permissions.sql eff-membership-postgres:/tmp/ward_audit_permissions.sql

# Execute the permissions migration
docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db -f /tmp/ward_audit_permissions.sql
```

### 1.2 Verify Permissions

```sql
-- Check that permissions were created
SELECT * FROM permissions WHERE category = 'Ward Audit';

-- Check role assignments
SELECT 
  r.role_name,
  p.permission_name
FROM roles r
JOIN role_permissions rp ON r.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
WHERE p.category = 'Ward Audit'
ORDER BY r.role_name, p.permission_name;
```

### 1.3 Verify Database Views

```sql
-- Check ward compliance summary view
SELECT * FROM vw_ward_compliance_summary LIMIT 5;

-- Check voting district compliance view
SELECT * FROM vw_voting_district_compliance LIMIT 10;

-- Check assembly types
SELECT * FROM assembly_types;
```

---

## 🔌 Step 2: API Testing

### 2.1 Get Authentication Token

```bash
# Login to get token
curl -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin@example.com",
    "password": "your-password"
  }'

# Save the token from the response
export TOKEN="your-jwt-token-here"
```

### 2.2 Test Geographic Filtering Endpoints

```bash
# Test 1: Get municipalities by province (Gauteng)
curl -X GET "http://localhost:5000/api/v1/ward-audit/municipalities?province_code=GP" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: List of municipalities and subregions in Gauteng
# Should include: JHB, JHB001-JHB007, TSH, TSH-1 to TSH-6, EKU, etc.

# Test 2: Get wards by municipality (Johannesburg)
curl -X GET "http://localhost:5000/api/v1/ward-audit/wards?municipality_code=JHB" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: List of wards with compliance data
```

### 2.3 Test Ward Compliance Endpoints

```bash
# Test 3: Get ward compliance details
curl -X GET "http://localhost:5000/api/v1/ward-audit/ward/79790001/compliance" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: Detailed compliance data for ward 79790001

# Test 4: Get voting district compliance
curl -X GET "http://localhost:5000/api/v1/ward-audit/ward/79790001/voting-districts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: List of voting districts with member counts
```

### 2.4 Test Approval Endpoint

```bash
# Test 5: Approve ward compliance (only if criterion 1 is met)
curl -X POST "http://localhost:5000/api/v1/ward-audit/ward/79790001/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Ward meets all compliance criteria. Approved for assembly participation."
  }'

# Expected: Success response if criterion 1 is met
# Expected: Error 400 if criterion 1 is not met
```

### 2.5 Test Delegate Endpoints

```bash
# Test 6: Get assembly types
curl -X GET "http://localhost:5000/api/v1/ward-audit/assembly-types" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: List of 5 assembly types (SRPA, PPA, NPA, BPA, BGA)

# Test 7: Get ward delegates
curl -X GET "http://localhost:5000/api/v1/ward-audit/ward/79790001/delegates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: List of delegates for the ward (may be empty initially)

# Test 8: Assign a delegate (requires valid member_id from the ward)
curl -X POST "http://localhost:5000/api/v1/ward-audit/delegates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ward_code": "79790001",
    "member_id": 12345,
    "assembly_code": "SRPA",
    "selection_method": "Elected",
    "term_start_date": "2025-01-01",
    "term_end_date": "2026-12-31",
    "notes": "Elected at ward meeting on 2025-01-15"
  }'

# Expected: Success response with delegate_id
```

### 2.6 Test Municipality Report Endpoint

```bash
# Test 9: Get municipality delegate report
curl -X GET "http://localhost:5000/api/v1/ward-audit/municipality/JHB/delegates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: Aggregate report with all wards in Johannesburg
```

---

## 🖥️ Step 3: UI Testing

### 3.1 Access Ward Audit Dashboard

1. **Login** to the system with National or Provincial Admin account
2. **Navigate** to sidebar → "Ward Audit System" → "Ward Compliance"
3. **Verify** the dashboard loads without errors

### 3.2 Test Cascading Filters

1. **Select Province**: Choose "Gauteng" from the province dropdown
2. **Verify**: Municipality dropdown populates with Gauteng municipalities
3. **Select Municipality**: Choose "City of Johannesburg" or a subregion (e.g., "JHB001")
4. **Verify**: Ward table populates with wards from the selected municipality
5. **Check Statistics**: Verify the statistics cards show correct counts

### 3.3 Test Ward Compliance Detail

1. **Click** the eye icon on any ward in the table
2. **Verify**: Ward compliance detail page loads
3. **Check Criteria**: Verify all 5 criteria are displayed with pass/fail indicators
4. **Check VD Table**: Verify voting district breakdown table shows correct data
5. **Test Approval**: If criterion 1 is met, click "Approve Ward Compliance"
6. **Verify**: Approval dialog opens, enter notes, and submit
7. **Check Update**: Verify ward status updates to "Approved"

### 3.4 Test Municipality Report

1. **Return** to Ward Audit Dashboard
2. **Select** a province and municipality
3. **Click** "View Municipality Report" button
4. **Verify**: Municipality report page loads
5. **Check Statistics**: Verify summary cards show correct data
6. **Check Delegate Breakdown**: Verify SRPA/PPA/NPA delegate counts
7. **Check Ward Table**: Verify ward-by-ward breakdown table

### 3.5 Test Navigation

1. **Test Back Navigation**: Click back arrow to return to previous page
2. **Test Sidebar Navigation**: Click "Ward Compliance" in sidebar
3. **Test Ward Links**: Click eye icon in municipality report to view ward details

---

## ✅ Expected Results

### Database
- ✅ 3 permissions created in `permissions` table
- ✅ Permissions assigned to National Admin and Provincial Admin roles
- ✅ Views return data correctly

### API Endpoints
- ✅ All 9 endpoints return 200 status with valid data
- ✅ Authentication required for all endpoints
- ✅ Permission checks work correctly
- ✅ Validation errors return 400 with clear messages
- ✅ Approval only works when criterion 1 is met

### UI Components
- ✅ Dashboard loads without errors
- ✅ Cascading filters work correctly
- ✅ Statistics calculate correctly
- ✅ Ward compliance detail shows all criteria
- ✅ Approval workflow functions correctly
- ✅ Municipality report displays aggregate data
- ✅ Navigation works smoothly
- ✅ Loading states display correctly
- ✅ Error messages are user-friendly

---

## 🐛 Troubleshooting

### Issue: "Permission denied" errors

**Solution**: Ensure permissions are added to database and assigned to your role:
```sql
SELECT * FROM permissions WHERE category = 'Ward Audit';
SELECT * FROM role_permissions WHERE permission_id IN (
  SELECT permission_id FROM permissions WHERE category = 'Ward Audit'
);
```

### Issue: Empty municipality dropdown

**Solution**: Check that the province code is correct and municipalities exist:
```sql
SELECT * FROM municipalities WHERE district_code IN (
  SELECT district_code FROM districts WHERE province_code = 'GP'
);
```

### Issue: Ward compliance shows 0 members

**Solution**: Verify members are assigned to the ward:
```sql
SELECT COUNT(*) FROM members WHERE ward_code = '79790001';
```

### Issue: Cannot approve ward

**Solution**: Check criterion 1 compliance:
```sql
SELECT * FROM vw_ward_compliance_summary WHERE ward_code = '79790001';
```

---

## 📊 Test Data Queries

### Find a compliant ward for testing approval:
```sql
SELECT 
  ward_code,
  ward_name,
  total_members,
  compliant_voting_districts,
  total_voting_districts,
  criterion_1_compliant
FROM vw_ward_compliance_summary
WHERE criterion_1_compliant = TRUE
  AND is_compliant = FALSE
LIMIT 5;
```

### Find members in a ward for delegate assignment:
```sql
SELECT 
  member_id,
  first_name,
  last_name,
  membership_number
FROM members
WHERE ward_code = '79790001'
  AND membership_status = 'Active'
LIMIT 10;
```

---

## 🎉 Success Criteria

The Ward Audit System is working correctly if:

1. ✅ All API endpoints return expected data
2. ✅ Cascading filters populate correctly
3. ✅ Ward compliance criteria display accurately
4. ✅ Approval workflow functions as expected
5. ✅ Municipality reports show aggregate data
6. ✅ Navigation works smoothly
7. ✅ No console errors in browser
8. ✅ No TypeScript compilation errors
9. ✅ Permission checks prevent unauthorized access
10. ✅ Data updates reflect immediately in UI

---

**Happy Testing! 🚀**

