# Multi-Factor Authentication (MFA) with OTP Implementation

## Overview

This document describes the Multi-Factor Authentication (MFA) system implemented for the EFF Membership Management System. The MFA system uses One-Time Passwords (OTP) sent via **both SMS and Email** to provide an additional layer of security for Provincial, Municipality, and Ward Admin users.

## Key Features

- **Dual Delivery**: OTP sent via both SMS and Email for redundancy
- **24-Hour Validity**: One OTP per day - valid for 24 hours from generation
- **Reusable OTP**: Users can logout and login multiple times within 24 hours using the same OTP
- **Automatic Refresh**: New OTP generated automatically after 24 hours
- **Session Persistence**: No need for new OTP if logging in within the 24-hour window

## Scope

### Users Requiring MFA
- **Province Admins** (`admin_level: 'province'`)
- **Municipality Admins** (`admin_level: 'municipality'`)
- **Ward Admins** (`admin_level: 'ward'`)

### Users Exempt from MFA
- **National Admins** (`admin_level: 'national'`)

## Architecture

### Database Schema

**Table: `user_otp_codes`**

Created by migration: `backend/migrations/create-otp-table.sql`

Key fields:
- `otp_id` - Primary key
- `user_id` - Foreign key to users table
- `otp_code_hash` - Hashed OTP (bcrypt with 10 salt rounds)
- `otp_plain` - Temporary plain OTP (cleared after SMS sending)
- `generated_at`, `expires_at` - OTP validity timestamps (24-hour validity)
- `validated_at` - When OTP was successfully validated
- `is_validated`, `is_expired` - Status flags
- `attempts_count`, `max_attempts` - Rate limiting (max 5 attempts)
- `session_token`, `session_expires_at` - 24-hour session tracking
- `sent_to_number`, `delivery_status` - SMS delivery tracking
- `ip_address`, `user_agent` - Security audit fields
- `invalidated_at`, `invalidation_reason` - OTP invalidation tracking

**View: `vw_active_otps`**

Provides easy querying of active, non-expired, non-validated OTPs.

**Triggers:**
- `trigger_update_user_otp_codes_updated_at` - Auto-update timestamp
- `trigger_invalidate_previous_otps` - Auto-invalidate old OTPs when new one is generated

### Backend Services

**OTPService** (`backend/src/services/otpService.ts`)

Core service handling all OTP operations:

Key methods:
- `requiresMFA(adminLevel)` - Check if user requires MFA
- `generateOTP(userId, phoneNumber, ipAddress, userAgent)` - Generate and store OTP
- `validateOTP(userId, otpCode, ipAddress)` - Validate OTP and create session
- `verifySession(userId, sessionToken)` - Verify OTP session validity
- `hasValidSession(userId)` - Check if user has valid 24-hour session
- `generateAndSendOTP(userId, userName, phoneNumber, ipAddress, userAgent)` - Generate and send OTP via SMS
- `sendOTPViaSMS(userId, otpId, otpCode, phoneNumber, userName)` - Send OTP via SMS
- `invalidateOTP(otpId, reason)` - Manually invalidate OTP
- `getActiveOTP(userId)` - Get active OTP for user
- `cleanupExpiredOTPs(daysOld)` - Maintenance function

Security features:
- OTP hashing using bcrypt (10 salt rounds)
- 6-digit random OTP generation
- 24-hour OTP validity
- 24-hour session validity after successful validation
- Max 5 validation attempts per OTP
- 2-minute cooldown between OTP generation requests
- Automatic invalidation of previous OTPs

**SMSService** (`backend/src/services/smsService.ts`)

Existing SMS service supporting multiple providers:
- JSON Applink (primary)
- Twilio
- Clickatell
- Gateway
- SMPP
- Mock (for testing)

**EmailService** (`backend/src/services/emailService.ts`)

Existing email service using Nodemailer:
- SMTP configuration via environment variables
- HTML and plain text email support
- Professional email templates with EFF branding
- Fallback to console logging if not configured

### Authentication Flow

**1. Initial Login (Password Validation)**

Endpoint: `POST /api/v1/auth/login`

