"""
Test script to diagnose why Invalid IDs and Duplicates sheets are empty in Excel reports
"""
import sys
import os
import pandas as pd

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'python'))

from pre_validation_processor import PreValidationProcessor
from excel_report_generator import ExcelReportGenerator

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'eff_membership_database',
    'user': 'eff_admin',
    'password': 'Frames!123'
}

def test_report_with_sample_data():
    """Test report generation with sample data containing invalid IDs and duplicates"""
    
    print("=" * 80)
    print("TEST: Report Generation with Invalid IDs and Duplicates")
    print("=" * 80)
    
    # Create sample data with REAL valid South African ID numbers
    # Using known valid IDs with correct checksums
    sample_data = {
        'ID Number': [
            '9202204720082',  # Valid ID (1992-02-20, Female)
            '8801235111088',  # Valid ID (1988-01-23, Male)
            '9202204720082',  # Duplicate of row 1
            '1234567890123',  # Invalid (bad checksum)
            '7106245929086',  # Valid ID (1971-06-24, Male)
            '9202204720082',  # Duplicate of row 1 (again)
            'INVALID',        # Invalid (not a number)
        ],
        'Name': ['Thandi', 'Sipho', 'Thandi', 'Bob', 'Mandla', 'Thandi', 'Invalid'],
        'Surname': ['Dlamini', 'Nkosi', 'Dlamini', 'Jones', 'Zulu', 'Dlamini', 'Person'],
        'Cell Number': ['0821234567'] * 7,
        'Email': ['test@example.com'] * 7,
    }

    df = pd.DataFrame(sample_data)
    print(f"\n📊 Created sample DataFrame with {len(df)} rows")
    print(f"   - Expected invalid IDs: 2 (rows 4 and 7)")
    print(f"   - Expected duplicates: 3 (rows 1, 3, 6 all have same ID: 9202204720082)")
    
    # Step 1: Run pre-validation
    print("\n" + "=" * 80)
    print("STEP 1: Pre-Validation")
    print("=" * 80)
    
    validator = PreValidationProcessor(DB_CONFIG)
    pre_validation_result = validator.validate_dataframe(df)
    
    # Check what's in the result
    print(f"\n✅ Pre-validation complete!")
    print(f"   Keys in result: {list(pre_validation_result.keys())}")
    
    invalid_ids = pre_validation_result.get('invalid_ids', [])
    duplicates = pre_validation_result.get('duplicates', [])
    
    print(f"\n📋 Invalid IDs:")
    print(f"   Type: {type(invalid_ids)}")
    print(f"   Count: {len(invalid_ids)}")
    if invalid_ids:
        print(f"   First record: {invalid_ids[0]}")
        print(f"   Keys: {list(invalid_ids[0].keys())}")
    
    print(f"\n📋 Duplicates:")
    print(f"   Type: {type(duplicates)}")
    print(f"   Count: {len(duplicates)}")
    if duplicates:
        print(f"   First record: {duplicates[0]}")
        print(f"   Keys: {list(duplicates[0].keys())}")
    
    # Step 2: Generate report
    print("\n" + "=" * 80)
    print("STEP 2: Generate Excel Report")
    print("=" * 80)
    
    reports_dir = os.path.join(os.path.dirname(__file__), 'test_reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    generator = ExcelReportGenerator('test_file.xlsx', reports_dir)
    
    processing_stats = {
        'total_records': len(df),
        'valid_ids': len(df) - len(invalid_ids),
        'invalid_ids': len(invalid_ids),
        'duplicates': len(duplicates),
        'verified_count': 0,
        'registered_in_ward': 0,
        'different_ward': 0,
        'not_registered': 0,
        'deceased': 0,
        'api_errors': 0,
        'vd_populated': 0,
        'vd_empty': 0,
        'unique_ids': len(df) - len(duplicates),
        'duplicate_ids': len(duplicates),
        'duplicate_records': len(duplicates),
        'imported': 0,
        'skipped': 0,
        'existing_members': 0,
        'new_members': 0,
        'processing_time': 0,
        'processing_speed': 0,
        'status': 'Test'
    }
    
    print(f"\n📊 Generating report with:")
    print(f"   - Invalid IDs: {len(invalid_ids)} records")
    print(f"   - Duplicates: {len(duplicates)} records")
    
    report_path = generator.generate_report(
        df_original=df,
        df_verified=pd.DataFrame(),
        processing_stats=processing_stats,
        invalid_ids=invalid_ids,
        duplicates=duplicates,
        different_ward=[],
        not_registered=[],
        successfully_imported=[],
        existing_members=[]
    )
    
    print(f"\n✅ Report generated: {report_path}")
    
    # Step 3: Verify the report
    print("\n" + "=" * 80)
    print("STEP 3: Verify Report Contents")
    print("=" * 80)
    
    xl_file = pd.ExcelFile(report_path)
    print(f"\n📋 Sheets in report: {xl_file.sheet_names}")
    
    for sheet_name in ['Invalid IDs', 'Duplicates']:
        df_sheet = pd.read_excel(report_path, sheet_name=sheet_name)
        print(f"\n📄 Sheet '{sheet_name}':")
        print(f"   Rows: {len(df_sheet)}")
        print(f"   Columns: {list(df_sheet.columns)}")
        if len(df_sheet) > 0:
            print(f"   First row: {df_sheet.iloc[0].to_dict()}")
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == '__main__':
    test_report_with_sample_data()

