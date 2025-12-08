#!/usr/bin/env python3
"""Check municipalities and roles table structure"""

import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)
cur = conn.cursor()

print("=" * 100)
print("MUNICIPALITIES TABLE STRUCTURE")
print("=" * 100)

cur.execute("""
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = 'municipalities' 
    ORDER BY ordinal_position
""")
print("\nColumns:")
for row in cur.fetchall():
    max_len = f"({row[2]})" if row[2] else ""
    print(f"  {row[0]:<30} {row[1]}{max_len}")

cur.execute("SELECT COUNT(*) FROM municipalities")
print(f"\nTotal municipalities: {cur.fetchone()[0]}")

cur.execute("SELECT municipality_code, municipality_name FROM municipalities LIMIT 5")
print("\nSample municipalities:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

print("\n" + "=" * 100)
print("ROLES TABLE")
print("=" * 100)

cur.execute("SELECT role_id, role_name FROM roles ORDER BY role_id")
print("\nAvailable roles:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

print("\n" + "=" * 100)
print("USERS TABLE STRUCTURE")
print("=" * 100)

cur.execute("""
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position
""")
print("\nColumns:")
for row in cur.fetchall():
    max_len = f"({row[2]})" if row[2] else ""
    print(f"  {row[0]:<30} {row[1]}{max_len}")

cur.execute("SELECT COUNT(*) FROM users WHERE admin_level = 'municipal'")
print(f"\nExisting municipal users: {cur.fetchone()[0]}")

conn.close()

