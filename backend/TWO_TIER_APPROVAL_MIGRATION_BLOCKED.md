# Two-Tier Approval Service Migration - BLOCKED

## ❌ **Migration Status: BLOCKED**

The migration of `twoTierApprovalService.ts` to Prisma ORM is **blocked** due to missing database schema fields.

---

## 🚫 **Blocking Issue**

### Missing Fields in `membership_applications` Table

The `twoTierApprovalService.ts` requires the following fields that **do not exist** in the current Prisma schema for the `membership_applications` table:

#### Workflow Fields (Missing):
1. `workflow_stage` - VARCHAR - Tracks application stage (Submitted, Financial Review, Payment Approved, Final Review, Approved, Rejected)
2. `financial_status` - VARCHAR - Financial review status (Pending, Under Review, Approved, Rejected)
3. `financial_reviewed_by` - INT - Foreign key to users table
4. `financial_reviewed_at` - TIMESTAMP - When financial review was completed
5. `financial_rejection_reason` - TEXT - Reason for financial rejection
6. `financial_admin_notes` - TEXT - Financial reviewer notes
7. `final_reviewed_by` - INT - Foreign key to users table
8. `final_reviewed_at` - TIMESTAMP - When final review was completed

#### Current Schema Fields (Existing):
- `status` - VARCHAR(20) - Generic status field
- `reviewed_by` - INT - Generic reviewer field
- `reviewed_at` - TIMESTAMP - Generic review timestamp
- `rejection_reason` - TEXT - Generic rejection reason
- `admin_notes` - TEXT - Generic admin notes

---

## 🗂️ **Missing Audit Trail Tables**

The service also requires the following tables that **do not exist** in the Prisma schema:

### 1. `approval_audit_trail`
Tracks all workflow actions for applications and renewals.

**Required Fields**:
- `id` - Primary key
- `application_id` - Foreign key (nullable)
- `renewal_id` - Foreign key (nullable)
- `user_id` - Foreign key to users
- `user_role` - VARCHAR (financial_reviewer, membership_approver)
- `action_type` - VARCHAR (financial_review_start, financial_approve, etc.)
- `entity_type` - VARCHAR (application, renewal)
- `notes` - TEXT
- `metadata` - JSONB
- `created_at` - TIMESTAMP

### 2. `workflow_notifications`
Stores notifications for workflow transitions.

**Required Fields**:
- `id` - Primary key
- `application_id` - Foreign key (nullable)
- `renewal_id` - Foreign key (nullable)
- `from_user_id` - Foreign key to users
- `to_role` - VARCHAR (financial_reviewer, membership_approver, system)
- `notification_type` - VARCHAR
- `title` - VARCHAR
- `message` - TEXT
- `is_read` - BOOLEAN
- `read_at` - TIMESTAMP
- `created_at` - TIMESTAMP

### 3. `renewal_financial_audit_trail`
Tracks financial review actions for renewals.

**Required Fields**:
- `id` - Primary key
- `renewal_id` - Foreign key
- `member_id` - Foreign key
- `workflow_stage_before` - VARCHAR
- `workflow_stage_after` - VARCHAR
- `financial_status_before` - VARCHAR
- `financial_status_after` - VARCHAR
- `reviewed_by` - Foreign key to users
- `reviewer_role` - VARCHAR
- `review_action` - VARCHAR
- `amount_reviewed` - DECIMAL
- `payment_method` - VARCHAR
- `payment_reference` - VARCHAR
- `approval_status` - VARCHAR
- `rejection_reason` - TEXT
- `reviewer_notes` - TEXT
- `created_at` - TIMESTAMP

### 4. `financial_operations_audit`
Tracks all financial operations for audit purposes.

**Required Fields**:
- `id` - Primary key
- `operation_id` - VARCHAR (unique)
- `operation_type` - VARCHAR
- `application_id` - Foreign key (nullable)
- `renewal_id` - Foreign key (nullable)
- `member_id` - Foreign key (nullable)
- `transaction_reference` - VARCHAR
- `amount_before` - DECIMAL
- `amount_after` - DECIMAL
- `performed_by` - Foreign key to users
- `performed_by_role` - VARCHAR
- `operation_status` - VARCHAR
- `operation_notes` - TEXT
- `system_notes` - TEXT
- `created_at` - TIMESTAMP

---

## 📋 **Current Migration Status**

