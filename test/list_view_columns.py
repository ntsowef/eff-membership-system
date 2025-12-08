import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)

cursor = conn.cursor()

# List all columns in the view
cursor.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'members_with_voting_districts'
    ORDER BY ordinal_position
""")

rows = cursor.fetchall()
print("Columns in members_with_voting_districts view:")
print("=" * 60)
for row in rows:
    print(f"{row[0]:<40} {row[1]}")

cursor.close()
conn.close()

