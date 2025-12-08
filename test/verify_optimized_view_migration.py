#!/usr/bin/env python3
"""
Verify vw_member_details_optimized view migration to members_consolidated table

This script:
1. Checks the current view definition
2. Verifies all required columns exist
3. Tests sample queries that the digital card feature uses
4. Compares data before and after migration (if run twice)
"""

import psycopg2
from psycopg2.extras import RealDictCursor
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

def check_view_definition(cursor):
    """Check which table the view is using"""
    print("\n" + "="*80)
    print("CHECKING VIEW DEFINITION")
    print("="*80)
    
    cursor.execute("""
        SELECT definition 
        FROM pg_views 
        WHERE viewname = 'vw_member_details_optimized'
    """)
    
    result = cursor.fetchone()
    if result:
        definition = result[0]
        
        # Check if using old tables or new consolidated table
        uses_members_table = 'FROM members m' in definition or 'FROM members AS m' in definition
        uses_memberships_table = 'LEFT JOIN memberships' in definition or 'JOIN memberships' in definition
        uses_consolidated = 'FROM members_consolidated' in definition
        
        print(f"\n✓ View exists: vw_member_details_optimized")
        print(f"\nTable Usage:")
        print(f"  - Uses 'members' table: {'YES ❌' if uses_members_table else 'NO ✓'}")
        print(f"  - Uses 'memberships' table: {'YES ❌' if uses_memberships_table else 'NO ✓'}")
        print(f"  - Uses 'members_consolidated' table: {'YES ✓' if uses_consolidated else 'NO ❌'}")
        
        if uses_consolidated:
            print(f"\n✅ View is using the NEW consolidated table structure")
        else:
            print(f"\n⚠️  View is using the OLD separate tables structure")
            
        return uses_consolidated
    else:
        print("\n❌ View does not exist!")
        return False

def check_required_columns(cursor):
    """Verify all required columns exist in the view"""
    print("\n" + "="*80)
    print("CHECKING REQUIRED COLUMNS")
    print("="*80)
    
    required_columns = [
        'member_id', 'id_number', 'firstname', 'surname', 'email', 'cell_number',
        'membership_number', 'province_code', 'province_name', 'municipality_name',
        'ward_code', 'voting_station_name', 'membership_status', 'expiry_date',
        'membership_amount', 'days_until_expiry', 'member_created_at'
    ]
    
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'vw_member_details_optimized'
        ORDER BY ordinal_position
    """)
    
    existing_columns = {row[0]: row[1] for row in cursor.fetchall()}
    
    print(f"\nTotal columns in view: {len(existing_columns)}")
    print(f"\nChecking required columns for digital card feature:")
    
    all_present = True
    for col in required_columns:
        if col in existing_columns:
            print(f"  ✓ {col:<30} ({existing_columns[col]})")
        else:
            print(f"  ❌ {col:<30} MISSING!")
            all_present = False
    
    if all_present:
        print(f"\n✅ All required columns are present")
    else:
        print(f"\n⚠️  Some required columns are missing")
    
    return all_present

def test_sample_queries(cursor):
    """Test sample queries that the digital card feature uses"""
    print("\n" + "="*80)
    print("TESTING SAMPLE QUERIES")
    print("="*80)
    
    # Test 1: Get total count
    print("\n1. Testing row count...")
    cursor.execute("SELECT COUNT(*) FROM vw_member_details_optimized")
    count = cursor.fetchone()[0]
    print(f"   Total members in view: {count:,}")
    
    # Test 2: Query by ID number (digital card uses this)
    print("\n2. Testing query by ID number...")
    cursor.execute("""
        SELECT 
            member_id, membership_number, firstname, surname,
            province_name, municipality_name, ward_code,
            voting_station_name, membership_status, expiry_date,
            membership_amount, days_until_expiry
        FROM vw_member_details_optimized
        WHERE id_number IS NOT NULL
        LIMIT 1
    """)
    
    result = cursor.fetchone()
    if result:
        print(f"   ✓ Query successful")
        print(f"   Sample: {result[2]} {result[3]} (Member #{result[0]})")
        print(f"   Membership: {result[1]}, Status: {result[8]}")
        print(f"   Province: {result[4]}, Municipality: {result[5]}")
        print(f"   Voting Station: {result[7]}")
    else:
        print(f"   ⚠️  No results returned")
    
    # Test 3: Query by member_id (digital card uses this)
    print("\n3. Testing query by member_id...")
    cursor.execute("""
        SELECT 
            member_id, membership_number, firstname, surname,
            membership_status, expiry_date, days_until_expiry
        FROM vw_member_details_optimized
        WHERE member_id = 1
        LIMIT 1
    """)
    
    result = cursor.fetchone()
    if result:
        print(f"   ✓ Query successful for member_id = 1")
        print(f"   Member: {result[2]} {result[3]}")
        print(f"   Status: {result[4]}, Expiry: {result[5]}, Days until expiry: {result[6]}")
    else:
        print(f"   ⚠️  No member with ID 1 found")
    
    # Test 4: Check for NULL critical fields
    print("\n4. Checking for NULL values in critical fields...")
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(membership_number) as has_membership_number,
            COUNT(expiry_date) as has_expiry_date,
            COUNT(membership_status) as has_membership_status,
            COUNT(province_name) as has_province_name
        FROM vw_member_details_optimized
        LIMIT 1000
    """)
    
    result = cursor.fetchone()
    print(f"   Total records checked: {result[0]:,}")
    print(f"   Has membership_number: {result[1]:,} ({result[1]/result[0]*100:.1f}%)")
    print(f"   Has expiry_date: {result[2]:,} ({result[2]/result[0]*100:.1f}%)")
    print(f"   Has membership_status: {result[3]:,} ({result[3]/result[0]*100:.1f}%)")
    print(f"   Has province_name: {result[4]:,} ({result[4]/result[0]*100:.1f}%)")

def compare_table_counts(cursor):
    """Compare counts between different tables"""
    print("\n" + "="*80)
    print("COMPARING TABLE COUNTS")
    print("="*80)
    
    tables = [
        ('members_consolidated', 'New consolidated table (source of truth)'),
        ('members', 'Old members table'),
        ('vw_member_details_optimized', 'Optimized view (used by digital cards)')
    ]
    
    for table_name, description in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"\n{table_name}:")
            print(f"  Description: {description}")
            print(f"  Count: {count:,}")
        except Exception as e:
            print(f"\n{table_name}:")
            print(f"  ❌ Error: {str(e)}")

def main():
    """Main verification function"""
    print("\n" + "="*80)
    print("VW_MEMBER_DETAILS_OPTIMIZED VIEW MIGRATION VERIFICATION")
    print("="*80)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Run all checks
        uses_consolidated = check_view_definition(cursor)
        has_all_columns = check_required_columns(cursor)
        test_sample_queries(cursor)
        compare_table_counts(cursor)
        
        # Summary
        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        
        if uses_consolidated and has_all_columns:
            print("\n✅ View is correctly using members_consolidated table")
            print("✅ All required columns are present")
            print("✅ Digital membership card feature should work correctly")
        elif not uses_consolidated:
            print("\n⚠️  View is still using old tables (members + memberships)")
            print("📝 Run the migration script to update:")
            print("   psql -h localhost -p 5432 -U eff_admin -d eff_membership_database \\")
            print("     -f database-recovery/fix_vw_member_details_optimized_use_consolidated.sql")
        else:
            print("\n⚠️  View structure needs attention")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

