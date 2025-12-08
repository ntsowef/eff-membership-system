#!/usr/bin/env python3
"""
Verify if JHB wards were actually deleted
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
print("VERIFYING JHB WARD DELETION")
print("=" * 80)

try:
    # Connect to database
    connection = psycopg2.connect(**db_config)
    cursor = connection.cursor()
    print("[OK] Connected to database\n")
    
    # Check for wards containing 'JHB'
    print("Checking for wards containing 'JHB'...")
    cursor.execute("SELECT COUNT(*) FROM wards WHERE ward_code LIKE '%JHB%'")
    jhb_count = cursor.fetchone()[0]
    print(f"Wards containing 'JHB': {jhb_count}")
    
    if jhb_count > 0:
        print("\n[WARNING] JHB wards still exist!")
        print("\nShowing all JHB wards:")
        cursor.execute("SELECT ward_code, ward_name, municipality_code FROM wards WHERE ward_code LIKE '%JHB%' ORDER BY ward_code LIMIT 50")
        for ward_code, ward_name, muni_code in cursor.fetchall():
            print(f"  - {ward_code}: {ward_name} (Municipality: {muni_code})")
    else:
        print("[OK] No JHB wards found - deletion was successful!")
    
    # Check total wards
    print("\nTotal wards in database:")
    cursor.execute("SELECT COUNT(*) FROM wards")
    total = cursor.fetchone()[0]
    print(f"  {total:,} wards")
    
    # Check for different patterns
    print("\nChecking different patterns:")
    
    patterns = ['JHB%', '%JHB%', 'JHB___']
    for pattern in patterns:
        cursor.execute(f"SELECT COUNT(*) FROM wards WHERE ward_code LIKE %s", (pattern,))
        count = cursor.fetchone()[0]
        print(f"  Pattern '{pattern}': {count} wards")
    
    cursor.close()
    connection.close()
    print("\n[OK] Database connection closed")
    
except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()

print("=" * 80)

