#!/usr/bin/env python3
"""
Test the ingestion script with FransTest.xlsx and verify status columns
"""

import sys
import os
import psycopg2

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flexible_membership_ingestionV2 import FlexibleMembershipIngestion

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

def get_id_numbers_from_excel():
    """Get ID numbers from the test Excel file"""
    import pandas as pd
    df = pd.read_excel('uploads/FransTest_unique.xlsx')
    # Convert to string to match database varchar type
    if 'ID Number' in df.columns:
        return [str(int(x)) if pd.notna(x) else None for x in df['ID Number'].tolist()]
    return []

def check_status_before():
    """Check status columns before ingestion"""
    print("=" * 80)
    print("BEFORE INGESTION - Checking existing records")
    print("=" * 80)
    
    id_numbers = get_id_numbers_from_excel()
    if not id_numbers:
        print("No ID numbers found in Excel file")
        return
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Check if any of these ID numbers already exist
    placeholders = ','.join(['%s'] * len(id_numbers))
    cur.execute(f"""
        SELECT id_number, voter_status_id, membership_status_id
        FROM members_consolidated
        WHERE id_number IN ({placeholders})
    """, id_numbers)
    
    results = cur.fetchall()
    print(f"\nFound {len(results)} existing records out of {len(id_numbers)} ID numbers")
    
    if results:
        print("\nSample existing records:")
        print(f"{'ID Number':<15} | {'voter_status_id':<20} | {'membership_status_id':<20}")
        print("-" * 60)
        for row in results[:5]:
            print(f"{row[0]:<15} | {str(row[1]):<20} | {str(row[2]):<20}")
    
    conn.close()

def run_ingestion():
    """Run the ingestion script"""
    print("\n" + "=" * 80)
    print("RUNNING INGESTION")
    print("=" * 80)
    
    try:
        ingestion = FlexibleMembershipIngestion(
            docs_directory='uploads',
            db_config=DB_CONFIG,
            use_optimized=True,
            archive_enabled=False
        )
        
        print("\nProcessing file: uploads/FransTest_unique.xlsx")
        result = ingestion.process_single_file('uploads/FransTest_unique.xlsx')
        
        print(f"\n✅ Ingestion completed")
        print(f"Result: {result}")
        
        # Close connection
        if ingestion.connection:
            ingestion.connection.close()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Ingestion failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_status_after():
    """Check status columns after ingestion"""
    print("\n" + "=" * 80)
    print("AFTER INGESTION - Verifying status columns")
    print("=" * 80)
    
    id_numbers = get_id_numbers_from_excel()
    if not id_numbers:
        print("No ID numbers found in Excel file")
        return
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Get the records with status information
    placeholders = ','.join(['%s'] * len(id_numbers))
    cur.execute(f"""
        SELECT 
            mc.id_number,
            mc.voter_status_id,
            vs.status_name as voter_status_name,
            mc.membership_status_id,
            ms.status_name as membership_status_name
        FROM members_consolidated mc
        LEFT JOIN voter_statuses vs ON mc.voter_status_id = vs.status_id
        LEFT JOIN membership_statuses ms ON mc.membership_status_id = ms.status_id
        WHERE mc.id_number IN ({placeholders})
        ORDER BY mc.id_number
    """, id_numbers)
    
    results = cur.fetchall()
    
    print(f"\nFound {len(results)} records")
    print("\nStatus Column Values:")
    print(f"{'ID Number':<15} | {'voter_status_id':<5} | {'Voter Status':<25} | {'memb_status_id':<5} | {'Membership Status':<20}")
    print("-" * 100)
    
    for row in results:
        voter_status = row[2] if row[2] else "NULL"
        memb_status = row[4] if row[4] else "NULL"
        print(f"{row[0]:<15} | {str(row[1]):<5} | {voter_status:<25} | {str(row[3]):<5} | {memb_status:<20}")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    # Voter status distribution
    cur.execute(f"""
        SELECT vs.status_name, COUNT(*) as cnt
        FROM members_consolidated mc
        LEFT JOIN voter_statuses vs ON mc.voter_status_id = vs.status_id
        WHERE mc.id_number IN ({placeholders})
        GROUP BY vs.status_name
        ORDER BY cnt DESC
    """, id_numbers)
    
    print("\nVoter Status Distribution:")
    for row in cur.fetchall():
        status_name = row[0] if row[0] else "NULL"
        print(f"  {status_name}: {row[1]}")
    
    # Membership status distribution
    cur.execute(f"""
        SELECT ms.status_name, COUNT(*) as cnt
        FROM members_consolidated mc
        LEFT JOIN membership_statuses ms ON mc.membership_status_id = ms.status_id
        WHERE mc.id_number IN ({placeholders})
        GROUP BY ms.status_name
        ORDER BY cnt DESC
    """, id_numbers)
    
    print("\nMembership Status Distribution:")
    for row in cur.fetchall():
        status_name = row[0] if row[0] else "NULL"
        print(f"  {status_name}: {row[1]}")
    
    conn.close()

if __name__ == '__main__':
    print("\n" + "=" * 80)
    print("INGESTION TEST WITH STATUS COLUMN VERIFICATION")
    print("=" * 80)
    
    # Step 1: Check before
    check_status_before()
    
    # Step 2: Run ingestion
    success = run_ingestion()
    
    if success:
        # Step 3: Check after
        check_status_after()
        
        print("\n" + "=" * 80)
        print("✅ TEST COMPLETE")
        print("=" * 80)
    else:
        print("\n" + "=" * 80)
        print("❌ TEST FAILED")
        print("=" * 80)

