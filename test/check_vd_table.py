#!/usr/bin/env python3
import psycopg2

db_config = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

try:
    connection = psycopg2.connect(**db_config)
    cursor = connection.cursor()
    
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'voting_districts' 
        ORDER BY ordinal_position
    """)
    
    print("voting_districts table columns:")
    for col_name, data_type in cursor.fetchall():
        print(f"  - {col_name}: {data_type}")
    
    cursor.close()
    connection.close()
    
except Exception as e:
    print(f"Error: {e}")