Request:
```json
{
  "email": "gauteng.admin@eff.org.za",
  "password": "Admin@123"
}
```

Response (MFA required - New OTP generated):
```json
{
  "success": true,
  "message": "OTP sent to your registered phone number and email address",
  "data": {
    "requires_otp": true,
    "user_id": 123,
    "email": "gauteng.admin@eff.org.za",
    "phone_number_masked": "082****789",
    "email_masked": "ga****@eff.org.za",
    "otp_expires_at": "2025-11-20T10:30:00Z",
    "is_existing_otp": false
  }
}
```

Response (MFA required - Existing valid OTP):
```json
{
  "success": true,
  "message": "You have an active OTP. Please check your SMS and Email for the code sent earlier.",
  "data": {
    "requires_otp": true,
    "user_id": 123,
    "email": "gauteng.admin@eff.org.za",
    "phone_number_masked": "082****789",
    "email_masked": "ga****@eff.org.za",
    "otp_expires_at": "2025-11-20T10:30:00Z",
    "is_existing_otp": true
  }
}
```

Response (MFA not required - National Admin):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "session_id": "session_123",
    "expires_in": "24h"
  }
}
```

**2. OTP Verification**

Endpoint: `POST /api/v1/auth/verify-otp`

Request:
```json
{
  "user_id": 123,
  "otp_code": "123456"
}
```

Response (success):
```json
{
  "success": true,
  "message": "OTP verified successfully. Login complete.",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "session_id": "session_123",
    "session_token": "a1b2c3d4e5f6...",
    "expires_in": "24h"
  }
}
```

Response (failure):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_OTP",
    "message": "Invalid OTP code. 3 attempts remaining.",
    "attempts_remaining": 3
  }
}
```

**3. Resend OTP**

Endpoint: `POST /api/v1/auth/resend-otp`

Request:
```json
{
  "user_id": 123
}
```

Response (New OTP sent):
```json
{
  "success": true,
  "message": "OTP resent successfully via SMS and Email",
  "data": {
    "phone_number_masked": "082****789",
    "email_masked": "ga****@eff.org.za",
    "otp_expires_at": "2025-11-20T10:35:00Z",
    "is_existing_otp": false
  }
}
```

Response (Existing valid OTP):
```json
{
  "success": true,
  "message": "You already have an active OTP. Please check your SMS and Email.",
  "data": {
    "phone_number_masked": "082****789",
    "email_masked": "ga****@eff.org.za",
    "otp_expires_at": "2025-11-20T10:30:00Z",
    "is_existing_otp": true
  }
}
```

## OTP Lifecycle - 24-Hour Validity

### How It Works

1. **First Login of the Day**:
   - User logs in with email/password
   - System checks if user has a valid OTP (not expired, within 24 hours)
   - If no valid OTP exists, system generates new 6-digit OTP
   - OTP is sent via **both SMS and Email**
   - OTP is valid for **24 hours** from generation time

2. **Subsequent Logins Within 24 Hours**:
   - User logs in with email/password
   - System finds existing valid OTP
   - System returns message: "You have an active OTP. Please check your SMS and Email for the code sent earlier."
   - User enters the **same OTP** from earlier
   - Login succeeds without generating new OTP

3. **After 24 Hours**:
   - Previous OTP expires automatically
   - Next login generates **new OTP**
   - New OTP sent via SMS and Email
   - Cycle repeats

### Example Timeline

```
Day 1, 9:00 AM  - User logs in → OTP "123456" generated and sent
Day 1, 9:05 AM  - User enters OTP "123456" → Login successful
Day 1, 12:00 PM - User logs out
Day 1, 2:00 PM  - User logs in again → Same OTP "123456" still valid
Day 1, 2:05 PM  - User enters OTP "123456" → Login successful
Day 1, 5:00 PM  - User logs out

Day 2, 9:00 AM  - User logs in → Previous OTP expired
Day 2, 9:00 AM  - New OTP "789012" generated and sent
Day 2, 9:05 AM  - User enters OTP "789012" → Login successful
```

### Benefits

