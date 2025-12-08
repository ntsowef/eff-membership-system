#!/usr/bin/env python3
"""
Check database relationships for members_consolidated table
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
print("DATABASE RELATIONSHIPS FOR members_consolidated")
print("=" * 100)

# Check foreign key constraints ON members_consolidated
print("\n1. Foreign Keys FROM other tables TO members_consolidated:")
print("-" * 100)
cur.execute("""
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'members_consolidated'
    ORDER BY tc.table_name;
""")

fk_to_members = cur.fetchall()
if fk_to_members:
    for row in fk_to_members:
        print(f"  {row[0]}.{row[1]} -> {row[2]}.{row[3]} (constraint: {row[4]})")
else:
    print("  No foreign keys found pointing TO members_consolidated")

# Check foreign key constraints FROM members_consolidated
print("\n2. Foreign Keys FROM members_consolidated TO other tables:")
print("-" * 100)
cur.execute("""
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'members_consolidated'
    ORDER BY ccu.table_name;
""")

fk_from_members = cur.fetchall()
if fk_from_members:
    for row in fk_from_members:
        print(f"  {row[0]}.{row[1]} -> {row[2]}.{row[3]} (constraint: {row[4]})")
else:
    print("  No foreign keys found FROM members_consolidated")

# Check for users table and national.admin@eff.org.za
print("\n3. Checking for users table and national.admin@eff.org.za:")
print("-" * 100)
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
        AND table_name = 'users'
""")
users_table = cur.fetchone()

if users_table:
    print("  ✓ users table exists")
    
    # Check columns in users table
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
    """)
    print("\n  Columns in users table:")
    for col in cur.fetchall():
        print(f"    - {col[0]} ({col[1]})")
    
    # Check for national.admin@eff.org.za
    cur.execute("""
        SELECT * FROM users 
        WHERE email = 'national.admin@eff.org.za'
    """)
    admin_user = cur.fetchone()
    if admin_user:
        print(f"\n  ✓ Found national.admin@eff.org.za user: {admin_user}")
    else:
        print("\n  ✗ national.admin@eff.org.za user NOT found")
else:
    print("  ✗ users table does NOT exist")

# Check all tables that might be related
print("\n4. All tables in database:")
print("-" * 100)
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    ORDER BY table_name
""")
all_tables = cur.fetchall()
for table in all_tables:
    print(f"  - {table[0]}")

# Count records in members_consolidated
print("\n5. Current record count:")
print("-" * 100)
cur.execute("SELECT COUNT(*) FROM members_consolidated")
count = cur.fetchone()[0]
print(f"  members_consolidated: {count} records")

conn.close()

print("\n" + "=" * 100)
print("END OF REPORT")
print("=" * 100)

