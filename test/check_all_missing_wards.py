#!/usr/bin/env python3
"""
Check ALL missing ward codes from the Excel file
"""

import psycopg2
import pandas as pd

# Database configuration
db_config = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

print("=" * 80)
print("ANALYZING ALL MISSING WARDS FROM EXCEL FILE")
print("=" * 80)

try:
    # Connect to database
    connection = psycopg2.connect(**db_config)
    cursor = connection.cursor()
    print("[OK] Connected to database\n")
    
    # Load the Excel file
    excel_file = 'docs/Gauteng_combined_output.xlsx'
    print(f"Loading Excel file: {excel_file}")
    df = pd.read_excel(excel_file)
    print(f"Loaded {len(df):,} records\n")
    
    # Get all unique wards from Excel
    if 'Ward' in df.columns:
        ward_values = df['Ward'].dropna().unique()
        excel_wards = set()
        for ward in ward_values:
            try:
                # Skip empty strings and whitespace
                ward_str = str(ward).strip()
                if ward_str and ward_str != '':
                    excel_wards.add(str(int(float(ward_str))))
            except (ValueError, TypeError):
                # Skip invalid ward values
                pass
        print(f"Found {len(excel_wards)} unique wards in Excel\n")
    else:
        print("[ERROR] No 'Ward' column found in Excel")
        exit(1)
    
    # Get all wards from database
    cursor.execute("SELECT ward_code FROM wards")
    db_wards = {row[0] for row in cursor.fetchall()}
    print(f"Found {len(db_wards):,} wards in database\n")
    
    # Find missing wards
    missing_wards = sorted(excel_wards - db_wards)
    valid_wards = excel_wards.intersection(db_wards)
    
    print("=" * 80)
    print("WARD VALIDATION SUMMARY:")
    print("=" * 80)
    print(f"Excel wards: {len(excel_wards)}")
    print(f"Valid wards (in DB): {len(valid_wards)}")
    print(f"Missing wards (NOT in DB): {len(missing_wards)}")
    
    # Count records per ward status
    df['ward_str'] = df['Ward'].astype(str).str.replace('.0', '', regex=False)
    valid_records = df[df['ward_str'].isin(valid_wards)]
    invalid_records = df[~df['ward_str'].isin(valid_wards)]
    
    print(f"\nRecords with VALID wards: {len(valid_records):,} ({len(valid_records)/len(df)*100:.1f}%)")
    print(f"Records with INVALID wards: {len(invalid_records):,} ({len(invalid_records)/len(df)*100:.1f}%)")
    
    # Show all missing wards
    print("\n" + "=" * 80)
    print(f"ALL {len(missing_wards)} MISSING WARD CODES:")
    print("=" * 80)
    
    # Count records per missing ward
    ward_counts = []
    for ward in missing_wards:
        count = len(df[df['ward_str'] == ward])
        ward_counts.append((ward, count))
    
    # Sort by count (descending)
    ward_counts.sort(key=lambda x: x[1], reverse=True)
    
    total_missing_records = 0
    for ward, count in ward_counts:
        print(f"  {ward}: {count:,} records")
        total_missing_records += count
    
    print(f"\nTotal records in missing wards: {total_missing_records:,}")
    
    # Analyze ward code patterns
    print("\n" + "=" * 80)
    print("WARD CODE PATTERN ANALYSIS:")
    print("=" * 80)
    
    # Group by first 3 digits
    patterns = {}
    for ward in missing_wards:
        prefix = ward[:3]
        if prefix not in patterns:
            patterns[prefix] = []
        patterns[prefix].append(ward)
    
    for prefix, wards in sorted(patterns.items()):
        print(f"\nPrefix '{prefix}': {len(wards)} missing wards")
        for ward in wards:
            count = next(c for w, c in ward_counts if w == ward)
            print(f"  - {ward} ({count:,} records)")
    
    cursor.close()
    connection.close()
    print("\n[OK] Database connection closed")
    
except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()

print("=" * 80)

