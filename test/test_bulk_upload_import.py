#!/usr/bin/env python3
"""
Test that bulk_upload_processor.py can correctly import flexible_membership_ingestionV2.py

This verifies the path resolution fix.
"""

import sys
import os

print("=" * 120)
print("TESTING BULK UPLOAD PROCESSOR IMPORT PATH")
print("=" * 120)

# Simulate the path resolution that bulk_upload_processor.py does
print("\n1. Simulating path resolution from bulk_upload_processor.py:")
print("-" * 120)

# Pretend we're at backend/python/bulk_upload_processor.py
fake_file_path = os.path.join(os.getcwd(), 'backend', 'python', 'bulk_upload_processor.py')
print(f"   Simulated __file__: {fake_file_path}")

# Calculate repo root (go up 2 levels)
repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(fake_file_path))))
print(f"   Calculated repo root: {repo_root}")

# Check if flexible_membership_ingestionV2.py exists
ingestion_script_path = os.path.join(repo_root, 'flexible_membership_ingestionV2.py')
print(f"   Looking for: {ingestion_script_path}")

if os.path.exists(ingestion_script_path):
    print(f"   ✅ FOUND: flexible_membership_ingestionV2.py")
else:
    print(f"   ❌ NOT FOUND: flexible_membership_ingestionV2.py")
    print(f"\n   Files in repo root:")
    for f in sorted(os.listdir(repo_root)):
        if f.endswith('.py'):
            print(f"      - {f}")

print("\n2. Testing actual import:")
print("-" * 120)

# Add repo root to path
sys.path.insert(0, repo_root)

try:
    from flexible_membership_ingestionV2 import FlexibleMembershipIngestion
    print("   ✅ SUCCESS: Imported FlexibleMembershipIngestion")
    print(f"   Module location: {FlexibleMembershipIngestion.__module__}")
except ImportError as e:
    print(f"   ❌ FAILED: Could not import FlexibleMembershipIngestion")
    print(f"   Error: {e}")
    sys.exit(1)

print("\n3. Testing bulk_upload_processor.py import:")
print("-" * 120)

# Now test importing the bulk_upload_processor itself
backend_python_path = os.path.join(repo_root, 'backend', 'python')
sys.path.insert(0, backend_python_path)

try:
    # Just check if we can import it (don't run it)
    import bulk_upload_processor
    print("   ✅ SUCCESS: Imported bulk_upload_processor module")
    print(f"   Module location: {bulk_upload_processor.__file__}")
except ImportError as e:
    print(f"   ❌ FAILED: Could not import bulk_upload_processor")
    print(f"   Error: {e}")
    sys.exit(1)

print("\n4. Verifying BulkUploadProcessor class:")
print("-" * 120)

try:
    processor_class = bulk_upload_processor.BulkUploadProcessor
    print(f"   ✅ SUCCESS: Found BulkUploadProcessor class")
    print(f"   Class: {processor_class}")
    print(f"   Methods: {[m for m in dir(processor_class) if not m.startswith('_')]}")
except AttributeError as e:
    print(f"   ❌ FAILED: Could not find BulkUploadProcessor class")
    print(f"   Error: {e}")
    sys.exit(1)

print("\n" + "=" * 120)
print("✅ ALL IMPORT TESTS PASSED")
print("=" * 120)
print("\nThe bulk_upload_processor.py should now be able to import flexible_membership_ingestionV2.py")
print("when running from the frontend upload endpoint.")
print("\nNext steps:")
print("  1. Restart the bulk upload processor service")
print("  2. Test file upload from the frontend")
print("  3. Check the processor logs for successful import")

