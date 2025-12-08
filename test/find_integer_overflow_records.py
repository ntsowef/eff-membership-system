#!/usr/bin/env python3
"""Find records with integer values exceeding PostgreSQL INTEGER limit"""

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
print(f"Loaded {len(df):,} records\n")

# Process the data (same as in the ingestion script)
df = df.dropna(subset=['ID Number'])
df['ID Number'] = df['ID Number'].apply(ingestion.normalize_id_number)
df = df[df['ID Number'].notna()]

# Process all the integer columns
df['gender_id'] = df['Gender'].apply(lambda x: ingestion.lookup_id('genders', x) or 1) if 'Gender' in df.columns else 1
df['race_id'] = df['Race'].apply(lambda x: ingestion.lookup_id('races', x) or 1) if 'Race' in df.columns else 1
df['citizenship_id'] = df['Citizenship'].apply(lambda x: ingestion.lookup_id('citizenships', x) or 1) if 'Citizenship' in df.columns else 1
df['language_id'] = df['Language'].apply(lambda x: ingestion.lookup_id('languages', x) or 1) if 'Language' in df.columns else 1
df['occupation_id'] = df['Occupation'].apply(lambda x: ingestion.lookup_id('occupations', x) or 1) if 'Occupation' in df.columns else 1
df['qualification_id'] = df['Qualification'].apply(lambda x: ingestion.lookup_id('qualifications', x) or 1) if 'Qualification' in df.columns else 1

voter_status_col = 'VOTER STATUS' if 'VOTER STATUS' in df.columns else ('Voter Status' if 'Voter Status' in df.columns else None)
if voter_status_col:
    df['voter_status_normalized'] = df[voter_status_col].apply(ingestion.normalize_voter_status)
    df['voter_status_id'] = df['voter_status_normalized'].apply(lambda x: ingestion.lookup_id('voter_statuses', x) or 1)
else:
    df['voter_status_id'] = 1

if 'Status' in df.columns:
    df['excel_status'] = df['Status'].apply(lambda x: str(x).strip() if pd.notna(x) else 'Good Standing')
    df['membership_status_normalized'] = df['excel_status'].apply(ingestion.normalize_membership_status)
    df['status_id'] = df['membership_status_normalized'].apply(lambda x: ingestion.lookup_id('membership_statuses', x) or 1)
else:
    df['excel_status'] = 'Good Standing'
    df['status_id'] = 8

df['subscription_type'] = df['Subscription'].apply(lambda x: str(x).strip() if pd.notna(x) else 'New') if 'Subscription' in df.columns else 'New'
df['subscription_type_id'] = df['subscription_type'].apply(lambda x: ingestion.lookup_id('subscription_types', x) or 1)

# Age
if 'Age' in df.columns:
    def safe_int_age(x):
        try:
            if pd.isna(x) or x == '':
                return None
            return int(float(x))
        except:
            return None
    df['age'] = df['Age'].apply(safe_int_age)
else:
    df['age'] = None

# Check for integer overflow in all integer columns
INTEGER_MAX = 2147483647
integer_columns = ['age', 'gender_id', 'race_id', 'citizenship_id', 'language_id', 
                   'occupation_id', 'qualification_id', 'voter_status_id', 
                   'subscription_type_id', 'status_id']

print("Checking for integer overflow in INTEGER columns...")
print("=" * 80)

for col in integer_columns:
    if col in df.columns:
        # Check for values exceeding INTEGER_MAX
        overflow_mask = df[col].notna() & (df[col] > INTEGER_MAX)
        overflow_count = overflow_mask.sum()
        
        if overflow_count > 0:
            print(f"\n❌ {col}: {overflow_count:,} values exceed INTEGER limit!")
            print(f"   Sample overflow values: {df[overflow_mask][col].head(10).tolist()}")
            print(f"   Max value: {df[col].max():,}")
        else:
            max_val = df[col].max() if df[col].notna().any() else None
            print(f"✓ {col}: OK (max={max_val})")

print("\n" + "=" * 80)
ingestion.close()

