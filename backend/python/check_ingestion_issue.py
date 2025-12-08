"""
Check why only 16 records are being imported
"""
import pandas as pd
import re
from typing import Optional

def normalize_id_number(id_num) -> Optional[str]:
    """Normalize ID number - ensure 13 digits, pad with 0 if needed"""
    if not id_num or pd.isna(id_num):
        return None

    id_str = str(id_num).strip()

    # Handle Excel float formatting (e.g., "8412020217088.0" -> "8412020217088")
    # Remove trailing .0 or . before removing all non-digits
    if '.' in id_str:
        # Split on decimal point and take only the integer part
        id_str = id_str.split('.')[0]

    # Remove any remaining non-digit characters
    id_digits = re.sub(r'\D', '', id_str)

    if not id_digits:
        return None

    # Pad with leading zeros if less than 13 digits
    if len(id_digits) < 13:
        id_digits = id_digits.zfill(13)

    # Validate length
    if len(id_digits) == 13:
        return id_digits

    return None

# Load the verified file
file_path = r"c:\Development\NewProj\Membership-newV2\reports\Copy of 2nd Matjhabeng Ward 11 Duplicates 14.11.2025(1)_verified.xlsx"
df = pd.read_excel(file_path)

print("="*80)
print("INGESTION ISSUE ANALYSIS")
print("="*80)

print(f"\nTotal records in file: {len(df)}")
print(f"Records with ID Number: {df['ID Number'].notna().sum()}")

# Simulate the ingestion process
print("\n" + "="*80)
print("SIMULATING INGESTION PROCESS")
print("="*80)

# Step 1: Drop rows with no ID Number
df_step1 = df.dropna(subset=['ID Number'])
print(f"\nAfter dropna(subset=['ID Number']): {len(df_step1)} records")

# Step 2: Normalize ID numbers
df_step2 = df_step1.copy()
df_step2['ID Number'] = df_step2['ID Number'].apply(normalize_id_number)
print(f"After normalize_id_number: {df_step2['ID Number'].notna().sum()} valid IDs")

# Step 3: Drop rows with invalid ID numbers
df_step3 = df_step2[df_step2['ID Number'].notna()]
print(f"After filtering out invalid IDs: {len(df_step3)} records")

# Show examples of filtered out records
print("\n" + "="*80)
print("RECORDS FILTERED OUT")
print("="*80)

filtered_out = df_step1[~df_step1.index.isin(df_step3.index)]
print(f"\nTotal filtered out: {len(filtered_out)}")

if len(filtered_out) > 0:
    print("\nFirst 20 filtered out ID Numbers:")
    for idx, row in filtered_out.head(20).iterrows():
        original_id = row['ID Number']
        normalized = normalize_id_number(original_id)
        print(f"  Row {idx}: '{original_id}' -> {normalized}")

# Check for duplicates in the remaining records
print("\n" + "="*80)
print("DUPLICATE ANALYSIS")
print("="*80)

duplicates = df_step3[df_step3.duplicated(subset=['ID Number'], keep=False)]
unique_duplicate_ids = df_step3[df_step3.duplicated(subset=['ID Number'], keep='first')]['ID Number'].nunique()

print(f"\nTotal duplicate records: {len(duplicates)}")
print(f"Unique duplicate ID numbers: {unique_duplicate_ids}")
print(f"Records after deduplication: {len(df_step3) - unique_duplicate_ids}")

# Show the final count
print("\n" + "="*80)
print("FINAL RESULT")
print("="*80)
print(f"\nRecords that would be imported: {len(df_step3) - unique_duplicate_ids}")

