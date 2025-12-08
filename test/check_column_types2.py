#!/usr/bin/env python3
"""Check column types in members_consolidated table"""

import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)

cursor = conn.cursor()

# Check specific columns
cursor.execute("""
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns
    WHERE table_name = 'members_consolidated'
    AND column_name IN ('cell_number', 'ward_code', 'voter_district_code', 'voting_district_code', 'id_number')
    ORDER BY column_name
""")

print("Column Types in members_consolidated:")
print("=" * 80)
for row in cursor.fetchall():
    col_name, data_type, max_length = row
    print(f"{col_name:30} {data_type:20} {max_length if max_length else 'N/A'}")

conn.close()

