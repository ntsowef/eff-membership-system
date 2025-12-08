# Database Migrations for Blocked Services

This directory contains SQL migration scripts to create missing database tables and fields required by the blocked services in the Prisma migration project.

## 📋 Overview

**Purpose**: Create database schema for 3 blocked services:
1. `twoTierApprovalService.ts` - Two-tier approval workflow
2. `iecGeographicMappingService.ts` - IEC geographic mapping
3. `iecLgeBallotResultsService.ts` - IEC ballot results

**Total Migrations**: 9 migration files
- **Migrations 001-005**: Workflow and audit tables
- **Migrations 006-009**: IEC mapping and ballot results tables

---

## 🚀 Quick Start

### Option 1: Run All Migrations at Once

```bash
# From backend directory
cd backend

# Run workflow migrations (001-005)
psql -h localhost -U eff_admin -d eff_membership_db -f prisma/migrations/run_all_migrations.sql

# Run IEC mapping migrations (006-009)
psql -h localhost -U eff_admin -d eff_membership_db -f prisma/migrations/run_iec_migrations.sql

# Update Prisma schema from database
npx prisma db pull

# Generate Prisma client
npx prisma generate
```

### Option 2: Run Individual Migrations

```bash
# Run migrations one by one
psql -h localhost -U eff_admin -d eff_membership_db -f prisma/migrations/001_add_workflow_fields_to_membership_applications.sql
psql -h localhost -U eff_admin -d eff_membership_db -f prisma/migrations/002_create_approval_audit_trail_table.sql
# ... and so on
```

---

## 📁 Migration Files

### Workflow & Audit Tables (001-005)

#### 001_add_workflow_fields_to_membership_applications.sql
**Purpose**: Add workflow fields to existing `membership_applications` table

**Fields Added**:
- `workflow_stage` - Current workflow stage
- `financial_status` - Financial review status
- `financial_reviewed_by` - Financial reviewer user ID
- `financial_reviewed_at` - Financial review timestamp
- `financial_rejection_reason` - Rejection reason
- `financial_admin_notes` - Reviewer notes
- `final_reviewed_by` - Final reviewer user ID
- `final_reviewed_at` - Final review timestamp

**Indexes Created**: 4 indexes for performance

---

#### 002_create_approval_audit_trail_table.sql
**Purpose**: Track all workflow actions for applications and renewals

**Table**: `approval_audit_trail`

**Key Fields**:
- `application_id` / `renewal_id` - Entity references
- `user_id` - User who performed action
- `user_role` - Role of user (financial_reviewer, membership_approver, etc.)
- `action_type` - Type of action performed
- `entity_type` - application or renewal
- `notes` - Action notes
- `metadata` - JSON metadata

**Constraints**:
- Must have either application_id OR renewal_id (not both)
- Valid user roles and action types enforced

**Indexes Created**: 6 indexes for performance

---

#### 003_create_workflow_notifications_table.sql
**Purpose**: Store notifications for workflow transitions

**Table**: `workflow_notifications`

**Key Fields**:
- `application_id` / `renewal_id` - Entity references
- `from_user_id` - User who triggered notification
- `to_role` - Target role for notification
- `notification_type` - Type of notification
- `title` / `message` - Notification content
- `is_read` / `read_at` - Read status

**Constraints**:
- Must have either application_id OR renewal_id (not both)
- Valid roles and notification types enforced

**Indexes Created**: 7 indexes for performance

---

#### 004_create_renewal_financial_audit_trail_table.sql
**Purpose**: Track financial review actions for renewals

**Table**: `renewal_financial_audit_trail`

**Key Fields**:
- `renewal_id` / `member_id` - Entity references
- `workflow_stage_before` / `workflow_stage_after` - Stage transitions
- `financial_status_before` / `financial_status_after` - Status transitions
- `reviewed_by` - Reviewer user ID
- `reviewer_role` - Role of reviewer
- `review_action` - Action performed
- `amount_reviewed` - Amount verified
- `payment_method` / `payment_reference` - Payment details
- `approval_status` - Current status
- `rejection_reason` / `reviewer_notes` - Review details

**Constraints**:
- Valid reviewer roles, actions, and statuses enforced

**Indexes Created**: 6 indexes for performance

---

#### 005_create_financial_operations_audit_table.sql
**Purpose**: Track all financial operations for audit purposes

**Table**: `financial_operations_audit`

**Key Fields**:
- `operation_id` - Unique operation identifier
- `operation_type` - Type of operation
- `application_id` / `renewal_id` / `member_id` - Entity references (all nullable)
- `transaction_reference` - External transaction reference
- `amount_before` / `amount_after` - Amount changes
- `performed_by` - User who performed operation
- `performed_by_role` - Role of user
- `operation_status` - Status of operation
- `operation_notes` / `system_notes` - Operation details

**Constraints**:
- Valid operation types, roles, and statuses enforced
- Unique operation_id

**Indexes Created**: 9 indexes for performance

---

### IEC Mapping Tables (006-009)

#### 006_create_iec_province_mappings_table.sql
**Purpose**: Map internal province codes to IEC API province IDs

**Table**: `iec_province_mappings`

