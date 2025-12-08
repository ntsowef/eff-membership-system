# Delegate Assignment Security Test Plan

## 🎯 Objective
Verify that delegate assignment is properly locked until a ward has been officially marked as compliant through the "Submit Ward as Compliant" workflow.

---

## 🔒 Security Requirements

### Backend Security (API Level)
1. **POST /api/v1/ward-audit/delegates** - Assign delegate
   - ✅ Must check `is_compliant = true` before allowing assignment
   - ✅ Return 403 error if ward not compliant
   - ✅ Error message: "Ward must be submitted as compliant before delegates can be assigned"

2. **PUT /api/v1/ward-audit/delegate/:delegateId/replace** - Replace delegate
   - ✅ Must check `is_compliant = true` before allowing replacement
   - ✅ Return 403 error if ward not compliant
   - ✅ Error message: "Ward must be submitted as compliant before delegates can be managed"

3. **DELETE /api/v1/ward-audit/delegate/:delegateId** - Remove delegate
   - ✅ Must check `is_compliant = true` before allowing removal
   - ✅ Return 403 error if ward not compliant
   - ✅ Error message: "Ward must be submitted as compliant before delegates can be managed"

### Frontend Security (UI Level)
1. **Criterion 5 Display**
   - ✅ Show "Locked" chip when `ward.is_compliant = false`
   - ✅ Show "⚠️ Ward must be submitted as compliant first" message
   - ✅ Disable "Manage Delegates" button when not compliant
   - ✅ Enable "Manage Delegates" button when compliant

2. **Submit Compliance Button**
   - ✅ Only show when criteria 1-4 pass AND ward not yet compliant
   - ✅ Hide button after ward is submitted as compliant
   - ✅ Show success message after submission

---

## 🧪 Test Scenarios

### Scenario 1: Ward NOT Compliant - UI Restrictions
**Setup:**
- Navigate to a ward that has NOT been submitted as compliant
- Ward may or may not meet criteria 1-4

**Expected Behavior:**
1. Criterion 5 shows "Locked" chip
2. Details show "⚠️ Ward must be submitted as compliant first"
3. No "Manage Delegates" button visible
4. Cannot access delegate management interface

**Test Steps:**
```
1. Open Ward Compliance Detail page for a non-compliant ward
2. Scroll to Criterion 5
3. Verify "Locked" chip is displayed
4. Verify warning message is shown
5. Verify no "Manage Delegates" button
```

---

### Scenario 2: Ward NOT Compliant - API Restrictions
**Setup:**
- Use Postman/curl to directly call delegate assignment API
- Ward is NOT compliant (`is_compliant = false`)

**Expected Behavior:**
1. POST /delegates returns 403 Forbidden
2. PUT /delegate/:id/replace returns 403 Forbidden
3. DELETE /delegate/:id returns 403 Forbidden
4. Error message clearly states ward must be compliant first

**Test Steps:**
```bash
# Test 1: Try to assign delegate to non-compliant ward
curl -X POST http://localhost:5000/api/v1/ward-audit/delegates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ward_code": "JHB004-001",
    "member_id": 12345,
    "assembly_code": "SRPA"
  }'

# Expected Response:
# Status: 403 Forbidden
# Body: {
#   "success": false,
#   "message": "Ward must be submitted as compliant before delegates can be assigned..."
# }

# Test 2: Try to replace delegate in non-compliant ward
curl -X PUT http://localhost:5000/api/v1/ward-audit/delegate/1/replace \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_member_id": 67890,
    "reason": "Testing security"
  }'

# Expected Response: 403 Forbidden

# Test 3: Try to remove delegate from non-compliant ward
curl -X DELETE http://localhost:5000/api/v1/ward-audit/delegate/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Testing security"
  }'

# Expected Response: 403 Forbidden
```

---

### Scenario 3: Submit Ward as Compliant - Workflow
**Setup:**
- Ward meets criteria 1, 2, 3, and 4
- Ward is NOT yet compliant

**Expected Behavior:**
1. "Submit Ward as Compliant" button is visible
2. Clicking button opens confirmation dialog
3. After submission, ward is marked as compliant
4. Button disappears
5. Success message appears
6. Delegate assignment automatically unlocks

