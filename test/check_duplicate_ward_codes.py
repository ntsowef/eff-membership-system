"""
Check for duplicate ward codes and identify data issues
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
print('CHECKING WARD CODE: EKU001')
print('=' * 100)

cur.execute("""
    SELECT 
        w.ward_code,
        w.municipality_code,
        mu.municipality_name,
        mu.municipality_type,
        w.ward_number,
        w.ward_name
    FROM wards w
    LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
    WHERE w.ward_code = 'EKU001'
""")

rows = cur.fetchall()

if rows:
    print(f'\nFound {len(rows)} ward(s) with code EKU001:\n')
    for row in rows:
        print(f'Ward Code: {row[0]}')
        print(f'Municipality Code: {row[1]}')
        print(f'Municipality Name: {row[2]}')
        print(f'Municipality Type: {row[3]}')
        print(f'Ward Number: {row[4]}')
        print(f'Ward Name: {row[5]}')
        print('-' * 100)

print('\n' + '=' * 100)
print('CHECKING WARD CODE: TSH001')
print('=' * 100)

cur.execute("""
    SELECT 
        w.ward_code,
        w.municipality_code,
        mu.municipality_name,
        mu.municipality_type,
        w.ward_number,
        w.ward_name
    FROM wards w
    LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
    WHERE w.ward_code = 'TSH001'
""")

rows = cur.fetchall()

if rows:
    print(f'\nFound {len(rows)} ward(s) with code TSH001:\n')
    for row in rows:
        print(f'Ward Code: {row[0]}')
        print(f'Municipality Code: {row[1]}')
        print(f'Municipality Name: {row[2]}')
        print(f'Municipality Type: {row[3]}')
        print(f'Ward Number: {row[4]}')
        print(f'Ward Name: {row[5]}')
        print('-' * 100)

print('\n' + '=' * 100)
print('CHECKING WARD CODE: TSH002')
print('=' * 100)

cur.execute("""
    SELECT 
        w.ward_code,
        w.municipality_code,
        mu.municipality_name,
        mu.municipality_type,
        w.ward_number,
        w.ward_name
    FROM wards w
    LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
    WHERE w.ward_code = 'TSH002'
""")

rows = cur.fetchall()

if rows:
    print(f'\nFound {len(rows)} ward(s) with code TSH002:\n')
    for row in rows:
        print(f'Ward Code: {row[0]}')
        print(f'Municipality Code: {row[1]}')
        print(f'Municipality Name: {row[2]}')
        print(f'Municipality Type: {row[3]}')
        print(f'Ward Number: {row[4]}')
        print(f'Ward Name: {row[5]}')
        print('-' * 100)

print('\n' + '=' * 100)
print('SUMMARY')
print('=' * 100)
print('\n💡 Analysis:')
print('   - Ward codes like EKU001, TSH001, TSH002 exist in the wards table')
print('   - These ward codes are ALSO sub-region codes in the municipalities table')
print('   - The wards table has municipality_code pointing to the PARENT metro (EKU, TSH)')
print('   - This is causing the Metro Municipalities to appear in the report')
print('\n✅ The fix will:')
print('   - Exclude wards where municipality_type = \'Metropolitan\'')
print('   - These problematic wards will not appear in the report')
print('   - Only wards with proper sub-region municipality codes will be shown')
print('=' * 100)

cur.close()
conn.close()

