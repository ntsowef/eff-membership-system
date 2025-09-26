# Comprehensive Admin Structure Setup

This document provides complete instructions for setting up a comprehensive admin structure for all provinces, regions, municipalities, and wards in the membership system.

## Overview

The admin structure follows the South African geographic hierarchy:
- **National Level**: 1 National Administrator
- **Provincial Level**: 9 Provincial Administrators (one per province)
- **Regional Level**: Regional Administrators (one per region)
- **Municipal Level**: Municipal Administrators (one per municipality)
- **Ward Level**: Ward Administrators (one per ward)

## Files Created

1. **`create_comprehensive_admin_structure.sql`** - Main SQL script to create all admin accounts
2. **`test_admin_logins.js`** - Node.js script to test admin login functionality
3. **`adminManagement.routes.js`** - API routes for admin management
4. **`ADMIN_STRUCTURE_SETUP.md`** - This documentation file

## Setup Instructions

### Step 1: Run the Admin Creation Script

Execute the SQL script to create all admin accounts:

```bash
# Connect to MySQL and run the script
mysql -u root -p membership_system_fresh < docs/create_comprehensive_admin_structure.sql
```

Or run it directly in MySQL:

```sql
USE membership_system_fresh;
SOURCE docs/create_comprehensive_admin_structure.sql;
```

### Step 2: Verify Admin Creation

Run the test script to verify all admins were created successfully:

```bash
cd docs
node test_admin_logins.js
```

### Step 3: Add Admin Management Routes

Add the admin management routes to your server:

```javascript
// In your main server file (server.js or app.js)
const adminManagementRoutes = require('./src/routes/adminManagement.routes');
app.use('/api/admin-management', adminManagementRoutes);
```

## Admin Account Structure

### Default Credentials

All admin accounts are created with the default password: **`password123`**

**⚠️ IMPORTANT**: Change these passwords in production!

### Admin Levels and Access

#### National Admin
- **Email**: `national.admin@eff.org.za`
- **Scope**: Full system access
- **Can manage**: All provinces, regions, municipalities, wards, and members

#### Provincial Admins
- **Email Pattern**: `{province}.admin@eff.org.za`
- **Examples**:
  - `gauteng.admin@eff.org.za`
  - `westerncape.admin@eff.org.za`
  - `kwazulunatal.admin@eff.org.za`
- **Scope**: Province-specific access
- **Can manage**: All regions, municipalities, and wards within their province

#### Regional Admins
- **Email Pattern**: `{region.name}.region.admin@eff.org.za`
- **Example**: `johannesburg.region.admin@eff.org.za`
- **Scope**: Region-specific access
- **Can manage**: All municipalities and wards within their region

#### Municipal Admins
- **Email Pattern**: `{municipality.name}.municipal.admin@eff.org.za`
- **Example**: `city.of.johannesburg.municipal.admin@eff.org.za`
- **Scope**: Municipality-specific access
- **Can manage**: All wards within their municipality

#### Ward Admins
- **Email Pattern**: `ward.{ward_number}.{municipality}.admin@eff.org.za`
- **Example**: `ward.77.city.of.johannesburg.admin@eff.org.za`
- **Scope**: Ward-specific access
- **Can manage**: Only their specific ward

## Database Schema

### Users Table Structure

The admin accounts are stored in the `users` table with the following structure:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  admin_level ENUM('national', 'province', 'region', 'municipality', 'ward', 'none') DEFAULT 'none',
  province_id INT,
  region_id INT,
  municipality_id INT,
  ward_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Admin Hierarchy View

A view is created to easily visualize the admin hierarchy:

