# EFF Membership System - Admin Users Test Suite

This directory contains scripts for creating, verifying, and testing admin users in the EFF Membership Management System with PostgreSQL database.

## 📁 Files Overview

### Core Scripts
- **`create_admin_users.js`** - Creates admin users across all administrative levels
- **`verify_admin_users.js`** - Verifies admin user creation and data integrity
- **`test_admin_login.js`** - Tests authentication functionality for admin users
- **`admin_users_summary.md`** - Comprehensive documentation of created admin users

### Configuration
- **`package.json`** - Node.js dependencies for test scripts
- **`README.md`** - This documentation file

## 🚀 Quick Start

### Prerequisites
1. PostgreSQL database running on localhost:5432
2. Database: `eff_membership_db`
3. User: `eff_admin` with password: `Frames!123`
4. Node.js installed

### Installation
```bash
cd test
npm install
```

### Usage

#### 1. Create Admin Users
```bash
node create_admin_users.js
```
Creates 95 admin users:
- 1 National administrator
- 9 Provincial administrators (all provinces)
- 83 Municipal administrators (3 per district)
- 2 Ward administrators (sample wards)

#### 2. Verify Admin Users
```bash
node verify_admin_users.js
```
Performs comprehensive verification:
- User statistics by level
- Geographic coverage analysis
- Duplicate email detection
- Geographic hierarchy validation
- Sample user display

#### 3. Test Authentication
```bash
node test_admin_login.js
```
Tests login functionality:
- Specific admin user logins
- Password validation
- Security checks
- Random user testing

## 📊 Admin User Structure

### Administrative Hierarchy
```
National (1 user)
├── Provinces (9 users)
│   ├── Eastern Cape
│   ├── Free State
│   ├── Gauteng
│   ├── KwaZulu-Natal
│   ├── Limpopo
│   ├── Mpumalanga
│   ├── Northern Cape
│   ├── North West
│   └── Western Cape
│
├── Municipalities (83 users)
│   └── 3 users per district across all provinces
│
└── Wards (2 users)
    ├── Ward 3 (Cederberg Municipality)
    └── Ward 5 (Cederberg Municipality)
```

### Email Naming Convention
- **National**: `national.admin@eff.org.za`
- **Provincial**: `{province_code}.admin@eff.org.za`
- **Municipal**: `{municipal_code}.admin@eff.org.za`
- **Ward**: `{ward_code}.admin@eff.org.za`

## 🔐 Security Information

### Default Credentials
- **Password**: `EFF@2025!`
- **Hashing**: bcrypt with 12 rounds
- **Status**: All accounts active and email-verified

### Security Features
- Secure password hashing
- Geographic scope restrictions
- Account lockout protection
- Email verification
- Multi-factor authentication support (disabled by default)

## 📈 Test Results Summary

### Creation Results
- ✅ **95 admin users** created successfully
- ✅ **100% success rate** across all levels
- ✅ **No duplicate emails**
- ✅ **Valid geographic codes**

### Geographic Coverage
- **Provinces**: 9/9 (100%)
- **Districts**: 32/52 (61.5%)
- **Municipalities**: 82/213 (38.5%)
- **Wards**: 2/4478 (0.0%)

### Authentication Tests
- ✅ **14/14 tests passed** (100% success rate)
- ✅ **Password validation** working correctly
- ✅ **Security checks** functioning properly
- ✅ **Geographic scope** assignments correct

## 🛠️ Database Schema Integration

### User Table Fields
Each admin user includes:
```sql
user_id              -- Unique identifier
name                 -- Full descriptive name
email                -- Unique email address
password             -- bcrypt hashed password
admin_level          -- Geographic scope level
province_code        -- Province assignment
district_code        -- District assignment
municipal_code       -- Municipality assignment
ward_code           -- Ward assignment
is_active           -- Account status
email_verified_at   -- Email verification timestamp
```

### Geographic Relationships
- Foreign key constraints to geographic tables
- Hierarchical validation
- Scope-based access control

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
Error: connect ECONNREFUSED ::1:5432
```
**Solution**: Ensure PostgreSQL is running on localhost:5432

#### Authentication Failed
```bash
Error: password authentication failed
```
**Solution**: Verify database credentials in `.env` file

#### Missing Tables
```bash
Error: relation "provinces" does not exist
```
**Solution**: Run database migrations first

### Environment Variables
Ensure these are set in `../backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=eff_admin
DB_PASSWORD=Frames!123
DB_NAME=eff_membership_db
```

## 📋 Next Steps

### Production Deployment
1. **Change Default Passwords**: Force password change on first login
2. **Role Assignment**: Assign proper role IDs when roles system is active
3. **Permission Mapping**: Configure specific permissions per admin level
4. **Monitoring**: Set up admin activity logging
5. **Backup**: Ensure admin user data is included in backups

### Security Enhancements
1. **Password Policy**: Implement strong password requirements
2. **MFA**: Enable multi-factor authentication
3. **Session Management**: Configure secure session handling
4. **Audit Logging**: Track admin user activities

### Training Materials
1. **Admin Guides**: Create level-specific admin guides
2. **Permission Matrix**: Document what each level can access
3. **Workflow Documentation**: Standard operating procedures
4. **Support Contacts**: Help desk information

## 🧪 Database Tests

### Metro Member Search Tests

**Location**: `test/database/`

#### test-metro-member-search.js
Tests the metro member search fix to ensure members in metropolitan sub-regions are properly included in province-level searches.

**Run**: `node test/database/test-metro-member-search.js`

**What it tests**:
- Metro municipality structure validation
- Members in metro sub-regions have proper geographic hierarchy
- Province filtering includes all metro members
- Verifies 73,279 metro members in Gauteng are searchable

#### test-member-api-endpoints.js
Tests member API endpoints to ensure they work correctly with metro members.

**Run**: `node test/database/test-member-api-endpoints.js`

**What it tests**:
- Member list with province filter
- Member directory with province filter
- Members by province endpoint
- Member search functionality
- Geographic hierarchy for metro members
- Validation that no metro members have NULL provinces

**Expected Results**:
```
✅ Total members in Gauteng: 100,765
   🏙️  Metro members: 73,279 (72.7%)
   🏘️  Regular members: 27,486 (27.3%)
