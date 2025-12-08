#!/usr/bin/env python3
"""
Check users table structure and related tables
"""

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
print("USERS TABLE STRUCTURE")
print("=" * 100)

# Get users table columns
cur.execute("""
    SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable,
        column_default
    FROM information_schema.columns 
    WHERE table_name = 'users'
    ORDER BY ordinal_position
""")

print("\nColumns in users table:")
print("-" * 100)
for col in cur.fetchall():
    nullable = "NULL" if col[3] == 'YES' else "NOT NULL"
    max_len = f"({col[2]})" if col[2] else ""
    default = f" DEFAULT {col[4]}" if col[4] else ""
    print(f"  {col[0]:<30} {col[1]}{max_len:<20} {nullable:<10} {default}")

# Check roles table
print("\n" + "=" * 100)
print("ROLES TABLE")
print("=" * 100)

cur.execute("SELECT role_id, role_name, description FROM roles ORDER BY role_id")
roles = cur.fetchall()
print("\nAvailable roles:")
print("-" * 100)
for role in roles:
    print(f"  {role[0]}: {role[1]:<20} - {role[2]}")

# Check current users
print("\n" + "=" * 100)
print("CURRENT USERS IN DATABASE")
print("=" * 100)

cur.execute("""
    SELECT 
        u.user_id,
        u.name,
        u.email,
        u.role_id,
        r.role_name,
        u.admin_level,
        u.member_id,
        u.is_active
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
    ORDER BY u.user_id
    LIMIT 10
""")

users = cur.fetchall()
print(f"\nShowing first 10 users (Total: {len(users)}):")
print("-" * 100)
for user in users:
    print(f"  ID: {user[0]:<6} | {user[1]:<30} | {user[2]:<35} | Role: {user[4]:<15} | Level: {user[5]:<10} | Active: {user[7]}")

# Check geographic hierarchy tables
print("\n" + "=" * 100)
print("GEOGRAPHIC HIERARCHY")
print("=" * 100)

cur.execute("SELECT COUNT(*) FROM provinces")
print(f"  Provinces: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM districts")
print(f"  Districts: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM municipalities")
print(f"  Municipalities: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM wards")
print(f"  Wards: {cur.fetchone()[0]}")

conn.close()

print("\n" + "=" * 100)
print("END OF REPORT")
print("=" * 100)

