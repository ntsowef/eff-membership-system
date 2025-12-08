#!/usr/bin/env python3
"""Check metro parent relationships"""

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
print("METRO SUB-REGIONS AND THEIR PARENTS:")
print("=" * 120)

# Check ETH metros
cur.execute("""
    SELECT 
        m.municipality_code,
        m.municipality_name,
        m.parent_municipality_id,
        m.district_code,
        parent.municipality_code as parent_code,
        parent.municipality_name as parent_name,
        parent.district_code as parent_district
    FROM municipalities m
    LEFT JOIN municipalities parent ON m.parent_municipality_id = parent.municipality_id
    WHERE m.municipality_code LIKE 'ETH%'
    ORDER BY m.municipality_code
""")

rows = cur.fetchall()
print(f"\nETH Municipalities ({len(rows)}):\n")
for row in rows:
    muni_code, muni_name, parent_id, dist_code, parent_code, parent_name, parent_dist = row
    print(f"{muni_code:<15} {muni_name:<50}")
    print(f"  Parent ID: {parent_id}, Parent Code: {parent_code}, Parent District: {parent_dist}")
    print()

# Now check if parent metro has district
print("\n" + "=" * 120)
print("CHECKING IF PARENT METROS HAVE DISTRICTS:")
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
    WHERE m.municipality_code IN ('ETH', 'JHB', 'CPT', 'TSH', 'EKU', 'MAN', 'BUF', 'NMA')
    ORDER BY m.municipality_code
""")

rows = cur.fetchall()
print(f"\nParent Metro Municipalities ({len(rows)}):\n")
for row in rows:
    muni_code, muni_name, dist_code, dist_name, prov_code, prov_name = row
    print(f"{muni_code:<15} {muni_name:<50}")
    print(f"  District: {dist_code or 'NONE':<10} {dist_name or ''}")
    print(f"  Province: {prov_code or 'NONE':<10} {prov_name or 'NONE'}")
    print()

# Alternative: Get province through wards
print("\n" + "=" * 120)
print("ALTERNATIVE: GET PROVINCE THROUGH WARDS:")
print("=" * 120)

cur.execute("""
    SELECT DISTINCT
        w.municipality_code,
        m.municipality_name,
        w.province_code,
        p.province_name
    FROM wards w
    JOIN municipalities m ON w.municipality_code = m.municipality_code
    LEFT JOIN provinces p ON w.province_code = p.province_code
    WHERE w.municipality_code IN ('ETH001', 'JHB001', 'CPT001', 'TSH001')
    ORDER BY w.municipality_code
""")

rows = cur.fetchall()
print(f"\nProvince via Wards ({len(rows)}):\n")
for row in rows:
    muni_code, muni_name, prov_code, prov_name = row
    print(f"{muni_code:<15} {muni_name:<50} Province: {prov_code or 'NONE':<10} {prov_name or 'NONE'}")

conn.close()

