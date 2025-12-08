#!/usr/bin/env python3
"""
Test the bulk upload processor configuration
"""

import sys
import os

# Add backend/python to path
backend_python_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', 'python')
sys.path.insert(0, backend_python_path)

print("=" * 120)
print("TESTING BULK UPLOAD PROCESSOR CONFIGURATION")
print("=" * 120)
print()

# Import config
from config import DB_CONFIG, UPLOAD_DIR, WEBSOCKET_URL, PROCESSING_INTERVAL

print("1. Configuration Values:")
print("-" * 120)
print(f"   Database: {DB_CONFIG['user']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
print(f"   WebSocket: {WEBSOCKET_URL}")
print(f"   Upload Dir: {UPLOAD_DIR}")
print(f"   Interval: {PROCESSING_INTERVAL}s")
print()

# Check if upload directory exists
print("2. Upload Directory Check:")
print("-" * 120)
if os.path.exists(UPLOAD_DIR):
    print(f"   ✅ Directory exists: {UPLOAD_DIR}")
    
    # List files in directory
    files = [f for f in os.listdir(UPLOAD_DIR) if os.path.isfile(os.path.join(UPLOAD_DIR, f))]
    print(f"   Files in directory: {len(files)}")
    
    if files:
        print()
        print("   Files:")
        for f in files:
            file_path = os.path.join(UPLOAD_DIR, f)
            size_kb = os.path.getsize(file_path) / 1024
            print(f"      - {f} ({size_kb:.2f} KB)")
else:
    print(f"   ❌ Directory does NOT exist: {UPLOAD_DIR}")
    print()
    print("   Creating directory...")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    print(f"   ✅ Directory created: {UPLOAD_DIR}")

print()

# Check database connection
print("3. Database Connection Check:")
print("-" * 120)
try:
    import psycopg2
    conn = psycopg2.connect(**DB_CONFIG)
    print("   ✅ Database connection successful")
    
    # Check for pending files
    cur = conn.cursor()
    cur.execute("""
        SELECT file_id, filename, original_filename, file_path, status
        FROM uploaded_files
        WHERE status = 'pending'
        ORDER BY upload_timestamp DESC
        LIMIT 5
    """)
    
    pending_files = cur.fetchall()
    
    if pending_files:
        print(f"   ⚠️  Found {len(pending_files)} pending file(s) in database:")
        print()
        for file_id, filename, original_filename, file_path, status in pending_files:
            print(f"      ID: {file_id}")
            print(f"      Filename: {filename}")
            print(f"      Original: {original_filename}")
            print(f"      Path: {file_path}")
            print(f"      Status: {status}")
            
            # Check if file exists
            if os.path.exists(file_path):
                print(f"      ✅ File exists at path")
            else:
                print(f"      ❌ File NOT found at path")
                
                # Check if it's in the upload directory
                expected_path = os.path.join(UPLOAD_DIR, filename)
                if os.path.exists(expected_path):
                    print(f"      ✅ Found in upload directory: {expected_path}")
                else:
                    print(f"      ❌ Not found in upload directory either")
            print()
    else:
        print("   ℹ️  No pending files in database")
    
    # Check all files
    cur.execute("""
        SELECT COUNT(*), status
        FROM uploaded_files
        GROUP BY status
        ORDER BY status
    """)
    
    status_counts = cur.fetchall()
    
    if status_counts:
        print()
        print("   File status summary:")
        for count, status in status_counts:
            print(f"      {status}: {count}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"   ❌ Database connection failed: {e}")

print()

# Check WebSocket URL
print("4. WebSocket Configuration:")
print("-" * 120)
print(f"   WebSocket URL: {WEBSOCKET_URL}")
print(f"   ℹ️  Make sure the backend server is running on this URL")
print()

# Summary
print("=" * 120)
print("SUMMARY")
print("=" * 120)
print()

if os.path.exists(UPLOAD_DIR):
    print("✅ Upload directory is configured correctly")
else:
    print("❌ Upload directory does not exist")

print()
print("Next steps:")
print("  1. Make sure backend server is running (for WebSocket)")
print("  2. Run: python backend/python/bulk_upload_processor.py")
print("  3. Upload a test file from the frontend")
print("  4. Watch the processor logs for activity")
print()

