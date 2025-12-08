"""
Test IEC verification with debug output
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from iec_verification_module import IECVerifier
import pandas as pd

file_path = r"c:\Development\NewProj\Membership-newV2\reports\Copy of 2nd Matjhabeng Ward 11 Duplicates 14.11.2025(1).xlsx"

print("Loading Excel file...")
df = pd.read_excel(file_path)

print(f"Loaded {len(df)} records")
print(f"Columns: {list(df.columns)}")

print("\nStarting IEC verification...")
verifier = IECVerifier(max_workers=15)
verified_df, report = verifier.verify_dataframe(df)

print("\n" + "="*80)
print("FINAL REPORT")
print("="*80)
print(f"Total records: {report['total_records']}")
print(f"Verified count: {report['verified_count']}")
print(f"Registered in ward: {report['registered_in_ward']}")
print(f"Different ward: {report['different_ward']}")
print(f"Not registered: {report['not_registered']}")
print(f"Deceased: {report['deceased']}")
print(f"API errors: {report['api_errors']}")

# Show sample of results
print("\n" + "="*80)
print("SAMPLE RESULTS (first 10 verified records)")
print("="*80)
sample = verified_df[verified_df['iec_verification_status'].notna()][['ID Number', 'Ward', 'iec_ward', 'iec_verification_status', 'VD Number']].head(10)
print(sample.to_string(index=False))

