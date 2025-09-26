# Database Migrations

This directory contains database migration files that implement the comprehensive schema according to the PRD requirements.

## Migration Files

### 001_comprehensive_schema_migration.sql
**Purpose**: Implements core missing tables and updates existing schema
**Tables Added/Modified**:
- ✅ `roles` - User role definitions
- ✅ `permissions` - System permissions
- ✅ `role_permissions` - Role-permission mappings
- ✅ `membership_applications` - Application workflow system
- ✅ `documents` - File upload management
- ✅ `voter_verifications` - Voter verification tracking
- ✅ `audit_logs` - System audit trail
- ✅ Updated `users` table with additional fields
- ✅ Updated `notifications` table with enhanced features
- ✅ Updated `members` table to align with PRD

### 002_meeting_leadership_tables.sql
**Purpose**: Implements meeting and leadership management system
**Tables Added**:
- ✅ `meetings` - Meeting scheduling and management
- ✅ `meeting_agenda_items` - Meeting agenda management
- ✅ `meeting_attendance` - Attendance tracking
- ✅ `meeting_minutes` - Meeting minutes and approval
- ✅ `leadership_positions` - Leadership position definitions
- ✅ `leadership_appointments` - Leadership appointments
- ✅ `leadership_elections` - Election management
- ✅ `leadership_election_candidates` - Election candidates
- ✅ `leadership_election_votes` - Voting system

## Running Migrations

### Prerequisites
1. Ensure your `.env` file is configured with database credentials
2. Database should exist (create it if it doesn't)
3. Run `npm install` to ensure dependencies are available

### Commands

#### Run All Pending Migrations
```bash
npm run migrate
```

#### Check Migration Status
```bash
npm run migrate:status
```

#### Manual Execution
```bash
# Run migrations
node run-migrations.js run

# Check status
node run-migrations.js status
```

## Migration Features

### ✅ **Safe Execution**
- Tracks executed migrations to prevent re-execution
- Uses transactions for atomic operations
- Includes rollback safety with foreign key constraints

### ✅ **Comprehensive Logging**
- Execution time tracking
- Detailed success/error reporting
- Migration history maintenance

### ✅ **Production Ready**
- Handles existing data gracefully
- Uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`
- Maintains data integrity with proper foreign keys

## Schema Overview

### **Authentication & Authorization**
```
users (enhanced)
├── roles
├── permissions
└── role_permissions
```

### **Membership Management**
```
membership_applications
├── documents
├── members (enhanced)
└── voter_verifications
```

### **Meeting Management**
```
meetings
├── meeting_agenda_items
├── meeting_attendance
└── meeting_minutes
```

### **Leadership Management**
```
leadership_positions
├── leadership_appointments
├── leadership_elections
├── leadership_election_candidates
└── leadership_election_votes
```

### **System Management**
```
notifications (enhanced)
├── audit_logs
└── system_settings
```

## Key Enhancements

### **Users Table Updates**
- Added `role_id` foreign key to roles table
- Email verification tracking
- Password reset token management
- Failed login attempt tracking
- Account lockout functionality
- Multi-factor authentication support

### **Members Table Updates**
- Added middle name field
- Enhanced contact information
- Postal address support
- Voter verification timestamp
- Membership type classification
- Application reference linking

### **Notifications Table Updates**
- Multi-channel delivery support (Email, SMS, In-App, Push)
- Delivery status tracking
- Template system support
- Enhanced notification types

## Data Integrity

### **Foreign Key Constraints**
- All relationships properly constrained
- Cascade deletes where appropriate
- Restrict deletes for critical references

### **Indexes**
- Performance indexes on frequently queried columns
- Composite indexes for complex queries
- Unique constraints for business rules

### **Enums**
- Standardized status values
- Hierarchical level definitions
- Type classifications

## Post-Migration Steps

After running migrations:

1. **Verify Schema**
   ```bash
   npm run migrate:status
   ```

2. **Update Models**
   - Update TypeScript interfaces
   - Add new model classes
   - Update existing models

3. **Test Database**
   - Run existing tests
   - Verify foreign key constraints
   - Test new table functionality

## Troubleshooting

### **Common Issues**

#### Migration Already Executed
- Check `schema_migrations` table
- Use `npm run migrate:status` to verify

#### Foreign Key Errors
- Ensure referenced tables exist
- Check data consistency
- Verify constraint definitions

#### Permission Errors
- Ensure database user has CREATE/ALTER privileges
- Check connection credentials

### **Recovery**

If migration fails:
1. Check error message in console
2. Verify database state
3. Fix data issues if needed
4. Re-run migration (safe to retry)

## Next Steps

After successful migration:
1. ✅ **Complete** - Database schema migration
2. 🔄 **Next** - Implement User model and authentication system
3. ⏳ **Pending** - Build Role-Based Access Control system
4. ⏳ **Pending** - Create membership application workflow

The database is now ready for Phase 1 implementation!
