"""
Analyze the ward comparison issue in detail
"""
import pandas as pd

file_path = r"c:\Development\NewProj\Membership-newV2\reports\Copy of 2nd Matjhabeng Ward 11 Duplicates 14.11.2025(1)_verified.xlsx"

df = pd.read_excel(file_path)

print("="*80)
print("DETAILED WARD ANALYSIS")
print("="*80)

# Get a sample record
sample = df.iloc[0]

print(f"\nSample Record (first row):")
print(f"  Excel Ward: {sample['Ward']} (type: {type(sample['Ward'])})")
print(f"  IEC Ward: {sample['iec_ward']} (type: {type(sample['iec_ward'])})")
print(f"  Status: {sample['iec_verification_status']}")
print(f"  Voter Status: {sample['VOTER STATUS']}")

# Test the comparison logic
excel_ward = sample['Ward']
iec_ward = sample['iec_ward']

print(f"\nComparison Tests:")
print(f"  1. Direct comparison: {excel_ward} == {iec_ward} = {excel_ward == iec_ward}")
print(f"  2. String comparison: '{str(excel_ward)}' == '{str(iec_ward)}' = {str(excel_ward) == str(iec_ward)}")

# Convert to int string (like in the code)
try:
    excel_ward_str = str(int(float(excel_ward)))
    iec_ward_str = str(int(float(iec_ward)))
    print(f"  3. Int string comparison: '{excel_ward_str}' == '{iec_ward_str}' = {excel_ward_str == iec_ward_str}")
except Exception as e:
    print(f"  3. Int string comparison failed: {e}")

# Check all records
print(f"\n\nAnalyzing all {len(df)} records:")

# Count ward matches using different methods
direct_match = (df['Ward'] == df['iec_ward']).sum()
str_match = (df['Ward'].astype(str) == df['iec_ward'].astype(str)).sum()

# Int match (handle NaN)
def safe_int_str(x):
    try:
        if pd.notna(x):
            return str(int(float(x)))
        return None
    except:
        return None

df['ward_int_str'] = df['Ward'].apply(safe_int_str)
df['iec_ward_int_str'] = df['iec_ward'].apply(safe_int_str)
int_str_match = ((df['ward_int_str'].notna()) & (df['iec_ward_int_str'].notna()) & (df['ward_int_str'] == df['iec_ward_int_str'])).sum()

print(f"  Direct comparison matches: {direct_match}")
print(f"  String comparison matches: {str_match}")
print(f"  Int string comparison matches: {int_str_match}")

# Show examples where they don't match
print(f"\n\nRecords where wards DON'T match (first 10):")
mismatches = df[(df['Ward'].notna()) & (df['iec_ward'].notna()) & (df['ward_int_str'] != df['iec_ward_int_str'])]
if len(mismatches) > 0:
    print(mismatches[['ID Number', 'Ward', 'iec_ward', 'ward_int_str', 'iec_ward_int_str', 'iec_verification_status']].head(10).to_string(index=False))
else:
    print("  No mismatches found!")

# Show the status distribution
print(f"\n\nStatus Distribution:")
print(df['iec_verification_status'].value_counts())

print(f"\n\n🤔 CONCLUSION:")
if int_str_match == len(df[df['iec_ward'].notna()]):
    print(f"  ALL wards match when compared as int strings!")
    print(f"  The 'DIFFERENT_WARD' status is INCORRECT - they should be 'REGISTERED_IN_WARD'")
else:
    print(f"  {int_str_match} wards match, {len(df[df['iec_ward'].notna()]) - int_str_match} don't match")

