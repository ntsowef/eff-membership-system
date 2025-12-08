import psycopg2

# Connect to database
conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    dbname='eff_membership_database'
)

cur = conn.cursor()

# Get voting_districts table schema
print("=" * 80)
print("VOTING_DISTRICTS TABLE SCHEMA")
print("=" * 80)
cur.execute("""
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'voting_districts' 
    ORDER BY ordinal_position
""")

for row in cur.fetchall():
    nullable = "NULL" if row[3] == 'YES' else "NOT NULL"
    max_len = f"({row[2]})" if row[2] else ""
    print(f"{row[0]:<30} {row[1]:<20} {max_len:<10} {nullable}")

# Check if there's an iec_vd_number column
print("\n" + "=" * 80)
print("CHECKING FOR IEC VD NUMBER COLUMN")
print("=" * 80)
cur.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'voting_districts' 
    AND column_name LIKE '%iec%' OR column_name LIKE '%vd%'
""")
iec_columns = cur.fetchall()
if iec_columns:
    print("Found IEC/VD related columns:")
    for col in iec_columns:
        print(f"  - {col[0]}")
else:
    print("❌ No IEC VD number column found in voting_districts table")

# Sample some voting district codes
print("\n" + "=" * 80)
print("SAMPLE VOTING DISTRICT RECORDS (First 5)")
print("=" * 80)
cur.execute("""
    SELECT voting_district_code, voting_district_name, ward_code
    FROM voting_districts
    LIMIT 5
""")
for row in cur.fetchall():
    print(f"Code: {row[0]:<15} Name: {row[1]:<40} Ward: {row[2]}")

conn.close()

