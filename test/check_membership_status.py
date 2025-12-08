#!/usr/bin/env python3
"""
Test script to check Status (membership status) column handling
"""

import psycopg2
import pandas as pd
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_membership_statuses_table():
    """Check what values exist in membership_statuses lookup table"""
    print("=" * 80)
    print("CHECKING membership_statuses LOOKUP TABLE")
    print("=" * 80)
    
    conn = psycopg2.connect(
        host='localhost',
        user='eff_admin',
        password='Frames!123',
        database='eff_membership_database',
        port=5432
    )
    cur = conn.cursor()
    
    cur.execute('SELECT status_id, status_name FROM membership_statuses ORDER BY status_id')
    rows = cur.fetchall()
    
    print(f"\nFound {len(rows)} membership status types:")
    print(f"{'status_id':<12} | {'status_name':<30}")
    print("-" * 45)
    for row in rows:
        print(f"{row[0]:<12} | {row[1]:<30}")
    
    conn.close()
    return rows

def check_excel_status_values(excel_file):
    """Check what Status values are in the Excel file"""
    print("\n" + "=" * 80)
    print(f"CHECKING Status VALUES IN: {os.path.basename(excel_file)}")
    print("=" * 80)
    
    df = pd.read_excel(excel_file)
    
    if 'Status' in df.columns:
        unique_values = df['Status'].dropna().unique()
        print(f"\nFound {len(unique_values)} unique Status values:")
        for val in sorted(unique_values):
            count = len(df[df['Status'] == val])
            print(f"  - '{val}' ({count} records)")
    else:
        print("\n[ERROR] 'Status' column not found in Excel file!")
        print(f"Available columns: {df.columns.tolist()}")
    
    return df

def check_members_consolidated_status():
    """Check what membership_status_id values are stored in members_consolidated"""
    print("\n" + "=" * 80)
    print("CHECKING membership_status_id IN members_consolidated TABLE")
    print("=" * 80)
    
    conn = psycopg2.connect(
        host='localhost',
        user='eff_admin',
        password='Frames!123',
        database='eff_membership_database',
        port=5432
    )
    cur = conn.cursor()
    
    # Get distribution of membership_status_id
    cur.execute('''
        SELECT membership_status_id, COUNT(*) as cnt 
        FROM members_consolidated 
        GROUP BY membership_status_id 
        ORDER BY membership_status_id
    ''')
    results = cur.fetchall()
    
    print(f"\nmembership_status_id distribution:")
    print(f"{'membership_status_id':<20} | {'count':<10}")
    print("-" * 35)
    for row in results:
        print(f"{str(row[0]):<20} | {row[1]:<10}")
    
    # Get sample records with status names
    cur.execute('''
        SELECT m.membership_status_id, ms.status_name, COUNT(*) as cnt
        FROM members_consolidated m
        LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
        GROUP BY m.membership_status_id, ms.status_name
        ORDER BY m.membership_status_id
    ''')
    results = cur.fetchall()
    
    print(f"\nmembership_status_id with names:")
    print(f"{'membership_status_id':<20} | {'status_name':<30} | {'count':<10}")
    print("-" * 65)
    for row in results:
        status_name = row[1] if row[1] else "NULL"
        print(f"{str(row[0]):<20} | {status_name:<30} | {row[2]:<10}")
    
    conn.close()

def test_lookup_matching():
    """Test how the ingestion script would match Excel values to database values"""
    print("\n" + "=" * 80)
    print("TESTING LOOKUP MATCHING LOGIC")
    print("=" * 80)
    
    # Excel values from the test file
    excel_values = ['Invalid']
    
    # Database values (case-insensitive lookup)
    db_values = {
        'active': 1,
        'expired': 2,
        'suspended': 3,
        'cancelled': 4,
        'pending': 5,
        'inactive': 6,
        'grace period': 7,
        'good standing': 8
    }
    
    print("\nMatching Excel values to database:")
    print(f"{'Excel Value':<20} | {'Matched DB Value':<25} | {'status_id':<10}")
    print("-" * 60)
    
    for excel_val in excel_values:
        excel_lower = excel_val.strip().lower()
        matched_id = db_values.get(excel_lower, None)
        matched_name = excel_lower if matched_id else "NO MATCH (defaults to 8)"
        status_id = matched_id if matched_id else 8
        print(f"{excel_val:<20} | {matched_name:<25} | {status_id:<10}")

if __name__ == '__main__':
    print("\n" + "=" * 80)
    print("MEMBERSHIP STATUS COLUMN VERIFICATION TEST")
    print("=" * 80)
    
    # Check membership_statuses lookup table
    check_membership_statuses_table()
    
    # Check Excel file
    excel_file = 'uploads/FransTest.xlsx'
    if os.path.exists(excel_file):
        check_excel_status_values(excel_file)
    else:
        print(f"\n[WARNING] Test file not found: {excel_file}")
    
    # Check members_consolidated table
    check_members_consolidated_status()
    
    # Test lookup matching logic
    test_lookup_matching()
    
    print("\n" + "=" * 80)
    print("CONCLUSION")
    print("=" * 80)
    print("""
The ingestion script DOES capture the Status column from Excel files.

Excel Value: "Invalid"
Database Values: Active, Expired, Suspended, Cancelled, Pending, Inactive, Grace Period, Good Standing

The script uses case-insensitive matching, so:
  - "Invalid" does NOT match any database value
  - When no match is found, the script defaults to status_id = 8 (Good Standing)

RECOMMENDATION:
Either add "Invalid" to the membership_statuses table, or map "Invalid" to an 
appropriate existing status (e.g., "Inactive" or "Suspended").
    """)

