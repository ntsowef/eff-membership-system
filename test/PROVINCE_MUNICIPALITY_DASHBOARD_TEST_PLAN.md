# Province and Municipality Admin Dashboard Test Plan

## Test Environment Setup

### Prerequisites
- Backend server running on port 5000
- Frontend server running on port 3000
- PostgreSQL database with test data
- Test accounts for each admin level:
  - National Admin
  - Province Admin (multiple provinces)
  - Municipality Admin (multiple municipalities)

## Test Cases

### 1. Province Admin Dashboard Tests

#### Test 1.1: Province Admin Login and Dashboard Access
**Steps:**
1. Login as Province Admin (e.g., Gauteng Province Admin)
2. Navigate to dashboard
3. Verify dashboard loads successfully

**Expected Results:**
- Dashboard displays without errors
- Page title shows province name (e.g., "Gauteng Province Dashboard")
- Province filter chip is visible showing assigned province

#### Test 1.2: Province-Specific Statistics
**Steps:**
1. Login as Province Admin
2. Check the statistics cards at the top of dashboard

**Expected Results:**
- Total members count shows only members from assigned province
- Active members count is province-specific
- Pending applications count is province-specific
- No national-level statistics are shown

#### Test 1.3: Expired Members Section - Province Summary
**Steps:**
1. Scroll to "Expired Members Overview" section
2. Check the summary statistics

**Expected Results:**
- Expired members count is province-specific
- Expiring soon count is province-specific
- Expiring urgent count is province-specific
- Total members count matches province total
- Province filter chip is visible (e.g., "Gauteng Only")

#### Test 1.4: Sub-Regional Breakdown Display
**Steps:**
1. Scroll to "Sub-Regional Breakdown" section
2. Verify the section is visible and populated

**Expected Results:**
- Section title shows "Sub-Regional Breakdown (Province Name)"
- List displays municipalities within the province
- Top 10 municipalities are shown (sorted by expired/expiring count)
- Each municipality shows:
  - Municipality name
  - Expired count (red chip)
  - Expiring soon count (warning chip)
  - Risk percentage
  - Total members count
  - Color-coded progress bar

#### Test 1.5: Metro Municipality Exclusion
**Steps:**
1. Check sub-regional breakdown for provinces with Metro Municipalities (e.g., Gauteng)
2. Verify Metro Municipalities are excluded

**Expected Results:**
- Parent Metro Municipalities (e.g., City of Johannesburg) are NOT shown
- Only Local Municipalities and Metro sub-regions are shown
- Consistent with Daily Report Metro Municipality fix

#### Test 1.6: No National-Level Data
**Steps:**
1. Review entire dashboard
2. Check for any national-level aggregations

**Expected Results:**
- No "Province Breakdown" section is visible
- No national-level charts or statistics
- All data is filtered to assigned province only

### 2. Municipality Admin Dashboard Tests

#### Test 2.1: Municipality Admin Login and Dashboard Access
**Steps:**
1. Login as Municipality Admin (e.g., City of Tshwane Municipality Admin)
2. Navigate to dashboard
3. Verify dashboard loads successfully

**Expected Results:**
- Dashboard displays without errors
- Page title shows municipality name (e.g., "City of Tshwane Municipality Dashboard")
- Municipality filter chip is visible showing assigned municipality

#### Test 2.2: Municipality-Specific Statistics
**Steps:**
1. Login as Municipality Admin
2. Check the statistics cards at the top of dashboard

**Expected Results:**
- Total members count shows only members from assigned municipality
- Active members count is municipality-specific
- Pending applications count is municipality-specific
- No province or national-level statistics are shown

#### Test 2.3: Expired Members Section - Municipality Summary
**Steps:**
1. Scroll to "Expired Members Overview" section
2. Check the summary statistics

**Expected Results:**
- Expired members count is municipality-specific
- Expiring soon count is municipality-specific
- Expiring urgent count is municipality-specific
- Total members count matches municipality total
- Municipality filter chip is visible (e.g., "City of Tshwane Only")

