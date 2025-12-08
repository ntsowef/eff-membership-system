# User Deletion Guide

## Overview
This guide explains how to delete users from the EFF Membership Management System. The system supports both **soft delete** (deactivation) and **hard delete** (permanent removal).

---

## Deletion Methods

### 1. Soft Delete (Deactivation)
**What it does**: Sets `is_active = FALSE` for the user. The user record remains in the database but the user cannot login.

**When to use**: 
- Temporary suspension
- When you want to preserve user history
- When you might need to reactivate the user later

**Method**: Use the existing `UserModel.deleteUser(id)` method

---

### 2. Hard Delete (Permanent Removal)
**What it does**: Completely removes the user and related records from the database.

**When to use**:
- GDPR/data privacy compliance requests
- Removing test accounts
- Permanent account closure

**⚠️ WARNING**: This action is **irreversible**. All user data will be permanently deleted.

---

## Hard Delete Implementation

### Method 1: Using Node.js Script (Recommended)

**Delete by Email**:
```bash
node backend/scripts/delete-user.js <email>
```

**Example**:
```bash
node backend/scripts/delete-user.js ntsowef@gmail.com
```

**Verify Deletion**:
```bash
node backend/scripts/verify-user-deletion.js <email>
```

---

### Method 2: Using API Endpoints

#### Delete by User ID
```bash
DELETE /api/v1/admin-management/users/:id/hard-delete
```

**Example**:
```bash
curl -X DELETE http://localhost:5000/api/v1/admin-management/users/12600/hard-delete \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "user_id": 12600,
    "user_email": "ntsowef@gmail.com",
    "user_name": "Florence Ntsowe"
  },
  "message": "User Florence Ntsowe (ntsowef@gmail.com) has been permanently deleted from the system",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

#### Delete by Email
```bash
DELETE /api/v1/admin-management/users/by-email/:email
```

**Example**:
```bash
curl -X DELETE http://localhost:5000/api/v1/admin-management/users/by-email/ntsowef@gmail.com \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json"
```

---

### Method 3: Using SQL Script

**Execute SQL**:
```bash
psql -h localhost -U eff_admin -d eff_membership_database -f database-recovery/delete_user_ntsowef.sql
```

---

## What Gets Deleted

When a user is hard deleted, the following records are removed:

1. ✅ **User record** from `users` table
2. ✅ **OTP codes** from `user_otp_codes` table
3. ✅ **User creation workflows** (if table exists)
4. ℹ️ **Audit logs** are **preserved** for compliance purposes

---

## Security & Permissions

### Required Permission
- `users.delete` permission
- National Admin level recommended

### Self-Deletion Protection
- Users **cannot delete their own account** via API
- This prevents accidental self-lockout

---

## Using the UserModel Methods

### Hard Delete by ID
```typescript
import { UserModel } from '../models/users';

const success = await UserModel.hardDeleteUser(userId);
if (success) {
  console.log('User deleted successfully');
}
```

### Hard Delete by Email
```typescript
import { UserModel } from '../models/users';

const result = await UserModel.hardDeleteUserByEmail('user@example.com');
if (result.success) {
  console.log(`User ${result.userName} (ID: ${result.userId}) deleted`);
}
```

---

## Audit Trail

All deletion operations are logged in the `audit_logs` table with:
- Action: `DELETE`
- Entity Type: `USER`
- User ID of the deleted user
- User ID of the admin who performed the deletion
- Timestamp
- IP address and user agent

**Note**: Audit logs are **never deleted** to maintain compliance and accountability.

---

## Best Practices

1. **Always verify** the user details before deletion
2. **Backup the database** before bulk deletions
3. **Document the reason** for deletion (in audit logs or external system)
4. **Notify the user** (if applicable) before deletion
5. **Use soft delete** when possible to preserve history
6. **Use hard delete** only when legally required or for test data

---

## Troubleshooting

### Error: "User not found"
- Verify the email address or user ID is correct
- Check if the user was already deleted

### Error: "Cannot delete self"
- You cannot delete your own account via API
- Use another admin account or SQL script

### Error: "Foreign key constraint"
- Some related records may not be handled by the script
- Check database logs for specific constraint violations
- Manually delete related records if needed

---

## Example: Complete Deletion Workflow

```bash
# 1. Find the user
node backend/scripts/verify-user-deletion.js ntsowef@gmail.com

# 2. Delete the user
node backend/scripts/delete-user.js ntsowef@gmail.com

# 3. Verify deletion
node backend/scripts/verify-user-deletion.js ntsowef@gmail.com
```

**Expected Output**:
```
✅ VERIFIED: User with email ntsowef@gmail.com does NOT exist in the system
   The user has been successfully deleted.

📋 Checking for related records...
   OTP codes: 0
   Audit logs: 0 (preserved for compliance)
```

---

## Compliance Notes

- **GDPR**: Hard delete satisfies "right to be forgotten" requests
- **Audit Logs**: Preserved for legal and compliance requirements
- **Data Retention**: Follow your organization's data retention policies
- **Backup**: Deleted data may still exist in database backups

---

## Support

For issues or questions about user deletion:
1. Check the audit logs for deletion history
2. Review database logs for errors
3. Contact system administrator

