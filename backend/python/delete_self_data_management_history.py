"""
Delete Self Data Management Upload History
This script deletes all records from the uploaded_files table used in /admin/self-data-management
"""

import psycopg2
import os
import shutil

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

def delete_self_data_management_history():
    """Delete all upload history records from self-data-management"""
    
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
            'file_processing_errors',
            'uploaded_files',
            'bulk_operations_log'
        ]
        
        counts_before = {}
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                counts_before[table] = count
                print(f"  {table}: {count:,} records")
            except Exception as e:
                print(f"  {table}: Table not found or error - {e}")
                counts_before[table] = 0
        
        # Get file paths before deletion (to delete physical files)
        print("\n📁 Retrieving file paths...")
        cursor.execute("SELECT file_path FROM uploaded_files")
        file_paths = [row[0] for row in cursor.fetchall()]
        print(f"  Found {len(file_paths)} files to delete from disk")
        
        print()
        
        # Ask for confirmation
        total_records = sum(counts_before.values())
        print(f"⚠️  WARNING: You are about to delete:")
        print(f"   - {total_records:,} database records")
        print(f"   - {len(file_paths)} physical files from disk")
        print("⚠️  This action CANNOT be undone!")
        response = input("\nType 'DELETE ALL' to confirm: ")
        
        if response != 'DELETE ALL':
            print("\n❌ Deletion cancelled.")
            return
        
        print("\n🗑️  Deleting records...")
        print("="*80)
        
        # Delete in correct order (respecting foreign keys)
        
        # 1. Delete file processing errors
        print("  Deleting file_processing_errors...")
        try:
            cursor.execute("DELETE FROM file_processing_errors")
            deleted = cursor.rowcount
            print(f"    ✅ Deleted {deleted:,} records")
        except Exception as e:
            print(f"    ⚠️  Error: {e}")
        
        # 2. Delete bulk operations log
        print("  Deleting bulk_operations_log...")
        try:
            cursor.execute("DELETE FROM bulk_operations_log")
            deleted = cursor.rowcount
            print(f"    ✅ Deleted {deleted:,} records")
        except Exception as e:
            print(f"    ⚠️  Error: {e}")
        
        # 3. Delete uploaded files
        print("  Deleting uploaded_files...")
        cursor.execute("DELETE FROM uploaded_files")
        deleted = cursor.rowcount
        print(f"    ✅ Deleted {deleted:,} records")
        
        print()
        
        # Commit database changes
        conn.commit()
        print("✅ Database changes committed")
        
        # Delete physical files
        print("\n🗑️  Deleting physical files from disk...")
        deleted_files = 0
        failed_files = 0
        
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_files += 1
                    print(f"    ✅ Deleted: {os.path.basename(file_path)}")
            except Exception as e:
                failed_files += 1
                print(f"    ❌ Failed to delete {os.path.basename(file_path)}: {e}")
        
        print(f"\n  📊 Files deleted: {deleted_files}/{len(file_paths)}")
        if failed_files > 0:
            print(f"  ⚠️  Failed to delete: {failed_files} files")
        
        # Reset sequences
        print("\n🔄 Resetting auto-increment sequences...")
        sequences = [
            'uploaded_files_file_id_seq',
            'file_processing_errors_error_id_seq',
            'bulk_operations_log_operation_id_seq'
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
        
        conn.commit()
        
        # Verify deletion
        print("\n" + "="*80)
        print("AFTER DELETION - Verification:")
        print("="*80)
        
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"  {table}: {count:,} records")
            except:
                print(f"  {table}: Table not found")
        
        print("\n" + "="*80)
        print("✅ All self-data-management upload history has been deleted!")
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
    delete_self_data_management_history()

