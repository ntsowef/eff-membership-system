#!/usr/bin/env python3
"""
Delete all data from members_consolidated and associated tables
EXCEPT the national.admin@eff.org.za user

WARNING: This script will delete ALL member data from the database!
Use with extreme caution!
"""

import psycopg2
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

# Protected user email
PROTECTED_USER_EMAIL = 'national.admin@eff.org.za'

def confirm_deletion():
    """Ask for user confirmation before proceeding"""
    print("=" * 100)
    print("⚠️  WARNING: DESTRUCTIVE OPERATION ⚠️")
    print("=" * 100)
    print("\nThis script will DELETE ALL DATA from:")
    print("  - members_consolidated table (all member records)")
    print("  - All associated tables (payments, documents, meetings, elections, etc.)")
    print("\nPROTECTED:")
    print(f"  - User: {PROTECTED_USER_EMAIL} (will be preserved)")
    print("\n" + "=" * 100)
    
    response = input("\nType 'DELETE ALL MEMBERS' to proceed (or anything else to cancel): ")
    
    if response != 'DELETE ALL MEMBERS':
        print("\n❌ Operation cancelled by user.")
        return False
    
    response2 = input("\nAre you ABSOLUTELY SURE? Type 'YES' to confirm: ")
    
    if response2 != 'YES':
        print("\n❌ Operation cancelled by user.")
        return False
    
    return True

def delete_all_members_data():
    """Delete all members data except protected user"""
    
    if not confirm_deletion():
        return
    
    print("\n" + "=" * 100)
    print("STARTING DELETION PROCESS")
    print("=" * 100)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # Start transaction
        print("\n[1/3] Checking protected user...")
        cur.execute("""
            SELECT user_id, name, email, member_id 
            FROM users 
            WHERE email = %s
        """, (PROTECTED_USER_EMAIL,))
        
        protected_user = cur.fetchone()
        if protected_user:
            print(f"  ✓ Found protected user: {protected_user[1]} ({protected_user[2]})")
            print(f"    User ID: {protected_user[0]}, Member ID: {protected_user[3]}")
            if protected_user[3] is not None:
                print(f"    ⚠️  WARNING: Protected user has member_id = {protected_user[3]}")
                print(f"    This member record will be preserved!")
        else:
            print(f"  ⚠️  Protected user {PROTECTED_USER_EMAIL} not found")
        
        # Get counts before deletion
        print("\n[2/3] Getting record counts before deletion...")
        cur.execute("SELECT COUNT(*) FROM members_consolidated")
        members_count = cur.fetchone()[0]
        print(f"  members_consolidated: {members_count:,} records")
        
        # Tables to delete from (in order - children first, then parent)
        deletion_order = [
            'birthday_messages_sent',
            'bulk_notification_recipients',
            'documents',
            'election_candidates',
            'election_votes',
            'financial_operations_audit',
            'leadership_appointments',
            'leadership_election_candidates',
            'leadership_election_votes',
            'leadership_meeting_attendees',
            'leadership_succession_plans',
            'leadership_terms',
            'meeting_action_items',
            'meeting_agenda_items',
            'meeting_attendance',
            'meeting_decisions',
            'meetings',
            'member_cache_summary',
            'member_notes',
            'member_transfers',
            'membership_history',
            'membership_renewals',
            'notifications',
            'payments',
            'renewal_approvals',
            'renewal_audit_trail',
            'renewal_bulk_operation_items',
            'renewal_financial_audit_trail',
            'renewal_manual_notes',
            'renewal_pricing_overrides',
            'sms_contact_list_members',
            'sms_messages',
            'ward_compliance_audit_log',
            'ward_delegates',
            'ward_meeting_records',
        ]

        print("\n[3/3] Deleting data from associated tables...")
        total_deleted = 0

        for table in deletion_order:
            try:
                # Check if table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public'
                        AND table_name = %s
                    )
                """, (table,))

                if not cur.fetchone()[0]:
                    print(f"  ⊘ {table}: table does not exist, skipping")
                    continue

                # Get count before deletion
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count_before = cur.fetchone()[0]

                if count_before == 0:
                    print(f"  ○ {table}: already empty")
                    continue

                # Delete all records from this table
                cur.execute(f"DELETE FROM {table}")
                deleted = cur.rowcount
                total_deleted += deleted
                print(f"  ✓ {table}: deleted {deleted:,} records")

            except Exception as e:
                print(f"  ✗ {table}: ERROR - {str(e)}")
                raise

        # Handle users table specially - delete users linked to members but keep protected user
        print("\n  Handling users table...")
        cur.execute("""
            SELECT COUNT(*) FROM users
            WHERE member_id IS NOT NULL
            AND email != %s
        """, (PROTECTED_USER_EMAIL,))
        users_to_delete = cur.fetchone()[0]

        if users_to_delete > 0:
            cur.execute("""
                DELETE FROM users
                WHERE member_id IS NOT NULL
                AND email != %s
            """, (PROTECTED_USER_EMAIL,))
            deleted = cur.rowcount
            total_deleted += deleted
            print(f"  ✓ users: deleted {deleted:,} member-linked users (preserved {PROTECTED_USER_EMAIL})")
        else:
            print(f"  ○ users: no member-linked users to delete")

        # Finally, delete from members_consolidated (except protected user's member if exists)
        print("\n  Deleting from members_consolidated...")
        if protected_user and protected_user[3] is not None:
            # Protected user has a member_id, preserve it
            protected_member_id = protected_user[3]
            cur.execute("""
                DELETE FROM members_consolidated
                WHERE member_id != %s
            """, (protected_member_id,))
            deleted = cur.rowcount
            total_deleted += deleted
            print(f"  ✓ members_consolidated: deleted {deleted:,} records (preserved member_id {protected_member_id})")
        else:
            # No protected member, delete all
            cur.execute("DELETE FROM members_consolidated")
            deleted = cur.rowcount
            total_deleted += deleted
            print(f"  ✓ members_consolidated: deleted {deleted:,} records")

        # Commit transaction
        conn.commit()

        print("\n" + "=" * 100)
        print("✅ DELETION COMPLETED SUCCESSFULLY")
        print("=" * 100)
        print(f"\nTotal records deleted: {total_deleted:,}")
        print(f"Protected user: {PROTECTED_USER_EMAIL} ✓")

        # Verify final counts
        print("\n" + "=" * 100)
        print("FINAL VERIFICATION")
        print("=" * 100)

        cur.execute("SELECT COUNT(*) FROM members_consolidated")
        final_members = cur.fetchone()[0]
        print(f"  members_consolidated: {final_members:,} records remaining")

        cur.execute("SELECT COUNT(*) FROM users WHERE email = %s", (PROTECTED_USER_EMAIL,))
        protected_exists = cur.fetchone()[0]
        print(f"  Protected user exists: {'✓ YES' if protected_exists else '✗ NO'}")

        print("\n" + "=" * 100)

    except Exception as e:
        conn.rollback()
        print("\n" + "=" * 100)
        print("❌ ERROR OCCURRED - TRANSACTION ROLLED BACK")
        print("=" * 100)
        print(f"\nError: {str(e)}")
        print("\nNo data was deleted. Database is unchanged.")
        raise

    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    delete_all_members_data()

