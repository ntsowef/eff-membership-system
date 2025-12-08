#!/usr/bin/env python3
"""
Check if the missing ward codes exist in the database
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

# Missing ward codes from the error log
missing_wards = [
    '74205008', '74205021', '74205001', '74205033', '74205009',
    '78900033', '74205035', '74205029', '74205032', '74205026'
]

print("=" * 80)
print("CHECKING MISSING WARD CODES IN DATABASE")
print("=" * 80)

try:
    # Connect to database
    connection = psycopg2.connect(**db_config)
    cursor = connection.cursor()
    print("[OK] Connected to database\n")
    
    # Check each ward individually
    print(f"Checking {len(missing_wards)} ward codes...\n")
    
    found_wards = []
    not_found_wards = []
    
    for ward_code in missing_wards:
        cursor.execute("SELECT ward_code, ward_name, municipality_code FROM wards WHERE ward_code = %s", (ward_code,))
        result = cursor.fetchone()
        
        if result:
            found_wards.append(result)
            print(f"✓ FOUND: {result[0]} - {result[1]} (Municipality: {result[2]})")
        else:
            not_found_wards.append(ward_code)
            print(f"✗ NOT FOUND: {ward_code}")
    
    print("\n" + "=" * 80)
    print("SUMMARY:")
    print("=" * 80)
    print(f"Total checked: {len(missing_wards)}")
    print(f"Found in database: {len(found_wards)}")
    print(f"NOT found in database: {len(not_found_wards)}")
    
    if not_found_wards:
        print(f"\nMissing ward codes that need to be added:")
        for ward in not_found_wards:
            print(f"  - {ward}")
    
    # Get total ward count
    cursor.execute("SELECT COUNT(*) FROM wards")
    total_wards = cursor.fetchone()[0]
    print(f"\nTotal wards in database: {total_wards:,}")
    
    # Check if there are any wards starting with '742' or '789'
    print("\n" + "=" * 80)
    print("CHECKING WARD CODE PATTERNS:")
    print("=" * 80)
    
    cursor.execute("SELECT COUNT(*) FROM wards WHERE ward_code LIKE '742%'")
    count_742 = cursor.fetchone()[0]
    print(f"Wards starting with '742': {count_742}")
    
    cursor.execute("SELECT COUNT(*) FROM wards WHERE ward_code LIKE '789%'")
    count_789 = cursor.fetchone()[0]
    print(f"Wards starting with '789': {count_789}")
    
    # Show sample wards with similar patterns
    if count_742 > 0:
        print("\nSample wards starting with '742':")
        cursor.execute("SELECT ward_code, ward_name FROM wards WHERE ward_code LIKE '742%' LIMIT 5")
        for row in cursor.fetchall():
            print(f"  {row[0]} - {row[1]}")
    
    if count_789 > 0:
        print("\nSample wards starting with '789':")
        cursor.execute("SELECT ward_code, ward_name FROM wards WHERE ward_code LIKE '789%' LIMIT 5")
        for row in cursor.fetchall():
            print(f"  {row[0]} - {row[1]}")
    
    cursor.close()
    connection.close()
    print("\n[OK] Database connection closed")
    
except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()

print("=" * 80)

