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

print("\n" + "=" * 120)
print("ALL FILES IN DATABASE - COMPLETE DETAILS")
print("=" * 120)

cur.execute("""
    SELECT 
        file_id, 
        filename, 
        original_filename,
        file_path,
        status,
        error_message,
        upload_timestamp,
        processing_started_at,
        processing_completed_at
    FROM uploaded_files
    ORDER BY file_id DESC
""")

files = cur.fetchall()

for row in files:
    file_id, filename, original_filename, file_path, status, error_msg, upload_ts, start_ts, end_ts = row
    
    print(f"\n{'='*120}")
    print(f"File ID: {file_id}")
    print(f"Filename: {filename}")
    print(f"Original: {original_filename}")
    print(f"Status: {status}")
    print(f"File Path: {file_path}")
    
    # Check if file exists
    if os.path.exists(file_path):
        file_size = os.path.getsize(file_path) / 1024
        print(f"File Exists: ✅ YES ({file_size:.2f} KB)")
    else:
        print(f"File Exists: ❌ NO")
    
    print(f"\nTimestamps:")
    print(f"  Uploaded: {upload_ts}")
    print(f"  Started: {start_ts}")
    print(f"  Completed: {end_ts}")
    
    if error_msg:
        print(f"\nError Message:")
        print(f"  {error_msg}")

conn.close()

print("\n" + "=" * 120)

