#!/usr/bin/env python3
"""
Populate IEC Ward and Voting District Mappings - Simple Approach
Since we're using IEC codes directly, we'll create mappings that treat IEC codes as the primary keys
"""

import psycopg2
from psycopg2.extras import execute_batch
import sys

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

def populate_iec_ward_mappings(conn):
    """Populate IEC ward mappings directly from iec_voting_stations"""
    cur = conn.cursor()
    
    print("\n" + "="*80)
    print("POPULATING IEC WARD MAPPINGS")
    print("="*80)
    
    # Get unique wards from iec_voting_stations
    # We'll use the IEC ward_id as both the key and the ward_code
    cur.execute("""
        SELECT DISTINCT
            ivs.iec_ward_id::text AS iec_ward_id,
            ivs.iec_municipality_id::text AS iec_municipality_id,
            ivs.iec_municipality_name,
            ivs.iec_province_id,
            ivs.iec_province_name
        FROM iec_voting_stations ivs
        WHERE ivs.iec_ward_id IS NOT NULL
        ORDER BY iec_ward_id
    """)
    
    wards = cur.fetchall()
    
    if not wards:
        print("❌ No wards found in iec_voting_stations!")
        return 0
    
    print(f"✅ Found {len(wards)} unique IEC wards")
    
    # Insert into iec_ward_mappings
    # We'll use the IEC ward_id as the ward_code
    insert_query = """
        INSERT INTO iec_ward_mappings 
            (ward_code, ward_name, ward_number, municipality_code, province_code,
             iec_ward_id, iec_ward_name, iec_municipality_id, iec_province_id, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (ward_code) DO UPDATE SET
            iec_ward_id = EXCLUDED.iec_ward_id,
            iec_municipality_id = EXCLUDED.iec_municipality_id,
            iec_province_id = EXCLUDED.iec_province_id,
            updated_at = CURRENT_TIMESTAMP
    """
    
    batch_data = []
    for row in wards:
        iec_ward_id = row[0]
        iec_municipality_id = row[1]
        iec_municipality_name = row[2]
        iec_province_id = row[3]
        iec_province_name = row[4]
        
        # Use IEC ward_id as the ward_code
        ward_code = iec_ward_id
        ward_name = f"Ward {iec_ward_id}"
        ward_number = 0  # Default value since we don't have this from IEC data
        municipality_code = iec_municipality_id  # Use IEC municipality_id as municipality_code
        province_code = f"P{iec_province_id}"  # Create a province code from IEC province_id
        
        batch_data.append((
            ward_code, ward_name, ward_number, municipality_code, province_code,
            iec_ward_id, ward_name, iec_municipality_id, iec_province_id, True
        ))
    
    execute_batch(cur, insert_query, batch_data, page_size=1000)
    conn.commit()
    
    print(f"✅ Inserted/Updated {len(batch_data)} ward mappings")
    
    # Show sample
    print("\n📊 Sample Ward Mappings:")
    print("-"*80)
    for i, row in enumerate(wards[:5]):
        print(f"  IEC Ward ID {row[0]} → Ward Code {row[0]} ({row[2]})")
    if len(wards) > 5:
        print(f"  ... and {len(wards) - 5} more")
    
    return len(batch_data)

def populate_iec_vd_mappings(conn):
    """Populate IEC voting district mappings directly from iec_voting_stations"""
    cur = conn.cursor()
    
    print("\n" + "="*80)
    print("POPULATING IEC VOTING DISTRICT MAPPINGS")
    print("="*80)
    
    # Get all voting districts from iec_voting_stations
    cur.execute("""
        SELECT DISTINCT
            ivs.iec_vd_number,
            ivs.iec_voting_district_name,
            ivs.iec_ward_id::text AS iec_ward_id
        FROM iec_voting_stations ivs
        WHERE ivs.iec_vd_number IS NOT NULL
        ORDER BY iec_vd_number
    """)
    
    vds = cur.fetchall()
    
    if not vds:
        print("❌ No voting districts found in iec_voting_stations!")
        return 0
    
    print(f"✅ Found {len(vds)} unique IEC voting districts")
    
    # Insert into iec_voting_district_mappings
    # We'll use the IEC vd_number as the voting_district_code
    insert_query = """
        INSERT INTO iec_voting_district_mappings 
            (iec_vd_number, voting_district_code, voting_district_name, ward_code, voting_station_name, is_active)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (iec_vd_number) DO UPDATE SET
            voting_district_code = EXCLUDED.voting_district_code,
            voting_district_name = EXCLUDED.voting_district_name,
            ward_code = EXCLUDED.ward_code,
            updated_at = CURRENT_TIMESTAMP
    """
    
    batch_data = [
        (row[0], str(row[0]), row[1], row[2], row[1], True)  # iec_vd_number, voting_district_code, voting_district_name, ward_code, voting_station_name, is_active
        for row in vds
    ]
    
    execute_batch(cur, insert_query, batch_data, page_size=1000)
    conn.commit()
    
    print(f"✅ Inserted/Updated {len(batch_data)} voting district mappings")
    
    # Show sample
    print("\n📊 Sample Voting District Mappings:")
    print("-"*80)
    for i, row in enumerate(vds[:5]):
        print(f"  IEC VD {row[0]} → VD Code {row[0]} ({row[1]})")
    if len(vds) > 5:
        print(f"  ... and {len(vds) - 5} more")
    
    return len(batch_data)

def main():
    try:
        print("\n🚀 Starting IEC Mapping Population (Simple Approach)")
        print("="*80)
        print("Strategy: Use IEC codes directly as our internal codes")
        print("="*80)
        
        conn = psycopg2.connect(**DB_CONFIG)
        
        ward_count = populate_iec_ward_mappings(conn)
        vd_count = populate_iec_vd_mappings(conn)
        
        print("\n" + "="*80)
        print("✅ MAPPING POPULATION COMPLETE")
        print("="*80)
        print(f"Ward Mappings Created: {ward_count}")
        print(f"Voting District Mappings Created: {vd_count}")
        print("="*80)
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

