# 🧪 MEMBER APPROVAL TESTING GUIDE

Complete guide for testing the member approval process with voter status and voting district code assignment.

---

## 🎯 What We're Testing

After implementing the voter status logic, we need to verify that when a membership application is approved:

1. ✅ **Voter Status ID** is correctly set (1=Registered, 2=Not Registered, 4=Verification Failed)
2. ✅ **Voting District Code** is assigned based on business rules
3. ✅ **Municipality Code** is mapped from ward table (sub-region, not metro)
4. ✅ **Membership Status** is set to 1 (Active/Good Standing)

---

## 🚀 Quick Start (RECOMMENDED)

### Option 1: Quick Python Verification (Fastest)

After manually approving a member in the UI:

```bash
cd test/playwright
python verify-approval.py <ID_NUMBER>
```

**Example**:
```bash
python verify-approval.py 7808020703087
```

This will:
- ✅ Check the member exists in database
- ✅ Display all relevant fields
- ✅ Run validation checks
- ✅ Show pass/fail status

---

### Option 2: Manual Playwright Test (Interactive)

This opens a browser and lets you test manually while automatically verifying results:

```bash
cd test/playwright
npm run test:manual
```

**Steps**:
1. Browser opens automatically
2. Navigate to application page and submit application
3. Go to admin panel and approve
4. Return to terminal and enter ID number
5. Script verifies database automatically

---

### Option 3: Automated Playwright Test

Run fully automated end-to-end test:

```bash
cd test/playwright
npm run test:headed
```

---

## 📋 Manual Testing Steps

### Step 1: Submit Application

1. Navigate to `http://localhost:3000/apply`
2. Fill in application form with test data:
   - **ID Number**: Use a valid SA ID (e.g., `7808020703087`)
   - **First Name**: Test
   - **Last Name**: User
   - **Date of Birth**: 1978-08-02
   - **Gender**: Male
   - **Cell Number**: 0821234567
   - **Email**: test@example.com
   - **Address**: 123 Test Street
3. Submit the application
4. Note the application ID

### Step 2: Approve Application

1. Navigate to `http://localhost:3000/admin/applications`
2. Login if required
3. Find the application (search by ID number)
4. Click "Approve" button
5. Confirm approval

### Step 3: Verify Database

Run the verification script:

```bash
cd test/playwright
python verify-approval.py <ID_NUMBER>
```

### Step 4: Check Results

The script will show:
- ✅ Member details
- ✅ Voter status (should be 1, 2, or 4)
- ✅ Voting district code (IEC VD or special code)
- ✅ Municipality code (sub-region format)
- ✅ Membership status (should be 1)
- ✅ Validation checks (all should pass)

---

## 🎯 Test Scenarios

### Scenario 1: Registered Voter with VD Code ✅

**Test ID**: `7808020703087` (Dunga Marshall)

**Expected Results**:
```
Voter Status ID: 1 (Registered)
Voting District Code: 32871326 (IEC VD number)
Municipality Code: EKU004 (sub-region)
Membership Status ID: 1 (Active)
```

**Verification**:
```bash
python verify-approval.py 7808020703087
```

---

### Scenario 2: Registered Voter without VD Code

**Expected Results**:
```
Voter Status ID: 1 (Registered)
Voting District Code: 222222222 (Special code)
Municipality Code: <sub-region from ward>
Membership Status ID: 1 (Active)
```

---

### Scenario 3: Non-Registered Voter

**Expected Results**:
```
Voter Status ID: 2 (Not Registered)
Voting District Code: 999999999 (Special code)
Municipality Code: <sub-region from ward>
Membership Status ID: 1 (Active)
```

---

### Scenario 4: Verification Failed/Pending

**Expected Results**:
```
Voter Status ID: 4 (Verification Failed)
Voting District Code: 888888888 (Special code)
Municipality Code: <sub-region from ward>
Membership Status ID: 1 (Active)
```

---

## 📊 Special Voting District Codes

| Code | Meaning | When Assigned |
|------|---------|---------------|
| **Actual VD** (e.g., `32871326`) | IEC Voting District | IEC returned valid VD number for registered voter |
| **`222222222`** | Registered - No VD Data | IEC confirmed registration but no VD number |
| **`999999999`** | Not Registered | IEC confirmed NOT registered |
| **`888888888`** | Verification Failed | IEC verification failed or pending |

---

## ✅ Validation Checklist

After approving a member, verify:

- [ ] **Voter Status ID** is set (not NULL)
- [ ] **Voter Status ID** is valid (1, 2, or 4)
- [ ] **Voting District Code** is set (not NULL)
- [ ] **Voting District Code** is either:
  - [ ] Actual IEC VD number (8 digits)
  - [ ] Special code (222222222, 999999999, or 888888888)
- [ ] **Municipality Code** is sub-region format (e.g., `EKU004`, `JHB001`)
- [ ] **Municipality Code** is NOT metro-level (NOT `EKU`, `JHB`, etc.)
- [ ] **Membership Status ID** is 1 (Active)

---

## 🐛 Troubleshooting

### Issue: "Member not found in database"

**Possible Causes**:
1. Application not yet approved
2. ID number incorrect
3. Approval failed silently

**Solution**:
```sql
-- Check if application exists
SELECT * FROM membership_applications WHERE id_number = '<ID_NUMBER>';

-- Check if member was created
SELECT * FROM members_consolidated WHERE id_number = '<ID_NUMBER>';
```

---

### Issue: "Voter Status ID is NULL"

**Possible Causes**:
1. IEC verification data not stored in application
2. Approval service not updated
3. Database migration not run

**Solution**:
1. Check application has `iec_is_registered` field:
```sql
SELECT iec_is_registered, iec_voter_status FROM membership_applications WHERE id_number = '<ID_NUMBER>';
```

2. Verify migration was run:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'membership_applications' AND column_name LIKE 'iec%';
```

---

### Issue: "Municipality Code is metro-level (e.g., EKU)"

**Possible Causes**:
1. Approval service not using ward's municipality code
2. Ward table has incorrect municipality code

**Solution**:
1. Check ward's municipality code:
```sql
SELECT ward_code, municipality_code FROM wards WHERE ward_code = '<WARD_CODE>';
```

2. Verify approval service is using `correctMunicipalityCode`

---

## 📁 Test Files

- **`verify-approval.py`**: Quick Python verification script
- **`manual-approval-test.ts`**: Interactive Playwright test
- **`member-approval-voter-status.spec.ts`**: Automated Playwright test
- **`playwright.config.ts`**: Playwright configuration
- **`README.md`**: Setup and usage instructions
- **`TESTING_GUIDE.md`**: This file

---

## 🎉 Success Criteria

A successful test should show:

```
====================================================================================================
✅ VALIDATION CHECKS
====================================================================================================
✅ PASS: Voter Status ID is set (1)
✅ PASS: Voter Status ID is valid (1, 2, or 4) (1)
✅ PASS: Voting District Code is set (32871326)
✅ PASS: Municipality Code is sub-region (not metro) (EKU004)
✅ PASS: Membership Status is Active (ID: 1) (1)

====================================================================================================
🎉 ALL CHECKS PASSED!
====================================================================================================
```

---

## 📞 Need Help?

1. Check backend logs: `backend/logs/`
2. Check database: Run SQL queries above
3. Check IEC API: Test with `test/reverify_member_with_iec.py`
4. Review implementation: `test/VOTER_STATUS_IMPLEMENTATION_COMPLETE.md`

