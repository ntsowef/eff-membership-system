#!/usr/bin/env python3
"""
Check VD code handling for special cases:
- 222222222 (registered voters without VD code)
- 999999999 (non-registered voters)
- Voters registered to different wards
"""

import psycopg2
from psycopg2.extras import RealDictCursor

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'eff_membership_database',
    'user': 'eff_admin',
    'password': 'Frames!123'
}

def check_vd_codes():
    """Check VD code handling in recent upload"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("=" * 80)
        print("VD CODE ANALYSIS - RECENT BULK UPLOAD")
        print("=" * 80)
        
        # Get recent members (last hour)
        cursor.execute("""
            SELECT 
                id_number,
                firstname,
                surname,
                ward_code,
                voter_district_code,
                voting_district_code,
                voter_status_id,
                membership_status_id,
                created_at
            FROM members_consolidated
            WHERE created_at > NOW() - INTERVAL '1 hour'
            ORDER BY created_at DESC
        """)
        
        members = cursor.fetchall()
        
        if not members:
            print("\n❌ No recent members found")
            return
        
        print(f"\n📊 Analyzing {len(members)} recently inserted members\n")
        
        # Check for special VD codes
        print("=" * 80)
        print("SPECIAL VD CODE ANALYSIS")
        print("=" * 80)
        
        vd_222222222 = [m for m in members if m['voting_district_code'] == '222222222']
        vd_999999999 = [m for m in members if m['voting_district_code'] == '999999999']
        vd_other = [m for m in members if m['voting_district_code'] not in ['222222222', '999999999', None]]
        vd_null = [m for m in members if m['voting_district_code'] is None]
        
        print(f"\n📋 VD Code Distribution:")
        print(f"  222222222 (Registered, no VD): {len(vd_222222222)} members")
        print(f"  999999999 (Non-registered):   {len(vd_999999999)} members")
        print(f"  Other VD codes:                {len(vd_other)} members")
        print(f"  NULL VD codes:                 {len(vd_null)} members")
        
        # Show samples of each type
        if vd_222222222:
            print(f"\n✅ Sample members with VD code 222222222:")
            for member in vd_222222222[:3]:
                print(f"  - {member['firstname']} {member['surname']} (ID: {member['id_number']})")
                print(f"    Ward: {member['ward_code']}, VD: {member['voting_district_code']}")
                print(f"    Voter Status: {member['voter_status_id']}")
        
        if vd_999999999:
            print(f"\n✅ Sample members with VD code 999999999:")
            for member in vd_999999999[:3]:
                print(f"  - {member['firstname']} {member['surname']} (ID: {member['id_number']})")
                print(f"    Ward: {member['ward_code']}, VD: {member['voting_district_code']}")
                print(f"    Voter Status: {member['voter_status_id']}")
        
        if vd_other:
            print(f"\n📋 Sample members with regular VD codes:")
            for member in vd_other[:5]:
                print(f"  - {member['firstname']} {member['surname']} (ID: {member['id_number']})")
                print(f"    Ward: {member['ward_code']}, VD: {member['voting_district_code']}")
                print(f"    Voter Status: {member['voter_status_id']}")
        
        # Check voter_district_code vs voting_district_code
        print("\n" + "=" * 80)
        print("VOTER_DISTRICT_CODE vs VOTING_DISTRICT_CODE COMPARISON")
        print("=" * 80)
        
        print("\nNote: voter_district_code = VD from IEC, voting_district_code = processed VD")
        
        # Show samples where they differ
        different = [m for m in members if m['voter_district_code'] != m['voting_district_code']]
        
        if different:
            print(f"\n⚠️  Found {len(different)} members where voter_district_code != voting_district_code:")
            for member in different[:10]:
                print(f"  - {member['firstname']} {member['surname']}")
                print(f"    voter_district_code:  {member['voter_district_code']}")
                print(f"    voting_district_code: {member['voting_district_code']}")
                print(f"    Ward: {member['ward_code']}")
        else:
            print("\n✅ All members have matching voter_district_code and voting_district_code")
        
        # Check for "Registered to different ward" scenario
        print("\n" + "=" * 80)
        print("REGISTERED TO DIFFERENT WARD ANALYSIS")
        print("=" * 80)
        
        # Get voter status lookup
        cursor.execute("SELECT voter_status_id, status_name FROM voter_status")
        voter_statuses = {row['voter_status_id']: row['status_name'] for row in cursor.fetchall()}
        
        print("\nVoter Status Distribution:")
        status_counts = {}
        for member in members:
            status_id = member['voter_status_id']
            status_counts[status_id] = status_counts.get(status_id, 0) + 1
        
        for status_id, count in sorted(status_counts.items()):
            status_name = voter_statuses.get(status_id, 'Unknown')
            percentage = (count / len(members)) * 100
            print(f"  Status {status_id} ({status_name}): {count} members ({percentage:.1f}%)")
        
        # Find members registered to different ward (should have VD code 222222222)
        cursor.execute("""
            SELECT voter_status_id, status_name 
            FROM voter_status 
            WHERE LOWER(status_name) LIKE '%different%ward%'
        """)
        different_ward_status = cursor.fetchone()
        
        if different_ward_status:
            different_ward_id = different_ward_status['voter_status_id']
            different_ward_members = [m for m in members if m['voter_status_id'] == different_ward_id]
            
            print(f"\n📋 Members registered to different ward (Status {different_ward_id}):")
            print(f"   Total: {len(different_ward_members)} members")
            
            if different_ward_members:
                print("\n   Checking if they have VD code 222222222:")
                correct_vd = [m for m in different_ward_members if m['voting_district_code'] == '222222222']
                incorrect_vd = [m for m in different_ward_members if m['voting_district_code'] != '222222222']
                
                print(f"   ✅ Correct VD (222222222): {len(correct_vd)} members")
                print(f"   ❌ Incorrect VD:           {len(incorrect_vd)} members")
                
                if incorrect_vd:
                    print("\n   ⚠️  Members with wrong VD code:")
                    for member in incorrect_vd[:5]:
                        print(f"     - {member['firstname']} {member['surname']}")
                        print(f"       Expected VD: 222222222, Got: {member['voting_district_code']}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("ANALYSIS COMPLETE")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_vd_codes()

