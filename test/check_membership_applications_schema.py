import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

print("\n" + "=" * 80)
print("MEMBERSHIP_APPLICATIONS TABLE - GENDER COLUMNS")
print("=" * 80)

cur.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'membership_applications'
    AND column_name LIKE '%gender%'
    ORDER BY ordinal_position
""")

rows = cur.fetchall()

if rows:
    print("\nGender-related columns found:")
    for row in rows:
        print(f"  Column: {row[0]}")
        print(f"  Type: {row[1]}")
        print(f"  Nullable: {row[2]}")
        print()
else:
    print("\n❌ No gender-related columns found!")

print("\n" + "=" * 80)
print("ALL COLUMNS IN MEMBERSHIP_APPLICATIONS")
print("=" * 80)

cur.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'membership_applications'
    ORDER BY ordinal_position
""")

all_columns = cur.fetchall()
print(f"\nTotal columns: {len(all_columns)}\n")

for i, row in enumerate(all_columns, 1):
    print(f"{i:3}. {row[0]:30} {row[1]:20} {'NULL' if row[2] == 'YES' else 'NOT NULL'}")

conn.close()