### ✅ Partially Migrated Methods:
1. `startFinancialReview()` - Converted to Prisma (but will fail due to missing fields)
2. `completeFinancialReview()` - Converted to Prisma (but will fail due to missing fields)
3. `startFinalReview()` - Converted to Prisma (but will fail due to missing fields)
4. `completeFinalReview()` - Converted to Prisma (but will fail due to missing fields)
5. `getApplicationsForFinancialReview()` - Converted to Prisma (but will fail due to missing fields)
6. `getApplicationsForFinalReview()` - Converted to Prisma (but will fail due to missing fields)

### ⏸️ Stubbed Methods (Console Logging Only):
1. `logWorkflowAction()` - Logs to console (table doesn't exist)
2. `sendWorkflowNotification()` - Logs to console (table doesn't exist)
3. `logRenewalFinancialAudit()` - Logs to console (table doesn't exist)
4. `logFinancialOperation()` - Logs to console (table doesn't exist)

### ❌ Not Yet Migrated (Still Using Raw SQL):
1. `getRenewalsForFinancialReview()` - Uses `executeQuery`
2. `startRenewalFinancialReview()` - Uses `executeQuery` and `executeQuerySingle`
3. `completeRenewalFinancialReview()` - Uses `executeQuery` and `executeQuerySingle`
4. `getWorkflowAuditTrail()` - Uses `executeQuery`
5. `getRenewalWorkflowAuditTrail()` - Uses `executeQuery`
6. `getRenewalComprehensiveAuditTrail()` - Uses `executeQuery`
7. `getRenewalWithRoleAccess()` - Uses `executeQuerySingle`
8. `getWorkflowNotifications()` - Uses `executeQuery`
9. `markNotificationAsRead()` - Uses `executeQuery`
10. `getWorkflowStatistics()` - Uses `executeQuery`
11. `getApplicationWithRoleAccess()` - Uses `executeQuerySingle`

---

## 🔧 **Required Actions to Unblock**

### Option 1: Add Missing Fields to Database Schema (Recommended)

1. **Create Database Migration** to add workflow fields to `membership_applications`:
   ```sql
   ALTER TABLE membership_applications
   ADD COLUMN workflow_stage VARCHAR(50) DEFAULT 'Submitted',
   ADD COLUMN financial_status VARCHAR(50),
   ADD COLUMN financial_reviewed_by INT REFERENCES users(user_id),
   ADD COLUMN financial_reviewed_at TIMESTAMP,
   ADD COLUMN financial_rejection_reason TEXT,
   ADD COLUMN financial_admin_notes TEXT,
   ADD COLUMN final_reviewed_by INT REFERENCES users(user_id),
   ADD COLUMN final_reviewed_at TIMESTAMP;
   ```

2. **Create Audit Trail Tables**:
   - `approval_audit_trail`
   - `workflow_notifications`
   - `renewal_financial_audit_trail`
   - `financial_operations_audit`

3. **Update Prisma Schema** with new fields and tables

4. **Regenerate Prisma Client**: `npx prisma generate`

5. **Complete Migration** of `twoTierApprovalService.ts`

### Option 2: Skip This Service for Now

1. Keep `twoTierApprovalService.ts` disabled
2. Continue migrating other services
3. Return to this service after schema updates

---

## 📊 **Impact Assessment**

### Services Affected:
- `twoTierApprovalService.ts` - **BLOCKED**
- Related routes: `twoTierApproval.ts` - **CANNOT BE ENABLED**

### Features Affected:
- Two-tier approval workflow for membership applications
- Financial review process
- Final membership review process
- Renewal financial review
- Workflow audit trails
- Workflow notifications

---

## 🎯 **Recommendation**

**Skip this service for now** and continue with the remaining services:

1. ✅ mfaService.ts - MIGRATED
2. ✅ securityService.ts - MIGRATED
3. ❌ twoTierApprovalService.ts - **BLOCKED (SKIP)**
4. ⏭️ iecElectoralEventsService.ts - **NEXT TO MIGRATE**
5. ⏭️ iecGeographicMappingService.ts
6. ⏭️ iecLgeBallotResultsService.ts
7. ⏭️ voterVerificationService.ts
8. ⏭️ fileProcessingQueueManager.ts

After completing the other services, we can:
1. Create the necessary database migrations
2. Update the Prisma schema
3. Return to complete this service migration

---

## 📝 **Notes**

- The service has been partially migrated but **will not compile** due to missing schema fields
- Audit trail methods have been stubbed with console logging
- The service should remain disabled until schema updates are complete
- No routes should be re-enabled for this service


