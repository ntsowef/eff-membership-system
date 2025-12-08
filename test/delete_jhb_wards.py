#!/usr/bin/env python3
"""
Delete ward codes containing 'JHB' from the wards table
"""

import psycopg2

# Database configuration
db_config = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

print("=" * 80)
print("DELETE WARDS CONTAINING 'JHB' FROM WARDS TABLE")
print("=" * 80)

try:
    # Connect to database
    connection = psycopg2.connect(**db_config)
    cursor = connection.cursor()
    print("[OK] Connected to database\n")
    
    # First, check how many wards match the pattern
    print("Step 1: Checking wards containing 'JHB'...")
    cursor.execute("SELECT COUNT(*) FROM wards WHERE ward_code LIKE '%JHB%'")
    count = cursor.fetchone()[0]
    print(f"Found {count} wards containing 'JHB'\n")
    
    if count == 0:
        print("[INFO] No wards found containing 'JHB'. Nothing to delete.")
        cursor.close()
        connection.close()
        exit(0)
    
    # Show sample wards that will be deleted
    print("Step 2: Sample wards that will be deleted:")
    cursor.execute("SELECT ward_code, ward_name, municipality_code FROM wards WHERE ward_code LIKE '%JHB%' LIMIT 20")
    sample_wards = cursor.fetchall()
    
    for ward in sample_wards:
        print(f"  - {ward[0]}: {ward[1]} (Municipality: {ward[2]})")
    
    if count > 20:
        print(f"  ... and {count - 20} more")
    
    # Check if any members reference these wards
    print("\nStep 3: Checking for member references...")
    cursor.execute("""
        SELECT COUNT(*) 
        FROM members_consolidated 
        WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
    """)
    member_count = cursor.fetchone()[0]
    
    if member_count > 0:
        print(f"[WARNING] Found {member_count:,} members referencing these wards!")
        print("[WARNING] Deleting these wards may cause referential integrity issues.")
        print("[WARNING] You may need to update or delete these member records first.")
    else:
        print(f"[OK] No members reference these wards. Safe to delete.")
    
    # Confirm deletion
    print("\n" + "=" * 80)
    print(f"READY TO DELETE {count} WARDS")
    print("=" * 80)
    
    user_input = input(f"\nType 'DELETE' to confirm deletion of {count} wards containing 'JHB': ")
    
    if user_input.strip().upper() == 'DELETE':
        print("\nStep 4: Deleting wards...")
        cursor.execute("DELETE FROM wards WHERE ward_code LIKE '%JHB%'")
        deleted_count = cursor.rowcount
        connection.commit()
        
        print(f"[OK] Successfully deleted {deleted_count} wards containing 'JHB'")
        
        # Verify deletion
        cursor.execute("SELECT COUNT(*) FROM wards WHERE ward_code LIKE '%JHB%'")
        remaining = cursor.fetchone()[0]
        print(f"[OK] Verification: {remaining} wards remaining with 'JHB' (should be 0)")
        
        # Show total wards remaining
        cursor.execute("SELECT COUNT(*) FROM wards")
        total_wards = cursor.fetchone()[0]
        print(f"[OK] Total wards in database: {total_wards:,}")
        
    else:
        print("\n[CANCELLED] Deletion cancelled by user.")
        connection.rollback()
    
    cursor.close()
    connection.close()
    print("\n[OK] Database connection closed")
    
except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
    if 'connection' in locals():
        connection.rollback()
        print("[INFO] Transaction rolled back")

print("=" * 80)

