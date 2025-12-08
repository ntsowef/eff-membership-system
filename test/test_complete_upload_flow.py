#!/usr/bin/env python3
"""
Test the complete upload flow including Excel report generation
"""

import psycopg2
import time
import os

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'eff_membership_database',
    'user': 'eff_admin',
    'password': 'Frames!123'
}

def check_latest_upload():
    """Check the latest upload and its report"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("=" * 80)
        print("LATEST UPLOAD STATUS")
        print("=" * 80)
        
        # Get the latest upload
        cursor.execute("""
            SELECT 
                file_id,
                original_filename,
                status,
                rows_total,
                rows_success,
                rows_failed,
                report_file_path,
                processing_started_at,
                processing_completed_at,
                upload_timestamp
            FROM uploaded_files
            ORDER BY file_id DESC
            LIMIT 1
        """)
        
        result = cursor.fetchone()
        
        if not result:
            print("\n❌ No uploads found in database")
            return
        
        file_id, original_filename, status, rows_total, rows_success, rows_failed, \
            report_file_path, processing_started_at, processing_completed_at, upload_timestamp = result
        
        print(f"\n📄 File ID: {file_id}")
        print(f"📝 Filename: {original_filename}")
        print(f"📊 Status: {status}")
        print(f"📅 Uploaded: {upload_timestamp}")
        print(f"⏱️  Started: {processing_started_at}")
        print(f"✅ Completed: {processing_completed_at}")
        
        print(f"\n📈 Statistics:")
        print(f"  Total rows: {rows_total}")
        print(f"  Success: {rows_success}")
        print(f"  Failed: {rows_failed}")
        
        print(f"\n📊 Excel Report:")
        if report_file_path:
            print(f"  ✅ Report path: {report_file_path}")
            
            # Check if file exists
            if os.path.exists(report_file_path):
                file_size = os.path.getsize(report_file_path)
                print(f"  ✅ File exists: {file_size:,} bytes")
                print(f"  📂 Full path: {os.path.abspath(report_file_path)}")
            else:
                print(f"  ❌ File NOT found on disk: {report_file_path}")
        else:
            print(f"  ❌ No report path in database (NULL)")
        
        # Check members inserted
        print(f"\n👥 Members in database:")
        cursor.execute("SELECT COUNT(*) FROM members_consolidated")
        total_members = cursor.fetchone()[0]
        print(f"  Total members: {total_members:,}")
        
        # Check members from this upload (approximate - last N members)
        if rows_success > 0:
            cursor.execute(f"""
                SELECT COUNT(*) FROM members_consolidated
                WHERE member_id > (SELECT MAX(member_id) - {rows_success} FROM members_consolidated)
            """)
            recent_members = cursor.fetchone()[0]
            print(f"  Recent members (last {rows_success}): {recent_members:,}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        
        if status == 'completed':
            print("✅ Upload completed successfully")
            if report_file_path and os.path.exists(report_file_path):
                print("✅ Excel report generated and available")
                print(f"\n📥 Download report using:")
                print(f"   GET /api/v1/self-data-management/bulk-upload/download-report/{file_id}")
            elif report_file_path:
                print("⚠️  Report path in database but file not found on disk")
            else:
                print("❌ No Excel report generated")
        elif status == 'processing':
            print("⏳ Upload is still processing...")
            print("   Wait a few moments and run this script again")
        elif status == 'failed':
            print("❌ Upload failed")
        else:
            print(f"⚠️  Unknown status: {status}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_latest_upload()

