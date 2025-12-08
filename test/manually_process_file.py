import psycopg2
import sys
import os

# Add backend/python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend', 'python'))

from process_self_data_management_file import process_file

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)

cursor = conn.cursor()

# Get the most recent file without a report
cursor.execute("""
    SELECT file_id, file_path, filename
    FROM uploaded_files
    WHERE report_file_path IS NULL
    AND status = 'completed'
    ORDER BY upload_timestamp DESC
    LIMIT 1
""")

row = cursor.fetchone()
if row:
    file_id, file_path, filename = row
    print(f"Processing file_id: {file_id}")
    print(f"Filename: {filename}")
    print(f"File path: {file_path}")
    print("=" * 80)
    
    # Check if file exists
    if os.path.exists(file_path):
        print(f"✅ File exists at: {file_path}")
        print("\nStarting processing...")
        print("=" * 80)
        
        # Process the file
        try:
            process_file(file_id, file_path)
            print("\n✅ Processing completed successfully!")
        except Exception as e:
            print(f"\n❌ Error during processing: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"❌ File does not exist at: {file_path}")
else:
    print("No files found without report_file_path")

cursor.close()
conn.close()

