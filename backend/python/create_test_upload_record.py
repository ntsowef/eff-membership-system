"""
Create a test upload record with report path for demonstration
"""

import psycopg2
from datetime import datetime

DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

def create_test_record():
    """Create a test upload record"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check if report file exists
        report_path = 'reports/Copy of 2nd Matjhabeng Ward 11 Duplicates 14.11.2025(1)_REPORT_20250120_123456.xlsx'
        
        cursor.execute("""
            INSERT INTO uploaded_files (
                filename, 
                original_filename, 
                file_path, 
                file_size, 
                mime_type, 
                uploaded_by_user_id,
                status,
                progress_percentage,
                rows_processed,
                rows_total,
                rows_success,
                rows_failed,
                report_file_path
            ) VALUES (
                'test-file.xlsx',
                'Test Upload.xlsx',
                'reports/test.xlsx',
                50000,
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                8633,
                'completed',
                100,
                139,
                139,
                121,
                18,
                %s
            ) RETURNING file_id
        """, (report_path,))
        
        file_id = cursor.fetchone()[0]
        conn.commit()
        
        print(f"✅ Created test upload record with ID: {file_id}")
        print(f"   Report path: {report_path}")
        
        cursor.close()
        conn.close()
        
        return file_id
        
    except Exception as e:
        print(f"❌ Error creating test record: {e}")
        return None

if __name__ == '__main__':
    create_test_record()

