#!/usr/bin/env python3
"""
Update member 772468 with voter status and VD code
"""

import psycopg2

DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

def main():
    print("=" * 100)
    print("UPDATE MEMBER 772468")
    print("=" * 100)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Show current data
    print("\n📋 BEFORE UPDATE:")
    cur.execute("""
        SELECT 
          member_id, 
          id_number,
          firstname,
          surname,
          ward_code,
          voting_district_code,
          voter_status_id,
          municipality_code,
          created_at
        FROM members_consolidated
        WHERE member_id = 772468
    """)
    
    before = cur.fetchone()
    print(f"   Member ID: {before[0]}")
    print(f"   ID Number: {before[1]}")
    print(f"   Name: {before[2]} {before[3]}")
    print(f"   Ward Code: {before[4]}")
    print(f"   Voting District Code: {before[5]}")
    print(f"   Voter Status ID: {before[6]}")
    print(f"   Municipality Code: {before[7]}")
    print(f"   Created: {before[8]}")
    
    # Update member
    print("\n🔄 UPDATING MEMBER...")
    cur.execute("""
        UPDATE members_consolidated
        SET 
          voter_status_id = 1,                    -- Registered to vote
          voting_district_code = '32871326',      -- IEC VD number
          municipality_code = 'EKU004',           -- Correct sub-region code from ward table
          updated_at = CURRENT_TIMESTAMP
        WHERE member_id = 772468
    """)
    
    conn.commit()
    print("✅ Update successful!")
    
    # Show updated data
    print("\n📋 AFTER UPDATE:")
    cur.execute("""
        SELECT 
          member_id, 
          id_number,
          firstname,
          surname,
          ward_code,
          voting_district_code,
          voter_status_id,
          municipality_code,
          vs.status_name as voter_status,
          m.updated_at
        FROM members_consolidated m
        LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
        WHERE member_id = 772468
    """)
    
    after = cur.fetchone()
    print(f"   Member ID: {after[0]}")
    print(f"   ID Number: {after[1]}")
    print(f"   Name: {after[2]} {after[3]}")
    print(f"   Ward Code: {after[4]}")
    print(f"   Voting District Code: {after[5]}")
    print(f"   Voter Status ID: {after[6]}")
    print(f"   Voter Status: {after[8]}")
    print(f"   Municipality Code: {after[7]}")
    print(f"   Updated: {after[9]}")
    
    # Show changes
    print("\n" + "=" * 100)
    print("CHANGES SUMMARY")
    print("=" * 100)
    print(f"   Voter Status ID: {before[6]} → {after[6]} ✅")
    print(f"   Voting District Code: {before[5]} → {after[5]} ✅")
    print(f"   Municipality Code: {before[7]} → {after[7]} ✅")
    
    conn.close()

if __name__ == '__main__':
    main()

