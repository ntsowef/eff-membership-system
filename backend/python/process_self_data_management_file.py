"""
Process Self Data Management File and Generate Report
This script processes an uploaded file and generates a comprehensive Excel report
"""

import sys
import os
import json
import pandas as pd
from datetime import datetime
import psycopg2

# Add directories to path to import modules
script_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.dirname(os.path.dirname(script_dir))  # Go up two levels to repo root
sys.path.insert(0, repo_root)  # For flexible_membership_ingestionV2.py
sys.path.insert(0, script_dir)  # For local modules in backend/python

from excel_report_generator import ExcelReportGenerator
from iec_verification_module import IECVerifier
from flexible_membership_ingestionV2 import FlexibleMembershipIngestion
from websocket_notifier import WebSocketNotifier

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

def update_file_status(file_id: int, status: str, progress: int = 0,
                       rows_processed: int = 0, rows_success: int = 0,
                       rows_failed: int = 0, error_message: str = None,
                       ws_notifier: WebSocketNotifier = None):
    """Update file processing status in database and send WebSocket notification"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Get total rows for WebSocket notification
        cursor.execute("SELECT rows_total FROM uploaded_files WHERE file_id = %s", (file_id,))
        result = cursor.fetchone()
        rows_total = result[0] if result else 0

        if error_message:
            cursor.execute("""
                UPDATE uploaded_files
                SET status = %s, progress_percentage = %s,
                    rows_processed = %s, rows_success = %s, rows_failed = %s,
                    error_message = %s,
                    processing_completed_at = CASE WHEN %s IN ('completed', 'failed')
                                                   THEN CURRENT_TIMESTAMP ELSE processing_completed_at END
                WHERE file_id = %s
            """, (status, progress, rows_processed, rows_success, rows_failed, error_message, status, file_id))
        else:
            cursor.execute("""
                UPDATE uploaded_files
                SET status = %s, progress_percentage = %s,
                    rows_processed = %s, rows_success = %s, rows_failed = %s,
                    processing_completed_at = CASE WHEN %s IN ('completed', 'failed')
                                                   THEN CURRENT_TIMESTAMP ELSE processing_completed_at END
                WHERE file_id = %s
            """, (status, progress, rows_processed, rows_success, rows_failed, status, file_id))

        conn.commit()
        cursor.close()
        conn.close()

        # Send WebSocket notification
        if ws_notifier:
            if status == 'completed':
                ws_notifier.send_bulk_upload_complete(
                    file_id=file_id,
                    rows_success=rows_success,
                    rows_failed=rows_failed,
                    rows_total=rows_total
                )
            elif status == 'failed' and error_message:
                ws_notifier.send_bulk_upload_error(file_id=file_id, error=error_message)
            else:
                ws_notifier.send_bulk_upload_progress(
                    file_id=file_id,
                    status=status,
                    progress=progress,
                    rows_processed=rows_processed,
                    rows_total=rows_total
                )
    except Exception as e:
        print(f"Error updating file status: {e}")


def update_report_path(file_id: int, report_path: str):
    """Update report file path in database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE uploaded_files 
            SET report_file_path = %s
            WHERE file_id = %s
        """, (report_path, file_id))
        
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error updating report path: {e}")


def process_file(file_id: int, file_path: str):
    """Process file and generate report"""

    print(f"\n{'='*80}")
    print(f"Processing File ID: {file_id}")
    print(f"File Path: {file_path}")
    print(f"{'='*80}\n")

    # Check if file exists
    if not os.path.exists(file_path):
        error_msg = f"File not found: {file_path}"
        print(f"❌ {error_msg}")
        update_file_status(file_id, 'failed', 0, 0, 0, 0, error_msg, ws_notifier=None)
        return

    print(f"✅ File found: {file_path}")
    print(f"   File size: {os.path.getsize(file_path):,} bytes")

    # Initialize WebSocket notifier (DISABLED FOR TESTING)
    # ws_notifier = WebSocketNotifier()
    ws_notifier = None  # Disabled for testing - backend will handle WebSocket notifications

    try:
        # Update status to processing
        update_file_status(file_id, 'processing', 10, ws_notifier=ws_notifier)

        # Step 1: Load Excel file
        print("📂 Loading Excel file...")
        df_original = pd.read_excel(file_path)
        total_rows = len(df_original)
        print(f"   Loaded {total_rows:,} rows")

        # Update rows_total in database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("UPDATE uploaded_files SET rows_total = %s WHERE file_id = %s", (total_rows, file_id))
        conn.commit()
        cursor.close()
        conn.close()

        update_file_status(file_id, 'processing', 20, total_rows, 0, 0, ws_notifier=ws_notifier)
        
        # Step 2: IEC Verification
        print("\n🔍 Performing IEC verification...")
        verifier = IECVerifier()
        df_verified, iec_report = verifier.verify_dataframe(df_original, id_column='ID Number', ward_column='Ward')
        print(f"   Verification complete")
        print(f"   IEC Report: {iec_report.get('verified', 0)} verified, {iec_report.get('not_registered', 0)} not registered")
        
        update_file_status(file_id, 'processing', 50, total_rows, 0, 0, ws_notifier=ws_notifier)

        # Step 3: Process file with ingestion
        print("\n💾 Processing file to database...")
        processor = FlexibleMembershipIngestion(
            docs_directory=os.path.dirname(file_path),
            db_config=DB_CONFIG,
            use_optimized=True,
            archive_enabled=False
        )

        result = processor.process_file_flexible(file_path)

        members_imported = result.get('members_imported', 0)
        members_skipped = result.get('members_skipped', 0)

        print(f"   ✅ Imported: {members_imported:,}")
        print(f"   ⏭️  Skipped: {members_skipped:,}")

        update_file_status(file_id, 'processing', 80, total_rows, members_imported, members_skipped, ws_notifier=ws_notifier)
        
        # Step 4: Generate Excel report
        print("\n📊 Generating Excel report...")

        # Prepare data for report - extract invalid IDs
        invalid_ids = []
        for idx, row in df_original.iterrows():
            id_num = row.get('ID Number', '')
            # Check if this ID is not in verified df (meaning it was invalid)
            if pd.notna(id_num):
                id_str = str(id_num).replace('.', '').replace(' ', '')
                if len(id_str) != 13:
                    invalid_ids.append({
                        'Row Number': idx + 2,  # Excel row (1-based with header)
                        'ID Number': id_num,
                        'Firstname': row.get('Firstname', ''),
                        'Surname': row.get('Surname', ''),
                        'Reason': f"{len(id_str)} digits - {'too short' if len(id_str) < 13 else 'too long'}"
                    })

        # Extract duplicates
        duplicates = []
        if 'ID Number' in df_verified.columns:
            dup_ids = df_verified[df_verified.duplicated(subset=['ID Number'], keep=False)]
            for id_num in dup_ids['ID Number'].unique():
                matching = df_verified[df_verified['ID Number'] == id_num]
                for idx, row in matching.iterrows():
                    duplicates.append({
                        'Row Number': idx + 2,
                        'ID Number': row['ID Number'],
                        'Firstname': row.get('Firstname', ''),
                        'Surname': row.get('Surname', ''),
                        'Count': len(matching)
                    })

        # Extract different ward
        different_ward = []
        if 'iec_verification_status' in df_verified.columns:
            diff_ward = df_verified[df_verified['iec_verification_status'] == 'Registered in Different Ward']
            for idx, row in diff_ward.iterrows():
                different_ward.append({
                    'Row Number': idx + 2,
                    'ID Number': row.get('ID Number', ''),
                    'Firstname': row.get('Firstname', ''),
                    'Surname': row.get('Surname', ''),
                    'Excel Ward': row.get('Ward', ''),
                    'IEC Ward': row.get('Ward', '')  # This should be from IEC data
                })

        # Extract not registered
        not_registered = []
        if 'iec_verification_status' in df_verified.columns:
            not_reg = df_verified[df_verified['iec_verification_status'] == 'Not Registered']
            for idx, row in not_reg.iterrows():
                not_registered.append({
                    'Row Number': idx + 2,
                    'ID Number': row.get('ID Number', ''),
                    'Firstname': row.get('Firstname', ''),
                    'Surname': row.get('Surname', '')
                })

        # Extract successfully imported
        successfully_imported = []
        # Assume all verified records that are not duplicates were imported
        if members_imported > 0:
            imported_df = df_verified[~df_verified.duplicated(subset=['ID Number'], keep='last')]
            for idx, row in imported_df.head(members_imported).iterrows():
                successfully_imported.append({
                    'Row Number': idx + 2,
                    'ID Number': row.get('ID Number', ''),
                    'Firstname': row.get('Firstname', ''),
                    'Surname': row.get('Surname', ''),
                    'Ward': row.get('Ward', ''),
                    'VD Number': row.get('VD Number', '')
                })

        # Processing stats
        processing_stats = {
            'total_records': total_rows,
            'valid_ids': len(df_verified),
            'invalid_ids': len(invalid_ids),
            'iec_verified': len(df_verified[df_verified['iec_verification_status'] != 'Unknown Status']),
            'registered_correct_ward': len(df_verified[df_verified['iec_verification_status'] == 'Registered in Correct Ward']),
            'registered_different_ward': len(different_ward),
            'not_registered': len(not_registered),
            'vd_populated': len(df_verified[df_verified['VD Number'].notna()]),
            'duplicates': len(duplicates),
            'imported_to_db': members_imported,
            'processing_time': result.get('processing_time', 0)
        }

        # Generate report
        output_dir = os.path.dirname(file_path)
        original_filename = os.path.basename(file_path)

        generator = ExcelReportGenerator(original_filename, output_dir)
        report_path = generator.generate_report(
            df_original=df_original,
            df_verified=df_verified,
            processing_stats=processing_stats,
            invalid_ids=invalid_ids,
            duplicates=duplicates,
            different_ward=different_ward,
            not_registered=not_registered,
            successfully_imported=successfully_imported
        )

        print(f"   ✅ Report generated: {os.path.basename(report_path)}")

        # Update database with report path
        update_report_path(file_id, report_path)

        # Final status update
        update_file_status(file_id, 'completed', 100, total_rows, members_imported, members_skipped, ws_notifier=ws_notifier)

        print(f"\n{'='*80}")
        print(f"✅ Processing Complete!")
        print(f"{'='*80}")

        return {
            'success': True,
            'file_id': file_id,
            'report_path': report_path,
            'members_imported': members_imported,
            'members_skipped': members_skipped
        }

    except Exception as e:
        print(f"\n❌ Error processing file: {e}")
        import traceback
        traceback.print_exc()

        # Update status to failed
        update_file_status(file_id, 'failed', 0, 0, 0, 0, str(e), ws_notifier=ws_notifier)

        return {
            'success': False,
            'error': str(e)
        }


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python process_self_data_management_file.py <file_id> <file_path>")
        sys.exit(1)

    file_id = int(sys.argv[1])
    file_path = sys.argv[2]

    result = process_file(file_id, file_path)

    # Output result as JSON for the calling process
    print("\n" + json.dumps(result))


