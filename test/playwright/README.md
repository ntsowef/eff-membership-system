# Playwright Tests - Member Approval with Voter Status

This directory contains Playwright tests for verifying the member approval process, specifically testing:
- Voter status assignment (`voter_status_id`)
- Voting district code assignment (`voting_district_code`)
- Municipality code mapping (sub-region vs metro)
- Membership status assignment

---

## 📋 Prerequisites

1. **Backend running** on `http://localhost:5000`
2. **Frontend running** on `http://localhost:3000`
3. **Database** accessible with test data

---

## 🚀 Setup

### 1. Install Dependencies

```bash
cd test/playwright
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install
```

---

## 🧪 Running Tests

### Option 1: Manual Interactive Test (RECOMMENDED)

This opens a browser and lets you manually test while automatically verifying database results:

```bash
npm run test:manual
```

**Steps**:
1. Browser opens automatically
2. Navigate to the application page
3. Submit a membership application
4. Go to admin panel and approve the application
5. Return to terminal and enter the ID number
6. Script will verify the database and show results

### Option 2: Automated Test (Headed Mode)

Run the automated test with visible browser:

```bash
npm run test:headed
```

### Option 3: Automated Test (Headless Mode)

Run the automated test in background:

```bash
npm test
```

### Option 4: Debug Mode

Run tests with Playwright Inspector for debugging:

```bash
npm run test:debug
```

### Option 5: UI Mode

Run tests with Playwright UI for interactive debugging:

```bash
npm run test:ui
```

---

## 📊 Test Reports

After running tests, view the HTML report:

```bash
npm run report
```

---

## 🧪 Test Scenarios

### 1. Registered Voter with VD Code
- **Expected**: `voter_status_id = 1`, `voting_district_code = <IEC VD number>`
- **Example**: ID 7808020703087

### 2. Registered Voter without VD Code
- **Expected**: `voter_status_id = 1`, `voting_district_code = '222222222'`

### 3. Non-Registered Voter
- **Expected**: `voter_status_id = 2`, `voting_district_code = '999999999'`

### 4. Verification Failed/Pending
- **Expected**: `voter_status_id = 4`, `voting_district_code = '888888888'`

---

## 🔍 What the Tests Verify

### ✅ Voter Status
- `voter_status_id` is set (not NULL)
- `voter_status_id` is valid (1, 2, or 4)

### ✅ Voting District Code
- `voting_district_code` is set (not NULL)
- Code is either:
  - Actual IEC VD number (8 digits)
  - Special code: `222222222`, `999999999`, or `888888888`

### ✅ Municipality Code
- `municipality_code` is set
- Code is sub-region format (e.g., `EKU004`, `JHB001`)
- Code is NOT metro-level (e.g., NOT `EKU`, `JHB`)

### ✅ Membership Status
- `membership_status_id = 1` (Active/Good Standing)

---

## 📁 Test Files

- **`member-approval-voter-status.spec.ts`**: Automated test suite
- **`manual-approval-test.ts`**: Manual interactive test script
- **`playwright.config.ts`**: Playwright configuration
- **`package.json`**: Dependencies and scripts
- **`tsconfig.json`**: TypeScript configuration

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to backend"
**Solution**: Ensure backend is running on port 5000
```bash
cd backend
npm run dev
```

### Issue: "Cannot connect to frontend"
**Solution**: Ensure frontend is running on port 3000
```bash
cd frontend
npm run dev
```

### Issue: "Member not found in database"
**Solution**: 
- Verify the application was approved
- Check the ID number is correct
- Verify database connection

### Issue: "Playwright browsers not installed"
**Solution**: 
```bash
npx playwright install
```

---

## 📝 Example Output

```
====================================================================================================
🔍 VERIFYING MEMBER IN DATABASE
====================================================================================================

📋 Member Details:
   Member ID: 772468
   Name: Dunga Marshall
   ID Number: 7808020703087
   Ward Code: 79700100
   Municipality Code: EKU004

✅ Voter Status:
   Voter Status ID: 1
   Voter Status: Registered

📍 Voting District:
   Voting District Code: 32871326
   ℹ️ Actual VD Number from IEC

🎯 Membership Status:
   Membership Status ID: 1
   Membership Status: Active

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

## 🎯 Quick Start

**Fastest way to test**:

```bash
# 1. Install dependencies
cd test/playwright
npm install
npx playwright install

# 2. Run manual test
npm run test:manual

# 3. Follow on-screen instructions
```

---

## 📞 Support

If you encounter issues, check:
1. Backend logs: `backend/logs/`
2. Frontend console: Browser DevTools
3. Database: Verify tables exist and have data
4. Playwright trace: `npx playwright show-trace trace.zip`