```sql
CREATE OR REPLACE VIEW admin_hierarchy_view AS
SELECT 
    u.id as user_id,
    u.name as admin_name,
    u.email,
    u.admin_level,
    u.is_active,
    CASE 
        WHEN u.admin_level = 'national' THEN 'National Level'
        WHEN u.admin_level = 'province' THEN CONCAT(p.name, ' Province')
        WHEN u.admin_level = 'region' THEN CONCAT(r.name, ' Region, ', p.name, ' Province')
        WHEN u.admin_level = 'municipality' THEN CONCAT(m.name, ' Municipality, ', r.name, ' Region, ', p.name, ' Province')
        WHEN u.admin_level = 'ward' THEN CONCAT(w.name, ', ', m.name, ' Municipality, ', r.name, ' Region, ', p.name, ' Province')
        ELSE 'No Assignment'
    END as full_hierarchy,
    u.created_at
FROM users u
LEFT JOIN provinces p ON u.province_id = p.id
LEFT JOIN regions r ON u.region_id = r.id
LEFT JOIN municipalities m ON u.municipality_id = m.id
LEFT JOIN wards w ON u.ward_id = w.id
WHERE u.role = 'admin';
```

## API Endpoints

### Admin Management API

The following API endpoints are available for admin management:

#### Get Admin Hierarchy
```
GET /api/admin-management/hierarchy
```
Returns complete admin hierarchy (National Admin only)

#### Get Admin Statistics
```
GET /api/admin-management/statistics
```
Returns admin statistics by level (National Admin only)

#### Create New Admin
```
POST /api/admin-management/create
```
Creates a new admin user (National Admin only)

#### Update Admin Status
```
PUT /api/admin-management/:id/status
```
Activate/deactivate admin user (National Admin only)

#### Get My Admin Scope
```
GET /api/admin-management/my-scope
```
Returns current admin's scope and permissions

## Testing Admin Logins

### Frontend Testing

1. Navigate to: `http://localhost:3001/login`
2. Use any admin email from the created accounts
3. Use password: `password123`
4. Each admin will have access to their hierarchical scope

### Sample Login Credentials

```
National Admin:
Email: national.admin@eff.org.za
Password: password123

Gauteng Provincial Admin:
Email: gauteng.admin@eff.org.za
Password: password123

Sample Municipal Admin:
Email: city.of.johannesburg.municipal.admin@eff.org.za
Password: password123
```

## Security Considerations

### Password Security
- All accounts use the same default password for initial setup
- **MUST** be changed in production
- Consider implementing password reset functionality

### Access Control
- Each admin level has specific scope restrictions
- Higher-level admins can manage lower-level entities
- Ward admins can only access their specific ward

### Audit Trail
- All admin actions should be logged
- Consider implementing admin activity tracking
- Monitor login attempts and access patterns

## Maintenance

### Adding New Admins

To add new admins for new geographic entities:

```sql
-- Example: Add admin for new ward
INSERT INTO users (name, email, password, role, admin_level, province_id, region_id, municipality_id, ward_id, is_active)
VALUES (
  'New Ward Admin',
  'ward.123.new.municipality.admin@eff.org.za',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  'ward',
  6, -- province_id
  48, -- region_id  
  11, -- municipality_id
  123, -- ward_id
  TRUE
);
```

### Deactivating Admins

```sql
-- Deactivate an admin
UPDATE users 
SET is_active = FALSE, updated_at = NOW() 
WHERE id = ? AND role = 'admin';
```

### Monitoring Admin Activity

```sql
-- Get admin login statistics
SELECT 
  admin_level,
  COUNT(*) as total_admins,
  COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_last_30_days,
  COUNT(CASE WHEN last_login IS NULL THEN 1 END) as never_logged_in
FROM users 
WHERE role = 'admin'
GROUP BY admin_level;
```

## Troubleshooting

### Common Issues

1. **Admin can't login**: Check if account is active and password is correct
2. **Access denied**: Verify admin level and scope permissions
3. **Missing geographic data**: Ensure provinces, regions, municipalities, and wards exist

### Verification Queries

```sql
-- Check admin count by level
SELECT admin_level, COUNT(*) as count 
FROM users 
WHERE role = 'admin' 
GROUP BY admin_level;

-- Check geographic coverage
SELECT 
  'Provinces' as level,
  COUNT(DISTINCT province_id) as with_admins,
  (SELECT COUNT(*) FROM provinces) as total
FROM users 
WHERE role = 'admin' AND admin_level = 'province';
```

## Support

For issues or questions regarding the admin structure setup:

1. Check the verification queries in the SQL script
2. Run the test script to identify specific problems
3. Review the API endpoints for admin management functionality
4. Ensure all geographic entities exist before creating admins
