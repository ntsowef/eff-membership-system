#!/usr/bin/env python3
"""
Create a test pending file entry in the database
This simulates what happens when a file is uploaded from the frontend
"""

import sys
import os
import shutil

# Add backend/python to path
backend_python_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', 'python')
sys.path.insert(0, backend_python_path)

from config import DB_CONFIG, UPLOAD_DIR
import psycopg2

print("=" * 120)
print("CREATE TEST PENDING FILE")
print("=" * 120)
print()

# Check if there's a test file we can use
test_files = [
    'uploads/FransTest.xlsx',
    'uploads/Book1.xlsx',
    '_upload_file_directory/upload-1762723915622-961869459.xlsx'
]

source_file = None
for test_file in test_files:
    if os.path.exists(test_file):
        source_file = test_file
        break

if not source_file:
    print("❌ No test file found. Please place a test Excel file in one of these locations:")
    for f in test_files:
        print(f"   - {f}")
    sys.exit(1)

print(f"✅ Found test file: {source_file}")
print()

# Copy file to upload directory with a new name
import time
timestamp = int(time.time() * 1000)
new_filename = f"test-upload-{timestamp}.xlsx"
dest_path = os.path.join(UPLOAD_DIR, new_filename)

print(f"Copying file to upload directory...")
print(f"   Source: {source_file}")
print(f"   Destination: {dest_path}")

shutil.copy2(source_file, dest_path)
file_size = os.path.getsize(dest_path)

print(f"✅ File copied successfully ({file_size} bytes)")
print()

# Register file in database as pending
print("Registering file in database...")

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

# Get the current user (or use a default)
cur.execute("SELECT user_id FROM users WHERE email = 'national.admin@eff.org.za' LIMIT 1")
user_row = cur.fetchone()

if user_row:
    user_id = user_row[0]
else:
    # Use user_id = 1 as fallback
    user_id = 1
    print(f"⚠️  Using default user_id = {user_id}")

cur.execute("""
    INSERT INTO uploaded_files (
        filename, 
        original_filename, 
        file_path, 
        file_size, 
        mime_type,
        uploaded_by_user_id,
        status,
        progress_percentage,
        rows_total
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING file_id, filename, status
""", (
    new_filename,
    os.path.basename(source_file),
    dest_path,
    file_size,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    user_id,
    'pending',
    0,
    0
))

result = cur.fetchone()
file_id, filename, status = result

conn.commit()

print(f"✅ File registered in database:")
print(f"   File ID: {file_id}")
print(f"   Filename: {filename}")
print(f"   Status: {status}")
print(f"   Path: {dest_path}")
print()

cur.close()
conn.close()

print("=" * 120)
print("✅ TEST FILE CREATED SUCCESSFULLY")
print("=" * 120)
print()
print("The bulk upload processor should now pick up this file and process it.")
print()
print("Watch the processor logs for:")
print(f"   📋 Found 1 pending files")
print(f"   📄 Processing file {file_id}: {os.path.basename(source_file)}")
print(f"   🔄 Starting processing with FlexibleMembershipIngestion...")
print()
print("If the processor is not running, start it with:")
print("   cd backend/python")
print("   python bulk_upload_processor.py")
print()

