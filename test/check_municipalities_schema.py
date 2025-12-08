#!/usr/bin/env python3
"""Check municipalities table schema and find ETH/Central municipalities"""

import psycopg2

DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

print("\n" + "=" * 120)
print("MUNICIPALITIES TABLE COLUMNS:")
print("=" * 120)
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'municipalities'
    ORDER BY ordinal_position
""")
for row in cur.fetchall():
    print(f"{row[0]:<40} {row[1]}")

print("\n" + "=" * 120)
print("MUNICIPALITIES WITH 'ETH' OR 'Central' IN NAME:")
print("=" * 120)
cur.execute("""
    SELECT
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name,
        d.province_code,
        p.province_name
    FROM municipalities m
    LEFT JOIN districts d ON m.district_code = d.district_code
    LEFT JOIN provinces p ON d.province_code = p.province_code
    WHERE m.municipality_name ILIKE '%ETH%'
       OR m.municipality_name ILIKE '%Central%'
    ORDER BY m.municipality_name
""")
rows = cur.fetchall()
print(f"\nFound {len(rows)} municipalities:\n")
for row in rows:
    muni_code, muni_name, dist_code, dist_name, prov_code, prov_name = row
    print(f"{muni_code:<15} {muni_name:<50} District: {dist_code or 'NONE':<10} Province: {prov_name or 'NONE'}")

print("\n" + "=" * 120)
print("ALL MUNICIPALITIES WITH ' - ' IN NAME:")
print("=" * 120)
cur.execute("""
    SELECT
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        d.district_name,
        d.province_code,
        p.province_name
    FROM municipalities m
    LEFT JOIN districts d ON m.district_code = d.district_code
    LEFT JOIN provinces p ON d.province_code = p.province_code
    WHERE m.municipality_name LIKE '%-%'
    ORDER BY m.municipality_name
""")
rows = cur.fetchall()
print(f"\nFound {len(rows)} municipalities with '-' in name:\n")
for row in rows:
    muni_code, muni_name, dist_code, dist_name, prov_code, prov_name = row
    print(f"{muni_code:<15} {muni_name:<50} District: {dist_code or 'NONE':<10} Province: {prov_name or 'NONE'}")

print("\n" + "=" * 120)
print("CHECKING PROVINCE RESOLUTION FOR METROS (no district):")
print("=" * 120)
cur.execute("""
    SELECT
        m.municipality_code,
        m.municipality_name,
        m.district_code,
        m.municipality_type
    FROM municipalities m
    WHERE m.district_code IS NULL
    ORDER BY m.municipality_name
""")
rows = cur.fetchall()
print(f"\nFound {len(rows)} municipalities without district (likely metros):\n")
for row in rows:
    muni_code, muni_name, dist_code, muni_type = row
    print(f"{muni_code:<15} {muni_name:<60} Type: {muni_type or 'NONE'}")

# Check if we can get province for these metros
if rows:
    print("\nTrying to get province for metros through other means...")
    for row in rows:
        muni_code = row[0]
        muni_name = row[1]

        # Try through wards
        cur.execute("""
            SELECT DISTINCT p.province_code, p.province_name
            FROM wards w
            JOIN voting_districts vd ON w.ward_code = vd.ward_code
            JOIN provinces p ON vd.province_code = p.province_code
            WHERE w.municipality_code = %s
            LIMIT 1
        """, (muni_code,))
        prov_row = cur.fetchone()
        if prov_row:
            print(f"  {muni_code}: Found province via wards -> {prov_row[1]} ({prov_row[0]})")
        else:
            print(f"  {muni_code}: NO PROVINCE FOUND")

conn.close()

