# Phone Number Masking Fix

## Problem
When users without phone numbers attempted to log in, the system crashed with:
```
❌ Database error during authentication: TypeError: Cannot read properties of null (reading 'replace')
```

## Root Cause
The authentication middleware was trying to mask the phone number for display in the response, but when no phone number was available, `cellNumber` was `null` or `'N/A'`, causing `.replace()` to fail.

**Error Location**: `backend/src/middleware/auth.ts`
- Line 651: Login endpoint response
- Line 985: Resend OTP endpoint response

## Solution
Added null checks before attempting to mask the phone number:

```typescript
// Before (BROKEN):
phone_number_masked: cellNumber.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')

// After (FIXED):
const phoneMasked = cellNumber && cellNumber !== 'N/A' 
  ? cellNumber.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
  : null;

return res.json({
  data: {
    phone_number_masked: phoneMasked,
    // ... other fields
  }
});
```

## Files Modified
- **`backend/src/middleware/auth.ts`**:
  - Line 643-661: Login endpoint - Added phone number null check
  - Line 976-995: Resend OTP endpoint - Added phone number null check

## Response Format

### With Phone Number
```json
{
  "success": true,
  "message": "OTP sent to your registered phone number and email address",
  "data": {
    "requires_otp": true,
    "user_id": 12601,
    "email": "ntsowef@gmail.com",
    "phone_number_masked": "082****567",
    "email_masked": "nt****@gmail.com",
    "otp_expires_at": "2025-11-21T10:30:00Z"
  }
}
```

### Without Phone Number (Email Only)
```json
{
  "success": true,
  "message": "OTP sent to your registered phone number and email address",
  "data": {
    "requires_otp": true,
    "user_id": 12601,
    "email": "ntsowef@gmail.com",
    "phone_number_masked": null,
    "email_masked": "nt****@gmail.com",
    "otp_expires_at": "2025-11-21T10:30:00Z"
  }
}
```

## Testing

### Test Login Without Phone Number
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ntsowef@gmail.com",
    "password": "Admin@123"
  }'
```

**Expected Result**:
- ✅ No error
- ✅ OTP sent via email
- ✅ Response includes `phone_number_masked: null`
- ✅ User can proceed to enter OTP

### Test Login With Phone Number
```bash
# First add phone number
node backend/scripts/update-user-cell-number.js ntsowef@gmail.com 0821234567

# Then login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ntsowef@gmail.com",
    "password": "Admin@123"
  }'
```

**Expected Result**:
- ✅ No error
- ✅ OTP sent via both SMS and Email
- ✅ Response includes `phone_number_masked: "082****567"`
- ✅ User can proceed to enter OTP

## Related Issues Fixed
1. ✅ User deletion functionality
2. ✅ Role lookup errors
3. ✅ Email-only OTP support
4. ✅ Phone number masking errors

## Status
✅ **FIXED** - Users can now log in successfully with or without phone numbers.

