import psycopg2

# Connect to database
conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    dbname='eff_membership_database'
)

cur = conn.cursor()

print("=" * 80)
print("SEARCHING FOR 'iec_vd_number' COLUMN IN ALL TABLES")
print("=" * 80)

cur.execute("""
    SELECT table_name, column_name, data_type
    FROM information_schema.columns 
    WHERE column_name LIKE '%iec_vd%'
    ORDER BY table_name, column_name
""")

results = cur.fetchall()
if results:
    for row in results:
        print(f"Table: {row[0]:<40} Column: {row[1]:<30} Type: {row[2]}")
else:
    print("❌ No columns found with 'iec_vd' in the name")

print("\n" + "=" * 80)
print("VOTING_DISTRICTS TABLE - ALL COLUMNS")
print("=" * 80)

cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'voting_districts'
    ORDER BY ordinal_position
""")

for row in cur.fetchall():
    print(f"{row[0]:<40} {row[1]}")

conn.close()

