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
print("VOTING_DISTRICTS TABLE DATA ANALYSIS")
print("=" * 80)

# Total count
cur.execute("SELECT COUNT(*) FROM voting_districts")
total = cur.fetchone()[0]
print(f"\nTotal voting districts: {total}")

# Count by ward prefix
print("\n" + "=" * 80)
print("VOTING DISTRICTS BY MUNICIPALITY (Top 10)")
print("=" * 80)

cur.execute("""
    SELECT 
        SUBSTRING(ward_code FROM 1 FOR 3) as municipality_prefix,
        COUNT(*) as vd_count
    FROM voting_districts
    GROUP BY SUBSTRING(ward_code FROM 1 FOR 3)
    ORDER BY vd_count DESC
    LIMIT 10
""")

for row in cur.fetchall():
    print(f"{row[0]}: {row[1]} voting districts")

# Check specifically for JHB
print("\n" + "=" * 80)
print("JOHANNESBURG (JHB) VOTING DISTRICTS")
print("=" * 80)

cur.execute("""
    SELECT COUNT(*) 
    FROM voting_districts
    WHERE ward_code LIKE 'JHB%'
""")
jhb_count = cur.fetchone()[0]
print(f"Total JHB voting districts: {jhb_count}")

if jhb_count > 0:
    print("\nSample JHB voting districts:")
    cur.execute("""
        SELECT voting_district_code, voting_district_name, ward_code
        FROM voting_districts
        WHERE ward_code LIKE 'JHB%'
        LIMIT 10
    """)
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]} (Ward: {row[2]})")

# Check ward JHB135 specifically
print("\n" + "=" * 80)
print("WARD JHB135 VOTING DISTRICTS")
print("=" * 80)

cur.execute("""
    SELECT COUNT(*) 
    FROM voting_districts
    WHERE ward_code = 'JHB135'
""")
jhb135_count = cur.fetchone()[0]
print(f"Total voting districts in JHB135: {jhb135_count}")

conn.close()

