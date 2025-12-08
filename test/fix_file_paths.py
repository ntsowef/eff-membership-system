#!/usr/bin/env python3
"""
Fix file paths in database that point to old backend/_upload_file_directory
"""

import psycopg2
import os

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

print("=" * 120)
print("FIX FILE PATHS IN DATABASE")
print("=" * 120)
print()

# Find files with old path
cur.execute("""
    SELECT file_id, filename, file_path
    FROM uploaded_files
    WHERE file_path LIKE '%backend\\_upload_file_directory%'
    OR file_path LIKE '%backend/_upload_file_directory%'
""")

files_to_fix = cur.fetchall()

if not files_to_fix:
    print("✅ No files with old paths found")
    conn.close()
    exit(0)

print(f"Found {len(files_to_fix)} file(s) with old paths:")
print()

repo_root = r"C:\Development\NewProj\Membership-newV2"
new_upload_dir = os.path.join(repo_root, "_upload_file_directory")

for file_id, filename, old_path in files_to_fix:
    print(f"File ID: {file_id}")
    print(f"Filename: {filename}")
    print(f"Old path: {old_path}")
    
    # Construct new path
    new_path = os.path.join(new_upload_dir, filename)
    print(f"New path: {new_path}")
    
    # Check if file exists at new location
    if os.path.exists(new_path):
        print(f"✅ File exists at new location")
        
        # Update database
        cur.execute("""
            UPDATE uploaded_files
            SET file_path = %s
            WHERE file_id = %s
        """, (new_path, file_id))
        
        print(f"✅ Database updated")
    else:
        print(f"❌ File NOT found at new location")
        print(f"   The file may have been deleted or moved elsewhere")
    
    print()

conn.commit()
cur.close()
conn.close()

print("=" * 120)
print("DONE")
print("=" * 120)

