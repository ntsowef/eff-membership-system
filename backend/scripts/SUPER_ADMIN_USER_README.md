# Super Admin User Creation Guide

This guide explains how to create a permanent super admin user for the EFF Membership Management System.

---

## 📋 **Overview**

The super admin user has full access to all system features, including:
- ✅ Super Admin Interface (all 8 pages)
- ✅ System monitoring and configuration
- ✅ Queue management
- ✅ User management and session control
- ✅ Bulk upload management
- ✅ Lookup data management
- ✅ All other system features

---

## 🚀 **Quick Start**

### **Method 1: Using SQL Script (Recommended)**

This is the fastest and most reliable method.

```bash
# Navigate to project root
cd C:/Development/NewProj/Membership-newV2

# Run the SQL script (Windows PowerShell)
# Replace 'postgres' with your PostgreSQL username if different
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U postgres -d eff_membership_database -f backend/scripts/create-super-admin.sql
```

**Default Credentials Created:**
- 📧 **Email**: `superadmin@eff.org.za`
- 🔑 **Password**: `SuperAdmin@2024!`

---

### **Method 2: Using Node.js Script**

```bash
# Navigate to project root
cd C:/Development/NewProj/Membership-newV2

# Run the Node.js script
node backend/scripts/create-super-admin.js
```

This script will:
1. Check if the `super_admin` role exists (create if not)
2. Check if the super admin user exists
3. Create the user with secure password hashing
4. Display the credentials

---

### **Method 3: Manual SQL Commands**

If you prefer to run SQL commands manually:

```sql
-- Connect to database
psql -h localhost -U postgres -d eff_membership_database

-- 1. Create super_admin role (if not exists)
INSERT INTO roles (role_name, description, created_at)
VALUES ('super_admin', 'Super Administrator with full system access', CURRENT_TIMESTAMP)
ON CONFLICT (role_name) DO NOTHING;

-- 2. Create super admin user
-- Password: SuperAdmin@2024! (pre-hashed with bcrypt)
INSERT INTO users (
    name, 
    email, 
    password, 
    role_id, 
    admin_level,
    cell_number,
    is_active, 
    email_verified_at, 
    created_at
) VALUES (
    'Super Administrator',
    'superadmin@eff.org.za',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjWZifHm.',
    (SELECT role_id FROM roles WHERE role_name = 'super_admin'),
    'national',
    '+27123456789',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
    role_id = (SELECT role_id FROM roles WHERE role_name = 'super_admin'),
    admin_level = 'national',
    is_active = TRUE;

-- 3. Verify the user was created
SELECT 
    u.user_id,
    u.name,
    u.email,
    r.role_name,
    u.admin_level,
    u.is_active
FROM users u
JOIN roles r ON u.role_id = r.role_id
WHERE u.email = 'superadmin@eff.org.za';
```

---

## 🔐 **Default Credentials**

After running any of the above methods, you can login with:

- 📧 **Email**: `superadmin@eff.org.za`
- 🔑 **Password**: `SuperAdmin@2024!`

---

## ⚠️ **IMPORTANT SECURITY NOTICE**

### **Immediately After First Login:**

1. **Change the default password**
   - Navigate to Profile Settings
   - Use a strong, unique password
   - Minimum 12 characters with uppercase, lowercase, numbers, and symbols

2. **Enable MFA (if available)**
   - Add an extra layer of security
   - Use authenticator app or SMS

3. **Review user permissions**
   - Ensure only authorized personnel have super admin access
   - Create role-specific admin accounts for other users

4. **Keep credentials secure**
   - Never share super admin credentials
   - Use a password manager
   - Enable audit logging

---

## 🧪 **Testing the Super Admin User**

### **1. Login to the System**

```
URL: http://localhost:3000/login
Email: superadmin@eff.org.za
Password: SuperAdmin@2024!
```

### **2. Verify Super Admin Menu**

After login, you should see a "Super Admin" menu item in the sidebar with 8 sub-items:
- Dashboard
- System Monitoring
- Queue Management
- User Management
- Bulk Upload Management
- Configuration
- Lookup Data
- Audit & Logs

### **3. Access Super Admin Dashboard**

Navigate to: `http://localhost:3000/admin/super-admin/dashboard`

You should see:
- System statistics cards
- Health monitoring cards
- Real-time metrics

### **4. Test API Access**

```bash
# Get JWT token after login (from browser DevTools → Application → Local Storage)
# Then test an API endpoint:

curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/v1/super-admin/dashboard
```

---

## 🔧 **Troubleshooting**

### **Issue: "Role super_admin not found"**

**Solution**: The script automatically creates the role. If you see this error, run:

```sql
INSERT INTO roles (role_name, description, created_at)
VALUES ('super_admin', 'Super Administrator with full system access', CURRENT_TIMESTAMP);
```

### **Issue: "User already exists"**

**Solution**: The script will update the existing user to super_admin role. If you want to reset the password:

```sql
UPDATE users 
SET password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjWZifHm.'
WHERE email = 'superadmin@eff.org.za';
```

### **Issue: "Cannot connect to database"**

**Solution**: Ensure PostgreSQL is running and credentials in `.env` are correct:

```bash
# Check if PostgreSQL is running
# Windows: Check Services or Task Manager
# Or try connecting manually:
psql -h localhost -U postgres -d eff_membership_database
```

### **Issue: "Super Admin menu not visible"**

**Solution**: 
1. Clear browser cache and local storage
2. Logout and login again
3. Verify user has `role_name = 'super_admin'` in database
4. Check browser console for errors

---

## 📚 **Additional Resources**

- **Super Admin Testing Guide**: `SUPER_ADMIN_TESTING_GUIDE.md`
- **Implementation Progress**: `SUPER_ADMIN_IMPLEMENTATION_PROGRESS.md`
- **Complete Summary**: `SUPER_ADMIN_IMPLEMENTATION_COMPLETE.md`

---

## 🎉 **Success!**

Once you've successfully created and tested the super admin user, you have full access to manage the entire EFF Membership Management System!

**Next Steps:**
1. Change the default password
2. Create additional admin users with appropriate roles
3. Configure system settings via Super Admin Interface
4. Set up monitoring and alerts
5. Review and configure rate limits and queue settings

---

**For support or questions, refer to the documentation or contact the development team.**

