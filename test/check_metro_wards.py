"""
Check if there are wards with Metro Municipality codes (JHB, TSH, EKU)
"""

import psycopg2

DB_CONFIG = {
    'host': 'localhost',
    'database': 'eff_membership_database',
    'user': 'eff_admin',
    'password': 'Frames!123'
}

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

print('\n' + '=' * 100)
print('WARDS WITH METRO MUNICIPALITY CODES (JHB, TSH, EKU)')
print('=' * 100)

cur.execute("""
    SELECT 
        w.ward_code,
        w.municipality_code,
        mu.municipality_name,
        mu.municipality_type,
        COUNT(m.member_id) as member_count
    FROM wards w
    LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
    LEFT JOIN members_consolidated m ON w.ward_code = m.ward_code
    WHERE w.municipality_code IN ('JHB', 'TSH', 'EKU')
    GROUP BY w.ward_code, w.municipality_code, mu.municipality_name, mu.municipality_type
    ORDER BY w.municipality_code, w.ward_code
    LIMIT 20
""")

rows = cur.fetchall()

if rows:
    print(f'\n❌ Found {len(rows)} wards with Metro Municipality codes:\n')
    print(f'{"Ward Code":<15} | {"Muni Code":<10} | {"Municipality Name":<50} | {"Type":<20} | {"Members"}')
    print('-' * 120)
    for row in rows:
        print(f'{row[0]:<15} | {row[1]:<10} | {row[2]:<50} | {row[3]:<20} | {row[4]}')
    
    print('\n💡 These wards should have sub-region codes (e.g., JHB001, TSH002, EKU003)')
    print('   instead of the parent metro code (JHB, TSH, EKU)')
else:
    print('\n✅ No wards found with Metro Municipality codes')
    print('   All wards correctly use sub-region codes')

print('\n' + '=' * 100)
print('CHECKING METRO MUNICIPALITIES IN DATABASE')
print('=' * 100)

cur.execute("""
    SELECT 
        municipality_code,
        municipality_name,
        municipality_type,
        district_code,
        parent_municipality_id
    FROM municipalities
    WHERE municipality_code IN ('JHB', 'TSH', 'EKU')
    ORDER BY municipality_code
""")

metros = cur.fetchall()

if metros:
    print(f'\n✅ Found {len(metros)} Metro Municipalities:\n')
    print(f'{"Code":<10} | {"Name":<50} | {"Type":<20} | {"District":<10} | {"Parent ID"}')
    print('-' * 120)
    for metro in metros:
        print(f'{metro[0]:<10} | {metro[1]:<50} | {metro[2]:<20} | {str(metro[3]):<10} | {metro[4]}')

print('\n' + '=' * 100)
print('CHECKING SUB-REGIONS FOR THESE METROS')
print('=' * 100)

cur.execute("""
    SELECT 
        m.municipality_code,
        m.municipality_name,
        m.municipality_type,
        m.parent_municipality_id,
        pm.municipality_code as parent_code,
        pm.municipality_name as parent_name,
        COUNT(w.ward_code) as ward_count
    FROM municipalities m
    LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
    LEFT JOIN wards w ON m.municipality_code = w.municipality_code
    WHERE pm.municipality_code IN ('JHB', 'TSH', 'EKU')
    GROUP BY m.municipality_code, m.municipality_name, m.municipality_type, 
             m.parent_municipality_id, pm.municipality_code, pm.municipality_name
    ORDER BY pm.municipality_code, m.municipality_code
    LIMIT 30
""")

subregions = cur.fetchall()

if subregions:
    print(f'\n✅ Found {len(subregions)} Sub-Regions:\n')
    print(f'{"Sub-Region Code":<15} | {"Sub-Region Name":<40} | {"Parent Code":<12} | {"Parent Name":<40} | {"Wards"}')
    print('-' * 140)
    for sr in subregions:
        print(f'{sr[0]:<15} | {sr[1]:<40} | {sr[4]:<12} | {sr[5]:<40} | {sr[6]}')

cur.close()
conn.close()

print('\n' + '=' * 100)
print('SUMMARY')
print('=' * 100)
print('\n✅ The fix in excelReportService.ts will:')
print('   1. Exclude Metro Municipalities (municipality_type = \'Metropolitan\')')
print('   2. Show only sub-regions in the report')
print('   3. Properly resolve province for sub-regions through parent municipality')
print('\n💡 After deploying the fix, regenerate the Daily Report to verify.')
print('=' * 100)

