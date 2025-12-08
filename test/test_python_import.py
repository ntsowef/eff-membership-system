"""
Test if Python script can import flexible_membership_ingestionV2 from repo root
"""
import sys
import os

# Change to repository root (same as what Node.js will do)
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(repo_root)
print(f"Working directory: {os.getcwd()}")

# Add both repo root and backend/python to path
sys.path.insert(0, repo_root)  # For flexible_membership_ingestionV2.py
sys.path.insert(0, os.path.join(repo_root, 'backend', 'python'))  # For other modules

try:
    from flexible_membership_ingestionV2 import FlexibleMembershipIngestion
    print("✅ Successfully imported FlexibleMembershipIngestion")
    print(f"   Class: {FlexibleMembershipIngestion}")
except ImportError as e:
    print(f"❌ Failed to import: {e}")
    import traceback
    traceback.print_exc()

