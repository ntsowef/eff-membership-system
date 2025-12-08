#!/usr/bin/env python3
"""
Populate IEC Ward and Voting District Mappings
Uses the iec_voting_stations table to create mappings between IEC codes and our internal codes
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

def create_ward_mappings(conn):
    """Create mappings from IEC ward_id to our internal ward_code"""
    cur = conn.cursor()

    print("\n" + "="*80)
    print("CREATING IEC WARD MAPPINGS")
    print("="*80)

    # Strategy: Use iec_municipality_mappings and iec_province_mappings to map IEC IDs
    # Then use wards table to get all wards for that municipality
    # Create a mapping for each unique IEC ward_id
    cur.execute("""
        SELECT DISTINCT
            ivs.iec_ward_id::text AS iec_ward_id,
            ivs.iec_municipality_id::text AS iec_municipality_id,
            ivs.iec_municipality_name,
            ivs.iec_province_id,
            ivs.iec_province_name,
            imm.municipality_code,
            imm.province_code,
            w.ward_code,
            w.ward_name,
            w.ward_number
        FROM iec_voting_stations ivs
        INNER JOIN iec_municipality_mappings imm ON
            imm.iec_municipality_id = ivs.iec_municipality_id::text
        INNER JOIN wards w ON
            w.municipality_code = imm.municipality_code
        WHERE ivs.iec_ward_id IS NOT NULL
        ORDER BY iec_municipality_id, iec_ward_id
    """)
    
    ward_mappings = cur.fetchall()
    
    if not ward_mappings:
        print("❌ No ward mappings found!")
        return 0
    
    print(f"✅ Found {len(ward_mappings)} ward mappings")
    
    # Insert mappings using the existing iec_ward_mappings schema
    insert_query = """
        INSERT INTO iec_ward_mappings
            (ward_code, ward_name, ward_number, municipality_code, province_code,
             iec_ward_id, iec_ward_name, iec_municipality_id, iec_province_id, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (ward_code) DO UPDATE SET
            iec_ward_id = EXCLUDED.iec_ward_id,
            iec_ward_name = EXCLUDED.iec_ward_name,
            iec_municipality_id = EXCLUDED.iec_municipality_id,
            iec_province_id = EXCLUDED.iec_province_id,
            updated_at = CURRENT_TIMESTAMP
    """

    batch_data = [
        (row[7], row[8], row[9], row[5], row[6],  # ward_code, ward_name, ward_number, municipality_code, province_code
         row[0], row[2], row[1], row[3], True)     # iec_ward_id, iec_ward_name, iec_municipality_id, iec_province_id, is_active
        for row in ward_mappings
    ]
    
    execute_batch(cur, insert_query, batch_data, page_size=1000)
    conn.commit()
    
    print(f"✅ Inserted/Updated {len(batch_data)} ward mappings")
    
    # Show sample mappings
    print("\n📊 Sample Ward Mappings:")
    print("-"*80)
    for i, row in enumerate(ward_mappings[:5]):
        print(f"  IEC Ward ID {row[0]} → Ward Code {row[7]} ({row[8]})")
    if len(ward_mappings) > 5:
        print(f"  ... and {len(ward_mappings) - 5} more")
    
    return len(batch_data)

def create_voting_district_mappings(conn):
    """Create mappings from IEC vd_number to our internal voting_district_code"""
    cur = conn.cursor()

    print("\n" + "="*80)
    print("CREATING IEC VOTING DISTRICT MAPPINGS")
    print("="*80)

    # Strategy: Use the ward mappings we just created to link IEC VD to our VD
    # Join iec_voting_stations -> iec_ward_mappings -> voting_districts
    cur.execute("""
        SELECT DISTINCT
            ivs.iec_vd_number,
            ivs.iec_voting_district_name,
            iwm.ward_code,
            vd.voting_district_code,
            vd.voting_district_name
        FROM iec_voting_stations ivs
        INNER JOIN iec_ward_mappings iwm ON
            iwm.iec_ward_id = ivs.iec_ward_id::text
        LEFT JOIN voting_districts vd ON
            vd.ward_code = iwm.ward_code
        WHERE ivs.iec_vd_number IS NOT NULL
        ORDER BY iwm.ward_code
    """)
    
    vd_mappings = cur.fetchall()
    
    if not vd_mappings:
        print("❌ No voting district mappings found!")
        return 0
    
    print(f"✅ Found {len(vd_mappings)} potential voting district mappings")
    
    # Filter out records where we don't have a matching voting_district_code
    valid_mappings = [row for row in vd_mappings if row[3] is not None]
    
    if not valid_mappings:
        print("⚠️ No valid voting district mappings (no matching voting_district_code)")
        print("   This is expected if voting_districts table is incomplete")
        return 0
    
    print(f"✅ Found {len(valid_mappings)} valid voting district mappings")
    
    # Insert mappings
    insert_query = """
        INSERT INTO iec_voting_district_mappings 
            (iec_vd_number, voting_district_code, voting_district_name, ward_code, voting_station_name, is_active)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (iec_vd_number) DO UPDATE SET
            voting_district_code = EXCLUDED.voting_district_code,
            voting_district_name = EXCLUDED.voting_district_name,
            ward_code = EXCLUDED.ward_code,
            voting_station_name = EXCLUDED.voting_station_name,
            updated_at = CURRENT_TIMESTAMP
    """
    
    batch_data = [
        (row[0], row[3], row[4], row[2], row[1], True)  # iec_vd_number, voting_district_code, voting_district_name, ward_code, voting_station_name, is_active
        for row in valid_mappings
    ]
    
    execute_batch(cur, insert_query, batch_data, page_size=1000)
    conn.commit()
    
    print(f"✅ Inserted/Updated {len(batch_data)} voting district mappings")
    
    # Show sample mappings
    print("\n📊 Sample Voting District Mappings:")
    print("-"*80)
    for i, row in enumerate(valid_mappings[:5]):
        print(f"  IEC VD {row[0]} → VD Code {row[3]} ({row[1]})")
    if len(valid_mappings) > 5:
        print(f"  ... and {len(valid_mappings) - 5} more")
    
    return len(batch_data)

def main():
    try:
        print("\n🚀 Starting IEC Mapping Population")
        print("="*80)
        
        conn = psycopg2.connect(**DB_CONFIG)
        
        ward_count = create_ward_mappings(conn)
        vd_count = create_voting_district_mappings(conn)
        
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

