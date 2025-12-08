# Role Lookup Fix Documentation

## Problem
The system was failing to create users with the error:
```
ValidationError: Role provincial_admin not found
```

## Root Cause
There was a mismatch between:
1. **Frontend/API**: Sending role names like `provincial_admin`, `municipal_admin`, etc.
2. **Database**: Storing role names as `Provincial Administrator`, `Municipal Administrator`, etc.
3. **Code**: Looking up roles by `name` column when the actual column is `role_name`
4. **Joins**: Using `r.id` when the actual primary key is `role_id`

## Database Schema
The `roles` table has the following structure:
```sql
CREATE TABLE roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  role_code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Available Roles**:
| ID | Role Name | Role Code |
|----|-----------|-----------|
| 1 | Super Administrator | SUPER_ADMIN |
| 2 | National Administrator | NATIONAL_ADMIN |
| 3 | Provincial Administrator | PROVINCIAL_ADMIN |
| 4 | District Administrator | DISTRICT_ADMIN |
| 5 | Municipal Administrator | MUNICIPAL_ADMIN |
| 6 | Ward Administrator | WARD_ADMIN |
| 7 | Member | MEMBER |
| 8 | Guest | GUEST |

## Solution Implemented

### 1. Role Name Mapping
Added a mapping function in `UserManagementService.createUserDirectly()` to convert common role name variations:

```typescript
const roleNameMapping: { [key: string]: string } = {
  'provincial_admin': 'Provincial Administrator',
  'province_admin': 'Provincial Administrator',
  'municipal_admin': 'Municipal Administrator',
  'municipality_admin': 'Municipal Administrator',
  'district_admin': 'District Administrator',
  'ward_admin': 'Ward Administrator',
  'national_admin': 'National Administrator',
  'super_admin': 'Super Administrator',
  'member': 'Member',
  'guest': 'Guest'
};
```

### 2. Flexible Role Lookup
Updated the role lookup query to search by multiple criteria:

```typescript
const role = await executeQuerySingle(`
  SELECT role_id as id, role_name as name FROM roles 
  WHERE role_name = $1 OR role_code = $2 OR LOWER(role_name) = LOWER($3)
  LIMIT 1`, [roleName, requestData.role_name.toUpperCase(), requestData.role_name]);
```

This searches by:
- Exact `role_name` match (e.g., "Provincial Administrator")
- `role_code` match (e.g., "PROVINCIAL_ADMIN")
- Case-insensitive `role_name` match

### 3. Fixed Database Joins
Updated all queries that join `users` and `roles` tables:

**Before**:
```sql
LEFT JOIN roles r ON u.role_id = r.id
```

**After**:
```sql
LEFT JOIN roles r ON u.role_id = r.role_id
```

**Before**:
```sql
SELECT r.name as role_name FROM roles
```

**After**:
```sql
SELECT r.role_name as role_name FROM roles
```

## Files Modified

### 1. `backend/src/services/userManagementService.ts`
- Added role name mapping
- Updated role lookup query to use `role_id` and `role_name`
- Fixed join in `requiresApproval()` method

### 2. `backend/src/models/users.ts`
- Fixed `getUserByEmail()` join: `r.id` → `r.role_id`
- Fixed `getUsers()` join: `r.id` → `r.role_id`
- Updated column references: `r.name` → `r.role_name`

### 3. `backend/src/models/roles.ts`
- Updated `getAllRoles()` to use `role_id` and `role_name`
- Updated `getRoleById()` to use `role_id` and PostgreSQL syntax (`$1`)
- Updated `getRoleByName()` to search by both `role_name` and `role_code`

### 4. `backend/src/routes/adminManagement.ts`
- Fixed users query join: `r.id` → `r.role_id`
- Updated column references: `r.name` → `r.role_name`
- Fixed column alias: `u.id` → `u.user_id as id`

## Testing

### Test Role Lookup
```bash
node backend/scripts/check-roles.js
```

This script displays all available roles in the database.

### Test User Creation
```bash
curl -X POST http://localhost:5000/api/v1/admin-management/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Admin@123",
    "admin_level": "province",
    "role_name": "provincial_admin",
    "province_code": "GP"
  }'
```

## Supported Role Name Formats

The system now accepts multiple formats for role names:

| Frontend Input | Database Role Name |
|----------------|-------------------|
| `provincial_admin` | Provincial Administrator |
| `province_admin` | Provincial Administrator |
| `PROVINCIAL_ADMIN` | Provincial Administrator |
| `Provincial Administrator` | Provincial Administrator |
| `municipal_admin` | Municipal Administrator |
| `municipality_admin` | Municipal Administrator |
| `MUNICIPAL_ADMIN` | Municipal Administrator |
| `Municipal Administrator` | Municipal Administrator |
| `district_admin` | District Administrator |
| `ward_admin` | Ward Administrator |
| `national_admin` | National Administrator |
| `super_admin` | Super Administrator |

## Best Practices

1. **Frontend**: Use lowercase with underscores (e.g., `provincial_admin`)
2. **Database**: Use proper case with spaces (e.g., `Provincial Administrator`)
3. **Code**: Use the mapping function to convert between formats
4. **Queries**: Always use `role_id` for joins and `role_name` for display

## Future Improvements

1. Consider standardizing on one format (either snake_case or Title Case)
2. Add database migration to ensure consistency
3. Update frontend to use role codes instead of names
4. Add validation to ensure role names are always valid

## Related Issues

- User deletion functionality added (see `USER_DELETION_GUIDE.md`)
- Hard delete endpoints created for complete user removal
- Audit logging preserved for compliance

