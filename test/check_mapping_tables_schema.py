import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

print("\n" + "="*80)
print("IEC_WARD_MAPPINGS TABLE SCHEMA")
print("="*80)
cur.execute("""
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = 'iec_ward_mappings' 
    ORDER BY ordinal_position
""")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}" + (f"({row[2]})" if row[2] else ""))

print("\n" + "="*80)
print("IEC_VOTING_DISTRICT_MAPPINGS TABLE SCHEMA")
print("="*80)
cur.execute("""
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = 'iec_voting_district_mappings' 
    ORDER BY ordinal_position
""")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}" + (f"({row[2]})" if row[2] else ""))

print("\n" + "="*80)
print("IEC_VOTING_STATIONS TABLE SCHEMA (relevant columns)")
print("="*80)
cur.execute("""
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = 'iec_voting_stations' 
    AND column_name IN ('iec_ward_id', 'iec_vd_number', 'iec_municipality_id')
    ORDER BY ordinal_position
""")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}" + (f"({row[2]})" if row[2] else ""))

conn.close()

