#!/usr/bin/env python3
"""
Diagnose municipality matching issues for names like "ETH - Central"

This script checks:
1. What municipalities exist in the database
2. How the lookup logic handles special formats
3. What municipalities are failing to match
"""

import psycopg2

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

def test_municipality_lookup():
    """Test municipality lookup logic"""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    print("=" * 120)
    print("MUNICIPALITY MATCHING DIAGNOSIS")
    print("=" * 120)
    
    # Get all municipalities from database
    cur.execute("""
        SELECT 
            m.municipality_code,
            m.municipality_name,
            m.district_code,
            d.district_name,
            m.province_code,
            p.province_name
        FROM municipalities m
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN provinces p ON m.province_code = p.province_code
        WHERE m.is_active = true
        ORDER BY m.municipality_name
    """)
    
    municipalities = cur.fetchall()
    
    print(f"\nTotal municipalities in database: {len(municipalities)}")
    
    # Build lookup dictionaries (same logic as ingestion script)
    municipality_lookup = {}
    municipality_lookup_simple = {}
    
    for muni_code, muni_name, dist_code, dist_name, prov_code, prov_name in municipalities:
        # Store full name
        municipality_lookup[muni_name.strip()] = muni_code
        
        # Store full name (uppercase)
        municipality_lookup_simple[muni_name.upper()] = muni_code
        
        # Extract key words (remove "Local Municipality", "Metropolitan Municipality", etc.)
        name_clean = muni_name.upper()
        name_clean = name_clean.replace(' LOCAL MUNICIPALITY', '')
        name_clean = name_clean.replace(' METROPOLITAN MUNICIPALITY', '')
        name_clean = name_clean.replace(' MUNICIPALITY', '')
        name_clean = name_clean.strip()
        municipality_lookup_simple[name_clean] = muni_code
        
        # If name contains " - ", also store the part after it
        if ' - ' in muni_name:
            simple_name = muni_name.split(' - ', 1)[1].strip().upper()
            municipality_lookup_simple[simple_name] = muni_code
            # Also store cleaned version
            simple_clean = simple_name.replace(' LOCAL MUNICIPALITY', '')
            simple_clean = simple_clean.replace(' METROPOLITAN MUNICIPALITY', '')
            simple_clean = simple_clean.replace(' MUNICIPALITY', '')
            municipality_lookup_simple[simple_clean.strip()] = muni_code
    
    print(f"Lookup entries created: {len(municipality_lookup_simple)}")
    
    # Test problematic municipality names
    print("\n" + "=" * 120)
    print("TESTING PROBLEMATIC MUNICIPALITY NAMES")
    print("=" * 120)
    
    test_names = [
        "ETH - Central",
        "ETH - North",
        "ETH - South",
        "ETH - West",
        "JHB - Region A",
        "JHB - Region B",
        "JHB - Region C",
        "CPT - Sub-Council 1",
        "CPT - Sub-Council 2",
        "Central",
        "North",
        "South",
        "West"
    ]
    
    for test_name in test_names:
        print(f"\nTesting: '{test_name}'")
        
        # Try exact match
        if test_name in municipality_lookup:
            code = municipality_lookup[test_name]
            print(f"  ✓ EXACT MATCH: {code}")
            continue
        
        # Try simplified/uppercase match
        test_upper = test_name.upper()
        if test_upper in municipality_lookup_simple:
            code = municipality_lookup_simple[test_upper]
            print(f"  ✓ UPPERCASE MATCH: {code}")
            continue
        
        # If Excel format is "CODE - Name", extract the part after " - "
        if ' - ' in test_name:
            name_part = test_name.split(' - ', 1)[1].strip().upper()
            if name_part in municipality_lookup_simple:
                code = municipality_lookup_simple[name_part]
                print(f"  ✓ PARTIAL MATCH (after '-'): {code} (matched on '{name_part}')")
                continue
        
        print(f"  ✗ NO MATCH FOUND")
    
    # Show municipalities with " - " in their names
    print("\n" + "=" * 120)
    print("MUNICIPALITIES WITH ' - ' IN NAME (from database)")
    print("=" * 120)
    
    cur.execute("""
        SELECT 
            m.municipality_code,
            m.municipality_name,
            m.province_code,
            p.province_name
        FROM municipalities m
        LEFT JOIN provinces p ON m.province_code = p.province_code
        WHERE m.municipality_name LIKE '%-%'
        AND m.is_active = true
        ORDER BY m.municipality_name
    """)
    
    dash_munis = cur.fetchall()
    print(f"\nFound {len(dash_munis)} municipalities with '-' in name:\n")
    
    for muni_code, muni_name, prov_code, prov_name in dash_munis:
        print(f"  {muni_code:<10} {muni_name:<60} {prov_name or 'NO PROVINCE'}")
    
    # Check for municipalities without province
    print("\n" + "=" * 120)
    print("MUNICIPALITIES WITHOUT PROVINCE CODE")
    print("=" * 120)
    
    cur.execute("""
        SELECT 
            municipality_code,
            municipality_name,
            district_code
        FROM municipalities
        WHERE province_code IS NULL
        AND is_active = true
        ORDER BY municipality_name
    """)
    
    no_province = cur.fetchall()
    print(f"\nFound {len(no_province)} municipalities without province:\n")
    
    for muni_code, muni_name, dist_code in no_province:
        print(f"  {muni_code:<10} {muni_name:<60} District: {dist_code or 'NONE'}")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    test_municipality_lookup()

