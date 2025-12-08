#!/usr/bin/env python3
"""Check what columns are in each Excel file"""

import pandas as pd
import os

docs_dir = 'docs'
archive_dir = 'docs/archive'

print("=" * 80)
print("EXCEL FILE COLUMN ANALYSIS")
print("=" * 80)

# Check files in docs directory
print("\n[DOCS DIRECTORY]")
for filename in os.listdir(docs_dir):
    if filename.endswith('.xlsx'):
        filepath = os.path.join(docs_dir, filename)
        try:
            df = pd.read_excel(filepath, nrows=0)  # Read only headers
            has_expiry = 'Expiry Date' in df.columns
            has_date_joined = 'Date Joined' in df.columns
            has_last_payment = 'Last Payment' in df.columns
            
            print(f"\n{filename}:")
            print(f"  Total columns: {len(df.columns)}")
            print(f"  Has 'Expiry Date': {has_expiry}")
            print(f"  Has 'Date Joined': {has_date_joined}")
            print(f"  Has 'Last Payment': {has_last_payment}")
            
            if not has_expiry:
                print(f"  ⚠️  MISSING 'Expiry Date' column!")
                print(f"  Available columns: {df.columns.tolist()}")
        except Exception as e:
            print(f"\n{filename}: ERROR - {e}")

# Check recent files in archive directory
print(f"\n{'='*80}")
print("[ARCHIVE DIRECTORY - Recent Files]")
print("=" * 80)

if os.path.exists(archive_dir):
    archive_files = []
    for filename in os.listdir(archive_dir):
        if filename.endswith('.xlsx'):
            filepath = os.path.join(archive_dir, filename)
            mtime = os.path.getmtime(filepath)
            archive_files.append((filename, filepath, mtime))
    
    # Sort by modification time (newest first) and take top 5
    archive_files.sort(key=lambda x: x[2], reverse=True)
    
    for filename, filepath, _ in archive_files[:5]:
        try:
            df = pd.read_excel(filepath, nrows=0)  # Read only headers
            has_expiry = 'Expiry Date' in df.columns
            has_date_joined = 'Date Joined' in df.columns
            has_last_payment = 'Last Payment' in df.columns
            
            print(f"\n{filename}:")
            print(f"  Total columns: {len(df.columns)}")
            print(f"  Has 'Expiry Date': {has_expiry}")
            print(f"  Has 'Date Joined': {has_date_joined}")
            print(f"  Has 'Last Payment': {has_last_payment}")
            
            if not has_expiry:
                print(f"  ⚠️  MISSING 'Expiry Date' column!")
        except Exception as e:
            print(f"\n{filename}: ERROR - {e}")

print("\n" + "=" * 80)

