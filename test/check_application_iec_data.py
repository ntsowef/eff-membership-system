#!/usr/bin/env python3
"""
Check membership application IEC verification data
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
    print("MEMBERSHIP APPLICATION IEC DATA CHECK")
    print("=" * 100)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Check application data
    cur.execute("""
        SELECT 
            application_id, application_number, status,
            id_number, first_name, last_name,
            ward_code, voting_district_code,
            province_code, district_code, municipal_code,
            iec_verified, iec_verification_data,
            created_at, submitted_at, reviewed_at
        FROM membership_applications
        WHERE id_number = '7808020703087'
    """)
    
    app = cur.fetchone()
    if app:
        print(f"\n✅ Application Found:")
        print(f"   Application ID: {app[0]}")
        print(f"   Application Number: {app[1]}")
        print(f"   Status: {app[2]}")
        print(f"   ID Number: {app[3]}")
        print(f"   Name: {app[4]} {app[5]}")
        print(f"   Ward Code: {app[6]}")
        print(f"   Voting District Code: {app[7]}")
        print(f"   Province Code: {app[8]}")
        print(f"   District Code: {app[9]}")
        print(f"   Municipal Code: {app[10]}")
        print(f"   IEC Verified: {app[11]}")
        print(f"   IEC Verification Data: {app[12]}")
        print(f"   Created: {app[13]}")
        print(f"   Submitted: {app[14]}")
        print(f"   Reviewed: {app[15]}")
        
        if app[12]:
            print(f"\n📋 IEC Verification Data (JSON):")
            try:
                iec_data = json.loads(app[12]) if isinstance(app[12], str) else app[12]
                print(json.dumps(iec_data, indent=2))
            except:
                print(f"   {app[12]}")
    else:
        print("\n❌ Application not found!")
    
    conn.close()

if __name__ == '__main__':
    main()

