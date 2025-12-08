#!/usr/bin/env python3
"""
Delete ward codes containing 'JHB' from the wards table (AUTO-CONFIRMED)
Handles foreign key references by updating them first
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
print("DELETING WARDS CONTAINING 'JHB' (AUTO-CONFIRMED)")
print("=" * 80)

try:
    # Connect to database
    connection = psycopg2.connect(**db_config)
    cursor = connection.cursor()
    print("[OK] Connected to database\n")
    
    # Step 1: Count JHB wards
    print("Step 1: Counting JHB wards...")
    cursor.execute("SELECT COUNT(*) FROM wards WHERE ward_code LIKE '%JHB%'")
    jhb_ward_count = cursor.fetchone()[0]
    print(f"Found {jhb_ward_count} wards containing 'JHB'\n")
    
    if jhb_ward_count == 0:
        print("[INFO] No JHB wards found. Nothing to delete.")
        cursor.close()
        connection.close()
        exit(0)
    
    # Step 2: Check references in users table
    print("Step 2: Checking references in 'users' table...")
    cursor.execute("""
        SELECT user_id, name, email, ward_code 
        FROM users 
        WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
    """)
    user_references = cursor.fetchall()
    
    if user_references:
        print(f"Found {len(user_references)} users referencing JHB wards:")
        for user_id, name, email, ward_code in user_references:
            print(f"  - User ID {user_id} ({name}): ward_code = {ward_code}")
    else:
        print("No users reference JHB wards")
    
    # Step 3: Check references in members_consolidated table
    print("\nStep 3: Checking references in 'members_consolidated' table...")
    cursor.execute("""
        SELECT COUNT(*) 
        FROM members_consolidated 
        WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
    """)
    member_count = cursor.fetchone()[0]
    print(f"Found {member_count} members referencing JHB wards")
    
    # Step 4: Check references in members table
    print("\nStep 4: Checking references in 'members' table...")
    cursor.execute("""
        SELECT COUNT(*)
        FROM members
        WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
    """)
    old_member_count = cursor.fetchone()[0]
    print(f"Found {old_member_count} members (old table) referencing JHB wards")

    # Step 5: Check references in voting_districts table
    print("\nStep 5: Checking references in 'voting_districts' table...")
    cursor.execute("""
        SELECT COUNT(*)
        FROM voting_districts
        WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
    """)
    vd_count = cursor.fetchone()[0]
    print(f"Found {vd_count} voting districts referencing JHB wards")

    if vd_count > 0:
        # Show sample VDs
        cursor.execute("""
            SELECT voting_district_code, voting_district_name, ward_code
            FROM voting_districts
            WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
            LIMIT 10
        """)
        sample_vds = cursor.fetchall()
        print("  Sample voting districts:")
        for vd_code, vd_name, ward_code in sample_vds:
            print(f"    - {vd_code}: {vd_name} (ward: {ward_code})")
        if vd_count > 10:
            print(f"    ... and {vd_count - 10} more")

    # Calculate total references
    total_references = len(user_references) + member_count + old_member_count + vd_count
    
    print("\n" + "=" * 80)
    print("DELETION PLAN:")
    print("=" * 80)
    print(f"1. Update {len(user_references)} users: set ward_code = NULL")
    print(f"2. Update {member_count} members_consolidated: set ward_code = NULL")
    print(f"3. Update {old_member_count} members (old): set ward_code = NULL")
    print(f"4. Delete {vd_count} voting districts referencing JHB wards")
    print(f"5. Delete {jhb_ward_count} JHB wards from wards table")
    print(f"\nTotal records to update/delete: {total_references}")
    
    print("\n" + "=" * 80)
    print("EXECUTING DELETION...")
    print("=" * 80)
    
    # Step 6: Update users table
    if len(user_references) > 0:
        print("\nStep 6: Updating users table...")
        cursor.execute("""
            UPDATE users
            SET ward_code = NULL
            WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
        """)
        updated_users = cursor.rowcount
        print(f"[OK] Updated {updated_users} users (set ward_code = NULL)")

    # Step 7: Update members_consolidated table
    if member_count > 0:
        print("\nStep 7: Updating members_consolidated table...")
        cursor.execute("""
            UPDATE members_consolidated
            SET ward_code = NULL
            WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
        """)
        updated_members = cursor.rowcount
        print(f"[OK] Updated {updated_members} members_consolidated (set ward_code = NULL)")

    # Step 8: Update members table (old)
    if old_member_count > 0:
        print("\nStep 8: Updating members table (old)...")
        cursor.execute("""
            UPDATE members
            SET ward_code = NULL
            WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
        """)
        updated_old_members = cursor.rowcount
        print(f"[OK] Updated {updated_old_members} members (set ward_code = NULL)")

    # Step 9: Delete voting districts referencing JHB wards
    if vd_count > 0:
        print(f"\nStep 9: Deleting {vd_count} voting districts referencing JHB wards...")
        cursor.execute("""
            DELETE FROM voting_districts
            WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
        """)
        deleted_vds = cursor.rowcount
        print(f"[OK] Deleted {deleted_vds} voting districts")

    # Step 10: Delete JHB wards
    print("\nStep 10: Deleting JHB wards...")
    cursor.execute("DELETE FROM wards WHERE ward_code LIKE '%JHB%'")
    deleted_wards = cursor.rowcount
    print(f"[OK] Deleted {deleted_wards} wards containing 'JHB'")
    
    # Commit transaction
    connection.commit()
    print("\n[OK] Transaction committed successfully!")
    
    # Verify deletion
    print("\n" + "=" * 80)
    print("VERIFICATION:")
    print("=" * 80)
    cursor.execute("SELECT COUNT(*) FROM wards WHERE ward_code LIKE '%JHB%'")
    remaining_jhb = cursor.fetchone()[0]
    print(f"JHB wards remaining: {remaining_jhb} (should be 0)")
    
    cursor.execute("SELECT COUNT(*) FROM wards")
    total_wards = cursor.fetchone()[0]
    print(f"Total wards in database: {total_wards:,}")
    
    cursor.close()
    connection.close()
    print("\n[OK] Database connection closed")
    print("\n" + "=" * 80)
    print("✓ DELETION COMPLETED SUCCESSFULLY")
    print("=" * 80)
    
except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
    if 'connection' in locals():
        connection.rollback()
        print("\n[INFO] Transaction rolled back - no changes made")

print("=" * 80)

