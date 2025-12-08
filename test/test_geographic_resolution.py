#!/usr/bin/env python3
"""
Test the geographic resolution logic to see why it's failing for West Rand wards
"""
import psycopg2

# Database connection
conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)
cursor = conn.cursor()

print("Testing geographic resolution for West Rand wards...\n")

# Test ward codes from West Rand
test_wards = ['74804001', '74801001', '74805001']

for ward_code in test_wards:
    print(f"=== Testing ward_code: {ward_code} ===")
    
    # Step 1: Get municipality from ward
    cursor.execute("""
        SELECT w.ward_code, w.municipality_code, m.municipality_name
        FROM wards w
        JOIN municipalities m ON w.municipality_code = m.municipality_code
        WHERE w.ward_code = %s
    """, (ward_code,))
    
    ward_result = cursor.fetchone()
    if not ward_result:
        print(f"  ❌ Ward {ward_code} NOT FOUND in wards table\n")
        continue
    
    ward_code_db, muni_code, muni_name = ward_result
    print(f"  ✅ Ward → Municipality: {muni_code} ({muni_name})")
    
    # Step 2: Get district from municipality
    cursor.execute("""
        SELECT m.municipality_code, m.district_code, d.district_name
        FROM municipalities m
        LEFT JOIN districts d ON m.district_code = d.district_code
        WHERE m.municipality_code = %s
    """, (muni_code,))
    
    muni_result = cursor.fetchone()
    if not muni_result:
        print(f"  ❌ Municipality {muni_code} NOT FOUND in municipalities table\n")
        continue
    
    muni_code_db, dist_code, dist_name = muni_result
    print(f"  Municipality → District: {dist_code} ({dist_name})")
    
    # Step 3: Check if municipality has a parent
    cursor.execute("""
        SELECT 
            m.municipality_code,
            m.parent_municipality_id,
            parent.municipality_code as parent_code,
            parent.municipality_name as parent_name,
            parent.district_code as parent_district
        FROM municipalities m
        LEFT JOIN municipalities parent ON m.parent_municipality_id = parent.municipality_id
        WHERE m.municipality_code = %s
    """, (muni_code,))
    
    parent_result = cursor.fetchone()
    if parent_result:
        muni_code_db, parent_id, parent_code, parent_name, parent_district = parent_result
        if parent_id:
            print(f"  Municipality has parent: {parent_code} ({parent_name})")
            print(f"  Parent district: {parent_district}")
        else:
            print(f"  Municipality has NO parent")
    
    # Step 4: Get province from district
    if dist_code:
        cursor.execute("""
            SELECT d.district_code, d.province_code, p.province_name
            FROM districts d
            JOIN provinces p ON d.province_code = p.province_code
            WHERE d.district_code = %s
        """, (dist_code,))
        
        dist_result = cursor.fetchone()
        if dist_result:
            dist_code_db, prov_code, prov_name = dist_result
            print(f"  District → Province: {prov_code} ({prov_name})")
        else:
            print(f"  ❌ District {dist_code} NOT FOUND in districts table")
    else:
        print(f"  ⚠️  Municipality has NO district_code")
    
    print()

# Check what the ingestion script's mappings would look like
print("\n=== Checking Ingestion Script's Mapping Tables ===\n")

# ward_to_municipality mapping
print("Sample ward_to_municipality mappings for West Rand:")
cursor.execute("""
    SELECT w.ward_code, w.municipality_code, m.municipality_name
    FROM wards w
    JOIN municipalities m ON w.municipality_code = m.municipality_code
    WHERE w.municipality_code IN ('GT481', 'GT484', 'GT485')
    LIMIT 5
""")
for row in cursor.fetchall():
    print(f"  {row[0]} → {row[1]} ({row[2]})")

# municipality_to_district mapping
print("\nmunicipality_to_district mappings for West Rand:")
cursor.execute("""
    SELECT m.municipality_code, m.district_code, d.district_name
    FROM municipalities m
    LEFT JOIN districts d ON m.district_code = d.district_code
    WHERE m.municipality_code IN ('GT481', 'GT484', 'GT485')
""")
for row in cursor.fetchall():
    print(f"  {row[0]} → {row[1]} ({row[2]})")

# district_to_province mapping
print("\ndistrict_to_province mapping for DC48:")
cursor.execute("""
    SELECT d.district_code, d.province_code, p.province_name
    FROM districts d
    JOIN provinces p ON d.province_code = p.province_code
    WHERE d.district_code = 'DC48'
""")
for row in cursor.fetchall():
    print(f"  {row[0]} → {row[1]} ({row[2]})")

conn.close()

