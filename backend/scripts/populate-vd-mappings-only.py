#!/usr/bin/env python3
"""
Populate IEC Voting District Mappings Only
Simple approach: Map IEC vd_number to itself as voting_district_code
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

def main():
    try:
        print("\n🚀 Populating IEC Voting District Mappings")
        print("="*80)
        print("Strategy: Use IEC vd_number directly as voting_district_code")
        print("="*80)
        
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Get all voting districts from iec_voting_stations
        print("\n📊 Fetching voting districts from iec_voting_stations...")
        cur.execute("""
            SELECT DISTINCT
                ivs.iec_vd_number,
                ivs.iec_voting_district_name,
                ivs.iec_ward_id::text AS ward_code
            FROM iec_voting_stations ivs
            WHERE ivs.iec_vd_number IS NOT NULL
            ORDER BY iec_vd_number
        """)
        
        vds = cur.fetchall()
        
        if not vds:
            print("❌ No voting districts found!")
            return
        
        print(f"✅ Found {len(vds)} unique voting districts")
        
        # Insert into iec_voting_district_mappings
        print("\n💾 Inserting mappings...")
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
            (row[0], str(row[0]), row[1], row[2], row[1], True)
            for row in vds
        ]
        
        execute_batch(cur, insert_query, batch_data, page_size=1000)
        conn.commit()
        
        print(f"✅ Inserted/Updated {len(batch_data)} voting district mappings")
        
        # Show sample
        print("\n📊 Sample Mappings:")
        print("-"*80)
        for i, row in enumerate(vds[:10]):
            print(f"  IEC VD {row[0]} → VD Code {row[0]} (Ward: {row[2]})")
        if len(vds) > 10:
            print(f"  ... and {len(vds) - 10} more")
        
        # Verify the test case
        print("\n" + "="*80)
        print("VERIFYING TEST CASE (VD: 32871326)")
        print("="*80)
        cur.execute("""
            SELECT iec_vd_number, voting_district_code, voting_district_name, ward_code
            FROM iec_voting_district_mappings
            WHERE iec_vd_number = 32871326
        """)
        result = cur.fetchone()
        if result:
            print(f"✅ Found mapping:")
            print(f"   IEC VD Number: {result[0]}")
            print(f"   VD Code: {result[1]}")
            print(f"   VD Name: {result[2]}")
            print(f"   Ward Code: {result[3]}")
        else:
            print("❌ Test case not found!")
        
        print("\n" + "="*80)
        print("✅ MAPPING POPULATION COMPLETE")
        print("="*80)
        print(f"Total Mappings: {len(batch_data)}")
        print("="*80)
        
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

