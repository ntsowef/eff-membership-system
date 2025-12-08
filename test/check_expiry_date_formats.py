#!/usr/bin/env python3
"""Check what expiry date formats are in the Excel file"""

import pandas as pd
from datetime import datetime, date

# Load the Excel file (use one of the available files)
file_path = 'docs/New_Gauteng_combined_output.xlsx'
df = pd.read_excel(file_path)
print(f"Analyzing: {file_path}")
print(f"Loaded {len(df):,} records\n")

# Check if Expiry Date column exists
if 'Expiry Date' not in df.columns:
    print("ERROR: 'Expiry Date' column not found!")
    print(f"Available columns: {df.columns.tolist()}")
    exit(1)

print("=" * 80)
print("EXPIRY DATE ANALYSIS")
print("=" * 80)

# Count non-null values
total_count = len(df)
non_null_count = df['Expiry Date'].notna().sum()
null_count = df['Expiry Date'].isna().sum()

print(f"\nTotal records: {total_count:,}")
print(f"Non-null expiry dates: {non_null_count:,} ({non_null_count/total_count*100:.1f}%)")
print(f"Null expiry dates: {null_count:,} ({null_count/total_count*100:.1f}%)")

# Get sample of non-null values
print(f"\n{'='*80}")
print("SAMPLE EXPIRY DATE VALUES (first 20 non-null)")
print("=" * 80)

non_null_dates = df[df['Expiry Date'].notna()]['Expiry Date'].head(20)
for idx, val in enumerate(non_null_dates, 1):
    print(f"{idx:2}. {val} (type: {type(val).__name__})")

# Check unique types
print(f"\n{'='*80}")
print("EXPIRY DATE VALUE TYPES")
print("=" * 80)

type_counts = df[df['Expiry Date'].notna()]['Expiry Date'].apply(lambda x: type(x).__name__).value_counts()
print(type_counts)

# Check for string dates and their formats
string_dates = df[df['Expiry Date'].notna() & df['Expiry Date'].apply(lambda x: isinstance(x, str))]['Expiry Date']
if len(string_dates) > 0:
    print(f"\n{'='*80}")
    print(f"STRING DATE FORMATS (found {len(string_dates):,} string dates)")
    print("=" * 80)
    print("\nSample string dates:")
    for idx, val in enumerate(string_dates.head(20), 1):
        print(f"{idx:2}. '{val}'")

# Test parsing with the function from the script
def parse_date_flexible(date_value):
    """Parse date from various formats"""
    if pd.isna(date_value):
        return None

    if isinstance(date_value, date):
        return date_value

    if isinstance(date_value, datetime):
        return date_value.date()

    if isinstance(date_value, str):
        # First try ISO format with timezone
        try:
            from dateutil import parser
            parsed = parser.isoparse(date_value)
            return parsed.date()
        except:
            pass

        # Try multiple date formats
        formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%m/%d/%Y',
            '%d-%m-%Y',
            '%Y/%m/%d'
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_value, fmt).date()
            except:
                continue

    return None

# Test parsing
print(f"\n{'='*80}")
print("PARSING TEST RESULTS")
print("=" * 80)

df['parsed_expiry'] = df['Expiry Date'].apply(parse_date_flexible)
parsed_count = df['parsed_expiry'].notna().sum()
failed_count = df['Expiry Date'].notna().sum() - parsed_count

print(f"\nSuccessfully parsed: {parsed_count:,}")
print(f"Failed to parse: {failed_count:,}")

if failed_count > 0:
    print(f"\n{'='*80}")
    print(f"FAILED TO PARSE (showing first 20)")
    print("=" * 80)
    failed_dates = df[df['Expiry Date'].notna() & df['parsed_expiry'].isna()]['Expiry Date'].head(20)
    for idx, val in enumerate(failed_dates, 1):
        print(f"{idx:2}. {val} (type: {type(val).__name__})")

print("\n" + "=" * 80)

