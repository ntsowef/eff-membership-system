#!/usr/bin/env python3
"""
Check all references to JHB wards before deletion
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

print("=" * 80)
print("CHECKING ALL REFERENCES TO JHB WARDS")
print("=" * 80)

try:
    # Connect to database
    connection = psycopg2.connect(**db_config)
    cursor = connection.cursor()
    print("[OK] Connected to database\n")
    
    # Count JHB wards
    cursor.execute("SELECT COUNT(*) FROM wards WHERE ward_code LIKE '%JHB%'")
    jhb_ward_count = cursor.fetchone()[0]
    print(f"Total JHB wards: {jhb_ward_count}\n")
    
    # Check all tables that reference wards
    tables_to_check = [
        'users',
        'members_consolidated',
        'members',
        'membership_history'
    ]
    
    print("=" * 80)
    print("CHECKING FOREIGN KEY REFERENCES:")
    print("=" * 80)
    
    total_references = 0
    
    for table in tables_to_check:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            )
        """, (table,))
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print(f"\n[SKIP] Table '{table}' does not exist")
            continue
        
        # Check if ward_code column exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = %s 
                AND column_name = 'ward_code'
            )
        """, (table,))
        
        column_exists = cursor.fetchone()[0]
        
        if not column_exists:
            print(f"\n[SKIP] Table '{table}' has no 'ward_code' column")
            continue
        
        # Count references
        query = f"""
            SELECT COUNT(*) 
            FROM {table} 
            WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
        """
        cursor.execute(query)
        count = cursor.fetchone()[0]
        
        print(f"\n[TABLE] {table}")
        print(f"  References to JHB wards: {count:,}")
        
        if count > 0:
            # Show sample records
            sample_query = f"""
                SELECT ward_code, COUNT(*) as count
                FROM {table}
                WHERE ward_code IN (SELECT ward_code FROM wards WHERE ward_code LIKE '%JHB%')
                GROUP BY ward_code
                ORDER BY count DESC
                LIMIT 10
            """
            cursor.execute(sample_query)
            samples = cursor.fetchall()
            
            print(f"  Top ward codes by count:")
            for ward_code, ward_count in samples:
                print(f"    - {ward_code}: {ward_count:,} records")
            
            total_references += count
    
    print("\n" + "=" * 80)
    print("SUMMARY:")
    print("=" * 80)
    print(f"Total JHB wards: {jhb_ward_count}")
    print(f"Total references across all tables: {total_references:,}")
    
    if total_references > 0:
        print("\n[WARNING] Cannot delete JHB wards without handling references first!")
        print("\nOptions:")
        print("1. Update all references to use different ward codes")
        print("2. Set ward_code to NULL in referencing tables (if allowed)")
        print("3. Delete all referencing records first (CASCADE)")
        print("4. Drop foreign key constraints temporarily")
    else:
        print("\n[OK] No references found. Safe to delete JHB wards.")
    
    cursor.close()
    connection.close()
    print("\n[OK] Database connection closed")
    
except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()

print("=" * 80)

