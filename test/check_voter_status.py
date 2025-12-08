#!/usr/bin/env python3
"""
Test script to check VOTER STATUS column handling in the ingestion script
"""

import psycopg2
import pandas as pd
import sys
import os

# Add parent directory to path to import the ingestion script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_voter_statuses_table():
    """Check what values exist in voter_statuses lookup table"""
    print("=" * 80)
    print("CHECKING voter_statuses LOOKUP TABLE")
    print("=" * 80)
    
    conn = psycopg2.connect(
        host='localhost',
        user='eff_admin',
        password='Frames!123',
        database='eff_membership_database',
        port=5432
    )
    cur = conn.cursor()
    
    cur.execute('SELECT status_id, status_name FROM voter_statuses ORDER BY status_id')
    rows = cur.fetchall()
    
    print(f"\nFound {len(rows)} voter status types:")
    print(f"{'status_id':<12} | {'status_name':<30}")
    print("-" * 45)
    for row in rows:
        print(f"{row[0]:<12} | {row[1]:<30}")
    
    conn.close()
    return rows

def check_excel_voter_status_values(excel_file):
    """Check what VOTER STATUS values are in the Excel file"""
    print("\n" + "=" * 80)
    print(f"CHECKING VOTER STATUS VALUES IN: {os.path.basename(excel_file)}")
    print("=" * 80)
    
    df = pd.read_excel(excel_file)
    
    if 'VOTER STATUS' in df.columns:
        unique_values = df['VOTER STATUS'].dropna().unique()
        print(f"\nFound {len(unique_values)} unique VOTER STATUS values:")
        for val in sorted(unique_values):
            count = len(df[df['VOTER STATUS'] == val])
            print(f"  - '{val}' ({count} records)")
    else:
        print("\n[ERROR] 'VOTER STATUS' column not found in Excel file!")
        print(f"Available columns: {df.columns.tolist()}")
    
    return df

def check_members_consolidated_voter_status():
    """Check what voter_status_id values are stored in members_consolidated"""
    print("\n" + "=" * 80)
    print("CHECKING voter_status_id IN members_consolidated TABLE")
    print("=" * 80)
    
    conn = psycopg2.connect(
        host='localhost',
        user='eff_admin',
        password='Frames!123',
        database='eff_membership_database',
        port=5432
    )
    cur = conn.cursor()
    
    # Get distribution of voter_status_id
    cur.execute('''
        SELECT voter_status_id, COUNT(*) as cnt 
        FROM members_consolidated 
        GROUP BY voter_status_id 
        ORDER BY voter_status_id
    ''')
    results = cur.fetchall()
    
    print(f"\nvoter_status_id distribution:")
    print(f"{'voter_status_id':<16} | {'count':<10}")
    print("-" * 30)
    for row in results:
        print(f"{str(row[0]):<16} | {row[1]:<10}")
    
    # Get sample records with voter status names
    cur.execute('''
        SELECT m.voter_status_id, vs.status_name, COUNT(*) as cnt
        FROM members_consolidated m
        LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
        GROUP BY m.voter_status_id, vs.status_name
        ORDER BY m.voter_status_id
    ''')
    results = cur.fetchall()
    
    print(f"\nvoter_status_id with names:")
    print(f"{'voter_status_id':<16} | {'status_name':<30} | {'count':<10}")
    print("-" * 60)
    for row in results:
        status_name = row[1] if row[1] else "NULL"
        print(f"{str(row[0]):<16} | {status_name:<30} | {row[2]:<10}")
    
    conn.close()

def test_lookup_matching():
    """Test how the ingestion script would match Excel values to database values"""
    print("\n" + "=" * 80)
    print("TESTING LOOKUP MATCHING LOGIC")
    print("=" * 80)
    
    # Excel values from the test file
    excel_values = [
        'NOT REGISTERED VOTER',
        'REGISTERED IN WARD',
        'REGISTERED IN DIFFERENT WARD'
    ]
    
    # Database values
    db_values = {
        'registered': 1,
        'not registered': 2,
        'pending verification': 3,
        'verification failed': 4,
        'deceased': 5,
        'other': 6
    }
    
    print("\nMatching Excel values to database:")
    print(f"{'Excel Value':<35} | {'Matched DB Value':<25} | {'status_id':<10}")
    print("-" * 75)
    
    for excel_val in excel_values:
        excel_lower = excel_val.strip().lower()
        matched_id = db_values.get(excel_lower, None)
        matched_name = excel_lower if matched_id else "NO MATCH (defaults to 1)"
        status_id = matched_id if matched_id else 1
        print(f"{excel_val:<35} | {matched_name:<25} | {status_id:<10}")

if __name__ == '__main__':
    print("\n" + "=" * 80)
    print("VOTER STATUS COLUMN VERIFICATION TEST")
    print("=" * 80)
    
    # Check voter_statuses lookup table
    check_voter_statuses_table()
    
    # Check Excel file
    excel_file = 'uploads/FransTest.xlsx'
    if os.path.exists(excel_file):
        check_excel_voter_status_values(excel_file)
    else:
        print(f"\n[WARNING] Test file not found: {excel_file}")
    
    # Check members_consolidated table
    check_members_consolidated_voter_status()
    
    # Test lookup matching logic
    test_lookup_matching()
    
    print("\n" + "=" * 80)
    print("CONCLUSION")
    print("=" * 80)
    print("""
The ingestion script DOES capture the VOTER STATUS column from Excel files.
However, there is a MISMATCH between Excel values and database values:

Excel Values:
  - NOT REGISTERED VOTER
  - REGISTERED IN WARD
  - REGISTERED IN DIFFERENT WARD

Database Values:
  - Registered
  - Not Registered
  - Pending Verification
  - Verification Failed
  - Deceased
  - Other

The script uses case-insensitive matching, so:
  - "NOT REGISTERED VOTER" does NOT match "Not Registered" (extra word "VOTER")
  - "REGISTERED IN WARD" does NOT match "Registered" (extra words "IN WARD")
  - "REGISTERED IN DIFFERENT WARD" does NOT match any value

When no match is found, the script defaults to voter_status_id = 1 (Registered).

RECOMMENDATION:
Either update the voter_statuses table to include the Excel values,
or normalize the Excel values before lookup.
    """)

