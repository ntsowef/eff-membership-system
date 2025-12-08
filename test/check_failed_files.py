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
print("FAILED FILES - ERROR DETAILS")
print("=" * 120)

cur.execute("""
    SELECT 
        file_id, 
        filename, 
        original_filename,
        status, 
        error_message,
        rows_processed,
        rows_total,
        upload_timestamp,
        processing_started_at,
        processing_completed_at
    FROM uploaded_files
    WHERE status = 'failed'
    ORDER BY file_id DESC
""")

failed_files = cur.fetchall()

if failed_files:
    for row in failed_files:
        file_id, filename, original_filename, status, error_msg, rows_proc, rows_total, upload_ts, start_ts, end_ts = row
        
        print(f"\nFile ID: {file_id}")
        print(f"Filename: {filename}")
        print(f"Original: {original_filename}")
        print(f"Status: {status}")
        print(f"Rows: {rows_proc}/{rows_total}")
        print(f"Uploaded: {upload_ts}")
        print(f"Started: {start_ts}")
        print(f"Completed: {end_ts}")
        print(f"\nError Message:")
        print("-" * 120)
        if error_msg:
            print(error_msg)
        else:
            print("(No error message recorded)")
        print("-" * 120)
else:
    print("\nNo failed files found")

conn.close()

print("\n" + "=" * 120)
print("To retry these files, you can update their status back to 'pending':")
print("UPDATE uploaded_files SET status = 'pending', error_message = NULL WHERE file_id = <id>;")
print("=" * 120)

