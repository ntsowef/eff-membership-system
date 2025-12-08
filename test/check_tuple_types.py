#!/usr/bin/env python3
"""Check the types of values in the tuple being inserted"""

import pandas as pd
import sys
sys.path.insert(0, '.')

from flexible_membership_ingestionV2 import FlexibleMembershipIngestion

# Create instance
db_config = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

ingestion = FlexibleMembershipIngestion('docs', db_config, use_optimized=True)

# Load the Excel file
df = pd.read_excel('docs/New_North West_combined_output.xlsx')
print(f"Loaded {len(df):,} records")

# Get first row
first_row = df.iloc[0]

# Process cell number
cell_num = ingestion.format_cell_number(first_row['Cell Number'])
print(f"\nCell Number from Excel: {first_row['Cell Number']} (type: {type(first_row['Cell Number'])})")
print(f"After format_cell_number: {cell_num} (type: {type(cell_num)})")

# Apply to DataFrame
df['cell_number'] = df['Cell Number'].apply(ingestion.format_cell_number)
print(f"\nIn DataFrame: {df['cell_number'].iloc[0]} (type: {type(df['cell_number'].iloc[0])})")

# Force to object type
df['cell_number'] = df['cell_number'].astype('object')
print(f"After astype('object'): {df['cell_number'].iloc[0]} (type: {type(df['cell_number'].iloc[0])})")

# Check ward code
df['ward_code'] = df['Ward'].apply(lambda x: str(int(x)) if pd.notna(x) else None)
print(f"\nWard code: {df['ward_code'].iloc[0]} (type: {type(df['ward_code'].iloc[0])})")

# Check ID number
df['ID Number'] = df['ID Number'].apply(ingestion.normalize_id_number)
print(f"ID Number: {df['ID Number'].iloc[0]} (type: {type(df['ID Number'].iloc[0])})")

ingestion.close()

