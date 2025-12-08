#!/usr/bin/env python3
"""Check for blank expiry dates in Excel files"""

import pandas as pd

# Check KwaZulu-Natal file (has most NULL expiry dates)
file_path = 'docs/archive/New_Kwazulu-Natal_combined_output_20251117_095639.xlsx'

print("=" * 80)
print(f"ANALYZING: {file_path}")
print("=" * 80)

df = pd.read_excel(file_path)
print(f"\nTotal records: {len(df):,}")

# Check Expiry Date column
if 'Expiry Date' in df.columns:
    total_count = len(df)
    non_null_count = df['Expiry Date'].notna().sum()
    null_count = df['Expiry Date'].isna().sum()
    
    print(f"\nExpiry Date column:")
    print(f"  Non-null values: {non_null_count:,} ({non_null_count/total_count*100:.1f}%)")
    print(f"  Null/blank values: {null_count:,} ({null_count/total_count*100:.1f}%)")
    
    # Show sample non-null values
    if non_null_count > 0:
        print(f"\n  Sample non-null expiry dates:")
        for idx, val in enumerate(df[df['Expiry Date'].notna()]['Expiry Date'].head(10), 1):
            print(f"    {idx}. {val}")
    
    # Show sample rows with null expiry dates
    if null_count > 0:
        print(f"\n  Sample rows with NULL expiry dates:")
        null_rows = df[df['Expiry Date'].isna()][['ID Number', 'Firstname', 'Surname', 'Date Joined', 'Last Payment', 'Expiry Date']].head(10)
        for idx, row in null_rows.iterrows():
            print(f"    {row['ID Number']} | {row['Firstname']} {row['Surname']} | Joined: {row['Date Joined']} | Last Pay: {row['Last Payment']} | Expiry: {row['Expiry Date']}")
else:
    print("\n⚠️  'Expiry Date' column not found!")

# Check Date Joined column
if 'Date Joined' in df.columns:
    total_count = len(df)
    non_null_count = df['Date Joined'].notna().sum()
    null_count = df['Date Joined'].isna().sum()
    
    print(f"\nDate Joined column:")
    print(f"  Non-null values: {non_null_count:,} ({non_null_count/total_count*100:.1f}%)")
    print(f"  Null/blank values: {null_count:,} ({null_count/total_count*100:.1f}%)")

# Check Last Payment column
if 'Last Payment' in df.columns:
    total_count = len(df)
    non_null_count = df['Last Payment'].notna().sum()
    null_count = df['Last Payment'].isna().sum()
    
    print(f"\nLast Payment column:")
    print(f"  Non-null values: {non_null_count:,} ({non_null_count/total_count*100:.1f}%)")
    print(f"  Null/blank values: {null_count:,} ({null_count/total_count*100:.1f}%)")

print("\n" + "=" * 80)

