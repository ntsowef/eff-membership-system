# Cell Number for Admin Users - OTP/MFA Support

## Problem
Admin users who are not linked to a member record couldn't receive OTP codes because the system only looked for cell numbers in the `members_consolidated` table via the `member_id` join.

**Error**:
```
❌ No cell number found for user 12601
```

## Root Cause
The `users` table didn't have a `cell_number` column. The system assumed all users would be linked to a member record via `member_id`, but admin users (especially provincial, municipal, district, and ward admins) are often not members.

## ✅ IMPORTANT UPDATE
**The system now supports email-only OTP delivery!** If a user doesn't have a cell number, the OTP will be sent via email only. This means admin users can log in and receive OTP codes even without a phone number registered.

## Solution

### 1. Email-Only OTP Support (Primary Solution)
The system now supports sending OTP codes via **email only** when no phone number is available:

- ✅ **No phone number required** - Users can receive OTP via email
- ✅ **Automatic fallback** - System detects missing phone number and sends email only
- ✅ **Seamless experience** - No error messages, just works
- ✅ **Dual delivery when available** - Still sends both SMS and Email when phone number exists

**How it works**:
1. User attempts to log in
2. System checks for phone number (users.cell_number or members_consolidated.cell_number)
3. If phone number exists: Sends OTP via **both SMS and Email**
4. If no phone number: Sends OTP via **Email only**
5. User receives OTP code and can log in

### 2. Database Schema Change (Optional Enhancement)
Added `cell_number` column to the `users` table:

```sql
ALTER TABLE users 
ADD COLUMN cell_number VARCHAR(20);

CREATE INDEX idx_users_cell_number ON users(cell_number) WHERE cell_number IS NOT NULL;
```

### 3. Updated User Creation
Modified `UserManagementService.createUserDirectly()` to accept and store `cell_number`:

**Interface Updated**:
```typescript
export interface UserCreationRequest {
  name: string;
  email: string;
  password: string;
  admin_level: 'national' | 'province' | 'district' | 'municipality' | 'ward';
  role_name: string;
  cell_number?: string; // NEW: For admin users who need OTP/MFA
  // ... other fields
}
```

**INSERT Query Updated**:
```typescript
INSERT INTO users (
  name, email, password, role_id, admin_level,
  province_code, district_code, municipal_code, ward_code, member_id, cell_number,
  is_active, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, CURRENT_TIMESTAMP)
```

### 4. Updated OTP Cell Number Lookup and Email-Only Support
Modified the cell number query in `auth.ts` to check both sources:

**Before**:
```sql
SELECT cell_number
FROM users u
LEFT JOIN members_consolidated m ON u.member_id = m.member_id
WHERE u.user_id = $1
```

**After**:
```sql
SELECT COALESCE(u.cell_number, m.cell_number) as cell_number
FROM users u
LEFT JOIN members_consolidated m ON u.member_id = m.member_id
WHERE u.user_id = $1
```

This uses `COALESCE` to:
1. First check `users.cell_number` (for admin users)
2. Fall back to `members_consolidated.cell_number` (for member users)
3. If no phone number found, use 'N/A' placeholder and send email only

**Email-Only OTP Logic** (in `otpService.ts`):
```typescript
// Determine if we should send SMS (only if valid phone number)
const shouldSendSMS = phoneNumber && phoneNumber !== 'N/A' && phoneNumber.trim() !== '';

if (shouldSendSMS) {
  // Send via both SMS and Email
  [smsSent, emailSent] = await Promise.all([...]);
} else {
  // Send via Email only
  console.log(`📧 No valid phone number, sending OTP via email only`);
  emailSent = await this.sendOTPViaEmail(...);
}
```

## Files Modified

### 1. Database
- **Migration**: `database-recovery/add_cell_number_to_users.sql`
- **Script**: `backend/scripts/add-cell-number-column.js`

### 2. Backend Services
- **`backend/src/services/userManagementService.ts`**:
  - Added `cell_number` to `UserCreationRequest` interface
  - Updated INSERT query to include `cell_number`

