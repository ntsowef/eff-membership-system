#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    database='eff_membership_database',
    user='eff_admin',
    password='Frames!123'
)
cursor = conn.cursor()

# Check which special codes exist in voting_districts table
special_codes_8 = ['22222222', '99999999', '33333333', '11111111', '00000000']
special_codes_9 = ['222222222', '999999999', '333333333', '111111111', '000000000']

print("\n8-digit special codes in voting_districts table:")
for code in special_codes_8:
    cursor.execute('SELECT voting_district_code, voting_district_name FROM voting_districts WHERE voting_district_code = %s', (code,))
    result = cursor.fetchone()
    if result:
        print(f"  ✅ {result[0]}: {result[1]}")
    else:
        print(f"  ❌ {code}: NOT FOUND")

print("\n9-digit special codes in voting_districts table:")
for code in special_codes_9:
    cursor.execute('SELECT voting_district_code, voting_district_name FROM voting_districts WHERE voting_district_code = %s', (code,))
    result = cursor.fetchone()
    if result:
        print(f"  ✅ {result[0]}: {result[1]}")
    else:
        print(f"  ❌ {code}: NOT FOUND")

conn.close()

