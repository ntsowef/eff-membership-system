"""
Delete All Upload History Records
This script deletes all records from bulk upload history tables
"""

import psycopg2
from psycopg2 import sql

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

def delete_all_upload_history():
    """Delete all upload history records from the database"""
    
    conn = None
    cursor = None
    
    try:
        # Connect to database
        print("🔌 Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("✅ Connected successfully!\n")
        
        # Display current counts
        print("="*80)
        print("BEFORE DELETION - Current Record Counts:")
        print("="*80)
        
        tables = [
            'renewal_fraud_cases',
            'renewal_bulk_upload_records',
            'renewal_bulk_uploads',
            'member_application_bulk_upload_records',
            'member_application_bulk_uploads'
        ]
        
        counts_before = {}
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            counts_before[table] = count
            print(f"  {table}: {count:,} records")
        
        print()
        
        # Ask for confirmation
        total_records = sum(counts_before.values())
        print(f"⚠️  WARNING: You are about to delete {total_records:,} total records!")
        print("⚠️  This action CANNOT be undone!")
        response = input("\nType 'DELETE ALL' to confirm: ")
        
        if response != 'DELETE ALL':
            print("\n❌ Deletion cancelled.")
            return
        
        print("\n🗑️  Deleting records...")
        print("="*80)
        
        # Delete in correct order (respecting foreign keys)
        
        # 1. Delete renewal fraud cases
        print("  Deleting renewal_fraud_cases...")
        cursor.execute("DELETE FROM renewal_fraud_cases")
        deleted = cursor.rowcount
        print(f"    ✅ Deleted {deleted:,} records")
        
        # 2. Delete renewal bulk upload records
        print("  Deleting renewal_bulk_upload_records...")
        cursor.execute("DELETE FROM renewal_bulk_upload_records")
        deleted = cursor.rowcount
        print(f"    ✅ Deleted {deleted:,} records")
        
        # 3. Delete renewal bulk uploads
        print("  Deleting renewal_bulk_uploads...")
        cursor.execute("DELETE FROM renewal_bulk_uploads")
        deleted = cursor.rowcount
        print(f"    ✅ Deleted {deleted:,} records")
        
        # 4. Delete member application bulk upload records
        print("  Deleting member_application_bulk_upload_records...")
        cursor.execute("DELETE FROM member_application_bulk_upload_records")
        deleted = cursor.rowcount
        print(f"    ✅ Deleted {deleted:,} records")
        
        # 5. Delete member application bulk uploads
        print("  Deleting member_application_bulk_uploads...")
        cursor.execute("DELETE FROM member_application_bulk_uploads")
        deleted = cursor.rowcount
        print(f"    ✅ Deleted {deleted:,} records")
        
        print()
        
        # Reset sequences
        print("🔄 Resetting auto-increment sequences...")
        sequences = [
            'renewal_bulk_uploads_upload_id_seq',
            'renewal_bulk_upload_records_record_id_seq',
            'renewal_fraud_cases_case_id_seq',
            'member_application_bulk_uploads_upload_id_seq',
            'member_application_bulk_upload_records_record_id_seq'
        ]

        for seq in sequences:
            try:
                # Check if sequence exists first
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM pg_class
                        WHERE relkind = 'S' AND relname = %s
                    )
                """, (seq,))
                exists = cursor.fetchone()[0]

                if exists:
                    cursor.execute(f"ALTER SEQUENCE {seq} RESTART WITH 1")
                    print(f"  ✅ Reset {seq}")
                else:
                    print(f"  ⏭️  Skipped {seq} (does not exist)")
            except Exception as e:
                print(f"  ⚠️  Could not reset {seq}: {e}")
                # Rollback this specific sequence reset and continue
                conn.rollback()
                # Start a new transaction
                conn.commit()
        
        print()
        
        # Commit changes
        conn.commit()
        print("✅ All changes committed to database")
        
        # Verify deletion
        print("\n" + "="*80)
        print("AFTER DELETION - Verification:")
        print("="*80)
        
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count:,} records")
        
        print("\n" + "="*80)
        print("✅ All upload history records have been deleted successfully!")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        if conn:
            conn.rollback()
            print("🔄 Changes rolled back")
        import traceback
        traceback.print_exc()
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("\n🔌 Database connection closed")


if __name__ == '__main__':
    delete_all_upload_history()

