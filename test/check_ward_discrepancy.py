#!/usr/bin/env python3
"""
Check ward discrepancy between IEC data and member record
"""

import psycopg2
import json

DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

def main():
    print("=" * 100)
    print("WARD DISCREPANCY INVESTIGATION")
    print("=" * 100)
    
    # Load IEC verification results
    with open('test/IEC_REVERIFICATION_RESULTS.json', 'r') as f:
        iec_results = json.load(f)
    
    iec_ward = iec_results['iec_data']['ward_code']
    iec_vd = iec_results['iec_data']['voting_district_code']
    
    print(f"\n📋 IEC Data:")
    print(f"   Ward Code: {iec_ward}")
    print(f"   VD Code: {iec_vd}")
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Check member's current ward
    cur.execute("""
        SELECT member_id, ward_code, voting_district_code, residential_address
        FROM members_consolidated
        WHERE member_id = 772468
    """)
    
    member = cur.fetchone()
    print(f"\n📋 Member Record:")
    print(f"   Ward Code: {member[1]}")
    print(f"   VD Code: {member[2]}")
    print(f"   Address: {member[3]}")
    
    # Check if both wards exist
    print(f"\n" + "=" * 100)
    print("WARD INFORMATION")
    print("=" * 100)
    
    for ward_code in [iec_ward, member[1]]:
        cur.execute("""
            SELECT ward_code, ward_name, ward_number, municipality_code
            FROM wards
            WHERE ward_code = %s
        """, (ward_code,))
        
        ward = cur.fetchone()
        if ward:
            print(f"\n✅ Ward {ward_code}:")
            print(f"   Name: {ward[1]}")
            print(f"   Number: {ward[2]}")
            print(f"   Municipality: {ward[3]}")
        else:
            print(f"\n❌ Ward {ward_code}: NOT FOUND in database")
    
    # Check application data
    print(f"\n" + "=" * 100)
    print("APPLICATION DATA")
    print("=" * 100)
    
    cur.execute("""
        SELECT application_id, ward_code, voting_district_code, residential_address
        FROM membership_applications
        WHERE id_number = '7808020703087'
    """)
    
    app = cur.fetchone()
    if app:
        print(f"\n✅ Application Record:")
        print(f"   Application ID: {app[0]}")
        print(f"   Ward Code: {app[1]}")
        print(f"   VD Code: {app[2]}")
        print(f"   Address: {app[3]}")
    
    conn.close()
    
    # Recommendation
    print(f"\n" + "=" * 100)
    print("RECOMMENDATION")
    print("=" * 100)
    
    print(f"""
⚠️ WARD MISMATCH DETECTED:
   - IEC says: Ward {iec_ward} (from voter registration)
   - Member record: Ward {member[1]} (from application)
   - Application: Ward {app[1]}

🤔 Possible Reasons:
   1. Member moved after registering to vote
   2. Member registered at different address
   3. Application used different address than voter registration
   4. Ward boundaries changed

💡 Recommendation:
   - Use IEC ward ({iec_ward}) since it's the official voter registration
   - Update member record to match IEC data
   - OR keep application ward ({member[1]}) if that's their current residence

📝 Suggested Update (using IEC data):
UPDATE members_consolidated
SET 
  voter_status_id = 1,
  ward_code = '{iec_ward}',
  voting_district_code = '{iec_vd}',
  municipality_code = (SELECT municipality_code FROM wards WHERE ward_code = '{iec_ward}')
WHERE member_id = 772468;

📝 Alternative Update (keeping application ward):
UPDATE members_consolidated
SET 
  voter_status_id = 1,
  voting_district_code = '{iec_vd}',
  municipality_code = (SELECT municipality_code FROM wards WHERE ward_code = '{member[1]}')
WHERE member_id = 772468;
    """)

if __name__ == '__main__':
    main()

