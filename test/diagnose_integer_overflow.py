#!/usr/bin/env python3
"""
Diagnostic script to identify which column is causing "integer out of range" error
in the membership ingestion process.

PostgreSQL Integer Limits:
- SMALLINT: -32,768 to 32,767
- INTEGER: -2,147,483,648 to 2,147,483,647
- BIGINT: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
"""

import pandas as pd
import sys
import os

# PostgreSQL integer limits
SMALLINT_MIN = -32768
SMALLINT_MAX = 32767
INTEGER_MIN = -2147483648
INTEGER_MAX = 2147483647
BIGINT_MIN = -9223372036854775808
BIGINT_MAX = 9223372036854775807

def check_integer_columns(file_path):
    """Check all numeric columns for values that exceed PostgreSQL integer limits"""
    
    print("=" * 80)
    print(f"DIAGNOSING INTEGER OVERFLOW IN: {os.path.basename(file_path)}")
    print("=" * 80)
    
    # Read the Excel file
    print(f"\n[*] Reading Excel file...")
    df = pd.read_excel(file_path)
    print(f"    Total rows: {len(df):,}")
    print(f"    Total columns: {len(df.columns)}")
    
    # Identify numeric columns
    numeric_cols = df.select_dtypes(include=['int64', 'float64', 'int32', 'float32']).columns.tolist()
    print(f"\n[*] Found {len(numeric_cols)} numeric columns:")
    for col in numeric_cols:
        print(f"    - {col}")
    
    print("\n" + "=" * 80)
    print("CHECKING FOR INTEGER OVERFLOW")
    print("=" * 80)
    
    issues_found = False
    
    for col in numeric_cols:
        # Skip NaN values
        non_null_values = df[col].dropna()
        
        if len(non_null_values) == 0:
            continue
        
        # Get min and max values
        min_val = non_null_values.min()
        max_val = non_null_values.max()
        
        # Check if values are floats (need to check if they're actually integers)
        if df[col].dtype in ['float64', 'float32']:
            # Check if all non-null values are actually integers
            is_integer = all(non_null_values.apply(lambda x: x == int(x) if pd.notna(x) else True))
            if is_integer:
                min_val = int(min_val)
                max_val = int(max_val)
        
        # Determine which PostgreSQL integer type is needed
        overflow_type = None
        recommended_type = None
        
        if min_val < SMALLINT_MIN or max_val > SMALLINT_MAX:
            if min_val < INTEGER_MIN or max_val > INTEGER_MAX:
                if min_val < BIGINT_MIN or max_val > BIGINT_MAX:
                    overflow_type = "BIGINT OVERFLOW"
                    recommended_type = "NUMERIC or TEXT"
                else:
                    overflow_type = "INTEGER OVERFLOW"
                    recommended_type = "BIGINT"
            else:
                overflow_type = None  # Fits in INTEGER
                recommended_type = "INTEGER"
        else:
            recommended_type = "SMALLINT"
        
        # Print column analysis
        status = "⚠️ OVERFLOW" if overflow_type else "✓ OK"
        print(f"\n{status} Column: {col}")
        print(f"    Data Type: {df[col].dtype}")
        print(f"    Min Value: {min_val:,}")
        print(f"    Max Value: {max_val:,}")
        print(f"    Non-null Count: {len(non_null_values):,}")
        
        if overflow_type:
            print(f"    ❌ ERROR: {overflow_type}")
            print(f"    💡 SOLUTION: Change database column to {recommended_type}")
            issues_found = True
            
            # Show sample problematic values
            if max_val > INTEGER_MAX:
                problematic = df[df[col] > INTEGER_MAX][col].head(5)
                print(f"    Sample values exceeding INTEGER limit:")
                for idx, val in problematic.items():
                    print(f"      Row {idx}: {val:,}")
            elif min_val < INTEGER_MIN:
                problematic = df[df[col] < INTEGER_MIN][col].head(5)
                print(f"    Sample values below INTEGER limit:")
                for idx, val in problematic.items():
                    print(f"      Row {idx}: {val:,}")
        else:
            print(f"    ✓ Fits in PostgreSQL {recommended_type}")
    
    print("\n" + "=" * 80)
    if issues_found:
        print("❌ INTEGER OVERFLOW DETECTED!")
        print("=" * 80)
        print("\nRECOMMENDED ACTIONS:")
        print("1. Identify which database columns need to be changed to BIGINT")
        print("2. Run ALTER TABLE commands to change column types")
        print("3. Re-run the ingestion script")
        print("\nExample SQL:")
        print("  ALTER TABLE members_consolidated ALTER COLUMN <column_name> TYPE BIGINT;")
    else:
        print("✓ NO INTEGER OVERFLOW DETECTED")
        print("=" * 80)
        print("\nAll numeric values fit within PostgreSQL INTEGER limits.")
        print("The error might be caused by:")
        print("1. Data type mismatch (e.g., string being inserted into integer column)")
        print("2. NULL handling issues")
        print("3. Foreign key constraint violations")
    
    print("=" * 80)
    
    return issues_found


if __name__ == "__main__":
    # Check if file path is provided
    if len(sys.argv) < 2:
        print("Usage: python diagnose_integer_overflow.py <path_to_excel_file>")
        print("\nExample:")
        print("  python diagnose_integer_overflow.py docs/New_North West_combined_output.xlsx")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"ERROR: File not found: {file_path}")
        sys.exit(1)
    
    check_integer_columns(file_path)

