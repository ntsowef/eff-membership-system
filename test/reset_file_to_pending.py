#!/usr/bin/env python3
"""
Reset a failed file back to pending status so it can be reprocessed
"""

import psycopg2
import sys

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

# Get file 2 specifically (the test file that exists)
cur.execute("""
    SELECT file_id, filename, original_filename, error_message
    FROM uploaded_files
    WHERE file_id = 2
""")

row = cur.fetchone()

if not row:
    print("No failed files found")
    conn.close()
    sys.exit(0)

file_id, filename, original_filename, error_msg = row

print("=" * 120)
print("RESET FILE TO PENDING")
print("=" * 120)
print(f"\nFile ID: {file_id}")
print(f"Filename: {filename}")
print(f"Original: {original_filename}")
print(f"\nPrevious Error:")
print("-" * 120)
print(error_msg if error_msg else "(No error message)")
print("-" * 120)
print()

# Reset the file
cur.execute("""
    UPDATE uploaded_files
    SET 
        status = 'pending',
        error_message = NULL,
        progress_percentage = 0,
        rows_processed = 0,
        rows_total = 0,
        processing_started_at = NULL,
        processing_completed_at = NULL
    WHERE file_id = %s
""", (file_id,))

conn.commit()

print(f"✅ File {file_id} has been reset to 'pending' status")
print()
print("The bulk upload processor should pick it up within 10 seconds.")
print()
print("Watch the processor logs for:")
print(f"   📋 Found 1 pending files")
print(f"   📄 Processing file {file_id}: {original_filename}")
print(f"   🔄 Starting processing with FlexibleMembershipIngestion...")
print()

cur.close()
conn.close()

