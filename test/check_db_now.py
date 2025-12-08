import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

print("\n=== ALL FILES ===")
cur.execute("SELECT file_id, filename, status FROM uploaded_files ORDER BY file_id DESC")
for row in cur.fetchall():
    print(f"ID: {row[0]}, File: {row[1]}, Status: {row[2]}")

print("\n=== PENDING FILES ===")
cur.execute("SELECT file_id, filename, status, file_path FROM uploaded_files WHERE status = 'pending'")
pending = cur.fetchall()
if pending:
    for row in pending:
        print(f"ID: {row[0]}, File: {row[1]}, Status: {row[2]}")
        print(f"Path: {row[3]}")
else:
    print("No pending files")

conn.close()

