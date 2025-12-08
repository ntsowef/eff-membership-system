import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)

cursor = conn.cursor()

# Check if expiry_date column exists in the view
cursor.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'members_with_voting_districts' 
    AND column_name LIKE '%expiry%'
""")

rows = cursor.fetchall()
print("Columns with 'expiry' in members_with_voting_districts view:")
for row in rows:
    print(f"  - {row[0]}")

# Test the query that was failing
cursor.execute("""
    SELECT COUNT(*) as count 
    FROM members_with_voting_districts 
    WHERE expiry_date >= CURRENT_DATE - INTERVAL '90 days' 
    AND voting_district_code = '21960031'
""")

result = cursor.fetchone()
print(f"\nTest query result: {result[0]} members found")

cursor.close()
conn.close()

print("\n✅ View has expiry_date column and query works!")