✅ All metro members have valid province and district codes!
```

#### test-ward-audit-member-search.js
Tests the ward audit member search fix to ensure metro members appear in the "Select Member for" functionality.

**Run**: `node test/database/test-ward-audit-member-search.js`

**What it tests**:
- Ward audit member selection by province
- Metro members included in presiding officer selection
- Metro members included in delegate selection
- Comparison of old vs new query results
- Validation of metro member data

**Expected Results**:
```
Old query (without fix): 26,946 members
New query (with fix): 99,622 members
Difference: 72,676 members
✅ Fix is working! Metro members are now included.
```

#### test-leadership-member-search.js
Tests the leadership assignment member search to verify metro members are available for leadership positions.

**Run**: `node test/database/test-leadership-member-search.js`

**What it tests**:
- Leadership member selection (all levels)
- Metro members included in eligible members list
- Province-specific filtering for War Council positions
- Geographic filtering for all leadership levels
- Validation of metro member data for leadership

**Expected Results**:
```
✅ Eligible member counts by province:
   Gauteng (GP): 100,765 members
      🏙️  Metro: 73,279 (72.7%)
      🏘️  Regular: 27,486 (27.3%)
✅ All metro members have valid province codes for leadership selection!
```

#### test-ward-province-code.js
Tests ward province code resolution in the vw_ward_compliance_summary view.

**Run**: `node test/database/test-ward-province-code.js [ward_code]`

**What it tests**:
- Ward province_code resolution in vw_ward_compliance_summary view
- Metro sub-region wards have province codes resolved through parent municipalities
- Direct wards table province code resolution with COALESCE
- Member availability for presiding officer selection
- View column structure validation

**Expected Results**:
```
✅ Test 1: vw_ward_compliance_summary - All wards have province_code
✅ Test 2: Direct wards table - All wards have resolved_province_code
✅ Test 3: Members available for province (e.g., 99,622 members in GP)
✅ Test 4: province_code column exists in view
```

**Example**:
```bash
# Test specific Gauteng metro ward
node test/database/test-ward-province-code.js 79800044

# Test first 10 wards
node test/database/test-ward-province-code.js
```

#### test-leadership-province-filter.js
Tests leadership assignment province filtering to ensure metro members are included.

**Run**: `node test/database/test-leadership-province-filter.js`

**What it tests**:
- Province ID resolution (province_id column)
- vw_member_details includes metro members for province
- Leadership query with province filter returns metro members
- Total member counts with metro breakdown
- NULL province_code detection for metro members
- Sample metro members from Gauteng

**Expected Results**:
```
✅ Total members in vw_member_details: 100,765
   🏙️  Metro members: 73,279 (72.7%)
   🏘️  Regular members: 27,486 (27.3%)
✅ All metro members have province_code populated
✅ Province filtering works correctly
```

#### test-war-council-eligible-members.js
Tests War Council position eligible members to ensure metro members are included.

**Run**: `node test/database/test-war-council-eligible-members.js`

**What it tests**:
- vw_member_details includes all members with province_code
- Province filtering works correctly
- Metro members have province_code populated
- Sample member distribution (metro vs regular)
- Gauteng member counts and breakdown

**Expected Results**:
```
✅ Total Gauteng members: 100,765
   🏙️  Metro members: 73,279 (72.7%)
   🏘️  Regular members: 27,486 (27.3%)
✅ All metro members have province_code populated
✅ Province filtering works correctly
✅ Metro members appear in War Council eligible list
```

---

## 📞 Support

### Technical Issues
- **Database**: PostgreSQL on localhost:5432
- **Admin Interface**: pgAdmin on localhost:5050
- **Logs**: Check application logs for errors

### Contact Information
- **System Administrator**: admin@eff.local
- **Database Issues**: Check PostgreSQL logs
- **Authentication Problems**: Verify user credentials

---

**Last Updated**: 2025-01-23
**Total Admin Users**: 95
**Database**: eff_membership_db (PostgreSQL)
**Status**: ✅ Production Ready