#### Test 2.4: Ward Breakdown Display
**Steps:**
1. Scroll to "Ward Breakdown" section
2. Verify the section is visible and populated

**Expected Results:**
- Section title shows "Ward Breakdown (Municipality Name)"
- List displays wards within the municipality
- Top 10 wards are shown (sorted by expired/expiring count)
- Each ward shows:
  - Ward name
  - Expired count (red chip)
  - Expiring soon count (warning chip)
  - Risk percentage
  - Total members count
  - Color-coded progress bar

#### Test 2.5: No Province or National-Level Data
**Steps:**
1. Review entire dashboard
2. Check for any province or national-level aggregations

**Expected Results:**
- No "Province Breakdown" section is visible
- No "Sub-Regional Breakdown" section is visible
- No province or national-level charts or statistics
- All data is filtered to assigned municipality only

### 3. Cross-Role Comparison Tests

#### Test 3.1: Data Consistency Across Admin Levels
**Steps:**
1. Login as National Admin and note total members for a specific province
2. Login as Province Admin for that province and note total members
3. Compare the numbers

**Expected Results:**
- Province Admin total should match the province total from National Admin view
- Data should be consistent across admin levels

#### Test 3.2: Geographic Filtering Verification
**Steps:**
1. Login as Province Admin for Province A
2. Note the municipalities shown in sub-regional breakdown
3. Verify all municipalities belong to Province A only

**Expected Results:**
- All municipalities in sub-regional breakdown belong to assigned province
- No municipalities from other provinces are shown

### 4. Edge Cases and Error Handling

#### Test 4.1: Province with No Municipalities
**Steps:**
1. Login as Province Admin for a province with no municipalities (if exists)
2. Check sub-regional breakdown section

**Expected Results:**
- Section either shows empty state or is hidden
- No errors are displayed
- Dashboard remains functional

#### Test 4.2: Municipality with No Wards
**Steps:**
1. Login as Municipality Admin for a municipality with no wards (if exists)
2. Check ward breakdown section

**Expected Results:**
- Section either shows empty state or is hidden
- No errors are displayed
- Dashboard remains functional

## Database Verification Queries

### Verify Province Admin Data
```sql
-- Check total members for a province
SELECT COUNT(*) FROM members_consolidated WHERE province_code = 'GP';

-- Check expired members for a province
SELECT COUNT(*) FROM members_consolidated 
WHERE province_code = 'GP' AND expiry_date < CURRENT_DATE;

-- Check municipalities in a province (excluding metros)
SELECT municipality_code, municipality_name, COUNT(m.member_id) as member_count
FROM municipalities mu
LEFT JOIN members_consolidated m ON mu.municipality_code = m.municipality_code
WHERE mu.province_code = 'GP' 
  AND COALESCE(mu.municipality_type, 'Local') != 'Metropolitan'
GROUP BY municipality_code, municipality_name
ORDER BY member_count DESC;
```

### Verify Municipality Admin Data
```sql
-- Check total members for a municipality
SELECT COUNT(*) FROM members_consolidated WHERE municipality_code = 'TSH';

-- Check expired members for a municipality
SELECT COUNT(*) FROM members_consolidated 
WHERE municipality_code = 'TSH' AND expiry_date < CURRENT_DATE;

-- Check wards in a municipality
SELECT ward_code, ward_name, COUNT(m.member_id) as member_count
FROM wards w
LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
WHERE w.municipality_code = 'TSH'
GROUP BY ward_code, ward_name
ORDER BY member_count DESC;
```

## Success Criteria

✅ All Province Admin tests pass
✅ All Municipality Admin tests pass
✅ Data is correctly filtered by geographic area
✅ No national/province data leaks to lower admin levels
✅ Metro Municipalities are excluded from sub-regional breakdown
✅ Dashboard performance is acceptable (< 3 seconds load time)
✅ No console errors or warnings
✅ UI is responsive and user-friendly

