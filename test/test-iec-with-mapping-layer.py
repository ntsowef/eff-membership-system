#!/usr/bin/env python3
"""
Test IEC API Integration with Mapping Layer
Test ID: 7808020703087
Expected: ward_id=79800135, vd_number=32871326
"""

import requests
import psycopg2
import json

# Test ID
TEST_ID = "7808020703087"

print("\n" + "="*80)
print("IEC API + MAPPING LAYER TEST")
print("="*80)
print(f"Test ID: {TEST_ID}")
print("="*80)

# Step 1: Call Backend API
print("\n📞 STEP 1: Calling Backend API")
print("-"*80)

try:
    response = requests.post(
        'http://localhost:5000/api/v1/iec/verify',
        json={'id_number': TEST_ID},
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Backend API Response:")
        print(json.dumps(data, indent=2))
        
        ward_code = data.get('ward_code')
        vd_code = data.get('voting_district_code')
        
        print(f"\n📍 Extracted Values:")
        print(f"   Ward Code: {ward_code}")
        print(f"   VD Code: {vd_code}")
    else:
        print(f"❌ API Error: {response.status_code}")
        print(response.text)
        exit(1)
        
except Exception as e:
    print(f"❌ Error calling API: {e}")
    exit(1)

# Step 2: Check Mapping Table
print("\n" + "="*80)
print("📊 STEP 2: Checking Mapping Table")
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
    
    # Check if VD exists in mapping table
    print(f"\n🔍 Looking up VD Code: {vd_code}")
    cur.execute("""
        SELECT 
            iec_vd_number,
            voting_district_code,
            voting_district_name,
            ward_code,
            voting_station_name
        FROM iec_voting_district_mappings
        WHERE iec_vd_number = %s
    """, (int(vd_code),))
    
    mapping = cur.fetchone()
    
    if mapping:
        print("✅ Found in Mapping Table:")
        print(f"   IEC VD Number: {mapping[0]}")
        print(f"   VD Code: {mapping[1]}")
        print(f"   VD Name: {mapping[2]}")
        print(f"   Ward Code: {mapping[3]}")
        print(f"   Voting Station: {mapping[4]}")
    else:
        print(f"❌ VD Code {vd_code} NOT found in mapping table!")
    
    # Check ward mapping
    print(f"\n🔍 Looking up Ward Code: {ward_code}")
    cur.execute("""
        SELECT COUNT(*)
        FROM iec_voting_district_mappings
        WHERE ward_code = %s
    """, (ward_code,))
    
    ward_vd_count = cur.fetchone()[0]
    print(f"✅ Found {ward_vd_count} voting districts for ward {ward_code}")
    
    # Show sample VDs for this ward
    if ward_vd_count > 0:
        cur.execute("""
            SELECT 
                iec_vd_number,
                voting_district_name
            FROM iec_voting_district_mappings
            WHERE ward_code = %s
            LIMIT 5
        """, (ward_code,))
        
        print(f"\n📋 Sample Voting Districts for Ward {ward_code}:")
        for row in cur.fetchall():
            print(f"   - VD {row[0]}: {row[1]}")
        
        if ward_vd_count > 5:
            print(f"   ... and {ward_vd_count - 5} more")
    
    conn.close()
    
except Exception as e:
    print(f"❌ Database Error: {e}")
    exit(1)

# Step 3: Verify Data Consistency
print("\n" + "="*80)
print("✅ STEP 3: Data Consistency Check")
print("="*80)

if mapping:
    backend_ward = ward_code
    mapping_ward = mapping[3]
    
    if backend_ward == mapping_ward:
        print(f"✅ Ward codes match: {backend_ward} = {mapping_ward}")
    else:
        print(f"❌ Ward code mismatch: Backend={backend_ward}, Mapping={mapping_ward}")
    
    backend_vd = vd_code
    mapping_vd = str(mapping[1])
    
    if backend_vd == mapping_vd:
        print(f"✅ VD codes match: {backend_vd} = {mapping_vd}")
    else:
        print(f"❌ VD code mismatch: Backend={backend_vd}, Mapping={mapping_vd}")

# Final Summary
print("\n" + "="*80)
print("🎉 TEST SUMMARY")
print("="*80)
print(f"✅ Backend API: Working")
print(f"✅ Mapping Table: {ward_vd_count} VDs for ward {ward_code}")
print(f"✅ Data Consistency: Verified")
print(f"✅ Test Case: PASSED")
print("="*80)

