# Test User Management Scripts

This directory contains scripts for creating and deleting test users for the EFF Membership System.

---

## 📁 Files

| File | Description |
|------|-------------|
| `create-test-users.js` | Creates 20 Test National Admin users for concurrent upload testing |
| `delete-test-users.js` | Deletes all Test National Admin users and their related records |

---

## 🗑️ Delete Test Users

### Quick Start

```bash
# Navigate to the script directory
cd test/setup

# Run the deletion script
node delete-test-users.js
```

### What Gets Deleted

The script will delete:
- ✅ All users with name pattern: `Test National Admin {number}`
- ✅ All users with email pattern: `test.national.admin{number}@eff.test.local`
- ✅ Related OTP codes
- ✅ Related user creation workflows

**Preserved for compliance:**
- ✅ Audit logs (kept for compliance and tracking)

### Example Output

```
🔍 Connecting to database...
✅ Connected to database

🔍 Searching for Test National Admin users...

📋 Found 20 Test National Admin user(s):

1. Test National Admin 1
   Email: test.national.admin1@eff.test.local
   User ID: 123
   Admin Level: national
   Created: 2024-01-15 10:30:00

2. Test National Admin 2
   Email: test.national.admin2@eff.test.local
   User ID: 124
   Admin Level: national
   Created: 2024-01-15 10:30:01

...

⚠️  WARNING: This will permanently delete these users and their related records!
⚠️  Audit logs will be preserved for compliance.

🗑️  Starting deletion process...

Deleting: Test National Admin 1 (test.national.admin1@eff.test.local)...
  ↳ Also deleted: 2 OTP code(s), 1 workflow(s)
  ✅ Deleted successfully

Deleting: Test National Admin 2 (test.national.admin2@eff.test.local)...
  ✅ Deleted successfully

...

═══════════════════════════════════════════════════════
📊 DELETION SUMMARY
═══════════════════════════════════════════════════════
✅ Successfully deleted: 20 user(s)
═══════════════════════════════════════════════════════

👋 Database connection closed
```

---

## 👥 Create Test Users

### Quick Start

```bash
# Navigate to the script directory
cd test/setup

# Run the creation script
node create-test-users.js
```

### What Gets Created

The script creates 20 test users with:
- **Name**: `Test National Admin {1-20}`
- **Email**: `test.national.admin{1-20}@eff.test.local`
- **Password**: `TestAdmin@123`
- **Role**: National Administrator
- **Admin Level**: national
- **MFA**: Disabled (for easy testing)

---

## 🔧 Configuration

Both scripts use the same database configuration:

```javascript
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
};
```

### Using Environment Variables

You can override the defaults using environment variables:

```bash
# Linux/Mac
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=eff_admin
export DB_PASSWORD=Frames!123
export DB_NAME=eff_membership_database

# Windows PowerShell
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_USER="eff_admin"
$env:DB_PASSWORD="Frames!123"
$env:DB_NAME="eff_membership_database"

# Then run the script
node delete-test-users.js
```

---

## ⚠️ Safety Features

### Delete Script Safety
- ✅ Uses transactions (rollback on error)
- ✅ Shows preview before deletion
- ✅ Preserves audit logs for compliance
- ✅ Deletes related records to avoid orphans
- ✅ Provides detailed summary

### Create Script Safety
- ✅ Checks for existing users (no duplicates)
- ✅ Uses secure password hashing (bcrypt)
- ✅ Validates role exists before creating users

---

## 🧪 Use Cases

### When to Delete Test Users

1. **After Testing**: Clean up after concurrent upload testing
2. **Before Production**: Remove test data before going live
3. **Database Cleanup**: Regular maintenance to remove test accounts
4. **Security**: Remove unused test accounts

### When to Create Test Users

1. **Concurrent Upload Testing**: Test multiple users uploading simultaneously
2. **Load Testing**: Simulate multiple admin users
3. **Permission Testing**: Test role-based access control
4. **UI Testing**: Test multi-user scenarios

---

## 📝 Notes

- **Audit Logs**: Deletion events are logged in audit_logs table
- **Transactions**: All deletions use database transactions for safety
- **Idempotent**: Scripts can be run multiple times safely
- **No Confirmation Prompt**: Scripts run automatically (be careful!)

---

## 🔍 Troubleshooting

### Error: "Role not found"
**Solution**: Make sure the "National Administrator" role exists in the roles table

### Error: "Connection refused"
**Solution**: Check database credentials and ensure PostgreSQL is running

### Error: "Foreign key constraint"
**Solution**: The delete script handles related records automatically. If you still see this error, check for additional foreign key relationships.

---

## 🚀 Quick Commands

```bash
# Delete all test users
cd test/setup && node delete-test-users.js

# Create 20 test users
cd test/setup && node create-test-users.js

# Check if test users exist (using psql)
psql -U eff_admin -d eff_membership_database -c "SELECT user_id, name, email FROM users WHERE name LIKE 'Test National Admin%';"
```

---

## 📚 Related Documentation

- **Admin Management**: `docs/ADMIN_STRUCTURE_SETUP.md`
- **Database Schema**: `docs/database-schema.md`
- **Testing Guide**: `test/README.md`

