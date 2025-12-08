#!/usr/bin/env python3
"""
Quick verification script for member approval
Run this after approving a member to verify the database
"""

import psycopg2
import sys

DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

def verify_member(id_number):
    print("=" * 100)
    print("🔍 VERIFYING MEMBER APPROVAL")
    print("=" * 100)
    print(f"\nID Number: {id_number}")
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Get member details
    cur.execute("""
        SELECT 
          m.member_id,
          m.id_number,
          m.firstname,
          m.surname,
          m.ward_code,
          m.voting_district_code,
          m.voter_status_id,
          vs.status_name as voter_status,
          m.municipality_code,
          m.membership_status_id,
          ms.status_name as membership_status,
          m.created_at,
          m.updated_at
        FROM members_consolidated m
        LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
        WHERE m.id_number = %s
    """, (id_number,))
    
    member = cur.fetchone()
    
    if not member:
        print("\n❌ Member not found in database!")
        print("   Possible reasons:")
        print("   1. Application not yet approved")
        print("   2. ID number incorrect")
        print("   3. Member not created")
        conn.close()
        return False
    
    print("\n📋 MEMBER DETAILS")
    print("=" * 100)
    print(f"   Member ID: {member[0]}")
    print(f"   Name: {member[2]} {member[3]}")
    print(f"   ID Number: {member[1]}")
    print(f"   Ward Code: {member[4]}")
    print(f"   Municipality Code: {member[8]}")
    print(f"   Created: {member[11]}")
    print(f"   Updated: {member[12]}")
    
    print("\n✅ VOTER STATUS")
    print("=" * 100)
    print(f"   Voter Status ID: {member[6]}")
    print(f"   Voter Status: {member[7]}")
    
    print("\n📍 VOTING DISTRICT")
    print("=" * 100)
    print(f"   Voting District Code: {member[5]}")
    
    # Check if special code
    special_codes = {
        '222222222': 'Registered - No VD Data',
        '999999999': 'Not Registered to Vote',
        '888888888': 'Verification Failed/Pending'
    }
    
    if member[5] in special_codes:
        print(f"   ℹ️ Special Code: {special_codes[member[5]]}")
    else:
        print(f"   ℹ️ Actual VD Number from IEC")
    
    print("\n🎯 MEMBERSHIP STATUS")
    print("=" * 100)
    print(f"   Membership Status ID: {member[9]}")
    print(f"   Membership Status: {member[10]}")
    
    # Validation checks
    print("\n" + "=" * 100)
    print("✅ VALIDATION CHECKS")
    print("=" * 100)
    
    checks = [
        ("Voter Status ID is set", member[6] is not None, member[6]),
        ("Voter Status ID is valid (1, 2, or 4)", member[6] in [1, 2, 4], member[6]),
        ("Voting District Code is set", member[5] is not None, member[5]),
        ("Municipality Code is sub-region (not metro)", member[8] not in ['EKU', 'JHB', 'TSH', 'CPT'], member[8]),
        ("Membership Status is Active (ID: 1)", member[9] == 1, member[9])
    ]
    
    all_passed = True
    for check_name, passed, value in checks:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {check_name} ({value})")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 100)
    if all_passed:
        print("🎉 ALL CHECKS PASSED!")
    else:
        print("⚠️ SOME CHECKS FAILED!")
    print("=" * 100 + "\n")
    
    conn.close()
    return all_passed

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python verify-approval.py <ID_NUMBER>")
        print("Example: python verify-approval.py 7808020703087")
        sys.exit(1)
    
    id_number = sys.argv[1]
    success = verify_member(id_number)
    sys.exit(0 if success else 1)

