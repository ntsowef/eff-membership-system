"""
Quick script to check the verified Excel file
"""
import pandas as pd
import sys

file_path = r"c:\Development\NewProj\Membership-newV2\reports\Copy of 2nd Matjhabeng Ward 11 Duplicates 14.11.2025(1)_verified.xlsx"

try:
    df = pd.read_excel(file_path)
    
    print("="*80)
    print("VERIFIED FILE ANALYSIS")
    print("="*80)
    print(f"\nTotal records: {len(df)}")
    print(f"\nColumns in file: {list(df.columns)}")
    
    # Check VD Number column
    if 'VD Number' in df.columns:
        vd_populated = df['VD Number'].notna().sum()
        vd_empty = df['VD Number'].isna().sum()
        print(f"\n📍 VD Number Statistics:")
        print(f"  Populated: {vd_populated} ({vd_populated/len(df)*100:.1f}%)")
        print(f"  Empty: {vd_empty} ({vd_empty/len(df)*100:.1f}%)")
        
        # Show sample VD numbers
        print(f"\n📋 Sample VD Numbers (first 20 non-empty):")
        sample = df[df['VD Number'].notna()][['ID Number', 'Ward', 'VD Number', 'VOTER STATUS', 'iec_ward']].head(20)
        print(sample.to_string(index=False))
        
        # Check for empty VD numbers
        print(f"\n❌ Records with empty VD Numbers (first 10):")
        empty_sample = df[df['VD Number'].isna()][['ID Number', 'Ward', 'VOTER STATUS']].head(10)
        print(empty_sample.to_string(index=False))
    
    # Check VOTER STATUS distribution
    if 'VOTER STATUS' in df.columns:
        print(f"\n📊 Voter Status Distribution:")
        status_counts = df['VOTER STATUS'].value_counts()
        for status, count in status_counts.items():
            print(f"  {status}: {count} ({count/len(df)*100:.1f}%)")
    
    # Check iec_verification_status
    if 'iec_verification_status' in df.columns:
        print(f"\n🔍 IEC Verification Status Distribution:")
        iec_status_counts = df['iec_verification_status'].value_counts()
        for status, count in iec_status_counts.items():
            print(f"  {status}: {count} ({count/len(df)*100:.1f}%)")
    
    # Check ward information
    if 'Ward' in df.columns and 'iec_ward' in df.columns:
        print(f"\n🏘️ Ward Comparison:")
        ward_match = (df['Ward'].astype(str) == df['iec_ward'].astype(str)).sum()
        ward_mismatch = ((df['Ward'].notna()) & (df['iec_ward'].notna()) & (df['Ward'].astype(str) != df['iec_ward'].astype(str))).sum()
        print(f"  Matching wards: {ward_match}")
        print(f"  Mismatching wards: {ward_mismatch}")
        
        # Show examples of mismatches
        if ward_mismatch > 0:
            print(f"\n  Examples of ward mismatches (first 10):")
            mismatches = df[(df['Ward'].notna()) & (df['iec_ward'].notna()) & (df['Ward'].astype(str) != df['iec_ward'].astype(str))][['ID Number', 'Ward', 'iec_ward', 'VD Number']].head(10)
            print(mismatches.to_string(index=False))
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