- **Convenience**: Users don't need to request new OTP for every login
- **Reduced SMS/Email costs**: One OTP per day instead of per login
- **Better UX**: Less friction for users who login multiple times per day
- **Security**: OTP still expires after 24 hours, maintaining security
- **Redundancy**: Dual delivery (SMS + Email) ensures users receive the code

## Audit Logging

All OTP operations are logged for security audit purposes.

**New Audit Actions** (added to `backend/src/models/auditLogs.ts`):
- `OTP_GENERATED` - OTP generated for user
- `OTP_SENT` - OTP sent via SMS successfully
- `OTP_SEND_FAILED` - OTP SMS sending failed
- `OTP_VALIDATED` - OTP validated successfully
- `OTP_VALIDATION_FAILED` - OTP validation failed
- `OTP_RESENT` - OTP resent to user
- `OTP_EXPIRED` - OTP expired
- `OTP_SESSION_CREATED` - 24-hour session created after OTP validation
- `OTP_SESSION_EXPIRED` - OTP session expired

**New Entity Type**:
- `OTP` - OTP entity type for audit logs

**Audit Logging Functions** (added to `backend/src/middleware/auditLogger.ts`):
- `logOTPGenerated(userId, otpId, phoneNumber)`
- `logOTPSent(userId, otpId, phoneNumber)`
- `logOTPSendFailed(userId, otpId, error)`
- `logOTPValidated(userId, otpId)`
- `logOTPValidationFailed(userId, otpId, reason, attemptsRemaining)`
- `logOTPResent(userId, oldOtpId, newOtpId)`
- `logOTPSessionCreated(userId, otpId, sessionExpiresAt)`

## Security Considerations

1. **OTP Hashing**: All OTPs are hashed using bcrypt with 10 salt rounds before storage
2. **Rate Limiting**: 
   - Max 5 validation attempts per OTP
   - 2-minute cooldown between OTP generation requests
   - Rate limiting on login and OTP endpoints
3. **Session Management**: 24-hour sessions after successful OTP validation
4. **Automatic Invalidation**: Previous OTPs are automatically invalidated when new one is generated
5. **Audit Trail**: All OTP operations are logged with IP address and user agent
6. **SMS Delivery Tracking**: SMS delivery status is tracked and logged
7. **Plain OTP Clearing**: Plain OTP is cleared from database after SMS is sent

## Testing

### Manual Testing Steps

1. **Test Provincial Admin Login with MFA (First Login)**:
   - Login with `gauteng.admin@eff.org.za` / `Admin@123`
   - Verify OTP is sent via **both SMS and Email**
   - Check SMS for OTP code
   - Check Email inbox for OTP code
   - Verify both contain the same OTP
   - Enter OTP to complete login
   - Verify login successful

2. **Test OTP Reuse (Multiple Logins Same Day)**:
   - Login with `gauteng.admin@eff.org.za` / `Admin@123`
   - Verify message: "You have an active OTP. Please check your SMS and Email for the code sent earlier."
   - Verify `is_existing_otp: true` in response
   - Enter the **same OTP from earlier**
   - Verify login successful without new OTP being sent

3. **Test National Admin Login (No MFA)**:
   - Login with `national.admin@eff.org.za` / `Admin@123`
   - Verify login completes immediately without OTP

4. **Test OTP Expiry (24 Hours)**:
   - Generate OTP at 9:00 AM Day 1
   - Try to login at 9:01 AM Day 2 (24+ hours later)
   - Verify new OTP is generated
   - Verify old OTP is expired

5. **Test Max Attempts**:
   - Generate OTP
   - Enter wrong OTP 5 times
   - Verify OTP is invalidated after 5 attempts
   - Verify error message

6. **Test Resend OTP (Within 24 Hours)**:
   - Generate OTP
   - Click "Resend OTP" within 24 hours
   - Verify message: "You already have an active OTP"
   - Verify `is_existing_otp: true`
   - Verify no new OTP is sent

7. **Test Resend OTP (After 24 Hours)**:
   - Generate OTP
   - Wait 24 hours
   - Click "Resend OTP"
   - Verify new OTP is generated and sent
   - Verify `is_existing_otp: false`

