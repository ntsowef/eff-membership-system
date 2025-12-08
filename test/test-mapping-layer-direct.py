#!/usr/bin/env python3
"""
Test IEC Mapping Layer - Direct Database Test
Test the mapping layer without needing the backend API
"""

import psycopg2

# Test data
TEST_WARD_CODE = "79800135"
TEST_VD_CODE = "32871326"

print("\n" + "="*80)
print("IEC MAPPING LAYER - DIRECT DATABASE TEST")
print("="*80)
print(f"Test Ward Code: {TEST_WARD_CODE}")
print(f"Test VD Code: {TEST_VD_CODE}")
print("="*80)

try:
    conn = psycopg2.connect(
        host='localhost',
        user='eff_admin',
        password='Frames!123',
        database='eff_membership_database',
        port=5432
    )
    
    cur = conn.cursor()
    
    # Test 1: Check if VD exists in mapping table
    print("\n" + "="*80)
    print("TEST 1: Lookup Voting District by IEC VD Number")
    print("="*80)
    
    cur.execute("""
        SELECT 
            iec_vd_number,
            voting_district_code,
            voting_district_name,
            ward_code,
            voting_station_name,
            is_active
        FROM iec_voting_district_mappings
        WHERE iec_vd_number = %s
    """, (int(TEST_VD_CODE),))
    
    vd_mapping = cur.fetchone()
    
    if vd_mapping:
        print("✅ FOUND in Mapping Table:")
        print(f"   IEC VD Number: {vd_mapping[0]}")
        print(f"   VD Code: {vd_mapping[1]}")
        print(f"   VD Name: {vd_mapping[2]}")
        print(f"   Ward Code: {vd_mapping[3]}")
        print(f"   Voting Station: {vd_mapping[4]}")
        print(f"   Is Active: {vd_mapping[5]}")
    else:
        print(f"❌ NOT FOUND: VD {TEST_VD_CODE}")
    
    # Test 2: Get all VDs for the ward
    print("\n" + "="*80)
    print(f"TEST 2: Get All Voting Districts for Ward {TEST_WARD_CODE}")
    print("="*80)
    
    cur.execute("""
        SELECT 
            iec_vd_number,
            voting_district_name,
            voting_station_name
        FROM iec_voting_district_mappings
        WHERE ward_code = %s
        ORDER BY iec_vd_number
    """, (TEST_WARD_CODE,))
    
    ward_vds = cur.fetchall()
    
    if ward_vds:
        print(f"✅ Found {len(ward_vds)} voting districts for ward {TEST_WARD_CODE}:")
        print("-"*80)
        for i, vd in enumerate(ward_vds[:10], 1):
            print(f"   {i}. VD {vd[0]}: {vd[1]}")
        if len(ward_vds) > 10:
            print(f"   ... and {len(ward_vds) - 10} more")
    else:
        print(f"❌ No voting districts found for ward {TEST_WARD_CODE}")
    
    # Test 3: Statistics
    print("\n" + "="*80)
    print("TEST 3: Mapping Table Statistics")
    print("="*80)
    
    cur.execute("SELECT COUNT(*) FROM iec_voting_district_mappings")
    total_vds = cur.fetchone()[0]
    print(f"✅ Total VD Mappings: {total_vds:,}")
    
    cur.execute("SELECT COUNT(DISTINCT ward_code) FROM iec_voting_district_mappings")
    total_wards = cur.fetchone()[0]
    print(f"✅ Total Unique Wards: {total_wards:,}")
    
    cur.execute("SELECT COUNT(*) FROM iec_voting_district_mappings WHERE is_active = true")
    active_vds = cur.fetchone()[0]
    print(f"✅ Active VD Mappings: {active_vds:,}")
    
    # Test 4: Sample data from different wards
    print("\n" + "="*80)
    print("TEST 4: Sample Data from Different Wards")
    print("="*80)
    
    cur.execute("""
        SELECT DISTINCT ward_code
        FROM iec_voting_district_mappings
        ORDER BY ward_code
        LIMIT 5
    """)
    
    sample_wards = cur.fetchall()
    print(f"Sample of {len(sample_wards)} wards:")
    for ward in sample_wards:
        cur.execute("""
            SELECT COUNT(*)
            FROM iec_voting_district_mappings
            WHERE ward_code = %s
        """, (ward[0],))
        vd_count = cur.fetchone()[0]
        print(f"   Ward {ward[0]}: {vd_count} voting districts")
    
    # Final Summary
    print("\n" + "="*80)
    print("🎉 TEST SUMMARY")
    print("="*80)
    
    if vd_mapping:
        print(f"✅ Test VD {TEST_VD_CODE}: FOUND")
        print(f"✅ Ward {TEST_WARD_CODE}: {len(ward_vds)} VDs")
        print(f"✅ Total Mappings: {total_vds:,}")
        print(f"✅ Mapping Layer: WORKING")
    else:
        print(f"❌ Test VD {TEST_VD_CODE}: NOT FOUND")
        print(f"❌ Mapping Layer: INCOMPLETE")
    
    print("="*80)
    
    conn.close()
    
except Exception as e:
    print(f"\n❌ Database Error: {e}")
    import traceback
    traceback.print_exc()

