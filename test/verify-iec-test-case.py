import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

print('🔍 Verifying IEC Data for Test Case: ID 7808020703087')
print('=' * 80)
print('\nExpected IEC Data:')
print('  Province ID: 3 (Gauteng)')
print('  Municipality ID: 3003 (JHB - City of Johannesburg)')
print('  Ward ID: 79800135')
print('  VD Number: 32871326')
print('  Voting Station: GLEN RIDGE PRIMARY SCHOOL')
print()

# Search for the exact voting district
cur.execute("""
    SELECT 
        id,
        iec_province_id,
        iec_province_name,
        iec_municipality_id,
        iec_municipality_name,
        iec_ward_id,
        iec_vd_number,
        iec_voting_district_name,
        town,
        suburb,
        street
    FROM iec_voting_stations
    WHERE iec_vd_number = 32871326
""")

result = cur.fetchone()

if result:
    print('✅ FOUND! Voting station data in database:')
    print('-' * 80)
    print(f'  ID: {result[0]}')
    print(f'  Province: {result[1]} - {result[2]}')
    print(f'  Municipality: {result[3]} - {result[4]}')
    print(f'  Ward ID: {result[5]}')
    print(f'  VD Number: {result[6]}')
    print(f'  Voting Station: {result[7]}')
    print(f'  Location: {result[10]}, {result[9]}, {result[8]}')
    print()
    print('✅ This data can now be used for IEC mapping!')
else:
    print('❌ NOT FOUND: VD Number 32871326 not in database')

# Also check how many records exist for Johannesburg
print('\n📊 Johannesburg (Municipality ID 3003) Statistics:')
print('-' * 80)

cur.execute("""
    SELECT COUNT(*) 
    FROM iec_voting_stations 
    WHERE iec_municipality_id = 3003
""")
jhb_count = cur.fetchone()[0]
print(f'  Total voting stations: {jhb_count}')

cur.execute("""
    SELECT COUNT(DISTINCT iec_ward_id) 
    FROM iec_voting_stations 
    WHERE iec_municipality_id = 3003
""")
jhb_wards = cur.fetchone()[0]
print(f'  Unique wards: {jhb_wards}')

# Show sample ward IDs for JHB
cur.execute("""
    SELECT DISTINCT iec_ward_id 
    FROM iec_voting_stations 
    WHERE iec_municipality_id = 3003
    ORDER BY iec_ward_id
    LIMIT 10
""")
sample_wards = cur.fetchall()
print(f'  Sample ward IDs: {[w[0] for w in sample_wards]}')

conn.close()

print('\n' + '=' * 80)
print('✅ Verification complete!')

