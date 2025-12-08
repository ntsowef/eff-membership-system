#!/usr/bin/env python3
"""
Comprehensive analysis of VD NUMBER handling in the ingestion script
"""

import pandas as pd
import psycopg2
import sys
sys.path.insert(0, '.')

from flexible_membership_ingestionV2 import FlexibleMembershipIngestion, SPECIAL_VD_CODES

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

print("=" * 100)
print("VD NUMBER HANDLING ANALYSIS")
print("=" * 100)

# 1. Analyze Excel file
print("\n[STEP 1] Analyzing Excel File")
print("-" * 100)

df = pd.read_excel('uploads/FransTest_unique.xlsx')
print(f"Total records: {len(df)}")

if 'VD NUMBER' in df.columns:
    print(f"\nVD NUMBER column found!")
    print(f"Unique VD NUMBERs: {df['VD NUMBER'].nunique()}")
    print(f"Null/NaN values: {df['VD NUMBER'].isna().sum()}")
    
    print("\nVD NUMBER value distribution:")
    print(df['VD NUMBER'].value_counts().head(20))
    
    print("\nSample records with VD NUMBER:")
    print(df[['ID Number', 'VD NUMBER', 'Ward']].head(10).to_string())
else:
    print("❌ VD NUMBER column NOT found in Excel file!")
    print(f"Available columns: {df.columns.tolist()}")

# 2. Check special VD codes
print("\n" + "=" * 100)
print("[STEP 2] Special VD Codes Configuration")
print("-" * 100)

print("Special VD codes that should NOT be stored in voting_district_code:")
for code, description in SPECIAL_VD_CODES.items():
    print(f"  {code}: {description}")

# 3. Initialize ingestion and check VD code cache
print("\n" + "=" * 100)
print("[STEP 3] Database VD Code Validation")
print("-" * 100)

ingestion = FlexibleMembershipIngestion(
    docs_directory='uploads',
    db_config=DB_CONFIG,
    use_optimized=True,
    archive_enabled=False
)

print(f"\nTotal valid VD codes in database: {len(ingestion.valid_vd_codes)}")
print(f"Sample valid VD codes: {list(ingestion.valid_vd_codes)[:10]}")

# 4. Test VD NUMBER processing
print("\n" + "=" * 100)
print("[STEP 4] Testing VD NUMBER Processing Logic")
print("-" * 100)

if 'VD NUMBER' in df.columns:
    # Get unique VD numbers from Excel
    unique_vds = df['VD NUMBER'].dropna().unique()
    
    print(f"\nProcessing {len(unique_vds)} unique VD numbers from Excel:\n")
    print(f"{'Excel VD':<15} | {'Processed':<15} | {'In DB?':<8} | {'Special?':<10} | {'Final voting_district_code':<30}")
    print("-" * 100)
    
    for vd in unique_vds[:20]:  # Show first 20
        processed = ingestion.process_vd_number(vd)
        in_db = processed in ingestion.valid_vd_codes if processed else False
        is_special = processed in SPECIAL_VD_CODES if processed else False
        
        # Determine final voting_district_code value
        if not processed or is_special:
            final_vdc = "NULL (special or invalid)"
        elif in_db:
            final_vdc = processed
        else:
            final_vdc = "NULL (not in DB)"
        
        print(f"{str(vd):<15} | {str(processed):<15} | {'YES' if in_db else 'NO':<8} | {'YES' if is_special else 'NO':<10} | {final_vdc:<30}")

# 5. Check database records
print("\n" + "=" * 100)
print("[STEP 5] Checking Database Records")
print("-" * 100)

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

# Get recent records with VD information
from datetime import datetime, timedelta
cutoff = datetime.now() - timedelta(minutes=10)

cur.execute("""
    SELECT 
        id_number,
        voter_district_code,
        voting_district_code,
        ward_code
    FROM members_consolidated
    WHERE updated_at > %s
    ORDER BY id_number
    LIMIT 30
""", (cutoff,))

results = cur.fetchall()

if results:
    print(f"\nFound {len(results)} recent records:")
    print(f"\n{'ID Number':<15} | {'voter_district_code':<20} | {'voting_district_code':<20} | {'ward_code':<15}")
    print("-" * 80)
    
    for row in results:
        vdc = row[1] if row[1] else "NULL"
        vdc2 = row[2] if row[2] else "NULL"
        ward = row[3] if row[3] else "NULL"
        print(f"{row[0]:<15} | {vdc:<20} | {vdc2:<20} | {ward:<15}")
    
    # Summary
    print("\n" + "=" * 100)
    print("SUMMARY")
    print("=" * 100)
    
    cur.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(voter_district_code) as has_voter_district_code,
            COUNT(voting_district_code) as has_voting_district_code
        FROM members_consolidated
        WHERE updated_at > %s
    """, (cutoff,))
    
    summary = cur.fetchone()
    print(f"\nTotal records: {summary[0]}")
    print(f"Records with voter_district_code: {summary[1]} ({summary[1]/summary[0]*100:.1f}%)")
    print(f"Records with voting_district_code: {summary[2]} ({summary[2]/summary[0]*100:.1f}%)")
else:
    print("\n❌ No recent records found. Run the ingestion test first.")

conn.close()

# 6. Recommendations
print("\n" + "=" * 100)
print("ANALYSIS COMPLETE")
print("=" * 100)

print("\nKey Points:")
print("1. voter_district_code: Stores ALL VD numbers from Excel (including special codes)")
print("2. voting_district_code: Stores ONLY valid VD codes that exist in the database")
print("3. Special codes (00000000, 22222222, 11111111, 99999999) are stored in voter_district_code but NOT in voting_district_code")
print("4. This design allows tracking of special statuses while maintaining referential integrity")

