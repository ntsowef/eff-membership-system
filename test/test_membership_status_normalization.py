#!/usr/bin/env python3
"""
Test script to verify membership status normalization is working correctly
"""

import sys
import os
import pandas as pd

# Add parent directory to path to import the ingestion script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flexible_membership_ingestionV2 import FlexibleMembershipIngestion

def test_normalize_membership_status():
    """Test the normalize_membership_status method"""
    print("=" * 80)
    print("TESTING normalize_membership_status() METHOD")
    print("=" * 80)
    
    # Create a mock instance
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'user': 'eff_admin',
        'password': 'Frames!123',
        'database': 'eff_membership_database'
    }
    
    try:
        ingestion = FlexibleMembershipIngestion(
            docs_directory='uploads',
            db_config=db_config,
            use_optimized=True,
            archive_enabled=False
        )
        
        # Test cases
        test_cases = [
            # (input_value, expected_output)
            ('Invalid', 'Inactive'),
            ('Active', 'Active'),
            ('Expired', 'Expired'),
            ('Suspended', 'Suspended'),
            ('Cancelled', 'Cancelled'),
            ('Pending', 'Pending'),
            ('Inactive', 'Inactive'),
            ('Grace Period', 'Grace Period'),
            ('Good Standing', 'Good Standing'),
            ('Good', 'Good Standing'),
            ('Unknown Status', 'Good Standing'),
            (None, None),
            ('', None),
        ]
        
        print("\nTest Results:")
        print(f"{'Input Value':<25} | {'Expected':<25} | {'Actual':<25} | {'Status':<10}")
        print("-" * 90)
        
        all_passed = True
        for input_val, expected in test_cases:
            actual = ingestion.normalize_membership_status(input_val)
            status = "✅ PASS" if actual == expected else "❌ FAIL"
            if actual != expected:
                all_passed = False
            
            input_display = str(input_val) if input_val is not None else "None"
            expected_display = str(expected) if expected is not None else "None"
            actual_display = str(actual) if actual is not None else "None"
            
            print(f"{input_display:<25} | {expected_display:<25} | {actual_display:<25} | {status:<10}")
        
        print("\n" + "=" * 80)
        if all_passed:
            print("✅ ALL TESTS PASSED")
        else:
            print("❌ SOME TESTS FAILED")
        print("=" * 80)
        
        # Close connection
        if ingestion.connection:
            ingestion.connection.close()
        
        return all_passed
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_with_excel_file():
    """Test with actual Excel file data"""
    print("\n" + "=" * 80)
    print("TESTING WITH ACTUAL EXCEL FILE")
    print("=" * 80)
    
    excel_file = 'uploads/FransTest.xlsx'
    
    if not os.path.exists(excel_file):
        print(f"❌ Test file not found: {excel_file}")
        return False
    
    try:
        df = pd.read_excel(excel_file)
        
        if 'Status' not in df.columns:
            print("❌ 'Status' column not found in Excel file")
            return False
        
        # Create mock instance
        db_config = {
            'host': 'localhost',
            'port': 5432,
            'user': 'eff_admin',
            'password': 'Frames!123',
            'database': 'eff_membership_database'
        }
        
        ingestion = FlexibleMembershipIngestion(
            docs_directory='uploads',
            db_config=db_config,
            use_optimized=True,
            archive_enabled=False
        )
        
        # Apply normalization
        df['membership_status_normalized'] = df['Status'].apply(ingestion.normalize_membership_status)
        
        # Show results
        print("\nNormalization Results:")
        print(f"{'Original Value':<25} | {'Normalized Value':<25} | {'Count':<10}")
        print("-" * 65)
        
        grouped = df.groupby(['Status', 'membership_status_normalized']).size().reset_index(name='count')
        for _, row in grouped.iterrows():
            print(f"{row['Status']:<25} | {row['membership_status_normalized']:<25} | {row['count']:<10}")
        
        # Verify expected mappings
        print("\n" + "=" * 80)
        print("VERIFICATION")
        print("=" * 80)
        
        expected_mappings = {
            'Invalid': 'Inactive'
        }
        
        all_correct = True
        for original, expected in expected_mappings.items():
            actual = df[df['Status'] == original]['membership_status_normalized'].iloc[0] if len(df[df['Status'] == original]) > 0 else None
            status = "✅ CORRECT" if actual == expected else "❌ INCORRECT"
            if actual != expected:
                all_correct = False
            print(f"{original:<25} → {expected:<25} : {status}")
        
        print("\n" + "=" * 80)
        if all_correct:
            print("✅ ALL MAPPINGS CORRECT")
        else:
            print("❌ SOME MAPPINGS INCORRECT")
        print("=" * 80)
        
        # Close connection
        if ingestion.connection:
            ingestion.connection.close()
        
        return all_correct
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("\n" + "=" * 80)
    print("MEMBERSHIP STATUS NORMALIZATION TEST SUITE")
    print("=" * 80)
    
    # Test 1: Method testing
    test1_passed = test_normalize_membership_status()
    
    # Test 2: Excel file testing
    test2_passed = test_with_excel_file()
    
    # Final summary
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)
    print(f"Method Test: {'✅ PASSED' if test1_passed else '❌ FAILED'}")
    print(f"Excel File Test: {'✅ PASSED' if test2_passed else '❌ FAILED'}")
    print("=" * 80)
    
    if test1_passed and test2_passed:
        print("\n✅ ALL TESTS PASSED - Membership status normalization is working correctly!")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED - Please review the results above")
        sys.exit(1)

