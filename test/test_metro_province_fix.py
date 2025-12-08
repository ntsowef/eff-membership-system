#!/usr/bin/env python3
"""
Test the metro province resolution fix

This script tests that metro sub-regions like "ETH - Central" now correctly resolve their province.
"""

import sys
sys.path.insert(0, '.')

from flexible_membership_ingestionV2 import FlexibleMembershipIngestion

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

print("=" * 120)
print("TESTING METRO PROVINCE RESOLUTION FIX")
print("=" * 120)

# Initialize ingestion system
print("\nInitializing ingestion system...")
ingestion = FlexibleMembershipIngestion(
    docs_directory='uploads',
    db_config=DB_CONFIG,
    use_optimized=True,
    archive_enabled=False
)

print("\n" + "=" * 120)
print("TESTING MUNICIPALITY LOOKUP FOR METRO SUB-REGIONS")
print("=" * 120)

# Test municipality lookups
test_municipalities = [
    "ETH - Central",
    "ETH - North",
    "JHB - A",
    "JHB - B",
    "CPT - Zone 1",
    "EKU - Central",
    "TSH - 1",
    "MAN - Bloemfontein",
    "BUF - East London",
    "NMA - Champion Galela"
]

print("\nTesting municipality name lookups:\n")
for muni_name in test_municipalities:
    muni_code = ingestion.lookup_municipality_code(muni_name)
    if muni_code:
        print(f"✓ '{muni_name}' -> {muni_code}")
        
        # Check if province mapping exists
        if muni_code in ingestion.municipality_to_province:
            prov_code, prov_name = ingestion.municipality_to_province[muni_code]
            print(f"  Province: {prov_code} - {prov_name}")
        else:
            print(f"  ✗ NO PROVINCE MAPPING FOUND")
    else:
        print(f"✗ '{muni_name}' -> NOT FOUND")
    print()

print("\n" + "=" * 120)
print("CHECKING MUNICIPALITY_TO_PROVINCE MAPPING")
print("=" * 120)

# Check how many metros have province mappings
metro_codes = ['ETH001', 'ETH002', 'JHB001', 'JHB002', 'CPT001', 'EKU001', 'TSH001', 'MAN001', 'BUF001', 'NMA001']
print(f"\nChecking {len(metro_codes)} metro sub-regions:\n")

found = 0
not_found = 0

for muni_code in metro_codes:
    if muni_code in ingestion.municipality_to_province:
        prov_code, prov_name = ingestion.municipality_to_province[muni_code]
        print(f"✓ {muni_code}: {prov_code} - {prov_name}")
        found += 1
    else:
        print(f"✗ {muni_code}: NO PROVINCE MAPPING")
        not_found += 1

print(f"\nSummary:")
print(f"  Found: {found}/{len(metro_codes)}")
print(f"  Not found: {not_found}/{len(metro_codes)}")

print("\n" + "=" * 120)
print("TESTING WARD-BASED GEOGRAPHIC RESOLUTION")
print("=" * 120)

# Test ward-based resolution (this is what happens during ingestion)
print("\nTesting resolve_geographic_hierarchy() for sample wards:\n")

# Get some sample wards from ETH municipalities
cur = ingestion.cursor
cur.execute("""
    SELECT w.ward_code, w.municipality_code, m.municipality_name
    FROM wards w
    JOIN municipalities m ON w.municipality_code = m.municipality_code
    WHERE w.municipality_code IN ('ETH001', 'JHB001', 'CPT001', 'EKU001')
    LIMIT 4
""")

sample_wards = cur.fetchall()

for ward_code, muni_code, muni_name in sample_wards:
    print(f"Ward: {ward_code} ({muni_name})")
    
    geo = ingestion.resolve_geographic_hierarchy(ward_code)
    
    print(f"  Municipality: {geo['municipality_code']} - {geo['municipality_name']}")
    print(f"  District: {geo['district_code']} - {geo['district_name']}")
    print(f"  Province: {geo['province_code']} - {geo['province_name']}")
    
    if geo['province_code']:
        print(f"  ✓ PROVINCE RESOLVED")
    else:
        print(f"  ✗ PROVINCE NOT RESOLVED")
    print()

print("\n" + "=" * 120)
print("SUMMARY")
print("=" * 120)

total_munis = len(ingestion.municipality_to_province)
print(f"\nTotal municipalities with province mapping: {total_munis}")

# Count metro sub-regions
metro_sub_regions = sum(1 for code in ingestion.municipality_to_province.keys() 
                        if any(code.startswith(prefix) for prefix in ['ETH0', 'JHB0', 'CPT0', 'EKU0', 'TSH0', 'MAN0', 'BUF0', 'NMA0']))
print(f"Metro sub-regions with province mapping: {metro_sub_regions}")

print("\n✅ Fix verification complete!")

# Close connection
ingestion.connection.close()