8. **Test Dual Delivery (SMS + Email)**:
   - Generate OTP
   - Verify SMS is sent
   - Verify Email is sent
   - Verify both contain the same OTP code
   - Test login with OTP from SMS
   - Test login with OTP from Email (should be same code)

## Frontend Implementation (TODO)

The following frontend components need to be created:

1. **OTPVerification Component** (`frontend/src/components/auth/OTPVerification.tsx`):
   - 6-digit OTP input with auto-focus
   - Resend OTP button with countdown timer
   - Error display for invalid OTP
   - Loading states

2. **Login Flow Update** (`frontend/src/pages/Login.tsx`):
   - Check for `requires_otp` flag in login response
   - Redirect to OTP verification page if MFA required
   - Store user_id in session storage for OTP verification

3. **API Client Update**:
   - Add `x-otp-session` header to API requests
   - Handle OTP session expiry errors
   - Redirect to login on session expiry

## Maintenance

### Cleanup Expired OTPs

Run the cleanup function periodically (e.g., daily cron job):

```typescript
await OTPService.cleanupExpiredOTPs(30); // Clean OTPs older than 30 days
```

### Monitor OTP Statistics

Get OTP statistics for a user:

```typescript
const stats = await OTPService.getOTPStats(userId);
console.log(stats);
// {
//   total_generated: 10,
//   total_validated: 8,
//   total_failed: 2,
//   total_expired: 1,
//   active_sessions: 1
// }
```

## Troubleshooting

### OTP Not Received

1. Check SMS service configuration
2. Verify phone number is registered for user
3. Check SMS delivery status in `user_otp_codes` table
4. Check SMS service logs

### OTP Validation Fails

1. Check if OTP has expired (24-hour validity)
2. Check if max attempts exceeded (5 attempts)
3. Check if OTP was invalidated
4. Verify correct OTP code is entered

### Session Expires Too Soon

1. Verify `SESSION_VALIDITY_HOURS` is set to 24
2. Check `session_expires_at` in `user_otp_codes` table
3. Verify system time is correct

## Configuration

Environment variables (in `backend/.env`):

```env
# SMS Service Configuration
SMS_PROVIDER=jsonapplink
SMS_API_KEY=your_api_key
SMS_API_SECRET=your_api_secret
SMS_FROM_NUMBER=EFF-MFA

# OTP Configuration (hardcoded in OTPService)
OTP_LENGTH=6
OTP_VALIDITY_HOURS=24
SESSION_VALIDITY_HOURS=24
MAX_ATTEMPTS=5
SALT_ROUNDS=10
```

## Files Modified/Created

### Created Files:
- `backend/migrations/create-otp-table.sql` - Database migration
- `backend/run-otp-migration.js` - Migration runner
- `backend/src/services/otpService.ts` - OTP service with SMS and Email delivery
- `backend/docs/MFA_OTP_IMPLEMENTATION.md` - This documentation

### Modified Files:
- `backend/src/services/otpService.ts` - Added email delivery, 24-hour OTP reuse logic
- `backend/src/middleware/auth.ts` - Updated login flow for dual delivery and OTP reuse
- `backend/src/models/auditLogs.ts` - Added OTP audit actions and entity type
- `backend/src/middleware/auditLogger.ts` - Added OTP audit logging functions

## Implementation Status

### ✅ Completed (Backend)

1. ✅ Database schema created
2. ✅ OTP service implemented
3. ✅ SMS integration completed
4. ✅ **Email integration completed** (NEW)
5. ✅ **Dual delivery (SMS + Email) implemented** (NEW)
6. ✅ **24-hour OTP validity with reuse logic** (NEW)
7. ✅ Login flow updated
8. ✅ OTP verification endpoint created
9. ✅ Resend OTP endpoint created
10. ✅ Authentication middleware updated
11. ✅ Audit logging implemented

### ⏳ Pending (Frontend)

12. ⏳ Frontend OTP input component (TODO)
13. ⏳ Frontend login flow update (TODO)
14. ⏳ Display dual delivery status (SMS + Email) (TODO)
15. ⏳ Show OTP expiry countdown (TODO)
16. ⏳ Testing and QA (TODO)

## Support

For issues or questions, contact the development team or refer to the main system documentation.

