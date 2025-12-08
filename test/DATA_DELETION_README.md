# Member Data Deletion Scripts

## Overview

These scripts allow you to delete all member data from the database while preserving the `national.admin@eff.org.za` user account.

---

## ⚠️ CRITICAL WARNING

**These scripts will DELETE ALL MEMBER DATA from the database!**

- This operation is **IRREVERSIBLE**
- Always create a database backup before running
- Test in a development environment first
- Use the preview script before actual deletion

---

## Scripts

### 1. `preview_deletion.py` - DRY RUN (Safe)

**Purpose:** Preview what would be deleted WITHOUT actually deleting anything.

**Usage:**
```bash
python test/preview_deletion.py
```

**What it does:**
- Shows the protected user information
- Lists all tables and record counts that would be deleted
- Calculates total records to be deleted
- **Does NOT modify any data**

**When to use:**
- Before running the actual deletion
- To verify what will be deleted
- To check the protected user status

---

### 2. `delete_all_members_data.py` - ACTUAL DELETION (Dangerous)

**Purpose:** Delete all member data except the protected user.

**Usage:**
```bash
python test/delete_all_members_data.py
```

**What it does:**
1. Asks for double confirmation
2. Checks the protected user (`national.admin@eff.org.za`)
3. Deletes data from 35+ associated tables
4. Deletes member-linked users (except protected user)
5. Deletes all members from `members_consolidated` (except protected user's member if exists)
6. Commits the transaction
7. Verifies the deletion

**Safety features:**
- Requires typing `DELETE ALL MEMBERS` to proceed
- Requires typing `YES` for final confirmation
- Uses database transactions (rolls back on error)
- Preserves the protected user account
- Shows detailed progress during deletion

---

## Protected User

**Email:** `national.admin@eff.org.za`

**What is preserved:**
- The user account in the `users` table
- If the user has a linked `member_id`, that member record is also preserved

**What is deleted:**
- All other member records
- All other user accounts that are linked to members
- All associated data (payments, documents, meetings, etc.)

---

## Tables Affected

The following tables will be **completely emptied**:

### Member-Related Tables
- `birthday_messages_sent`
- `documents`
- `member_cache_summary`
- `member_notes`
- `member_transfers`
- `membership_history`
- `membership_renewals`

### Financial Tables
- `payments`
- `financial_operations_audit`
- `renewal_approvals`
- `renewal_audit_trail`
- `renewal_bulk_operation_items`
- `renewal_financial_audit_trail`
- `renewal_manual_notes`
- `renewal_pricing_overrides`

### Communication Tables
- `bulk_notification_recipients`
- `notifications`
- `sms_contact_list_members`
- `sms_messages`

### Meeting Tables
- `meeting_action_items`
- `meeting_agenda_items`
- `meeting_attendance`
- `meeting_decisions`
- `meetings`
- `leadership_meeting_attendees`

### Election Tables
- `election_candidates`
- `election_votes`
- `leadership_election_candidates`
- `leadership_election_votes`

### Leadership Tables
- `leadership_appointments`
- `leadership_succession_plans`
- `leadership_terms`

### Ward Tables
- `ward_compliance_audit_log`
- `ward_delegates`
- `ward_meeting_records`

### Main Table
- `members_consolidated` (all member records)

### Users Table
- Member-linked users (except `national.admin@eff.org.za`)

---

## Usage Example

### Step 1: Preview (Safe)

```bash
python test/preview_deletion.py
```

**Output:**
```
🔍 DELETION PREVIEW (DRY RUN - NO DATA WILL BE DELETED)
====================================================================================================

[1] Protected User:
----------------------------------------------------------------------------------------------------
  ✓ Found: National Administrator (national.admin@eff.org.za)
    User ID: 8571
    Member ID: NULL (no member record)
    Status: WILL BE PRESERVED ✓

[2] Associated Tables (will be completely emptied):
----------------------------------------------------------------------------------------------------
  ✗ payments                               -    123,456 records WILL BE DELETED
  ✗ documents                              -     45,678 records WILL BE DELETED
  ...

[4] Members Consolidated Table:
----------------------------------------------------------------------------------------------------
  Total members: 626,785
  ✗ Will be deleted: 626,785 (ALL)
  ✓ Will be preserved: 0

SUMMARY
====================================================================================================
  Total records that WILL BE DELETED: 1,234,567
  Protected user: national.admin@eff.org.za ✓
```

### Step 2: Backup Database (CRITICAL)

```bash
# PostgreSQL backup command
pg_dump -h localhost -U eff_admin -d eff_membership_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 3: Delete (Dangerous)

```bash
python test/delete_all_members_data.py
```

**You will be prompted:**
```
⚠️  WARNING: DESTRUCTIVE OPERATION ⚠️
====================================================================================================

This script will DELETE ALL DATA from:
  - members_consolidated table (all member records)
  - All associated tables (payments, documents, meetings, elections, etc.)

PROTECTED:
  - User: national.admin@eff.org.za (will be preserved)

Type 'DELETE ALL MEMBERS' to proceed (or anything else to cancel): 
```

---

## Error Handling

**If an error occurs:**
- The transaction is automatically rolled back
- No data is deleted
- Error message is displayed
- Database remains unchanged

**Common errors:**
- Database connection failure
- Permission issues
- Foreign key constraint violations (shouldn't happen with correct deletion order)

---

## Verification

After deletion, the script shows:

```
✅ DELETION COMPLETED SUCCESSFULLY
====================================================================================================

Total records deleted: 1,234,567
Protected user: national.admin@eff.org.za ✓

FINAL VERIFICATION
====================================================================================================
  members_consolidated: 0 records remaining
  Protected user exists: ✓ YES
```

---

## Recovery

**If you need to recover deleted data:**

1. Restore from database backup:
```bash
psql -h localhost -U eff_admin -d eff_membership_database < backup_20251109_123456.sql
```

2. Or restore specific tables if you have table-level backups

---

## Notes

- The deletion order is important (children before parents)
- All operations are wrapped in a transaction
- The script uses parameterized queries to prevent SQL injection
- Progress is shown for each table during deletion
- Final verification ensures the protected user still exists

---

## Support

If you encounter issues:
1. Check the error message
2. Verify database connection
3. Ensure you have proper permissions
4. Check that the protected user exists
5. Review the database logs

---

**Last Updated:** 2025-11-09

