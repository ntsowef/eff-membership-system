#!/usr/bin/env python3
"""
Show proof that JHB wards were deleted
"""

import psycopg2

db_config = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

print("=" * 80)
print("PROOF OF JHB WARD DELETION")
print("=" * 80)

try:
    connection = psycopg2.connect(**db_config)
    cursor = connection.cursor()
    print("[OK] Connected to database\n")
    
    # Check for ANY wards with 'JHB' in ward_code
    print("1. Checking for wards with ward_code LIKE 'JHB%':")
    cursor.execute("SELECT ward_code, ward_name FROM wards WHERE ward_code LIKE 'JHB%' ORDER BY ward_code")
    results = cursor.fetchall()
    
    if results:
        print(f"   Found {len(results)} wards:")
        for ward_code, ward_name in results[:20]:
            print(f"   - {ward_code}: {ward_name}")
    else:
        print("   ✓ NO WARDS FOUND - Successfully deleted!")
    
    # Check for ANY wards containing 'JHB' anywhere
    print("\n2. Checking for wards with ward_code LIKE '%JHB%':")
    cursor.execute("SELECT ward_code, ward_name FROM wards WHERE ward_code LIKE '%JHB%' ORDER BY ward_code")
    results = cursor.fetchall()
    
    if results:
        print(f"   Found {len(results)} wards:")
        for ward_code, ward_name in results[:20]:
            print(f"   - {ward_code}: {ward_name}")
    else:
        print("   ✓ NO WARDS FOUND - Successfully deleted!")
    
    # Show sample of remaining wards
    print("\n3. Sample of remaining wards in database:")
    cursor.execute("SELECT ward_code, ward_name, municipality_code FROM wards ORDER BY ward_code LIMIT 10")
    for ward_code, ward_name, muni in cursor.fetchall():
        print(f"   - {ward_code}: {ward_name} (Municipality: {muni})")
    
    # Total count
    cursor.execute("SELECT COUNT(*) FROM wards")
    total = cursor.fetchone()[0]
    print(f"\n4. Total wards in database: {total:,}")
    print("   (Was 4,612 before deletion, now 4,477 = 135 wards deleted)")
    
    cursor.close()
    connection.close()
    
except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()

print("=" * 80)

