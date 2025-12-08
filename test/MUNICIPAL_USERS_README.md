# Municipal Administrator User Creation Script

## Overview

This script creates Municipal Administrator user accounts for all municipalities in South Africa. Each municipality gets one dedicated administrator account with appropriate permissions and access levels.

---

## Script: `recreate_municipal_users.py`

### Purpose

Automatically create or recreate Municipal Administrator user accounts for all 266 municipalities in the database.

---

## Features

✅ **Automated User Creation** - Creates one admin per municipality  
✅ **Smart Email Generation** - Sanitizes municipality names for email addresses  
✅ **Secure Passwords** - Uses bcrypt hashing for password security  
✅ **Duplicate Prevention** - Skips users that already exist  
✅ **Dry Run Mode** - Preview before creating (default)  
✅ **Transaction Safety** - Rolls back on errors  
✅ **Progress Tracking** - Shows real-time creation progress  
✅ **Comprehensive Summary** - Detailed report at completion

---

## Usage

### Step 1: Preview (Dry Run - Safe)

```bash
python test/recreate_municipal_users.py
```

**What it does:**
- Shows all 266 municipalities
- Displays the email that would be generated for each
- Checks which users already exist
- Shows summary of what would be created
- **Does NOT create any users**

### Step 2: Create Users (Requires Confirmation)

```bash
python test/recreate_municipal_users.py --execute
```

**What it does:**
- Asks for confirmation (`CREATE USERS`)
- Creates Municipal Administrator accounts
- Shows progress for each municipality
- Commits transaction if successful
- Rolls back if any errors occur

---

## User Account Details

### Role & Permissions
- **Role:** Municipal Administrator (role_id = 5)
- **Admin Level:** `municipal`
- **Permissions:** Full access to their municipality's data

### Email Format
```
{municipality-name}.admin@eff.org.za
```

**Examples:**
- City of Johannesburg → `city-of-johannesburg-metropolitan-municipality.admin@eff.org.za`
- Ekurhuleni → `ekurhuleni-metropolitan-municipality.admin@eff.org.za`
- Buffalo City → `buffalo-city-metropolitan-municipality.admin@eff.org.za`

**Sanitization Rules:**
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters
- Remove leading/trailing hyphens
- Collapse multiple hyphens to single hyphen

### Display Name Format
```
{Municipality Name} Municipal Admin
```

**Examples:**
- `City of Johannesburg Metropolitan Municipality Municipal Admin`
- `Ekurhuleni Metropolitan Municipality Municipal Admin`
- `Buffalo City Metropolitan Municipality Municipal Admin`

### Default Password
```
EFF@2024
```

**Security:**
- Hashed using bcrypt
- Users should change password on first login
- Consider implementing password change requirement

### Account Settings
- `is_active`: `true`
- `account_locked`: `false`
- `failed_login_attempts`: `0`
- `mfa_enabled`: `false`
- `member_id`: `NULL` (not linked to member records)

### Geographic Linking
Each user is linked to their municipality via:
- `municipal_code`: Municipality code (e.g., "JHB", "CPT", "EKU")
- `district_code`: District code for the municipality

---

## Example Output

### Dry Run Preview

```
🔍 DRY RUN - PREVIEW OF MUNICIPAL USERS TO BE CREATED
========================================================================================================================

Total municipalities found: 266

------------------------------------------------------------------------------------------------------------------------
#     Municipality Name                                  Email                                              Code      
------------------------------------------------------------------------------------------------------------------------
✓ 1   City of Johannesburg Metropolitan Municipality     city-of-johannesburg-metropolitan-municipality.admin@eff.org.za JHB
✓ 2   City of Cape Town Metropolitan Municipality        city-of-cape-town-metropolitan-municipality.admin@eff.org.za CPT
✓ 3   Ekurhuleni Metropolitan Municipality               ekurhuleni-metropolitan-municipality.admin@eff.org.za EKU
...

Summary:
  Total municipalities: 266
  Would create: 266
  Would skip (already exist): 0

Default password for all new users: EFF@2024
```

### Actual Creation

