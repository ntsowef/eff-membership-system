import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)

cursor = conn.cursor()

# Check uploaded files
cursor.execute("""
    SELECT 
        file_id,
        filename,
        status,
        report_file_path,
        rows_total,
        rows_success,
        rows_failed,
        upload_timestamp
    FROM uploaded_files
    ORDER BY upload_timestamp DESC
    LIMIT 10
""")

rows = cursor.fetchall()
print("Recent uploaded files:")
print("=" * 120)
print(f"{'ID':<5} {'Filename':<30} {'Status':<15} {'Report Path':<40} {'Rows':<10}")
print("=" * 120)

for row in rows:
    file_id, filename, status, report_path, rows_total, rows_success, rows_failed = row[:7]
    report_display = report_path[:37] + '...' if report_path and len(report_path) > 40 else (report_path or 'None')
    rows_display = f"{rows_success or 0}/{rows_total or 0}"
    print(f"{file_id:<5} {filename:<30} {status:<15} {report_display:<40} {rows_display:<10}")

cursor.close()
conn.close()

