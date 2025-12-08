#!/usr/bin/env python3
"""
Check member voter status and voting district code
Member ID: 7808020703087 (Dunga Marshall)
"""

import psycopg2
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
    print("MEMBER VOTER STATUS INVESTIGATION")
    print("=" * 100)
    print(f"\nInvestigation Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Target ID Number: 7808020703087 (Dunga Marshall)")
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # 1. Check member's current status
    print("\n" + "=" * 100)
    print("1. CURRENT MEMBER STATUS")
    print("=" * 100)
    
    cur.execute("""
        SELECT 
            member_id, id_number, firstname, surname,
            membership_status_id, 
            voter_status_id,
            voting_district_code,
            ward_code,
            municipality_code,
            province_code,
            created_at
        FROM members_consolidated
        WHERE id_number = '7808020703087'
    """)
    
    member = cur.fetchone()
    if member:
        print(f"\n✅ Member Found:")
        print(f"   Member ID: {member[0]}")
        print(f"   Name: {member[2]} {member[3]}")
        print(f"   Membership Status ID: {member[4]}")
        print(f"   Voter Status ID: {member[5]}")
        print(f"   Voting District Code: {member[6]}")
        print(f"   Ward Code: {member[7]}")
        print(f"   Municipality Code: {member[8]}")
        print(f"   Province Code: {member[9]}")
        print(f"   Created: {member[10]}")
        
        membership_status_id = member[4]
        voter_status_id = member[5]
        voting_district_code = member[6]
        ward_code = member[7]
        municipality_code = member[8]
    else:
        print("\n❌ Member not found!")
        conn.close()
        return
    
    # 2. Get membership status name
    print("\n" + "=" * 100)
    print("2. MEMBERSHIP STATUS DETAILS")
    print("=" * 100)
    
    if membership_status_id:
        cur.execute("""
            SELECT status_id, status_name, is_active, description
            FROM membership_statuses
            WHERE status_id = %s
        """, (membership_status_id,))
        
        status = cur.fetchone()
        if status:
            print(f"\n✅ Membership Status:")
            print(f"   Status ID: {status[0]}")
            print(f"   Status Name: {status[1]}")
            print(f"   Is Active: {status[2]}")
            print(f"   Description: {status[3]}")
    else:
        print("\n⚠️ No membership status assigned!")
    
    # 3. Get voter status name
    print("\n" + "=" * 100)
    print("3. VOTER STATUS DETAILS")
    print("=" * 100)
    
    if voter_status_id:
        cur.execute("""
            SELECT status_id, status_name, description
            FROM voter_statuses
            WHERE status_id = %s
        """, (voter_status_id,))
        
        voter_status = cur.fetchone()
        if voter_status:
            print(f"\n✅ Voter Status:")
            print(f"   Status ID: {voter_status[0]}")
            print(f"   Status Name: {voter_status[1]}")
            print(f"   Description: {voter_status[2]}")
    else:
        print("\n⚠️ No voter status assigned!")
    
    # 4. Check all available membership statuses
    print("\n" + "=" * 100)
    print("4. ALL AVAILABLE MEMBERSHIP STATUSES")
    print("=" * 100)
    
    cur.execute("""
        SELECT status_id, status_name, is_active, description
        FROM membership_statuses
        ORDER BY status_id
    """)
    
    statuses = cur.fetchall()
    print(f"\n✅ Found {len(statuses)} membership statuses:")
    for status in statuses:
        print(f"   {status[0]}. {status[1]} (Active: {status[2]}) - {status[3]}")
    
    # 5. Check all available voter statuses
    print("\n" + "=" * 100)
    print("5. ALL AVAILABLE VOTER STATUSES")
    print("=" * 100)
    
    cur.execute("""
        SELECT status_id, status_name, description
        FROM voter_statuses
        ORDER BY status_id
    """)
    
    voter_statuses = cur.fetchall()
    print(f"\n✅ Found {len(voter_statuses)} voter statuses:")
    for vs in voter_statuses:
        print(f"   {vs[0]}. {vs[1]} - {vs[2]}")
    
    # 6. Check ward's municipality mapping
    print("\n" + "=" * 100)
    print("6. WARD MUNICIPALITY MAPPING")
    print("=" * 100)
    
    cur.execute("""
        SELECT 
            ward_code, ward_name, ward_number,
            municipality_code
        FROM wards
        WHERE ward_code = %s
    """, (ward_code,))
    
    ward_info = cur.fetchone()
    if ward_info:
        print(f"\n✅ Ward Information:")
        print(f"   Ward Code: {ward_info[0]}")
        print(f"   Ward Name: {ward_info[1]}")
        print(f"   Ward Number: {ward_info[2]}")
        print(f"   Municipality Code (from ward table): {ward_info[3]}")
        print(f"   Municipality Code (from member): {municipality_code}")
        
        if ward_info[3] != municipality_code:
            print(f"\n⚠️ MISMATCH: Ward's municipality ({ward_info[3]}) != Member's municipality ({municipality_code})")
    
    conn.close()
    
    # Summary
    print("\n" + "=" * 100)
    print("INVESTIGATION SUMMARY")
    print("=" * 100)
    print(f"""
✅ Current Status:
   - Membership Status ID: {membership_status_id}
   - Voter Status ID: {voter_status_id}
   - Voting District Code: {voting_district_code if voting_district_code else 'NULL ⚠️'}
   - Ward Code: {ward_code}
   - Municipality Code: {municipality_code}

🔍 Issues Identified:
   1. Voting District Code is {'NULL' if not voting_district_code else 'SET'}
   2. Need to verify if voter status indicates IEC registration
   3. Need to apply business rules based on voter status

📋 Business Rules to Apply:
   - IF voter_status = "Registered to Vote" AND voting_district_code IS NULL
     → SET voting_district_code = '222222222'
   
   - IF voter_status = "Not Registered to Vote"
     → SET voting_district_code = '999999999' (or appropriate code)
   
   - Ensure membership_status_id = 1 (Good Standing)
   
   - Map metro municipality code to sub-region code
    """)

if __name__ == '__main__':
    main()

