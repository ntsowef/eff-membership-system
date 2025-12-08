#!/usr/bin/env python3
"""
Check vw_member_details view definition
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
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Get view definition
    cur.execute("""
        SELECT pg_get_viewdef('vw_member_details', true)
    """)
    
    view_def = cur.fetchone()[0]
    
    print("=" * 100)
    print("VIEW DEFINITION: vw_member_details")
    print("=" * 100)
    print(view_def)
    
    conn.close()

if __name__ == '__main__':
    main()

