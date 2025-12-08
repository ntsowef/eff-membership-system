#!/usr/bin/env python3
"""Check expiry dates in the database"""

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
print("EXPIRY DATE ANALYSIS IN DATABASE")
print("=" * 80)

# Count total records
cursor.execute("SELECT COUNT(*) FROM members_consolidated")
total_count = cursor.fetchone()[0]
print(f"\nTotal members in database: {total_count:,}")

# Count non-null expiry dates
cursor.execute("SELECT COUNT(*) FROM members_consolidated WHERE expiry_date IS NOT NULL")
non_null_count = cursor.fetchone()[0]
print(f"Members with expiry_date: {non_null_count:,} ({non_null_count/total_count*100:.1f}%)")

# Count null expiry dates
null_count = total_count - non_null_count
print(f"Members with NULL expiry_date: {null_count:,} ({null_count/total_count*100:.1f}%)")

# Show sample expiry dates
print(f"\n{'='*80}")
print("SAMPLE EXPIRY DATES FROM DATABASE (first 20)")
print("=" * 80)

cursor.execute("""
    SELECT id_number, firstname, surname, expiry_date, date_joined, last_payment_date
    FROM members_consolidated
    WHERE expiry_date IS NOT NULL
    LIMIT 20
""")

for row in cursor.fetchall():
    id_num, fname, sname, expiry, joined, last_pay = row
    print(f"{id_num} | {fname} {sname} | Expiry: {expiry} | Joined: {joined} | Last Pay: {last_pay}")

# Show sample NULL expiry dates
print(f"\n{'='*80}")
print("SAMPLE NULL EXPIRY DATES (first 20)")
print("=" * 80)

cursor.execute("""
    SELECT id_number, firstname, surname, expiry_date, date_joined, last_payment_date
    FROM members_consolidated
    WHERE expiry_date IS NULL
    LIMIT 20
""")

for row in cursor.fetchall():
    id_num, fname, sname, expiry, joined, last_pay = row
    print(f"{id_num} | {fname} {sname} | Expiry: {expiry} | Joined: {joined} | Last Pay: {last_pay}")

# Check date ranges
print(f"\n{'='*80}")
print("EXPIRY DATE RANGES")
print("=" * 80)

cursor.execute("""
    SELECT 
        MIN(expiry_date) as earliest,
        MAX(expiry_date) as latest,
        COUNT(DISTINCT expiry_date) as unique_dates
    FROM members_consolidated
    WHERE expiry_date IS NOT NULL
""")

earliest, latest, unique = cursor.fetchone()
print(f"Earliest expiry date: {earliest}")
print(f"Latest expiry date: {latest}")
print(f"Unique expiry dates: {unique:,}")

conn.close()
print("\n" + "=" * 80)

