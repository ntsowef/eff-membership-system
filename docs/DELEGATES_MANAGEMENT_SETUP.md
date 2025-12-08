# Delegates Management Module - Setup & Configuration

## Overview

The Delegates Management module is now an **independent module** (not nested under Ward Audit System) with its own permissions and access controls. This module provides organization-wide oversight of all delegates for SRPA, PPA, and NPA conferences.

---

## Module Structure

### **Independent Module**
- **Location in Sidebar**: Top-level menu item (not nested)
- **Icon**: Groups icon
- **Path**: `/admin/delegates-management`
- **Visibility**: Based on permissions, not admin level restrictions

---

## Permissions Setup

### **Required Permissions**

The module uses the following permissions:

1. **ward_audit.read** - View ward audit data and delegates information
2. **ward_audit.manage_delegates** - Assign and manage ward delegates
3. **delegates.read** - View delegates information
4. **delegates.manage** - Manage delegates (assign, update, remove)
5. **delegates.export** - Export delegates data and reports

### **Permission Assignment by Role**

| Role | Permissions |
|------|-------------|
| **National Admin** | All permissions (read, manage, export, approve) |
| **Provincial Admin** | All permissions (read, manage, export, approve) |
| **District Admin** | Read, manage, export (no approve) |
| **Municipal Admin** | Read, manage, export (no approve) |
| **Ward Admin** | No access |

---

## Database Migration

### **Run the Migration Script**

Execute the following SQL script to set up permissions:

```bash
# For PostgreSQL
psql -U your_username -d your_database -f backend/migrations/delegates_management_permissions.sql

# Or using your database client
# Run: backend/migrations/delegates_management_permissions.sql
```

### **What the Migration Does**

1. Creates new permissions in the `permissions` table
2. Assigns permissions to appropriate roles via `role_permissions` table
3. Verifies permissions were added correctly
4. Shows which roles have delegates management permissions

---

## Frontend Configuration

### **Sidebar Menu Item**

The Delegates Management module appears as an independent menu item:

```typescript
{
  id: 'delegates-management',
  label: 'Delegates Management',
  icon: <Groups />,
  path: '/admin/delegates-management',
  requireDelegatesManagement: true, // Permission check
}
```

### **Permission Checks**

The frontend uses the `useRolePermissions` hook to check access:

```typescript
// In useRolePermissions.ts
canAccessDelegatesManagement: isNationalAdmin || isProvincialAdmin || isDistrictAdmin || isMunicipalAdmin
canManageDelegates: isNationalAdmin || isProvincialAdmin || isDistrictAdmin || isMunicipalAdmin
```

### **Who Can See the Module**

- ✅ National Admin
- ✅ Provincial Admin
- ✅ District Admin
- ✅ Municipal Admin
- ❌ Ward Admin (no access)
- ✅ Super Admin (bypasses all restrictions)

---

## Backend API Endpoints

### **Delegates Management Routes**

All routes are under `/api/v1/delegates-management`:

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/statistics` | `ward_audit.read` | Get delegate statistics |
| GET | `/delegates` | `ward_audit.read` | Get all delegates with filters |
| GET | `/summary` | `ward_audit.read` | Get summary by region |
| GET | `/conference/:assembly_code` | `ward_audit.read` | Get delegates for specific conference |
| PUT | `/delegate/:delegate_id` | `ward_audit.manage_delegates` | Update delegate information |
| DELETE | `/delegate/:delegate_id` | `ward_audit.manage_delegates` | Remove delegate |

### **Ward Audit Routes (Delegate Assignment)**

Routes under `/api/v1/ward-audit`:

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/delegates` | `ward_audit.manage_delegates` | Assign new delegate |
| DELETE | `/delegate/:delegateId` | `ward_audit.manage_delegates` | Remove delegate assignment |

---

## Features

### **1. Delegates Overview**
- View all delegates across the organization
- Filter by province, district, municipality, assembly type, status
- Hierarchical display with geographic breakdown
- Export capabilities

### **2. Summary by Region**
- Province-level summary
- District-level breakdown
- Municipality-level details
- Delegate counts by assembly type

### **3. Conference Delegates**
- View delegates by conference type (SRPA, PPA, NPA)
- Filter by region
- Export conference delegate lists

### **4. Audit Trail**
- Complete history of all delegate operations
- Track assignments, updates, removals
- User accountability with IP addresses
- Before/after value comparison

---

## Testing Access

### **1. Check User Permissions**

```sql
-- Check if user has delegates management permissions
SELECT 
  u.name,
  u.email,
  u.admin_level,
  r.role_name,
  p.permission_name
FROM users u
JOIN roles r ON u.role_id = r.role_id
JOIN role_permissions rp ON r.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
WHERE u.user_id = YOUR_USER_ID
  AND p.category IN ('Ward Audit', 'Delegates Management')
ORDER BY p.permission_name;
```

### **2. Verify Menu Visibility**

1. Log in with different admin levels
2. Check if "Delegates Management" appears in sidebar
3. Verify access to the page

### **3. Test API Endpoints**

```bash
# Get delegate statistics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/delegates-management/statistics

# Get all delegates
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/delegates-management/delegates
```

---

## Troubleshooting

### **Module Not Visible in Sidebar**

**Possible Causes:**
1. User doesn't have required permissions
2. User admin level is 'ward' (ward admins don't have access)
3. Permissions not assigned to user's role

**Solution:**
```sql
-- Check user's role and permissions
SELECT u.name, u.admin_level, r.role_name
FROM users u
JOIN roles r ON u.role_id = r.role_id
WHERE u.user_id = YOUR_USER_ID;

-- Assign permissions if missing
-- Run: backend/migrations/delegates_management_permissions.sql
```

### **403 Forbidden on API Calls**

**Possible Causes:**
1. User doesn't have `ward_audit.read` permission
2. User doesn't have `ward_audit.manage_delegates` permission

**Solution:**
```sql
-- Grant permissions to user's role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'YOUR_ROLE_NAME'
  AND p.permission_name IN ('ward_audit.read', 'ward_audit.manage_delegates')
ON CONFLICT DO NOTHING;
```

---

## Summary

✅ **Delegates Management is now an independent module**
✅ **Accessible to National, Provincial, District, and Municipal admins**
✅ **Permission-based access control**
✅ **Complete audit trail for all operations**
✅ **Hierarchical viewing and management**
✅ **Export and reporting capabilities**

Run the migration script and verify permissions to complete the setup!

