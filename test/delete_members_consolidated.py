#!/usr/bin/env python3
"""
Delete data from members_consolidated table
Options:
1. Delete ALL records
2. Delete by specific criteria (province, municipality, ward, etc.)
3. Delete by date range
"""

import psycopg2
import sys

# Database configuration
db_config = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

def show_table_stats(cursor):
    """Show current table statistics"""
    print("\n" + "=" * 80)
    print("CURRENT TABLE STATISTICS")
    print("=" * 80)
    
    # Total records
    cursor.execute("SELECT COUNT(*) FROM members_consolidated")
    total = cursor.fetchone()[0]
    print(f"Total records: {total:,}")
    
    # By province
    cursor.execute("""
        SELECT province_code, COUNT(*) 
        FROM members_consolidated 
        GROUP BY province_code 
        ORDER BY COUNT(*) DESC
    """)
    print("\nRecords by province:")
    for province, count in cursor.fetchall():
        print(f"  {province}: {count:,}")
    
    # By membership status
    cursor.execute("""
        SELECT membership_status_id, COUNT(*) 
        FROM members_consolidated 
        GROUP BY membership_status_id 
        ORDER BY membership_status_id
    """)
    print("\nRecords by membership status:")
    for status, count in cursor.fetchall():
        print(f"  Status {status}: {count:,}")

def delete_all_records(cursor):
    """Delete ALL records from members_consolidated"""
    print("\n" + "=" * 80)
    print("⚠️  WARNING: DELETE ALL RECORDS")
    print("=" * 80)
    
    cursor.execute("SELECT COUNT(*) FROM members_consolidated")
    total = cursor.fetchone()[0]
    
    print(f"\nThis will delete ALL {total:,} records from members_consolidated table!")
    print("This action CANNOT be undone!")
    
    confirm = input("\nType 'DELETE ALL' to confirm: ")
    
    if confirm.strip() != 'DELETE ALL':
        print("\n[CANCELLED] Deletion cancelled.")
        return False
    
    print("\nDeleting all records...")
    cursor.execute("DELETE FROM members_consolidated")
    deleted = cursor.rowcount
    print(f"[OK] Deleted {deleted:,} records")
    
    return True

def delete_by_province(cursor, province_code):
    """Delete records by province code"""
    print(f"\nDeleting records for province: {province_code}")
    
    cursor.execute("SELECT COUNT(*) FROM members_consolidated WHERE province_code = %s", (province_code,))
    count = cursor.fetchone()[0]
    
    if count == 0:
        print(f"[INFO] No records found for province {province_code}")
        return False
    
    print(f"Found {count:,} records to delete")
    confirm = input(f"\nType 'DELETE' to confirm deletion of {count:,} records: ")
    
    if confirm.strip().upper() != 'DELETE':
        print("\n[CANCELLED] Deletion cancelled.")
        return False
    
    cursor.execute("DELETE FROM members_consolidated WHERE province_code = %s", (province_code,))
    deleted = cursor.rowcount
    print(f"[OK] Deleted {deleted:,} records")
    
    return True

def delete_by_municipality(cursor, municipality_code):
    """Delete records by municipality code"""
    print(f"\nDeleting records for municipality: {municipality_code}")
    
    cursor.execute("SELECT COUNT(*) FROM members_consolidated WHERE municipality_code = %s", (municipality_code,))
    count = cursor.fetchone()[0]
    
    if count == 0:
        print(f"[INFO] No records found for municipality {municipality_code}")
        return False
    
    print(f"Found {count:,} records to delete")
    confirm = input(f"\nType 'DELETE' to confirm deletion of {count:,} records: ")
    
    if confirm.strip().upper() != 'DELETE':
        print("\n[CANCELLED] Deletion cancelled.")
        return False
    
    cursor.execute("DELETE FROM members_consolidated WHERE municipality_code = %s", (municipality_code,))
    deleted = cursor.rowcount
    print(f"[OK] Deleted {deleted:,} records")
    
    return True

def delete_by_ward(cursor, ward_code):
    """Delete records by ward code"""
    print(f"\nDeleting records for ward: {ward_code}")
    
    cursor.execute("SELECT COUNT(*) FROM members_consolidated WHERE ward_code = %s", (ward_code,))
    count = cursor.fetchone()[0]
    
    if count == 0:
        print(f"[INFO] No records found for ward {ward_code}")
        return False
    
    print(f"Found {count:,} records to delete")
    confirm = input(f"\nType 'DELETE' to confirm deletion of {count:,} records: ")
    
    if confirm.strip().upper() != 'DELETE':
        print("\n[CANCELLED] Deletion cancelled.")
        return False
    
    cursor.execute("DELETE FROM members_consolidated WHERE ward_code = %s", (ward_code,))
    deleted = cursor.rowcount
    print(f"[OK] Deleted {deleted:,} records")
    
    return True

# Main script
print("=" * 80)
print("DELETE DATA FROM members_consolidated TABLE")
print("=" * 80)

try:
    # Connect to database
    connection = psycopg2.connect(**db_config)
    cursor = connection.cursor()
    print("[OK] Connected to database")
    
    # Show current stats
    show_table_stats(cursor)
    
    # Menu
    print("\n" + "=" * 80)
    print("DELETION OPTIONS:")
    print("=" * 80)
    print("1. Delete ALL records")
    print("2. Delete by province code")
    print("3. Delete by municipality code")
    print("4. Delete by ward code")
    print("5. Cancel")
    
    choice = input("\nEnter your choice (1-5): ").strip()
    
    deleted = False
    
    if choice == '1':
        deleted = delete_all_records(cursor)
    elif choice == '2':
        province = input("Enter province code (e.g., GT, WC, EC): ").strip()
        deleted = delete_by_province(cursor, province)
    elif choice == '3':
        municipality = input("Enter municipality code: ").strip()
        deleted = delete_by_municipality(cursor, municipality)
    elif choice == '4':
        ward = input("Enter ward code: ").strip()
        deleted = delete_by_ward(cursor, ward)
    else:
        print("\n[CANCELLED] Operation cancelled.")
        connection.close()
        sys.exit(0)
    
    if deleted:
        # Commit transaction
        connection.commit()
        print("\n[OK] Transaction committed successfully!")
        
        # Show updated stats
        show_table_stats(cursor)
    else:
        connection.rollback()
        print("\n[INFO] Transaction rolled back - no changes made")
    
    cursor.close()
    connection.close()
    print("\n[OK] Database connection closed")
    
except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
    if 'connection' in locals():
        connection.rollback()
        print("\n[INFO] Transaction rolled back - no changes made")

print("=" * 80)

