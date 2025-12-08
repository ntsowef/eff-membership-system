#!/usr/bin/env python3
"""
Diagnostic script to check the processed data AFTER normalization
to identify which column causes integer overflow during database insertion.
"""

import pandas as pd
import sys
import os
import re

# PostgreSQL integer limits
INTEGER_MIN = -2147483648
INTEGER_MAX = 2147483647

def normalize_id_number(id_num):
    """Normalize ID number to 13 digits (same logic as in the ingestion script)"""
    if pd.isna(id_num):
        return None
    
    id_str = str(id_num).strip()
    
    # Remove any non-digit characters
    id_str = re.sub(r'\D', '', id_str)
    
    if not id_str:
        return None
    
    # Pad with leading zeros to make it 13 digits
    id_str = id_str.zfill(13)
    
    return id_str

def normalize_cell_number(cell):
    """Normalize cell number (same logic as in the ingestion script)"""
    if pd.isna(cell):
        return None
    
    cell_str = str(cell).strip()
    
    # Remove any non-digit characters
    cell_str = re.sub(r'\D', '', cell_str)
    
    if not cell_str:
        return None
    
    # If it starts with 0, replace with 27
    if cell_str.startswith('0'):
        cell_str = '27' + cell_str[1:]
    # If it doesn't start with 27, add 27 prefix
    elif not cell_str.startswith('27'):
        cell_str = '27' + cell_str
    
    return cell_str

def check_processed_data(file_path):
    """Check processed data for integer overflow issues"""
    
    print("=" * 80)
    print(f"DIAGNOSING PROCESSED DATA: {os.path.basename(file_path)}")
    print("=" * 80)
    
    # Read the Excel file
    print(f"\n[*] Reading Excel file...")
    df = pd.read_excel(file_path)
    print(f"    Total rows: {len(df):,}")
    
    # Process ID numbers and cell numbers (as the script does)
    print(f"\n[*] Processing ID numbers and cell numbers...")
    
    # Check ID Number column
    id_col = None
    for col in df.columns:
        if 'id' in col.lower() and 'number' in col.lower():
            id_col = col
            break
    
    if id_col:
        print(f"\n[*] Found ID column: '{id_col}'")
        df['processed_id'] = df[id_col].apply(normalize_id_number)
        
        # Check if any processed IDs are numeric and exceed INTEGER limit
        numeric_ids = []
        for idx, val in df['processed_id'].items():
            if val and val.isdigit():
                num_val = int(val)
                if num_val > INTEGER_MAX or num_val < INTEGER_MIN:
                    numeric_ids.append((idx, val, num_val))
        
        if numeric_ids:
            print(f"\n❌ FOUND {len(numeric_ids)} ID NUMBERS EXCEEDING INTEGER LIMIT!")
            print(f"    Sample problematic IDs:")
            for idx, str_val, num_val in numeric_ids[:10]:
                print(f"      Row {idx}: '{str_val}' = {num_val:,}")
            print(f"\n💡 SOLUTION: ID numbers should be stored as VARCHAR/TEXT, not INTEGER!")
        else:
            print(f"    ✓ All ID numbers fit in INTEGER range (or are stored as strings)")
    
    # Check Cell Number column
    cell_col = None
    for col in df.columns:
        if 'cell' in col.lower() or 'phone' in col.lower():
            cell_col = col
            break
    
    if cell_col:
        print(f"\n[*] Found Cell column: '{cell_col}'")
        df['processed_cell'] = df[cell_col].apply(normalize_cell_number)
        
        # Check if any processed cells are numeric and exceed INTEGER limit
        numeric_cells = []
        for idx, val in df['processed_cell'].items():
            if val and val.isdigit():
                num_val = int(val)
                if num_val > INTEGER_MAX or num_val < INTEGER_MIN:
                    numeric_cells.append((idx, val, num_val))
        
        if numeric_cells:
            print(f"\n❌ FOUND {len(numeric_cells)} CELL NUMBERS EXCEEDING INTEGER LIMIT!")
            print(f"    Sample problematic cell numbers:")
            for idx, str_val, num_val in numeric_cells[:10]:
                print(f"      Row {idx}: '{str_val}' = {num_val:,}")
            print(f"\n💡 SOLUTION: Cell numbers should be stored as VARCHAR/TEXT, not INTEGER!")
            print(f"    Cell numbers like '27821234567' (11 digits) exceed INTEGER max (2,147,483,647)")
        else:
            print(f"    ✓ All cell numbers fit in INTEGER range (or are stored as strings)")
    
    # Check Ward column
    if 'Ward' in df.columns:
        print(f"\n[*] Checking Ward column...")
        ward_vals = df['Ward'].dropna()
        if len(ward_vals) > 0:
            max_ward = ward_vals.max()
            min_ward = ward_vals.min()
            print(f"    Min Ward: {min_ward:,}")
            print(f"    Max Ward: {max_ward:,}")
            if max_ward > INTEGER_MAX or min_ward < INTEGER_MIN:
                print(f"    ❌ Ward values exceed INTEGER limit!")
            else:
                print(f"    ✓ Ward values fit in INTEGER")
    
    # Check VD NUMBER column
    if 'VD NUMBER' in df.columns:
        print(f"\n[*] Checking VD NUMBER column...")
        vd_vals = df['VD NUMBER'].dropna()
        if len(vd_vals) > 0:
            max_vd = vd_vals.max()
            min_vd = vd_vals.min()
            print(f"    Min VD: {min_vd:,}")
            print(f"    Max VD: {max_vd:,}")
            if max_vd > INTEGER_MAX or min_vd < INTEGER_MIN:
                print(f"    ❌ VD NUMBER values exceed INTEGER limit!")
            else:
                print(f"    ✓ VD NUMBER values fit in INTEGER")
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print("\nMost likely cause: CELL NUMBER column")
    print("  - South African cell numbers: 27XXXXXXXXX (11 digits)")
    print("  - Example: 27821234567 = 27,821,234,567")
    print("  - PostgreSQL INTEGER max: 2,147,483,647")
    print("  - Cell numbers exceed this limit by ~10x!")
    print("\n💡 SOLUTION:")
    print("  ALTER TABLE members_consolidated ALTER COLUMN cell_number TYPE VARCHAR(20);")
    print("=" * 80)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python diagnose_processed_data.py <path_to_excel_file>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"ERROR: File not found: {file_path}")
        sys.exit(1)
    
    check_processed_data(file_path)

