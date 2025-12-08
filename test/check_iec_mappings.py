import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

print('🔍 Checking IEC Mappings for ID 7808020703087\n')
print('IEC Data from verification:')
print('  Province ID: 3')
print('  Municipality ID: 3003')
print('  Ward ID: 79800135')
print('  VD Number: 32871326\n')

# Check province mapping
cur.execute("SELECT * FROM iec_province_mappings WHERE iec_province_id = 3")
province_result = cur.fetchall()

print('1. Province Mapping:')
if province_result:
    print(f'  ✅ Found: {province_result[0]}')
else:
    print('  ❌ No mapping found for IEC Province ID 3')

# Check municipality mapping
cur.execute("SELECT * FROM iec_municipality_mappings WHERE iec_municipality_id = '3003'")
municipality_result = cur.fetchall()

print('\n2. Municipality Mapping:')
if municipality_result:
    print(f'  ✅ Found: {municipality_result[0]}')
else:
    print('  ❌ No mapping found for IEC Municipality ID 3003')
    
    # Check what municipality mappings exist
    cur.execute("SELECT * FROM iec_municipality_mappings ORDER BY iec_municipality_id::integer LIMIT 10")
    sample_muni = cur.fetchall()
    print('\n  Sample municipality mappings:')
    for row in sample_muni:
        print(f'    IEC ID: {row[0]} → {row[1]}')

# Check ward mapping
cur.execute("SELECT * FROM iec_ward_mappings WHERE iec_ward_id = '79800135'")
ward_result = cur.fetchall()

print('\n3. Ward Mapping:')
if ward_result:
    print(f'  ✅ Found: {ward_result[0]}')
else:
    print('  ❌ No mapping found for IEC Ward ID 79800135')
    
    # Check what ward mappings exist
    cur.execute("SELECT * FROM iec_ward_mappings WHERE iec_ward_id LIKE '798%' ORDER BY iec_ward_id LIMIT 10")
    sample_ward = cur.fetchall()
    print('\n  Sample ward mappings starting with 798:')
    if sample_ward:
        for row in sample_ward:
            print(f'    IEC Ward ID: {row[0]} → Ward Code: {row[1]}')
    else:
        print('    No ward mappings found starting with 798')
        
        # Check total ward mappings
        cur.execute("SELECT COUNT(*) FROM iec_ward_mappings")
        total_wards = cur.fetchone()[0]
        print(f'\n  Total ward mappings in database: {total_wards}')
        
        # Show first 10 ward mappings
        cur.execute("SELECT * FROM iec_ward_mappings ORDER BY iec_ward_id LIMIT 10")
        first_wards = cur.fetchall()
        print('\n  First 10 ward mappings:')
        for row in first_wards:
            print(f'    IEC Ward ID: {row[0]} → Ward Code: {row[1]}')

# Check voting district
print('\n4. Voting District:')
print('  Looking for VD Number: 32871326')

if ward_result:
    ward_code = ward_result[0][1]
    cur.execute("SELECT * FROM voting_districts WHERE ward_code = %s AND voting_district_number = '32871326'", (ward_code,))
    vd_result = cur.fetchall()
    
    if vd_result:
        print(f'  ✅ Found: {vd_result[0]}')
    else:
        print(f'  ❌ No voting district found for ward {ward_code} with VD number 32871326')
else:
    print('  ⚠️ Cannot check voting district without ward mapping')

conn.close()

