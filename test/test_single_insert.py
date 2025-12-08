#!/usr/bin/env python3
"""
Test inserting a single row to identify which column causes integer overflow
"""

import psycopg2
from psycopg2.extras import execute_values

db_config = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

# Sample data from the Excel file (first row after processing)
test_data = [(
    '0002161259086',  # id_number (VARCHAR)
    'John',  # firstname
    'Doe',  # surname
    '2000-01-01',  # date_of_birth
    24,  # age (INTEGER)
    1,  # gender_id (INTEGER)
    1,  # race_id (INTEGER)
    1,  # citizenship_id (INTEGER)
    1,  # language_id (INTEGER)
    '63701001',  # ward_code (VARCHAR)
    '27632383545',  # voter_district_code (THIS MIGHT BE THE PROBLEM!)
    '27632383545',  # voting_district_code (VARCHAR)
    None,  # voting_station_id (INTEGER)
    '123 Main St',  # residential_address
    '27632383545',  # cell_number (VARCHAR)
    'test@example.com',  # email
    1,  # occupation_id (INTEGER)
    1,  # qualification_id (INTEGER)
    1,  # voter_status_id (INTEGER)
    'Full Member',  # membership_type
    'North West',  # province_name
    'NW',  # province_code
    'Test District',  # district_name
    'DC01',  # district_code
    'Test Municipality',  # municipality_name
    'NW001',  # municipality_code
    '2024-01-01',  # date_joined
    '2024-01-01',  # last_payment_date
    '2025-01-01',  # expiry_date
    1,  # subscription_type_id (INTEGER)
    100.00,  # membership_amount (NUMERIC)
    1,  # membership_status_id (INTEGER)
    'Cash',  # payment_method
    'REF001',  # payment_reference
    'Paid'  # payment_status
)]

print("=" * 80)
print("TESTING SINGLE ROW INSERT")
print("=" * 80)

try:
    conn = psycopg2.connect(**db_config)
    cursor = conn.cursor()
    
    query = """
        INSERT INTO members_consolidated (
            id_number, firstname, surname, date_of_birth, age, gender_id, race_id,
            citizenship_id, language_id, ward_code, voter_district_code, voting_district_code,
            voting_station_id, residential_address, cell_number, email, occupation_id,
            qualification_id, voter_status_id, membership_type,
            province_name, province_code, district_name, district_code,
            municipality_name, municipality_code,
            date_joined, last_payment_date, expiry_date, subscription_type_id,
            membership_amount, membership_status_id, payment_method, payment_reference, payment_status
        ) VALUES %s
        ON CONFLICT (id_number) DO UPDATE SET
            firstname = EXCLUDED.firstname
        RETURNING id_number, member_id
    """
    
    print("\n[*] Attempting to insert test row...")
    print(f"    voter_district_code: {test_data[0][10]}")
    print(f"    cell_number: {test_data[0][14]}")
    
    result = execute_values(cursor, query, test_data, fetch=True)
    
    print(f"\n✓ SUCCESS! Inserted row:")
    print(f"    ID Number: {result[0][0]}")
    print(f"    Member ID: {result[0][1]}")
    
    conn.rollback()  # Don't actually commit the test data
    cursor.close()
    conn.close()
    
except psycopg2.errors.NumericValueOutOfRange as e:
    print(f"\n❌ INTEGER OUT OF RANGE ERROR!")
    print(f"    Error: {e}")
    print(f"\n💡 The error is likely in one of these columns:")
    print(f"    - voter_district_code: '{test_data[0][10]}' (trying to insert into INTEGER column?)")
    print(f"    - cell_number: '{test_data[0][14]}'")
    print(f"    - age: {test_data[0][4]}")
    print(f"    - Any other ID column")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print(f"    Type: {type(e).__name__}")

print("\n" + "=" * 80)

