#!/usr/bin/env python3
"""Test inserting a single record to identify which column causes integer overflow"""

import psycopg2
from psycopg2.extras import execute_values

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)

cursor = conn.cursor()

# Sample data from the first row
test_data = [(
    '0001020948087',  # id_number
    'ESETHU',  # firstname
    'ZWEZWE',  # surname
    '2002-10-09',  # date_of_birth
    22,  # age
    1,  # gender_id
    1,  # race_id
    1,  # citizenship_id
    1,  # language_id
    '63703031',  # ward_code
    '22222222',  # voter_district_code
    None,  # voting_district_code
    None,  # voting_station_id
    'MAFIKENG',  # residential_address
    '27632383545',  # cell_number
    None,  # email
    1,  # occupation_id
    1,  # qualification_id
    1,  # voter_status_id
    'Good Standing',  # membership_type
    'North West',  # province_name
    'NW',  # province_code
    'Dr Kenneth Kaunda',  # district_name
    'DC40',  # district_code
    'Mahikeng',  # municipality_name
    'NW403',  # municipality_code
    '2024-01-01',  # date_joined
    '2024-01-01',  # last_payment_date
    '2025-01-01',  # expiry_date
    1,  # subscription_type_id
    10.00,  # membership_amount
    1,  # membership_status_id
    None,  # payment_method
    None,  # payment_reference
    'Pending'  # payment_status
)]

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
        updated_at = CURRENT_TIMESTAMP
    RETURNING id_number, member_id
"""

print("Testing single insert...")
print(f"Test data: {test_data[0]}")
print(f"\nColumn types:")
for i, val in enumerate(test_data[0]):
    print(f"  {i+1}: {val} (type: {type(val).__name__})")

try:
    # Try without template first
    print("\n[TEST 1] Inserting WITHOUT template...")
    result = execute_values(cursor, query, test_data, template=None, page_size=1, fetch=True)
    print(f"✓ SUCCESS! Inserted: {result}")
    conn.rollback()  # Rollback to test again
except Exception as e:
    print(f"✗ FAILED: {e}")
    conn.rollback()

try:
    # Try with VARCHAR casting template
    print("\n[TEST 2] Inserting WITH VARCHAR casting template...")
    template = """(
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::VARCHAR, %s::VARCHAR, %s::VARCHAR, %s, %s, %s::VARCHAR, %s, %s, %s, %s, %s,
        %s, %s::VARCHAR, %s, %s::VARCHAR, %s, %s::VARCHAR, %s, %s, %s, %s, %s, %s, %s, %s, %s
    )"""
    result = execute_values(cursor, query, test_data, template=template, page_size=1, fetch=True)
    print(f"✓ SUCCESS! Inserted: {result}")
    conn.rollback()
except Exception as e:
    print(f"✗ FAILED: {e}")
    conn.rollback()

conn.close()
print("\nTest complete!")

