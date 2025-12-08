#!/usr/bin/env python3
"""
Check membership_applications table columns
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
    
    # Get table columns
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'membership_applications'
        ORDER BY ordinal_position
    """)
    
    columns = cur.fetchall()
    print("=" * 100)
    print("MEMBERSHIP_APPLICATIONS TABLE COLUMNS")
    print("=" * 100)
    for col in columns:
        print(f"   {col[0]:40} {col[1]:20} Nullable: {col[2]}")
    
    # Get application data with all available columns
    print("\n" + "=" * 100)
    print("APPLICATION DATA FOR ID 7808020703087")
    print("=" * 100)
    
    cur.execute("""
        SELECT *
        FROM membership_applications
        WHERE id_number = '7808020703087'
    """)
    
    app = cur.fetchone()
    if app:
        col_names = [desc[0] for desc in cur.description]
        print(f"\n✅ Application Found:")
        for i, col_name in enumerate(col_names):
            print(f"   {col_name:40} {app[i]}")
    
    conn.close()

if __name__ == '__main__':
    main()

