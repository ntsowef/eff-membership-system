"""
Test script for IEC Verification Integration
Tests the integration between IEC verification and membership ingestion
"""

import sys
import os
import pandas as pd
from pathlib import Path

# Add backend/python to path
backend_python_path = Path(__file__).parent.parent / 'backend' / 'python'
sys.path.insert(0, str(backend_python_path))

print(f"📂 Python path: {backend_python_path}")

# Test imports
print("\n🔍 Testing imports...")

try:
    from iec_verification_module import IECVerifier, IECVerificationError
    print("✅ IECVerifier imported successfully")
except ImportError as e:
    print(f"❌ Failed to import IECVerifier: {e}")
    sys.exit(1)

try:
    from flexible_membership_ingestionV2 import FlexibleMembershipIngestion
    print("✅ FlexibleMembershipIngestion imported successfully")
except ImportError as e:
    print(f"❌ Failed to import FlexibleMembershipIngestion: {e}")
    sys.exit(1)

# Create test data
print("\n📝 Creating test data...")

test_data = {
    'ID Number': [
        '8001015800080',  # Valid ID
        '9002025900090',  # Valid ID
        '7503035700070',  # Valid ID
        '1234567890123',  # Invalid/test ID
        '9876543210987',  # Invalid/test ID
    ],
    'First Name': ['John', 'Jane', 'Bob', 'Alice', 'Charlie'],
    'Surname': ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown'],
    'Ward Number': ['1', '1', '2', '1', '2'],
    'Cell Number': ['0821234567', '0829876543', '0837654321', '0841234567', '0859876543'],
}

df = pd.DataFrame(test_data)
print(f"✅ Created test DataFrame with {len(df)} records")
print(df)

# Test IEC Verification
print("\n🔍 Testing IEC Verification...")

try:
    verifier = IECVerifier(max_workers=5)  # Use fewer workers for testing
    print("✅ IECVerifier initialized")
    
    print("\n📡 Connecting to IEC API...")
    token = verifier.get_access_token()
    print(f"✅ IEC API token obtained: {token[:20]}...")
    
    print("\n🔄 Verifying test data...")
    verified_df, report = verifier.verify_dataframe(df, id_column='ID Number', ward_column='Ward Number')
    
    print("\n📊 Verification Report:")
    print(f"   Total records: {report['total_records']}")
    print(f"   Verified: {report['verified_count']}")
    print(f"   Registered in ward: {report['registered_in_ward']}")
    print(f"   Not registered: {report['not_registered']}")
    print(f"   Different ward: {report['different_ward']}")
    print(f"   Deceased: {report['deceased']}")
    print(f"   API errors: {report['api_errors']}")
    print(f"   Success: {report['success']}")
    
    if report['errors']:
        print(f"\n⚠️  Errors:")
        for error in report['errors']:
            print(f"   - {error}")
    
    print("\n📋 Verified DataFrame (with user-friendly columns):")
    display_columns = ['ID Number', 'First Name', 'Surname', 'VD Number', 'VOTER STATUS', 'iec_ward']
    print(verified_df[display_columns])
    
    # Save verified data
    output_file = Path(__file__).parent / 'test_iec_verified.xlsx'
    verified_df.to_excel(output_file, index=False)
    print(f"\n💾 Verified data saved to: {output_file}")
    
    print("\n✅ IEC Verification test completed successfully!")
    
except IECVerificationError as e:
    print(f"\n❌ IEC Verification Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test workflow simulation
print("\n" + "="*60)
print("🔄 Simulating Full Workflow")
print("="*60)

print("\n1️⃣  Step 1: IEC Verification")
print("   Status: ✅ Completed (see above)")

print("\n2️⃣  Step 2: Database Ingestion")
print("   Status: ⏭️  Skipped (requires database connection)")
print("   Note: In production, verified_df would be passed to FlexibleMembershipIngestion")

print("\n" + "="*60)
print("✅ Integration Test Completed Successfully!")
print("="*60)

print("\n📋 Summary:")
print(f"   ✅ IEC verification module working")
print(f"   ✅ IEC API connection successful")
print(f"   ✅ DataFrame verification working")
print(f"   ✅ Verification report generated")
print(f"   ✅ Verified data saved")

print("\n🎯 Next Steps:")
print("   1. Review verified data in: test/test_iec_verified.xlsx")
print("   2. Check verification status for each record")
print("   3. Test with real membership data")
print("   4. Monitor bulk upload processor logs")

print("\n💡 To test full integration:")
print("   1. Start the bulk upload processor: python backend/python/bulk_upload_processor.py")
print("   2. Upload an Excel file through the web interface")
print("   3. Monitor logs for IEC verification progress")
print("   4. Verify data in database after successful ingestion")

