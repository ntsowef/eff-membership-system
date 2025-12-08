#!/usr/bin/env python3
"""
Check users table structure
"""

import psycopg2

# Database configuration
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
    
    # Get users table columns
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
    """)
    
    print("Users table columns:")
    for col_name, data_type in cursor.fetchall():
        print(f"  - {col_name}: {data_type}")
    
    cursor.close()
    connection.close()
    
except Exception as e:
    print(f"Error: {e}")