```
🚀 CREATING MUNICIPAL ADMINISTRATOR USERS
========================================================================================================================

Total municipalities found: 266
Generating password hash...
Password hash generated ✓

Existing municipal users: 0

------------------------------------------------------------------------------------------------------------------------
✓ [1/266] CREATED: City of Johannesburg Metropolitan Municipality Municipal Admin
✓ [2/266] CREATED: City of Cape Town Metropolitan Municipality Municipal Admin
✓ [3/266] CREATED: Ekurhuleni Metropolitan Municipality Municipal Admin
...

✅ TRANSACTION COMMITTED SUCCESSFULLY

SUMMARY
========================================================================================================================
  Total municipalities: 266
  Users created: 266
  Users skipped (already exist): 0
  Errors: 0

  Default password for all new users: EFF@2024
  ⚠️  Users should change their password on first login!

Final verification: 266 municipal users in database
```

---

## Database Tables Affected

### `users` Table
New records inserted with:
- `name` - Display name
- `email` - Generated email address
- `password` - Bcrypt hashed password
- `role_id` - 5 (Municipal Administrator)
- `admin_level` - 'municipal'
- `municipal_code` - Municipality code
- `district_code` - District code
- `is_active` - true
- `account_locked` - false
- `created_at` - Current timestamp
- `updated_at` - Current timestamp

---

## Safety Features

1. **Dry Run Default** - Must explicitly use `--execute` flag
2. **Confirmation Required** - Must type `CREATE USERS` to proceed
3. **Duplicate Check** - Skips existing users (checks by email)
4. **Transaction Rollback** - All changes rolled back on error
5. **Progress Tracking** - See exactly what's being created
6. **Final Verification** - Confirms user count after creation

---

## Error Handling

**If an error occurs:**
- Transaction is automatically rolled back
- No users are created
- Error message is displayed
- Database remains unchanged

**Common errors:**
- Database connection failure
- Permission issues
- Duplicate email constraint violation
- Invalid municipality data

---

## Verification

After creation, verify users were created:

```sql
-- Count municipal users
SELECT COUNT(*) FROM users WHERE admin_level = 'municipal';

-- List all municipal users
SELECT 
    user_id,
    name,
    email,
    municipal_code,
    is_active
FROM users 
WHERE admin_level = 'municipal'
ORDER BY name;

-- Check specific municipality
SELECT * FROM users 
WHERE email = 'city-of-johannesburg-metropolitan-municipality.admin@eff.org.za';
```

---

## Municipalities Covered

**Total:** 266 municipalities

**Categories:**
- 8 Metropolitan Municipalities (JHB, CPT, EKU, TSH, ETH, MAN, BUF, NMA)
- 44 District Municipalities
- 214 Local Municipalities (Sub-Regions)

**Provinces:**
- Eastern Cape: 38 municipalities
- Free State: 20 municipalities
- Gauteng: 11 municipalities
- KwaZulu-Natal: 43 municipalities
- Limpopo: 25 municipalities
- Mpumalanga: 17 municipalities
- Northern Cape: 27 municipalities
- North West: 18 municipalities
- Western Cape: 30 municipalities

---

## Post-Creation Tasks

1. **Notify Users** - Send welcome emails with login credentials
2. **Password Change** - Require password change on first login
3. **MFA Setup** - Consider enabling multi-factor authentication
4. **Training** - Provide admin training materials
5. **Documentation** - Share user guides and manuals

---

## Maintenance

### Re-running the Script

The script is **idempotent** - safe to run multiple times:
- Existing users are skipped
- Only new municipalities get users created
- No duplicate users are created

### Adding New Municipalities

When new municipalities are added to the database:
1. Run the script again
2. It will create users only for new municipalities
3. Existing users remain unchanged

---

## Security Considerations

⚠️ **Important Security Notes:**

1. **Default Password** - All users start with `EFF@2024`
   - Change this in production
   - Implement password change requirement
   - Consider random password generation

2. **Password Storage** - Uses bcrypt hashing
   - Secure by default
   - Industry standard
   - Resistant to rainbow table attacks

3. **Email Addresses** - Predictable format
   - Consider adding random component for security
   - Implement email verification
   - Monitor for unauthorized access attempts

4. **Access Control** - Municipal admins have broad access
   - Review permissions regularly
   - Implement audit logging
   - Monitor for suspicious activity

---

## Support

If you encounter issues:
1. Check database connection
2. Verify municipality data exists
3. Check for duplicate emails
4. Review error messages
5. Check database logs

---

**Last Updated:** 2025-11-09