**Key Fields**:
- `province_code` - Internal code (EC, FS, GP, etc.) - UNIQUE
- `province_name` - Internal province name
- `iec_province_id` - IEC API province ID
- `iec_province_name` - IEC API province name
- `is_active` - Active status

**Default Data**: Inserts 9 South African provinces with mappings

**Indexes Created**: 3 indexes for performance

---

#### 007_create_iec_municipality_mappings_table.sql
**Purpose**: Map internal municipality codes to IEC API municipality IDs

**Table**: `iec_municipality_mappings`

**Key Fields**:
- `municipality_code` - Internal code - UNIQUE
- `municipality_name` - Internal name
- `province_code` - Foreign key to iec_province_mappings
- `iec_municipality_id` - IEC API municipality ID (VARCHAR for flexibility)
- `iec_municipality_name` - IEC API name
- `iec_province_id` - IEC API province ID
- `is_active` - Active status

**Foreign Keys**: References `iec_province_mappings(province_code)`

**Indexes Created**: 5 indexes for performance

---

#### 008_create_iec_ward_mappings_table.sql
**Purpose**: Map internal ward codes to IEC API ward IDs

**Table**: `iec_ward_mappings`

**Key Fields**:
- `ward_code` - Internal code - UNIQUE
- `ward_name` - Internal name
- `ward_number` - Ward number
- `municipality_code` - Foreign key to iec_municipality_mappings
- `province_code` - Foreign key to iec_province_mappings
- `iec_ward_id` - IEC API ward ID (VARCHAR for flexibility)
- `iec_ward_name` - IEC API name
- `iec_municipality_id` - IEC API municipality ID
- `iec_province_id` - IEC API province ID
- `is_active` - Active status

**Foreign Keys**: 
- References `iec_municipality_mappings(municipality_code)`
- References `iec_province_mappings(province_code)`

**Indexes Created**: 8 indexes for performance

---

#### 009_create_iec_lge_ballot_results_table.sql
**Purpose**: Store Local Government Election ballot results from IEC API

**Table**: `iec_lge_ballot_results`

**Key Fields**:
- `iec_event_id` - Foreign key to iec_electoral_events
- `iec_province_id` / `iec_municipality_id` / `iec_ward_id` - IEC IDs (nullable)
- `province_code` / `municipality_code` / `ward_code` - Internal codes (nullable)
- `ballot_data` - Full ballot results in JSON format
- `total_votes` - Total votes cast
- `registered_voters` - Total registered voters
- `voter_turnout_percentage` - Turnout percentage
- `result_type` - Type: province, municipality, or ward
- `data_source` - Source: IEC_API, MOCK, MANUAL, IMPORT
- `last_updated` - Last update timestamp

**Foreign Keys**: 
- References `iec_electoral_events(iec_event_id)`
- References `iec_province_mappings(province_code)`
- References `iec_municipality_mappings(municipality_code)`
- References `iec_ward_mappings(ward_code)`

**Unique Constraints**: Prevents duplicate results per event and geographic level

**Indexes Created**: 10 indexes for performance

---

## 🔧 After Running Migrations

### 1. Update Prisma Schema

Pull the new schema from the database:

```bash
npx prisma db pull
```

This will update `prisma/schema.prisma` with the new models.

### 2. Generate Prisma Client

Generate the TypeScript types:

```bash
npx prisma generate
```

### 3. Verify Schema

Check that all new models are present in `prisma/schema.prisma`:
- `approval_audit_trail`
- `workflow_notifications`
- `renewal_financial_audit_trail`
- `financial_operations_audit`
- `iec_province_mappings`
- `iec_municipality_mappings`
- `iec_ward_mappings`
- `iec_lge_ballot_results`

And that `membership_applications` has the new workflow fields.

---

## 📊 Database Credentials

**Host**: localhost  
**Port**: 5432  
**Database**: eff_membership_db  
**User**: eff_admin  
**Password**: Frames!123

---

## ✅ Verification

After running migrations, verify tables were created:

```sql
-- Check workflow tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'approval_audit_trail',
    'workflow_notifications',
    'renewal_financial_audit_trail',
    'financial_operations_audit'
);

-- Check IEC mapping tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'iec_province_mappings',
    'iec_municipality_mappings',
    'iec_ward_mappings',
    'iec_lge_ballot_results'
);

-- Check new fields in membership_applications
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'membership_applications' 
AND column_name LIKE '%workflow%' OR column_name LIKE '%financial%';
```

---

## 🎯 Next Steps

After migrations are complete:

1. ✅ Run migrations (001-009)
2. ✅ Update Prisma schema (`npx prisma db pull`)
3. ✅ Generate Prisma client (`npx prisma generate`)
4. 🔄 Complete migration of blocked services:
   - `twoTierApprovalService.ts`
   - `iecGeographicMappingService.ts`
   - `iecLgeBallotResultsService.ts`
5. 🔄 Re-enable routes in `app.ts`
6. 🔄 Test services
7. 🔄 Update documentation

---

## 📝 Notes

- All migrations use `IF NOT EXISTS` to prevent errors if tables already exist
- All migrations are wrapped in transactions for safety
- Indexes are created for optimal query performance
- Foreign key constraints ensure data integrity
- Check constraints enforce valid values
- Comments are added to all tables and columns for documentation


