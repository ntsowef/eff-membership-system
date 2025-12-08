#!/usr/bin/env python3
"""Check patterns in NULL expiry dates"""

import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)

cursor = conn.cursor()

print("=" * 80)
print("NULL EXPIRY DATE PATTERN ANALYSIS")
print("=" * 80)

# Count NULL expiry dates by date_joined
print("\nNULL Expiry Dates grouped by date_joined:")
cursor.execute("""
    SELECT date_joined, COUNT(*) as count
    FROM members_consolidated
    WHERE expiry_date IS NULL
    GROUP BY date_joined
    ORDER BY count DESC
    LIMIT 20
""")

for date_joined, count in cursor.fetchall():
    print(f"  {date_joined}: {count:,} members")

# Count NULL expiry dates by province
print("\nNULL Expiry Dates grouped by province:")
cursor.execute("""
    SELECT province_name, COUNT(*) as count
    FROM members_consolidated
    WHERE expiry_date IS NULL
    GROUP BY province_name
    ORDER BY count DESC
""")

for province, count in cursor.fetchall():
    print(f"  {province}: {count:,} members")

# Check if there's a pattern with membership_status
print("\nNULL Expiry Dates grouped by membership_status_id:")
cursor.execute("""
    SELECT membership_status_id, COUNT(*) as count
    FROM members_consolidated
    WHERE expiry_date IS NULL
    GROUP BY membership_status_id
    ORDER BY count DESC
""")

for status_id, count in cursor.fetchall():
    print(f"  Status ID {status_id}: {count:,} members")

# Check created_at timestamps
print("\nNULL Expiry Dates grouped by created_at date:")
cursor.execute("""
    SELECT DATE(created_at) as created_date, COUNT(*) as count
    FROM members_consolidated
    WHERE expiry_date IS NULL
    GROUP BY DATE(created_at)
    ORDER BY count DESC
    LIMIT 10
""")

for created_date, count in cursor.fetchall():
    print(f"  {created_date}: {count:,} members")

conn.close()
print("\n" + "=" * 80)

