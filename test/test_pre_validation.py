#!/usr/bin/env python3
"""
Test script for pre-validation functionality
Tests ID validation, duplicate detection, and existing member checks
"""

import sys
import os

# Add backend/python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend', 'python'))

import pandas as pd
from upload_validation_utils import validate_sa_id_number, normalize_id_number, detect_duplicates_in_dataframe
from pre_validation_processor import PreValidationProcessor

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'eff_membership_database',
    'user': 'eff_admin',
    'password': 'Frames!123'
}

def test_id_validation():
    """Test South African ID number validation"""
    print("=" * 80)
    print("TEST 1: ID NUMBER VALIDATION")
    print("=" * 80)
    
    test_cases = [
        ("7001015800089", True, "Valid ID"),
        ("7912200800082", True, "Valid ID"),
        ("1234567890123", False, "Invalid checksum"),
        ("9913310800089", False, "Invalid date (99 month)"),
        ("7000000800089", False, "Invalid date (00 day)"),
        ("12345", False, "Too short"),
        ("12345678901234", False, "Too long"),
        ("abcd567890123", False, "Contains letters"),
    ]
    
    for id_num, expected_valid, description in test_cases:
        is_valid, error_msg = validate_sa_id_number(id_num)
        status = "✅" if is_valid == expected_valid else "❌"
        print(f"{status} {id_num}: {description}")
        if not is_valid:
            print(f"   Error: {error_msg}")
    
    print()

def test_duplicate_detection():
    """Test duplicate detection within dataframe"""
    print("=" * 80)
    print("TEST 2: DUPLICATE DETECTION")
    print("=" * 80)
    
    # Create test dataframe with duplicates
    data = {
        'ID Number': [
            '7001015800089',
            '7912200800082',
            '7001015800089',  # Duplicate
            '8001015800089',
            '7912200800082',  # Duplicate
            '9001015800089'
        ],
        'Name': ['John', 'Jane', 'John2', 'Bob', 'Jane2', 'Alice'],
        'Surname': ['Doe', 'Smith', 'Doe', 'Brown', 'Smith', 'Johnson']
    }
    
    df = pd.DataFrame(data)
    
    print(f"Total records: {len(df)}")
    
    result = detect_duplicates_in_dataframe(df, 'ID Number')
    
    print(f"✅ Unique IDs: {result['unique_count']}")
    print(f"⚠️  Duplicate IDs: {result['duplicate_count']}")
    print(f"⚠️  Total duplicate records: {result['total_duplicate_records']}")
    
    if result['duplicate_ids']:
        print(f"\nDuplicate ID numbers:")
        for dup_id in result['duplicate_ids']:
            print(f"  - {dup_id}")
    
    print()

def test_pre_validation_processor():
    """Test complete pre-validation processor"""
    print("=" * 80)
    print("TEST 3: PRE-VALIDATION PROCESSOR")
    print("=" * 80)
    
    # Create test dataframe with various issues
    data = {
        'ID Number': [
            '7001015800089',  # Valid, might exist in DB
            '7912200800082',  # Valid, might exist in DB
            '1234567890123',  # Invalid checksum
            '7001015800089',  # Duplicate
            '8001015800089',  # Valid, new
            '12345',          # Invalid length
            '9001015800089',  # Valid, new
        ],
        'Name': ['John', 'Jane', 'Invalid', 'John2', 'Bob', 'Short', 'Alice'],
        'Surname': ['Doe', 'Smith', 'ID', 'Doe', 'Brown', 'ID', 'Johnson']
    }
    
    df = pd.DataFrame(data)
    
    print(f"Input records: {len(df)}")
    
    try:
        processor = PreValidationProcessor(DB_CONFIG)
        result = processor.validate_dataframe(df)
        
        stats = result['validation_stats']
        
        print(f"\n📊 Validation Results:")
        print(f"  Total records: {stats['total_records']}")
        print(f"  Valid IDs: {stats['valid_ids']}")
        print(f"  Invalid IDs: {stats['invalid_ids']}")
        print(f"  Unique records: {stats['unique_records']}")
        print(f"  Duplicates: {stats['duplicates']}")
        print(f"  Existing members: {stats['existing_members']}")
        print(f"  New members: {stats['new_members']}")
        
        print(f"\n❌ Invalid IDs ({len(result['invalid_ids'])}):")
        for invalid in result['invalid_ids'][:5]:  # Show first 5
            print(f"  Row {invalid['row_number']}: {invalid['id_number']} - {invalid['error']}")
        
        print(f"\n⚠️  Duplicates ({len(result['duplicates'])}):")
        for dup in result['duplicates'][:5]:  # Show first 5
            print(f"  {dup.get('ID Number', 'N/A')}: {dup.get('Name', '')} {dup.get('Surname', '')}")
        
        print(f"\n👥 Existing Members ({len(result['existing_members'])}):")
        for existing in result['existing_members'][:5]:  # Show first 5
            print(f"  {existing.get('ID Number', 'N/A')}: {existing.get('Name', '')} {existing.get('Surname', '')}")
        
        print(f"\n👤 New Members ({len(result['new_members'])}):")
        for new in result['new_members'][:5]:  # Show first 5
            print(f"  {new.get('ID Number', 'N/A')}: {new.get('Name', '')} {new.get('Surname', '')}")
        
        print(f"\n✅ Valid records for processing: {len(result['valid_df'])}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print()

if __name__ == '__main__':
    print("\n🧪 PRE-VALIDATION TEST SUITE\n")
    
    test_id_validation()
    test_duplicate_detection()
    test_pre_validation_processor()
    
    print("=" * 80)
    print("✅ ALL TESTS COMPLETE")
    print("=" * 80)