### 3. Authentication Middleware
- **`backend/src/middleware/auth.ts`**:
  - Updated cell number query in login endpoint (line 597-622)
  - Updated cell number query in resend OTP endpoint (line 934-959)
  - Both now use `COALESCE(u.cell_number, m.cell_number)`
  - Both now support email-only OTP when no phone number available
  - No longer returns error when phone number is missing

### 4. OTP Service
- **`backend/src/services/otpService.ts`**:
  - Updated `generateAndSendOTP()` method (line 657-713)
  - Added logic to detect missing/invalid phone numbers
  - Sends via email only when phone number is 'N/A' or empty
  - Sends via both SMS and Email when valid phone number exists
  - Success message indicates delivery method used

### 5. Utility Scripts
- **`backend/scripts/update-user-cell-number.js`**: Update existing user's cell number

## Usage

### Creating New Admin User with Cell Number

**Via API**:
```bash
curl -X POST http://localhost:5000/api/v1/admin-management/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Frans Ntsowe",
    "email": "ntsowef@gmail.com",
    "password": "Admin@123",
    "admin_level": "province",
    "role_name": "provincial_admin",
    "province_code": "GP",
    "cell_number": "0821234567",
    "justification": "Provincial administrator"
  }'
```

**Via Frontend**:
The user management form should include a "Cell Number" field for admin users.

### Updating Existing User's Cell Number

**Via Script**:
```bash
node backend/scripts/update-user-cell-number.js ntsowef@gmail.com 0821234567
```

**Via SQL**:
```sql
UPDATE users 
SET cell_number = '0821234567', updated_at = CURRENT_TIMESTAMP 
WHERE email = 'ntsowef@gmail.com';
```

## OTP Delivery Methods

The system now follows this priority for OTP delivery:

1. **User with Phone Number**:
   - Checks `users.cell_number` first
   - Falls back to `members_consolidated.cell_number`
   - Sends OTP via **both SMS and Email**
   - User receives code on both channels

2. **User without Phone Number**:
   - No phone number in either table
   - Sends OTP via **Email only**
   - User receives code via email
   - No error message, seamless experience

3. **Delivery Success Messages**:
   - "OTP sent successfully via SMS and Email" (both channels)
   - "OTP sent successfully via Email" (email only)
   - "OTP sent successfully via SMS (Email delivery failed)" (SMS only)
   - "Failed to send OTP" (both failed)

## Testing

### 1. Test User Creation with Cell Number
```bash
# Create user
curl -X POST http://localhost:5000/api/v1/admin-management/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "test@example.com",
    "password": "Admin@123",
    "admin_level": "province",
    "role_name": "provincial_admin",
    "province_code": "GP",
    "cell_number": "0821234567"
  }'
```

### 2. Test Login with OTP
```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Admin@123"
  }'

# Should receive OTP via SMS and Email
# Then verify OTP
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 12601,
    "otp_code": "123456"
  }'
```

### 3. Verify Cell Number in Database
```sql
SELECT user_id, name, email, cell_number, member_id
FROM users
WHERE email = 'test@example.com';
```

## Best Practices

1. **Always provide cell number** when creating admin users
2. **Validate cell number format** (South African format: 0821234567 or +27821234567)
3. **Update cell numbers** when users change their phone numbers
4. **Test OTP delivery** after creating new admin users
5. **Document cell numbers** in user creation justification

## Related Documentation

- `ROLE_LOOKUP_FIX.md` - Role name mapping and lookup fixes
- `USER_DELETION_GUIDE.md` - User deletion functionality
- `MFA_OTP_TEST_PLAN.md` - MFA/OTP testing procedures
- `IMPLEMENTATION_SUMMARY.md` - Overall system implementation

## Future Improvements

1. Add cell number validation in frontend
2. Add SMS verification during user creation
3. Allow users to update their own cell numbers
4. Add cell number change audit logging
5. Support multiple phone numbers per user
6. Add international phone number support

