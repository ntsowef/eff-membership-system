#!/usr/bin/env python3
"""
Check for pending files in the database and update their paths if needed
"""

import psycopg2
import os

DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

print("=" * 120)
print("CHECKING PENDING FILES IN DATABASE")
print("=" * 120)

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

# Get pending files
cur.execute("""
    SELECT file_id, filename, original_filename, file_path, status, upload_timestamp
    FROM uploaded_files
    WHERE status = 'pending'
    ORDER BY upload_timestamp DESC
    LIMIT 10
""")

rows = cur.fetchall()

if rows:
    print(f"\nFound {len(rows)} pending file(s):\n")
    
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    correct_upload_dir = os.path.join(repo_root, '_upload_file_directory')
    
    for row in rows:
        file_id, filename, original_filename, file_path, status, upload_timestamp = row
        
        print(f"ID: {file_id}")
        print(f"  Filename: {filename}")
        print(f"  Original: {original_filename}")
        print(f"  Current Path: {file_path}")
        print(f"  Status: {status}")
        print(f"  Uploaded: {upload_timestamp}")
        
        # Check if path needs updating
        if 'backend\\_upload_file_directory' in file_path or 'backend/_upload_file_directory' in file_path:
            # Path needs updating
            new_path = os.path.join(correct_upload_dir, filename)
            print(f"  ⚠️  Path needs updating!")
            print(f"  New Path: {new_path}")
            
            # Check if file exists at new location
            if os.path.exists(new_path):
                print(f"  ✅ File exists at new location")
                
                # Update database
                cur.execute("""
                    UPDATE uploaded_files
                    SET file_path = %s
                    WHERE file_id = %s
                """, (new_path, file_id))
                print(f"  ✅ Database updated")
            else:
                print(f"  ❌ File NOT found at new location")
        else:
            # Check if file exists
            if os.path.exists(file_path):
                print(f"  ✅ File exists at current path")
            else:
                print(f"  ❌ File NOT found at current path")
                
                # Try to find it in the correct location
                new_path = os.path.join(correct_upload_dir, filename)
                if os.path.exists(new_path):
                    print(f"  ✅ Found at: {new_path}")
                    
                    # Update database
                    cur.execute("""
                        UPDATE uploaded_files
                        SET file_path = %s
                        WHERE file_id = %s
                    """, (new_path, file_id))
                    print(f"  ✅ Database updated")
        
        print()
    
    # Commit changes
    conn.commit()
    print("✅ All changes committed")
else:
    print("\nNo pending files in database")

# Get all files (any status)
print("\n" + "=" * 120)
print("ALL FILES IN DATABASE (Last 10)")
print("=" * 120)

cur.execute("""
    SELECT file_id, filename, original_filename, status, upload_timestamp
    FROM uploaded_files
    ORDER BY upload_timestamp DESC
    LIMIT 10
""")

all_rows = cur.fetchall()

if all_rows:
    print(f"\nFound {len(all_rows)} file(s):\n")
    for row in all_rows:
        file_id, filename, original_filename, status, upload_timestamp = row
        print(f"ID: {file_id:<5} Status: {status:<12} File: {original_filename:<40} ({upload_timestamp})")
else:
    print("\nNo files in database")

cur.close()
conn.close()

print("\n" + "=" * 120)
print("✅ CHECK COMPLETE")
print("=" * 120)

