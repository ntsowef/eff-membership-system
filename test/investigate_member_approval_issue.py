#!/usr/bin/env python3
"""
Investigation: Member Approval System Issue
Analyze why only newly approved member shows up in ward listing
"""

import psycopg2
import json
from datetime import datetime

DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

def main():
    print("=" * 100)
    print("MEMBER APPROVAL SYSTEM INVESTIGATION")
    print("=" * 100)
    print(f"\nInvestigation Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Target ID Number: 7808020703087")
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # 1. Find the newly approved member
    print("\n" + "=" * 100)
    print("1. NEWLY APPROVED MEMBER DETAILS")
    print("=" * 100)
    
    cur.execute("""
        SELECT
            member_id, id_number, firstname, surname,
            ward_code, voting_district_code,
            province_code, province_name,
            district_code, district_name,
            municipality_code, municipality_name,
            created_at, updated_at
        FROM members_consolidated
        WHERE id_number = '7808020703087'
    """)
    
    new_member = cur.fetchone()
    if new_member:
        print(f"\n✅ Found Member:")
        print(f"   Member ID: {new_member[0]}")
        print(f"   Name: {new_member[2]} {new_member[3]}")
        print(f"   Ward Code: {new_member[4]}")
        print(f"   VD Code: {new_member[5]}")
        print(f"   Province: {new_member[6]} - {new_member[7]}")
        print(f"   District: {new_member[8]} - {new_member[9]}")
        print(f"   Municipality: {new_member[10]} - {new_member[11]}")
        print(f"   Created: {new_member[12]}")
        
        ward_code = new_member[4]
        municipal_code = new_member[10]
    else:
        print("\n❌ Member not found!")
        conn.close()
        return
    
    # 2. Check the membership application
    print("\n" + "=" * 100)
    print("2. MEMBERSHIP APPLICATION DATA")
    print("=" * 100)
    
    cur.execute("""
        SELECT
            application_id, application_number, status,
            ward_code, voting_district_code,
            province_code, district_code, municipal_code,
            submitted_at, reviewed_at, created_at
        FROM membership_applications
        WHERE id_number = '7808020703087'
    """)
    
    application = cur.fetchone()
    if application:
        print(f"\n✅ Found Application:")
        print(f"   Application ID: {application[0]}")
        print(f"   Application Number: {application[1]}")
        print(f"   Status: {application[2]}")
        print(f"   Ward Code: {application[3]}")
        print(f"   VD Code: {application[4]}")
        print(f"   Province Code: {application[5]}")
        print(f"   District Code: {application[6]}")
        print(f"   Municipal Code: {application[7]}")
        print(f"   Submitted: {application[8]}")
        print(f"   Reviewed: {application[9]}")
    
    # 3. Find all members in the same ward
    print("\n" + "=" * 100)
    print(f"3. ALL MEMBERS IN WARD: {ward_code}")
    print("=" * 100)
    
    cur.execute("""
        SELECT
            member_id, id_number, firstname, surname,
            ward_code, municipality_code, municipality_name,
            created_at
        FROM members_consolidated
        WHERE ward_code = %s
        ORDER BY created_at DESC
    """, (ward_code,))
    
    ward_members = cur.fetchall()
    print(f"\n✅ Found {len(ward_members)} members in ward {ward_code}:")
    for i, member in enumerate(ward_members[:10], 1):  # Show first 10
        print(f"   {i}. ID: {member[0]} | {member[2]} {member[3]} | Municipal: {member[5]} | Created: {member[7]}")
    
    if len(ward_members) > 10:
        print(f"   ... and {len(ward_members) - 10} more members")
    
    # 4. Check if there are members with different municipal_code in same ward
    print("\n" + "=" * 100)
    print(f"4. MUNICIPAL CODE ANALYSIS FOR WARD: {ward_code}")
    print("=" * 100)
    
    cur.execute("""
        SELECT
            municipality_code, municipality_name,
            COUNT(*) as member_count
        FROM members_consolidated
        WHERE ward_code = %s
        GROUP BY municipality_code, municipality_name
        ORDER BY member_count DESC
    """, (ward_code,))
    
    municipal_groups = cur.fetchall()
    print(f"\n✅ Municipal codes in ward {ward_code}:")
    for group in municipal_groups:
        print(f"   {group[0]} ({group[1]}): {group[2]} members")
    
    # 5. Check ward table definition
    print("\n" + "=" * 100)
    print(f"5. WARD TABLE RECORD FOR: {ward_code}")
    print("=" * 100)
    
    cur.execute("""
        SELECT 
            ward_code, ward_name, ward_number,
            municipality_code, member_count,
            is_in_good_standing, is_active
        FROM wards
        WHERE ward_code = %s
    """, (ward_code,))
    
    ward_info = cur.fetchone()
    if ward_info:
        print(f"\n✅ Ward Information:")
        print(f"   Ward Code: {ward_info[0]}")
        print(f"   Ward Name: {ward_info[1]}")
        print(f"   Ward Number: {ward_info[2]}")
        print(f"   Municipality Code: {ward_info[3]}")
        print(f"   Member Count: {ward_info[4]}")
        print(f"   Good Standing: {ward_info[5]}")
        print(f"   Active: {ward_info[6]}")
        
        ward_municipal_code = ward_info[3]
    else:
        print(f"\n⚠️ Ward {ward_code} not found in wards table!")
        ward_municipal_code = None
    
    # 6. Compare member's municipal_code with ward's municipal_code
    print("\n" + "=" * 100)
    print("6. MUNICIPAL CODE MISMATCH ANALYSIS")
    print("=" * 100)
    
    print(f"\n📊 Comparison:")
    print(f"   New Member's Municipal Code: {municipal_code}")
    print(f"   Ward Table's Municipal Code: {ward_municipal_code}")
    
    if municipal_code != ward_municipal_code:
        print(f"\n⚠️ MISMATCH DETECTED!")
        print(f"   The member was assigned municipal_code '{municipal_code}'")
        print(f"   But ward {ward_code} belongs to municipal_code '{ward_municipal_code}'")
    else:
        print(f"\n✅ Municipal codes match")
    
    # 7. Check if filtering by municipal_code would hide members
    print("\n" + "=" * 100)
    print("7. FILTERING SIMULATION")
    print("=" * 100)
    
    print(f"\nIf filtering by municipality_code = '{municipal_code}':")
    cur.execute("""
        SELECT COUNT(*)
        FROM members_consolidated
        WHERE ward_code = %s AND municipality_code = %s
    """, (ward_code, municipal_code))
    filtered_count = cur.fetchone()[0]
    print(f"   Result: {filtered_count} members")

    print(f"\nIf filtering by municipality_code = '{ward_municipal_code}':")
    cur.execute("""
        SELECT COUNT(*)
        FROM members_consolidated
        WHERE ward_code = %s AND municipality_code = %s
    """, (ward_code, ward_municipal_code))
    correct_count = cur.fetchone()[0]
    print(f"   Result: {correct_count} members")
    
    # 8. Check IEC data for this ID
    print("\n" + "=" * 100)
    print("8. IEC VOTER REGISTRATION DATA")
    print("=" * 100)
    
    cur.execute("""
        SELECT 
            iec_vd_number, iec_voting_district_name,
            iec_ward_id, iec_municipality_id, iec_province_id
        FROM iec_voting_stations
        WHERE iec_vd_number = 32871326
        LIMIT 1
    """)
    
    iec_data = cur.fetchone()
    if iec_data:
        print(f"\n✅ IEC Data:")
        print(f"   VD Number: {iec_data[0]}")
        print(f"   VD Name: {iec_data[1]}")
        print(f"   Ward ID: {iec_data[2]}")
        print(f"   Municipality ID: {iec_data[3]}")
        print(f"   Province ID: {iec_data[4]}")
    
    conn.close()
    
    # Summary
    print("\n" + "=" * 100)
    print("INVESTIGATION SUMMARY")
    print("=" * 100)
    print(f"""
✅ Data Collected:
   - New member found in members_consolidated table
   - Ward code: {ward_code}
   - Member's municipality_code: {municipal_code}
   - Ward's municipality_code: {ward_municipal_code}
   - Total members in ward: {len(ward_members)}
   - Members with same municipality_code: {filtered_count}
   - Members with ward's municipality_code: {correct_count}

⚠️ Potential Issues:
   1. Municipality code mismatch between member and ward
   2. If UI filters by member's municipality_code, it will only show {filtered_count} member(s)
   3. Other {correct_count} members have different municipality_code

🔍 Next Steps:
   - Check how the UI queries members (does it filter by municipality_code?)
   - Verify the approval process - where does municipality_code come from?
   - Check if IEC data provides correct municipality_code
    """)

if __name__ == '__main__':
    main()

