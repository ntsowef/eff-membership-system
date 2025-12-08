#!/usr/bin/env python3
"""
Check for duplicate members in the test Excel file
"""

import pandas as pd
import os

file_path = r"C:\Development\NewProj\Membership-newV2\_upload_file_directory\test-upload-1762727974296.xlsx"

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

print("=" * 120)
print("CHECKING FOR DUPLICATES IN EXCEL FILE")
print("=" * 120)
print(f"\nFile: {file_path}")
print()

# Read the Excel file
df = pd.read_excel(file_path)

print(f"Total rows: {len(df)}")
print()

# Check for duplicate ID numbers
id_col = None
for col in df.columns:
    if 'ID' in col.upper() and 'NUMBER' in col.upper():
        id_col = col
        break

if not id_col:
    print("No ID NUMBER column found")
    print("Columns:", df.columns.tolist())
    exit(1)

print(f"Using column: '{id_col}'")
print()

# Find duplicates
duplicates = df[df.duplicated(subset=[id_col], keep=False)]

if len(duplicates) > 0:
    print(f"⚠️  Found {len(duplicates)} rows with duplicate ID numbers:")
    print()
    
    # Group by ID number to show duplicates together
    duplicate_ids = duplicates[id_col].unique()
    
    for id_num in duplicate_ids:
        dup_rows = df[df[id_col] == id_num]
        print(f"\nID Number: {id_num} (appears {len(dup_rows)} times)")
        print("-" * 120)
        
        for idx, row in dup_rows.iterrows():
            print(f"  Row {idx + 2}:")  # +2 because Excel is 1-indexed and has header
            if 'NAME' in df.columns:
                print(f"    Name: {row.get('NAME', 'N/A')}")
            if 'SURNAME' in df.columns:
                print(f"    Surname: {row.get('SURNAME', 'N/A')}")
            if 'MEMBERSHIP NUMBER' in df.columns:
                print(f"    Membership #: {row.get('MEMBERSHIP NUMBER', 'N/A')}")
            print()
else:
    print("✅ No duplicate ID numbers found")

print("=" * 120)
print("\nThe ingestion script needs to handle duplicates by:")
print("1. De-duplicating rows before bulk insert")
print("2. Using the most recent/complete record for each person")
print("3. Or processing one row at a time with individual conflict handling")
print("=" * 120)

