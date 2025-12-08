#!/usr/bin/env python3
"""
Preview what would be deleted by delete_all_members_data.py
This is a DRY RUN - no data will be deleted
"""

import psycopg2

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

def preview_deletion():
    """Preview what would be deleted"""
    
    print("=" * 100)
    print("🔍 DELETION PREVIEW (DRY RUN - NO DATA WILL BE DELETED)")
    print("=" * 100)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # Check protected user
        print("\n[1] Protected User:")
        print("-" * 100)
        cur.execute("""
            SELECT user_id, name, email, member_id 
            FROM users 
            WHERE email = %s
        """, (PROTECTED_USER_EMAIL,))
        
        protected_user = cur.fetchone()
        if protected_user:
            print(f"  ✓ Found: {protected_user[1]} ({protected_user[2]})")
            print(f"    User ID: {protected_user[0]}")
            print(f"    Member ID: {protected_user[3] if protected_user[3] else 'NULL (no member record)'}")
            print(f"    Status: WILL BE PRESERVED ✓")
        else:
            print(f"  ⚠️  User {PROTECTED_USER_EMAIL} not found in database")
        
        # Tables to check
        tables_to_check = [
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
        
        print("\n[2] Associated Tables (will be completely emptied):")
        print("-" * 100)
        
        total_records = 0
        for table in tables_to_check:
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
                    print(f"  ⊘ {table:<40} - table does not exist")
                    continue
                
                # Get count
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                total_records += count
                
                if count == 0:
                    print(f"  ○ {table:<40} - already empty")
                else:
                    print(f"  ✗ {table:<40} - {count:>10,} records WILL BE DELETED")
                
            except Exception as e:
                print(f"  ? {table:<40} - ERROR: {str(e)}")
        
        # Check users table
        print("\n[3] Users Table:")
        print("-" * 100)
        
        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]
        
        cur.execute("""
            SELECT COUNT(*) FROM users 
            WHERE member_id IS NOT NULL 
            AND email != %s
        """, (PROTECTED_USER_EMAIL,))
        users_to_delete = cur.fetchone()[0]
        
        cur.execute("""
            SELECT COUNT(*) FROM users 
            WHERE member_id IS NULL OR email = %s
        """, (PROTECTED_USER_EMAIL,))
        users_to_keep = cur.fetchone()[0]
        
        print(f"  Total users: {total_users:,}")
        print(f"  ✗ Will be deleted: {users_to_delete:,} (member-linked users)")
        print(f"  ✓ Will be preserved: {users_to_keep:,} (including {PROTECTED_USER_EMAIL})")
        total_records += users_to_delete
        
        # Check members_consolidated
        print("\n[4] Members Consolidated Table:")
        print("-" * 100)
        
        cur.execute("SELECT COUNT(*) FROM members_consolidated")
        total_members = cur.fetchone()[0]
        
        if protected_user and protected_user[3] is not None:
            protected_member_id = protected_user[3]
            members_to_delete = total_members - 1
            print(f"  Total members: {total_members:,}")
            print(f"  ✗ Will be deleted: {members_to_delete:,}")
            print(f"  ✓ Will be preserved: 1 (member_id {protected_member_id} for {PROTECTED_USER_EMAIL})")
        else:
            members_to_delete = total_members
            print(f"  Total members: {total_members:,}")
            print(f"  ✗ Will be deleted: {members_to_delete:,} (ALL)")
            print(f"  ✓ Will be preserved: 0")
        
        total_records += members_to_delete
        
        # Summary
        print("\n" + "=" * 100)
        print("SUMMARY")
        print("=" * 100)
        print(f"\n  Total records that WILL BE DELETED: {total_records:,}")
        print(f"  Protected user: {PROTECTED_USER_EMAIL} ✓")
        print(f"\n  To proceed with deletion, run: python test/delete_all_members_data.py")
        print("\n" + "=" * 100)
        
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    preview_deletion()

