#!/usr/bin/env python3
"""
Check the status of bulk uploads and verify data insertion into members_consolidated
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import sys

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'eff_membership_database',
    'user': 'eff_admin',
    'password': 'Frames!123'
}

def check_upload_status():
    """Check the status of recent uploads"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("=" * 80)
        print("CHECKING BULK UPLOAD STATUS")
        print("=" * 80)
        
        # Get recent uploads
        cursor.execute("""
            SELECT
                file_id,
                original_filename,
                status,
                rows_total,
                rows_processed,
                rows_success,
                rows_failed,
                error_message,
                created_at
            FROM uploaded_files
            ORDER BY created_at DESC
            LIMIT 5
        """)
        
        uploads = cursor.fetchall()
        
        if not uploads:
            print("\n❌ No uploads found in database")
            return
        
        print(f"\n📋 Found {len(uploads)} recent uploads:\n")
        
        for upload in uploads:
            print(f"File ID: {upload['file_id']}")
            print(f"  Filename: {upload['original_filename']}")
            print(f"  Status: {upload['status']}")
            print(f"  Rows Total: {upload['rows_total']}")
            print(f"  Rows Processed: {upload['rows_processed']}")
            print(f"  Rows Success: {upload['rows_success']}")
            print(f"  Rows Failed: {upload['rows_failed']}")
            if upload['error_message']:
                print(f"  Error: {upload['error_message']}")
            print(f"  Created: {upload['created_at']}")
            print()
        
        # Check the most recent upload in detail
        latest_upload = uploads[0]
        file_id = latest_upload['file_id']
        
        print("=" * 80)
        print(f"CHECKING DATA INSERTION FOR FILE_ID: {file_id}")
        print("=" * 80)
        
        # Count members in members_consolidated
        cursor.execute("SELECT COUNT(*) as total FROM members_consolidated")
        total_members = cursor.fetchone()['total']
        print(f"\n📊 Total members in members_consolidated: {total_members:,}")
        
        # Check if there are any members added recently (within last hour)
        cursor.execute("""
            SELECT COUNT(*) as recent_count
            FROM members_consolidated
            WHERE created_at > NOW() - INTERVAL '1 hour'
        """)
        recent_count = cursor.fetchone()['recent_count']
        print(f"📊 Members added in last hour: {recent_count:,}")
        
        # Get sample of recent members
        if recent_count > 0:
            cursor.execute("""
                SELECT 
                    id_number,
                    firstname,
                    surname,
                    ward_code,
                    voter_district_code,
                    membership_status_id,
                    created_at
                FROM members_consolidated
                WHERE created_at > NOW() - INTERVAL '1 hour'
                ORDER BY created_at DESC
                LIMIT 5
            """)
            
            recent_members = cursor.fetchall()
            print(f"\n📋 Sample of recently added members:")
            for member in recent_members:
                print(f"  - {member['firstname']} {member['surname']} (ID: {member['id_number']})")
                print(f"    Ward: {member['ward_code']}, VD: {member['voter_district_code']}")
                print(f"    Status: {member['membership_status_id']}, Created: {member['created_at']}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        
        if latest_upload['status'] == 'pending':
            print("⏳ Latest upload is still PENDING - Python processor may not be running")
            print("   Run: cd backend/python && python bulk_upload_processor.py")
        elif latest_upload['status'] == 'processing':
            print("🔄 Latest upload is PROCESSING - check Python processor logs")
        elif latest_upload['status'] == 'completed':
            print(f"✅ Latest upload COMPLETED successfully")
            print(f"   {latest_upload['rows_success']} rows inserted")
            if recent_count == 0:
                print("   ⚠️  WARNING: No recent members found in members_consolidated!")
                print("   This suggests data may not have been inserted properly")
        elif latest_upload['status'] == 'failed':
            print(f"❌ Latest upload FAILED")
            print(f"   Error: {latest_upload['error_message']}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_upload_status()

