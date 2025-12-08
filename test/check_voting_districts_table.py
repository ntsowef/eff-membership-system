#!/usr/bin/env python3
"""
Check the voting_districts table and foreign key constraints
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

def check_voting_districts():
    """Check voting_districts table and constraints"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("=" * 80)
        print("VOTING_DISTRICTS TABLE ANALYSIS")
        print("=" * 80)
        
        # Check if special codes exist in voting_districts table
        special_codes = ['222222222', '999999999', '333333333', '111111111', '000000000',
                        '22222222', '99999999', '33333333', '11111111', '00000000']
        
        print("\nChecking for special codes in voting_districts table:")
        for code in special_codes:
            cursor.execute("""
                SELECT voting_district_code, voting_district_name 
                FROM voting_districts 
                WHERE voting_district_code = %s
            """, (code,))
            result = cursor.fetchone()
            if result:
                print(f"  ✅ {code}: {result['voting_district_name']}")
            else:
                print(f"  ❌ {code}: NOT FOUND")
        
        # Check foreign key constraints on members_consolidated
        print("\n" + "=" * 80)
        print("FOREIGN KEY CONSTRAINTS ON members_consolidated")
        print("=" * 80)
        
        cursor.execute("""
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'members_consolidated'
                AND kcu.column_name LIKE '%voting%'
        """)
        
        constraints = cursor.fetchall()
        
        if constraints:
            print("\nFound foreign key constraints:")
            for constraint in constraints:
                print(f"\n  Constraint: {constraint['constraint_name']}")
                print(f"  Column: {constraint['column_name']}")
                print(f"  References: {constraint['foreign_table_name']}.{constraint['foreign_column_name']}")
        else:
            print("\n✅ No foreign key constraints found on voting-related columns")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("SOLUTION")
        print("=" * 80)
        print("\nThe voting_district_code field has a foreign key constraint.")
        print("Special codes (222222222, 999999999, etc.) must either:")
        print("  1. Be inserted into the voting_districts table, OR")
        print("  2. The foreign key constraint should allow NULL for special cases")
        print("\nRecommended approach:")
        print("  - Keep voting_district_code = NULL for special codes")
        print("  - Use voter_district_code to store special codes")
        print("  - This maintains referential integrity while tracking special statuses")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_voting_districts()

