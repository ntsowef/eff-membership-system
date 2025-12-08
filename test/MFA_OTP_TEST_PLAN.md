# MFA/OTP Implementation Test Plan

## Overview
This document outlines the comprehensive testing plan for the Multi-Factor Authentication (MFA) with OTP system implemented for Provincial, Municipality, and Ward Admin users.

## Test Environment
- **Backend URL**: http://localhost:5000
- **Frontend URL**: http://localhost:3000
- **Database**: PostgreSQL (localhost)

## Test Scenarios

### 1. National Admin Login (No MFA Required)
**Expected Behavior**: National admins should bypass MFA and login directly.

**Test Steps**:
1. Navigate to http://localhost:3000/login
2. Enter National Admin credentials
3. Click "Sign In"

**Expected Result**:
- ✅ User logs in directly without OTP prompt
- ✅ Redirected to dashboard immediately
- ✅ No OTP sent via SMS or Email

---

### 2. Provincial Admin Login (MFA Required - First Time)
**Expected Behavior**: Provincial admin should receive OTP via SMS and Email.

**Test Steps**:
1. Navigate to http://localhost:3000/login
2. Enter Provincial Admin credentials
3. Click "Sign In"

**Expected Result**:
- ✅ OTP verification form appears
- ✅ Shows masked phone number (e.g., 082****456)
- ✅ Shows masked email (e.g., ad****@example.com)
- ✅ SMS sent to registered phone number
- ✅ Email sent to registered email address
- ✅ Both SMS and Email contain the same 6-digit OTP
- ✅ OTP expiry countdown displayed (24 hours)

---

### 3. OTP Verification (Valid Code)
**Expected Behavior**: Valid OTP should complete login.

**Test Steps**:
1. Complete Provincial/Municipality/Ward Admin login (steps 1-3 from scenario 2)
2. Check SMS and Email for OTP code
3. Enter the 6-digit OTP code
4. Click "Verify Code"

**Expected Result**:
- ✅ OTP verified successfully
- ✅ User logged in and redirected to dashboard
- ✅ Session created with 24-hour validity
- ✅ Success notification displayed

---

### 4. OTP Verification (Invalid Code)
**Expected Behavior**: Invalid OTP should show error with remaining attempts.

**Test Steps**:
1. Complete Provincial/Municipality/Ward Admin login
2. Enter incorrect 6-digit OTP code (e.g., 123456)
3. Click "Verify Code"

**Expected Result**:
- ✅ Error message displayed: "Invalid OTP code"
- ✅ Shows remaining attempts (max 5 attempts)
- ✅ OTP form remains visible
- ✅ User can try again

---

### 5. OTP Resend Functionality
**Expected Behavior**: User can request OTP resend.

**Test Steps**:
1. Complete Provincial/Municipality/Ward Admin login
2. Click "Resend Code" button

**Expected Result**:
- ✅ Success message: "Verification code resent successfully!"
- ✅ New OTP sent via SMS and Email (if expired)
- ✅ OR message: "You already have an active OTP" (if not expired)
- ✅ Expiry countdown updated

---

### 6. OTP Reuse (Multiple Logins Within 24 Hours)
**Expected Behavior**: Same OTP should work for multiple logins within 24 hours.

**Test Steps**:
1. Complete Provincial Admin login with OTP verification
2. Logout
3. Login again with same credentials
4. Use the SAME OTP code from earlier

**Expected Result**:
- ✅ Message: "You have an active OTP. Please check your messages for the code sent earlier."
- ✅ Same OTP code works
- ✅ No new SMS/Email sent
- ✅ Login successful

---

### 7. OTP Expiry (After 24 Hours)
**Expected Behavior**: Expired OTP should trigger new OTP generation.

**Test Steps**:
1. Wait 24 hours after OTP generation (or manually expire in database)
2. Attempt login with expired OTP

**Expected Result**:
- ✅ Error message: "OTP expired"
- ✅ New OTP automatically generated
- ✅ New SMS and Email sent
- ✅ User must use new OTP

---

### 8. Rate Limiting (Too Many Attempts)
**Expected Behavior**: System should block after 5 failed login attempts.

**Test Steps**:
1. Attempt login with wrong password 5 times
2. Try to login again

**Expected Result**:
- ✅ After 5 attempts: "Too many login attempts"
- ✅ Account temporarily locked for 30 minutes
- ✅ Shows retry time
- ✅ Cannot login until lock expires

---

### 9. Rate Limiting (OTP Verification)
**Expected Behavior**: System should block after 5 failed OTP attempts.

**Test Steps**:
1. Complete login to OTP verification screen
2. Enter wrong OTP 5 times

**Expected Result**:
- ✅ After 5 attempts: OTP invalidated
- ✅ Must request new OTP
- ✅ Rate limit message displayed

---

### 10. Municipality Admin Login (MFA Required)
**Expected Behavior**: Municipality admin should receive OTP via SMS and Email.

**Test Steps**:
1. Navigate to http://localhost:3000/login
2. Enter Municipality Admin credentials
3. Complete OTP verification

**Expected Result**:
- ✅ OTP sent via SMS and Email
- ✅ OTP verification successful
- ✅ Dashboard shows only municipality-specific data
- ✅ Ward breakdown visible

---

### 11. Ward Admin Login (MFA Required)
**Expected Behavior**: Ward admin should receive OTP via SMS and Email.

**Test Steps**:
1. Navigate to http://localhost:3000/login
2. Enter Ward Admin credentials
3. Complete OTP verification

**Expected Result**:
- ✅ OTP sent via SMS and Email
- ✅ OTP verification successful
- ✅ Dashboard shows only ward-specific data

---

## Dashboard Testing

### 12. Province Admin Dashboard
**Test Steps**:
1. Login as Provincial Admin
2. Navigate to Dashboard

**Expected Result**:
- ✅ Shows only province-specific statistics
- ✅ Sub-regional breakdown visible
- ✅ Top wards within province displayed
- ✅ No national-level data shown

---

### 13. Municipality Admin Dashboard
**Test Steps**:
1. Login as Municipality Admin
2. Navigate to Dashboard

**Expected Result**:
- ✅ Shows only municipality-specific statistics
- ✅ Ward breakdown visible
- ✅ Municipality overview displayed
- ✅ No province or national data shown

---

## API Testing (Using curl or Postman)

### Test OTP Generation
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"provincial@example.com","password":"password123"}'
```

### Test OTP Verification
```bash
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"user_id":123,"otp_code":"123456"}'
```

### Test OTP Resend
```bash
curl -X POST http://localhost:5000/api/v1/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{"user_id":123}'
```

---

## Database Verification

### Check OTP Records
```sql
SELECT * FROM user_otp_codes 
WHERE user_id = 123 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check Active OTPs
```sql
SELECT * FROM vw_active_otps 
WHERE user_id = 123;
```

### Check Audit Logs
```sql
SELECT * FROM audit_logs 
WHERE user_id = 123 
AND action IN ('OTP_GENERATED', 'OTP_VALIDATED', 'OTP_FAILED')
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Success Criteria
- ✅ All test scenarios pass
- ✅ No errors in browser console
- ✅ No errors in backend logs
- ✅ SMS and Email delivery working
- ✅ Rate limiting functioning correctly
- ✅ Audit logs recording all events
- ✅ Dashboard filtering working correctly
- ✅ OTP reuse working within 24 hours
- ✅ OTP expiry working after 24 hours

---

## Known Issues / Notes
- SMS delivery depends on external service configuration
- Email delivery depends on SMTP configuration
- Test with actual phone numbers and email addresses
- Verify timezone handling for OTP expiry

