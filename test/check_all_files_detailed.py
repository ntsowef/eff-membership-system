import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

print("\n" + "=" * 120)
print("ALL UPLOADED FILES - DETAILED STATUS")
print("=" * 120)

cur.execute("""
    SELECT 
        file_id, 
        filename,
        original_filename,
        status,
        rows_processed,
        rows_total,
        error_message,
        upload_timestamp,
        processing_started_at,
        processing_completed_at
    FROM uploaded_files
    ORDER BY file_id DESC
""")

files = cur.fetchall()

for row in files:
    file_id, filename, original, status, rows_proc, rows_total, error, upload, start, complete = row
    
    print(f"\n{'='*120}")
    print(f"File ID: {file_id}")
    print(f"Filename: {filename}")
    print(f"Original: {original}")
    print(f"Status: {status}")
    print(f"Rows: {rows_proc}/{rows_total}")
    print(f"\nTimestamps:")
    print(f"  Uploaded: {upload}")
    print(f"  Started: {start}")
    print(f"  Completed: {complete}")
    
    if error:
        print(f"\nError:")
        print(f"  {error}")

conn.close()

print("\n" + "=" * 120)

