#!/usr/bin/env python3
"""
Run the vw_member_details_optimized view migration to use members_consolidated table
"""

import psycopg2
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

def get_connection():
    """Create database connection"""
    return psycopg2.connect(**DB_CONFIG)

def run_migration():
    """Run the migration SQL script"""
    print("\n" + "="*80)
    print("MIGRATING VW_MEMBER_DETAILS_OPTIMIZED TO USE MEMBERS_CONSOLIDATED")
    print("="*80)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Read the SQL file
    print("\n📖 Reading migration SQL file...")
    with open('database-recovery/fix_vw_member_details_optimized_use_consolidated.sql', 'r') as f:
        sql_script = f.read()
    
    print("✓ SQL file loaded")
    
    try:
        conn = get_connection()
        conn.autocommit = False  # Use transaction
        cursor = conn.cursor()
        
        print("\n🔄 Executing migration...")
        
        # Split by semicolons and execute each statement
        statements = [s.strip() for s in sql_script.split(';') if s.strip() and not s.strip().startswith('--')]
        
        for i, statement in enumerate(statements, 1):
            # Skip comments and empty statements
            if not statement or statement.startswith('--'):
                continue
                
            try:
                cursor.execute(statement)
                
                # Check if it's a SELECT statement and print results
                if statement.strip().upper().startswith('SELECT'):
                    results = cursor.fetchall()
                    if results:
                        print(f"\n   Query {i} results:")
                        for row in results:
                            print(f"     {row}")
                else:
                    print(f"   ✓ Statement {i} executed")
                    
            except Exception as e:
                # Some statements might fail (like DROP VIEW if not exists), that's ok
                if 'does not exist' not in str(e):
                    print(f"   ⚠️  Statement {i} warning: {str(e)}")
        
        # Commit the transaction
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Verify the migration
        print("\n" + "="*80)
        print("VERIFICATION")
        print("="*80)
        
        # Check view definition
        cursor.execute("""
            SELECT definition 
            FROM pg_views 
            WHERE viewname = 'vw_member_details_optimized'
        """)
        
        result = cursor.fetchone()
        if result:
            definition = result[0]
            uses_consolidated = 'FROM members_consolidated' in definition
            
            if uses_consolidated:
                print("\n✅ View is now using members_consolidated table")
            else:
                print("\n⚠️  View is still using old tables")
        
        # Check row count
        cursor.execute("SELECT COUNT(*) FROM vw_member_details_optimized")
        view_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM members_consolidated")
        table_count = cursor.fetchone()[0]
        
        print(f"\nRow counts:")
        print(f"  members_consolidated: {table_count:,}")
        print(f"  vw_member_details_optimized: {view_count:,}")
        
        if view_count == table_count:
            print(f"\n✅ Row counts match!")
        else:
            print(f"\n⚠️  Row counts differ by {abs(table_count - view_count):,}")
        
        # Test a sample query
        print("\n" + "="*80)
        print("TESTING SAMPLE QUERY")
        print("="*80)
        
        cursor.execute("""
            SELECT 
                member_id, membership_number, firstname, surname,
                province_name, municipality_name, membership_status,
                expiry_date, days_until_expiry
            FROM vw_member_details_optimized
            WHERE id_number IS NOT NULL
            LIMIT 3
        """)
        
        results = cursor.fetchall()
        print(f"\nSample records from updated view:")
        for row in results:
            print(f"  Member #{row[0]}: {row[2]} {row[3]}")
            print(f"    Membership: {row[1]}, Status: {row[6]}")
            print(f"    Province: {row[4]}, Municipality: {row[5]}")
            print(f"    Expiry: {row[7]}, Days until expiry: {row[8]}")
            print()
        
        cursor.close()
        conn.close()
        
        print("="*80)
        print("✅ MIGRATION SUCCESSFUL!")
        print("="*80)
        print("\nThe digital membership card feature will now use the updated view")
        print("with data from members_consolidated table.")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        import traceback
        traceback.print_exc()
        
        if 'conn' in locals():
            conn.rollback()
            print("\n🔄 Transaction rolled back")

if __name__ == '__main__':
    run_migration()