**Test Steps:**
```
1. Navigate to ward that meets criteria 1-4
2. Verify "Submit Ward as Compliant" button is visible
3. Click the button
4. Verify confirmation dialog appears
5. Click "Submit as Compliant"
6. Wait for success message
7. Verify button is now hidden
8. Verify success alert shows approval date
9. Scroll to Criterion 5
10. Verify "Manage Delegates" button is now visible
11. Verify "Locked" chip is gone
```

---

### Scenario 4: Ward IS Compliant - Full Access
**Setup:**
- Ward has been submitted as compliant (`is_compliant = true`)

**Expected Behavior:**
1. "Submit Ward as Compliant" button is hidden
2. Success message shows approval date
3. Criterion 5 shows "Manage Delegates" button
4. Clicking button opens delegate management interface
5. Can assign, replace, and remove delegates via UI
6. API calls succeed (no 403 errors)

**Test Steps:**
```
1. Navigate to a compliant ward
2. Verify "Submit Ward as Compliant" button is NOT visible
3. Verify success alert shows "✅ Ward Approved" with date
4. Scroll to Criterion 5
5. Verify "Manage Delegates" button is visible
6. Click "Manage Delegates"
7. Verify delegate management interface opens
8. Try assigning a delegate → Should succeed
9. Try replacing a delegate → Should succeed
10. Try removing a delegate → Should succeed
```

---

### Scenario 5: Criteria 1-4 Not Met - Cannot Submit
**Setup:**
- Ward does NOT meet all of criteria 1-4

**Expected Behavior:**
1. "Submit Ward as Compliant" button is hidden
2. Info alert shows requirements
3. Delegate assignment remains locked

**Test Steps:**
```
1. Navigate to ward that fails any of criteria 1-4
2. Verify "Submit Ward as Compliant" button is NOT visible
3. Verify info alert shows: "Criteria 1, 2, 3, and 4 must all pass..."
4. Verify Criterion 5 shows "Locked" chip
```

---

## ✅ Security Checklist

### Backend (API)
- [ ] POST /delegates checks `is_compliant` before assignment
- [ ] PUT /delegate/:id/replace checks `is_compliant` before replacement
- [ ] DELETE /delegate/:id checks `is_compliant` before removal
- [ ] All endpoints return 403 with clear error message when not compliant
- [ ] Security checks cannot be bypassed via direct API calls

### Frontend (UI)
- [ ] Criterion 5 shows "Locked" chip when not compliant
- [ ] Warning message displayed when not compliant
- [ ] "Manage Delegates" button disabled when not compliant
- [ ] "Submit Ward as Compliant" button only shows when criteria 1-4 pass
- [ ] Button disappears after submission
- [ ] Success message shows after submission
- [ ] Delegate management automatically unlocks after submission

### Workflow
- [ ] Cannot assign delegates before ward is compliant
- [ ] Can submit ward when criteria 1-4 pass (criterion 5 not required)
- [ ] After submission, delegate assignment becomes available
- [ ] Approval date is recorded and displayed

---

## 🐛 Known Issues / Edge Cases

1. **What if a ward becomes non-compliant after approval?**
   - Current implementation: Delegates can still be managed
   - Recommendation: Add periodic compliance re-checks

2. **What if criteria 1-4 change after approval?**
   - Current implementation: Ward remains approved
   - Recommendation: Add audit trail for compliance changes

3. **Can an admin override the compliance requirement?**
   - Current implementation: No override mechanism
   - Recommendation: Add admin override with audit log

---

## 📊 Test Results

| Test Scenario | Status | Notes |
|--------------|--------|-------|
| Scenario 1: UI Restrictions | ⏳ Pending | |
| Scenario 2: API Restrictions | ⏳ Pending | |
| Scenario 3: Submit Workflow | ⏳ Pending | |
| Scenario 4: Full Access | ⏳ Pending | |
| Scenario 5: Cannot Submit | ⏳ Pending | |

---

## 🎯 Success Criteria

All tests must pass with:
- ✅ No security bypasses possible
- ✅ Clear error messages for users
- ✅ Smooth workflow from submission to delegate assignment
- ✅ UI and API security aligned
- ✅ No TypeScript/runtime errors

