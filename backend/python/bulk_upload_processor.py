"""
Bulk Upload File Processor with WebSocket Support
Processes Excel files from _upload_file_directory and sends real-time updates
"""

import os
import sys
import time
import logging
import psycopg2
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Add parent directory to path to import websocket_client
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from websocket_client import FileProcessingWebSocketClient

# Add repository root to path to import flexible_membership_ingestionV2
# Current file: backend/python/bulk_upload_processor.py
# Need to go up 2 levels: backend/python -> backend -> root
repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, repo_root)

print(f'📂 Repository root: {repo_root}')

# Check if the ingestion script exists
ingestion_script_path = os.path.join(repo_root, 'flexible_membership_ingestionV2.py')
if not os.path.exists(ingestion_script_path):
    raise FileNotFoundError(
        f'flexible_membership_ingestionV2.py not found at: {ingestion_script_path}\n'
        f'Repository root: {repo_root}\n'
        f'Current file: {os.path.abspath(__file__)}'
    )

print(f'✓ Found ingestion script: {ingestion_script_path}')

from flexible_membership_ingestionV2 import FlexibleMembershipIngestion

print(f'✓ Successfully imported FlexibleMembershipIngestion')

# Import Excel Report Generator
try:
    from excel_report_generator import ExcelReportGenerator
    print(f'✓ Successfully imported ExcelReportGenerator')
    EXCEL_REPORT_AVAILABLE = True
except ImportError as e:
    print(f'⚠️  Excel report generator not available: {e}')
    print(f'   Excel reports will not be generated')
    EXCEL_REPORT_AVAILABLE = False

# Import IEC verification module
IEC_VERIFIER_AVAILABLE = False
try:
    from iec_verification_module import IECVerifier, IECVerificationError
    print(f'✓ Successfully imported IECVerifier')
    IEC_VERIFIER_AVAILABLE = True
except ImportError as e:
    print(f'⚠️  IEC verification module not available: {e}')
    print(f'   IEC verification will be disabled')

# Import Pre-Validation Processor
try:
    from pre_validation_processor import PreValidationProcessor
    print(f'✓ Successfully imported PreValidationProcessor')
    PRE_VALIDATION_AVAILABLE = True
except ImportError as e:
    print(f'⚠️  Pre-validation processor not available: {e}')
    print(f'   Pre-validation will be disabled')
    PRE_VALIDATION_AVAILABLE = False

# Configure logging
# Use DEBUG level to see detailed information
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BulkUploadProcessor:
    """Processes bulk upload files with real-time WebSocket updates"""
    
    def __init__(self, db_config: Dict[str, str], upload_dir: str, websocket_url: str = 'http://localhost:5000'):
        """
        Initialize processor
        
        Args:
            db_config: Database configuration dict with host, user, password, database
            upload_dir: Directory to watch for uploaded files
            websocket_url: WebSocket server URL
        """
        self.db_config = db_config
        self.upload_dir = Path(upload_dir)
        self.websocket_url = websocket_url
        self.ws_client: Optional[FileProcessingWebSocketClient] = None
        
        # Ensure upload directory exists
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def connect_db(self):
        """Connect to PostgreSQL database"""
        return psycopg2.connect(**self.db_config)
    
    def get_pending_files(self) -> list:
        """Get list of pending files from database"""
        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            # First, check total files in database
            cursor.execute("SELECT COUNT(*) FROM uploaded_files")
            total_count = cursor.fetchone()[0]
            logger.debug(f'Total files in database: {total_count}')

            # Check pending files
            cursor.execute("""
                SELECT file_id, filename, file_path, original_filename
                FROM uploaded_files
                WHERE status = 'pending'
                ORDER BY upload_timestamp ASC
                LIMIT 10
            """)

            files = cursor.fetchall()
            logger.debug(f'Pending files query returned: {len(files)} files')

            cursor.close()
            conn.close()

            return files
        except Exception as e:
            logger.error(f'Error getting pending files: {e}')
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    def update_file_status(self, file_id: int, status: str, 
                          progress: int = 0,
                          rows_processed: int = 0,
                          rows_total: int = 0,
                          rows_success: int = 0,
                          rows_failed: int = 0,
                          error_message: Optional[str] = None):
        """Update file processing status in database"""
        try:
            conn = self.connect_db()
            cursor = conn.cursor()
            
            if status == 'processing':
                cursor.execute("""
                    UPDATE uploaded_files
                    SET status = %s, 
                        progress_percentage = %s,
                        rows_processed = %s,
                        rows_total = %s,
                        processing_started_at = CURRENT_TIMESTAMP
                    WHERE file_id = %s
                """, (status, progress, rows_processed, rows_total, file_id))
            elif status == 'completed':
                cursor.execute("""
                    UPDATE uploaded_files
                    SET status = %s,
                        progress_percentage = 100,
                        rows_processed = %s,
                        rows_total = %s,
                        rows_success = %s,
                        rows_failed = %s,
                        processing_completed_at = CURRENT_TIMESTAMP
                    WHERE file_id = %s
                """, (status, rows_total, rows_total, rows_success, rows_failed, file_id))
            elif status == 'failed':
                cursor.execute("""
                    UPDATE uploaded_files
                    SET status = %s,
                        error_message = %s,
                        rows_processed = %s,
                        rows_total = %s,
                        rows_success = %s,
                        rows_failed = %s,
                        processing_completed_at = CURRENT_TIMESTAMP
                    WHERE file_id = %s
                """, (status, error_message, rows_processed, rows_total, rows_success, rows_failed, file_id))
            else:
                cursor.execute("""
                    UPDATE uploaded_files
                    SET status = %s,
                        progress_percentage = %s,
                        rows_processed = %s
                    WHERE file_id = %s
                """, (status, progress, rows_processed, file_id))
            
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            logger.error(f'Error updating file status: {e}')
    
    def log_error(self, file_id: int, row_number: int, error_type: str, error_message: str, row_data: Optional[Dict] = None):
        """Log processing error to database"""
        try:
            conn = self.connect_db()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO file_processing_errors
                (file_id, row_number, error_type, error_message, row_data)
                VALUES (%s, %s, %s, %s, %s)
            """, (file_id, row_number, error_type, error_message, str(row_data) if row_data else None))

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            logger.error(f'Error logging error: {e}')

    def _generate_validation_only_report(self, file_id: int, file_path: str, original_filename: str,
                                        pre_validation_result: Dict, total_records: int):
        """Generate report when all records fail validation (no processing occurred)"""
        try:
            logger.info(f'📊 Generating validation-only report...')

            df_original = pd.read_excel(file_path)

            invalid_ids = pre_validation_result.get('invalid_ids', [])
            duplicates = pre_validation_result.get('duplicates', [])
            validation_stats = pre_validation_result.get('validation_stats', {})

            processing_stats = {
                'total_records': total_records,
                'valid_ids': validation_stats.get('valid_ids', 0),
                'invalid_ids': validation_stats.get('invalid_ids', 0),
                'verified_count': 0,
                'registered_in_ward': 0,
                'different_ward': 0,
                'not_registered': 0,
                'deceased': 0,
                'api_errors': 0,
                'vd_populated': 0,
                'vd_empty': 0,
                'unique_ids': validation_stats.get('unique_records', 0),
                'duplicate_ids': validation_stats.get('duplicates', 0),
                'duplicate_records': validation_stats.get('total_duplicate_records', 0),
                'imported': 0,
                'skipped': total_records,
                'existing_members': 0,
                'new_members': 0,
                'processing_time': 0,
                'processing_speed': 0,
                'status': 'Failed - Validation Errors'
            }

            reports_dir = os.path.join(os.path.dirname(file_path), 'reports')
            os.makedirs(reports_dir, exist_ok=True)

            generator = ExcelReportGenerator(original_filename, reports_dir)
            report_path = generator.generate_report(
                df_original=df_original,
                df_verified=pd.DataFrame(),  # Empty
                processing_stats=processing_stats,
                invalid_ids=invalid_ids,
                duplicates=duplicates,
                different_ward=[],
                not_registered=[],
                successfully_imported=[],
                existing_members=[]
            )

            logger.info(f'✅ Validation-only report generated: {report_path}')

            # Update database with report path
            conn = self.connect_db()
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
            logger.error(f'❌ Failed to generate validation-only report: {e}')
            logger.exception(e)

    def process_file(self, file_id: int, file_path: str, original_filename: str):
        """
        Process a single file with WebSocket updates

        Args:
            file_id: Database file ID
            file_path: Path to the file
            original_filename: Original filename
        """
        logger.info(f'📄 Processing file {file_id}: {original_filename}')

        # Connect to WebSocket with API key for service-to-service authentication
        from config import INTERNAL_SERVICE_API_KEY
        self.ws_client = FileProcessingWebSocketClient(
            server_url=self.websocket_url,
            api_key=INTERNAL_SERVICE_API_KEY
        )
        if not self.ws_client.connect():
            logger.warning('⚠️  Failed to connect to WebSocket, continuing without real-time updates')
            # Create a dummy WebSocket client as fallback
            class DummyWSClient:
                def send_progress(self, *args, **kwargs):
                    logger.debug(f'[WebSocket unavailable] Progress: {args}')
                def send_complete(self, *args, **kwargs):
                    logger.debug(f'[WebSocket unavailable] Complete: {args}')
                def send_error(self, *args, **kwargs):
                    logger.debug(f'[WebSocket unavailable] Error: {args}')
                def send_rate_limit_warning(self, *args, **kwargs):
                    logger.warning(f'[WebSocket unavailable] Rate limit warning: {args}')
                def send_rate_limit_exceeded(self, *args, **kwargs):
                    logger.error(f'[WebSocket unavailable] Rate limit exceeded: {args}')
                def disconnect(self):
                    pass
            self.ws_client = DummyWSClient()
        else:
            logger.info('✅ Connected to WebSocket server')
            self.ws_client.set_file_id(file_id)

        try:
            # Update status to processing
            self.update_file_status(file_id, 'processing', progress=0, rows_total=0)
            self.ws_client.send_progress('processing', 0, 0, 0, 'Starting file processing...')

            # Check if file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f'File not found: {file_path}')

            # ============================================================
            # STEP 0: PRE-VALIDATION (ID validation, duplicates, existing members)
            # ============================================================
            pre_validation_result = None
            if PRE_VALIDATION_AVAILABLE:
                logger.info(f'🔍 Step 0: Pre-Validation - Starting...')
                self.ws_client.send_progress('processing', 5, 0, 0, 'Step 0/3: Pre-validating data...')

                try:
                    # Load Excel file for pre-validation
                    df = pd.read_excel(file_path)
                    initial_count = len(df)
                    logger.info(f'   Loaded {initial_count} records for pre-validation')

                    # Send all uploaded rows to frontend for display
                    uploaded_rows = df.to_dict('records')
                    logger.info(f'📤 Sending {len(uploaded_rows)} uploaded rows to frontend...')
                    self.ws_client.send_uploaded_rows(uploaded_rows)

                    # Perform pre-validation
                    validator = PreValidationProcessor(self.db_config)
                    pre_validation_result = validator.validate_dataframe(df)

                    # DEBUG: Check what's in pre_validation_result
                    logger.info(f'🔍 DEBUG: pre_validation_result keys: {list(pre_validation_result.keys())}')
                    logger.info(f'🔍 DEBUG: invalid_ids count in result: {len(pre_validation_result.get("invalid_ids", []))}')
                    logger.info(f'🔍 DEBUG: duplicates count in result: {len(pre_validation_result.get("duplicates", []))}')
                    if pre_validation_result.get('invalid_ids'):
                        logger.info(f'🔍 DEBUG: First invalid_id: {pre_validation_result["invalid_ids"][0]}')
                    if pre_validation_result.get('duplicates'):
                        logger.info(f'🔍 DEBUG: First duplicate: {pre_validation_result["duplicates"][0]}')

                    # Log validation statistics
                    stats = pre_validation_result['validation_stats']
                    logger.info(f'✅ Pre-Validation completed:')
                    logger.info(f'   Total records: {stats["total_records"]}')
                    logger.info(f'   Valid IDs: {stats["valid_ids"]}')
                    logger.info(f'   Invalid IDs: {stats["invalid_ids"]}')
                    logger.info(f'   Unique records: {stats["unique_records"]}')
                    logger.info(f'   Duplicates: {stats["duplicates"]}')
                    logger.info(f'   Existing members: {stats["existing_members"]}')
                    logger.info(f'   New members: {stats["new_members"]}')

                    # Send detailed validation results to frontend
                    validation_summary = (
                        f"Pre-validation complete: {stats['total_records']} records analyzed. "
                        f"✓ Valid IDs: {stats['valid_ids']} | "
                        f"✗ Invalid IDs: {stats['invalid_ids']} | "
                        f"⚠ Duplicates: {stats['duplicates']} | "
                        f"📋 Existing: {stats['existing_members']} | "
                        f"🆕 New: {stats['new_members']}"
                    )
                    self.ws_client.send_progress('processing', 8, 0, stats['total_records'], validation_summary)

                    # Check if we have any valid records to process
                    if len(pre_validation_result['valid_df']) == 0:
                        error_msg = (
                            f"❌ No valid records to process. "
                            f"Total: {stats['total_records']} | "
                            f"Invalid IDs: {stats['invalid_ids']} | "
                            f"Duplicates: {stats['duplicates']} | "
                            f"All records were either invalid or duplicates."
                        )
                        logger.error(f'❌ {error_msg}')

                        # Send detailed error to frontend
                        self.ws_client.send_progress(
                            'failed', 0, 0, initial_count,
                            f"Pre-validation failed: {error_msg}"
                        )

                        self.update_file_status(
                            file_id=file_id,
                            status='failed',
                            error_message=error_msg,
                            rows_total=initial_count,
                            rows_failed=initial_count
                        )
                        self.ws_client.send_error(error_msg)

                        # Still generate report with validation errors
                        if EXCEL_REPORT_AVAILABLE:
                            self._generate_validation_only_report(
                                file_id, file_path, original_filename,
                                pre_validation_result, initial_count
                            )

                        return

                    # Save validated data to temporary file for IEC verification
                    validated_file_path = file_path.replace('.xlsx', '_prevalidated.xlsx')
                    pre_validation_result['valid_df'].to_excel(validated_file_path, index=False)
                    logger.info(f'💾 Pre-validated data saved to: {validated_file_path}')

                    # Update file path to use pre-validated file
                    file_path = validated_file_path

                    self.ws_client.send_progress('processing', 10, 0, 0,
                                                'Step 0/3: Pre-validation completed ✓')

                except Exception as e:
                    error_msg = f"Pre-validation error: {str(e)}"
                    logger.error(f'❌ {error_msg}')
                    logger.exception(e)

                    self.update_file_status(
                        file_id=file_id,
                        status='failed',
                        error_message=error_msg
                    )
                    self.ws_client.send_error(error_msg)
                    return
            else:
                logger.warning('⚠️  Pre-validation is disabled - skipping validation step')
                self.ws_client.send_progress('processing', 5, 0, 0,
                                            'Pre-validation disabled - proceeding to IEC verification...')

            # ============================================================
            # STEP 1: IEC VERIFICATION (MANDATORY)
            # ============================================================
            if IEC_VERIFIER_AVAILABLE:
                logger.info(f'🔍 Step 1: IEC Verification - Starting...')
                self.ws_client.send_progress('processing', 10, 0, 0, 'Step 1/2: Verifying with IEC database...')

                try:
                    # Load Excel file for verification
                    df = pd.read_excel(file_path)
                    initial_count = len(df)
                    logger.info(f'   Loaded {initial_count} records for IEC verification')

                    # Perform IEC verification
                    verifier = IECVerifier(max_workers=15)
                    verified_df, verification_report = verifier.verify_dataframe(df)

                    # Check if rate limit was hit
                    if verification_report.get('rate_limit_hit', False):
                        reset_time = verification_report.get('rate_limit_reset_time', 0)
                        rows_processed = verification_report.get('rows_processed_before_limit', 0)
                        rate_limit_msg = verification_report.get('rate_limit_message', 'Rate limit exceeded')

                        logger.error(f'🚫 IEC API rate limit exceeded!')
                        logger.error(f'   Processed {rows_processed} of {initial_count} records before limit')
                        logger.error(f'   {rate_limit_msg}')

                        # Calculate reset time
                        from datetime import datetime
                        reset_datetime = datetime.fromtimestamp(reset_time / 1000)
                        reset_str = reset_datetime.strftime('%Y-%m-%d %H:%M:%S')

                        # Send WebSocket notification
                        if hasattr(self.ws_client, 'send_rate_limit_exceeded'):
                            self.ws_client.send_rate_limit_exceeded(
                                file_id=file_id,
                                current_count=verification_report.get('rows_processed_before_limit', 0),
                                max_limit=10000,
                                reset_time=reset_time,
                                rows_processed=rows_processed,
                                rows_total=initial_count,
                                message=f"IEC API rate limit reached. Processed {rows_processed}/{initial_count} records. Resets at {reset_str}."
                            )

                        # Update file status to 'rate_limited'
                        self.update_file_status(
                            file_id=file_id,
                            status='rate_limited',
                            error_message=f"IEC API rate limit exceeded. Processed {rows_processed}/{initial_count} records. Resets at {reset_str}.",
                            rows_total=initial_count,
                            rows_processed=rows_processed,
                            rows_failed=initial_count - rows_processed
                        )

                        # Save partially verified data for resume
                        partial_file_path = file_path.replace('.xlsx', '_partial_verified.xlsx')
                        verified_df.to_excel(partial_file_path, index=False)
                        logger.info(f'💾 Partially verified data saved to: {partial_file_path}')

                        return

                    # Check verification results
                    if not verification_report['success']:
                        error_msg = f"IEC verification failed: {', '.join(verification_report['errors'])}"
                        logger.error(f'❌ {error_msg}')

                        self.update_file_status(
                            file_id=file_id,
                            status='failed',
                            error_message=error_msg,
                            rows_total=initial_count,
                            rows_failed=initial_count
                        )
                        self.ws_client.send_error(error_msg)
                        return

                    # Log verification statistics
                    logger.info(f'✅ IEC Verification completed:')
                    logger.info(f'   Total records: {verification_report["total_records"]}')
                    logger.info(f'   Verified: {verification_report["verified_count"]}')
                    logger.info(f'   Registered in ward: {verification_report["registered_in_ward"]}')
                    logger.info(f'   Not registered: {verification_report["not_registered"]}')
                    logger.info(f'   Different ward: {verification_report["different_ward"]}')
                    logger.info(f'   Deceased: {verification_report["deceased"]}')
                    logger.info(f'   API errors: {verification_report["api_errors"]}')

                    # Save verified data to temporary file for ingestion
                    verified_file_path = file_path.replace('.xlsx', '_verified.xlsx')
                    verified_df.to_excel(verified_file_path, index=False)
                    logger.info(f'💾 Verified data saved to: {verified_file_path}')

                    # Update file path to use verified file
                    file_path = verified_file_path

                    self.ws_client.send_progress('processing', 50, 0, 0,
                                                'Step 1/2: IEC verification completed ✓')

                except Exception as e:
                    error_msg = f"IEC verification error: {str(e)}"
                    logger.error(f'❌ {error_msg}')
                    logger.exception(e)

                    self.update_file_status(
                        file_id=file_id,
                        status='failed',
                        error_message=error_msg
                    )
                    self.ws_client.send_error(error_msg)
                    return
            else:
                logger.warning('⚠️  IEC verification is disabled - skipping verification step')
                self.ws_client.send_progress('processing', 10, 0, 0,
                                            'IEC verification disabled - proceeding to ingestion...')

            # ============================================================
            # STEP 2: DATABASE INGESTION (Only if verification passed)
            # ============================================================
            logger.info(f'💾 Step 2: Database Ingestion - Starting...')
            self.ws_client.send_progress('processing', 60, 0, 0, 'Step 2/2: Ingesting data into database...')

            # Initialize the processor
            processor = FlexibleMembershipIngestion(
                docs_directory=os.path.dirname(file_path),
                db_config=self.db_config,
                use_optimized=True,
                archive_enabled=False  # Don't archive, we'll handle file management
            )

            # Process the file
            logger.info(f'🔄 Processing verified data with FlexibleMembershipIngestion...')
            result = processor.process_file_flexible(file_path)

            # Extract results - map from ingestion script's return format
            # The ingestion script returns: members_imported, members_skipped, success
            rows_success = result.get('members_imported', 0)
            rows_failed = result.get('members_skipped', 0)
            rows_total = rows_success + rows_failed
            errors = result.get('errors', [])

            logger.info(f'📊 Processing results: {rows_success} imported, {rows_failed} skipped, {rows_total} total')

            # Check if processing was successful
            if not result.get('success', False):
                error_msg = result.get('error_message', 'Processing failed')
                logger.error(f'❌ Processing failed: {error_msg}')

                # Update status to failed with partial results
                self.update_file_status(
                    file_id=file_id,
                    status='failed',
                    error_message=error_msg,
                    progress=0,
                    rows_processed=rows_success,
                    rows_total=rows_total,
                    rows_success=rows_success,
                    rows_failed=rows_failed
                )

                # Send error notification
                if self.ws_client:
                    self.ws_client.send_error(error_msg)

                return

            # Log errors to database
            if errors:
                for idx, error in enumerate(errors[:100]):  # Limit to 100 errors
                    self.log_error(
                        file_id=file_id,
                        row_number=error.get('row', idx),
                        error_type=error.get('type', 'unknown'),
                        error_message=error.get('message', 'Unknown error'),
                        row_data=error.get('data')
                    )

            # ============================================================
            # STEP 3: GENERATE EXCEL REPORT
            # ============================================================
            report_path = None
            if EXCEL_REPORT_AVAILABLE:
                try:
                    logger.info(f'📊 Step 3: Generating Excel Report...')
                    self.ws_client.send_progress('processing', 90, rows_total, rows_success,
                                                'Generating Excel report...')

                    # Load the original data for report
                    original_file_path = file_path
                    # Trace back to original file
                    if '_verified' in file_path:
                        original_file_path = file_path.replace('_verified.xlsx', '.xlsx')
                    if '_prevalidated' in file_path:
                        original_file_path = file_path.replace('_prevalidated.xlsx', '.xlsx')

                    df_original = pd.read_excel(original_file_path)
                    df_verified = pd.read_excel(file_path)

                    # Use pre-validation results if available
                    if pre_validation_result:
                        logger.info(f'📋 Using pre-validation results for report...')
                        logger.info(f'📋 Pre-validation result keys: {list(pre_validation_result.keys())}')

                        invalid_ids = pre_validation_result.get('invalid_ids', [])
                        duplicates = pre_validation_result.get('duplicates', [])

                        logger.info(f'📋 Extracted invalid_ids type: {type(invalid_ids)}, length: {len(invalid_ids)}')
                        logger.info(f'📋 Extracted duplicates type: {type(duplicates)}, length: {len(duplicates)}')
                        existing_members = pre_validation_result.get('existing_members', [])
                        new_members_list = pre_validation_result.get('new_members', [])

                        # Format existing members for report
                        existing_members_formatted = []
                        for member in existing_members:
                            existing_members_formatted.append({
                                'ID Number': member.get('ID Number', ''),
                                'Name': member.get('Name', ''),
                                'Surname': member.get('Surname', ''),
                                'Status': 'Updated (Already Existed)',
                                'Created At': member.get('database_created_at', ''),
                                'Updated At': member.get('database_updated_at', '')
                            })

                        # Format new members for report
                        new_members_formatted = []
                        for member in new_members_list:
                            new_members_formatted.append({
                                'ID Number': member.get('ID Number', ''),
                                'Name': member.get('Name', ''),
                                'Surname': member.get('Surname', ''),
                                'Status': 'New Member'
                            })

                        logger.info(f'   Invalid IDs: {len(invalid_ids)}')
                        logger.info(f'   Duplicates: {len(duplicates)}')
                        logger.info(f'   Existing members: {len(existing_members_formatted)}')
                        logger.info(f'   New members: {len(new_members_formatted)}')

                        # Debug: Log sample data
                        if invalid_ids:
                            logger.info(f'   📋 Sample invalid ID: {invalid_ids[0]}')
                        if duplicates:
                            logger.info(f'   📋 Sample duplicate: {duplicates[0]}')
                    else:
                        # Fallback: Check database for existing members
                        logger.info(f'🔍 Checking for existing members in database...')
                        existing_members_formatted = []
                        new_members_formatted = []
                        invalid_ids = []
                        duplicates = []

                        if 'ID Number' in df_verified.columns:
                            id_numbers = df_verified['ID Number'].dropna().astype(str).tolist()

                            if id_numbers:
                                conn = self.connect_db()
                                cursor = conn.cursor()

                                cursor.execute("""
                                    SELECT id_number, member_id, created_at, updated_at
                                    FROM members_consolidated
                                    WHERE id_number = ANY(%s)
                                """, (id_numbers,))

                                existing_records = cursor.fetchall()
                                existing_id_set = {row[0] for row in existing_records}

                                for _, row in df_verified.iterrows():
                                    id_num = str(row.get('ID Number', ''))
                                    if id_num in existing_id_set:
                                        db_record = next((r for r in existing_records if r[0] == id_num), None)
                                        if db_record:
                                            existing_members_formatted.append({
                                                'ID Number': id_num,
                                                'Name': row.get('Name', ''),
                                                'Surname': row.get('Surname', ''),
                                                'Status': 'Updated (Already Existed)',
                                                'Created At': db_record[2],
                                                'Updated At': db_record[3]
                                            })
                                    else:
                                        new_members_formatted.append({
                                            'ID Number': id_num,
                                            'Name': row.get('Name', ''),
                                            'Surname': row.get('Surname', ''),
                                            'Status': 'New Member'
                                        })

                                cursor.close()
                                conn.close()

                    # Extract special cases from verified data
                    different_ward = []
                    not_registered = []

                    if 'voter_district_code' in df_verified.columns:
                        different_ward_df = df_verified[df_verified['voter_district_code'] == '22222222']
                        different_ward = different_ward_df.to_dict('records') if not different_ward_df.empty else []

                        not_registered_df = df_verified[df_verified['voter_district_code'] == '99999999']
                        not_registered = not_registered_df.to_dict('records') if not not_registered_df.empty else []

                    # Prepare processing statistics
                    validation_stats = pre_validation_result.get('validation_stats', {}) if pre_validation_result else {}

                    processing_stats = {
                        'total_records': validation_stats.get('total_records', rows_total),
                        'valid_ids': validation_stats.get('valid_ids', rows_success),
                        'invalid_ids': validation_stats.get('invalid_ids', rows_failed),
                        'verified_count': rows_success,
                        'registered_in_ward': rows_success - len(different_ward) - len(not_registered),
                        'different_ward': len(different_ward),
                        'not_registered': len(not_registered),
                        'deceased': 0,
                        'api_errors': 0,
                        'vd_populated': rows_success,
                        'vd_empty': 0,
                        'unique_ids': validation_stats.get('unique_records', rows_success),
                        'duplicate_ids': validation_stats.get('duplicates', 0),
                        'duplicate_records': validation_stats.get('total_duplicate_records', 0),
                        'imported': rows_success,
                        'skipped': rows_failed,
                        'existing_members': len(existing_members_formatted),
                        'new_members': len(new_members_formatted),
                        'processing_time': result.get('processing_time', 0),
                        'processing_speed': rows_success / result.get('processing_time', 1) if result.get('processing_time', 0) > 0 else 0,
                        'status': 'Completed'
                    }

                    # Create reports directory
                    reports_dir = os.path.join(os.path.dirname(original_file_path), 'reports')
                    os.makedirs(reports_dir, exist_ok=True)

                    # Debug: Log what we're passing to report generator
                    logger.info(f'📊 Generating report with:')
                    logger.info(f'   - Invalid IDs: {len(invalid_ids)} records')
                    logger.info(f'   - Duplicates: {len(duplicates)} records')
                    logger.info(f'   - Different Ward: {len(different_ward)} records')
                    logger.info(f'   - Not Registered: {len(not_registered)} records')
                    logger.info(f'   - New Members: {len(new_members_formatted)} records')
                    logger.info(f'   - Existing Members: {len(existing_members_formatted)} records')

                    if invalid_ids:
                        logger.info(f'   📋 First invalid ID record keys: {list(invalid_ids[0].keys())}')
                    if duplicates:
                        logger.info(f'   📋 First duplicate record keys: {list(duplicates[0].keys())}')

                    # Generate report
                    generator = ExcelReportGenerator(original_filename, reports_dir)
                    report_path = generator.generate_report(
                        df_original=df_original,
                        df_verified=df_verified,
                        processing_stats=processing_stats,
                        invalid_ids=invalid_ids,
                        duplicates=duplicates,
                        different_ward=different_ward,
                        not_registered=not_registered,
                        successfully_imported=new_members_formatted,
                        existing_members=existing_members_formatted
                    )

                    logger.info(f'✅ Excel report generated: {report_path}')

                    # Update database with report path
                    conn = self.connect_db()
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE uploaded_files
                        SET report_file_path = %s
                        WHERE file_id = %s
                    """, (report_path, file_id))
                    conn.commit()
                    cursor.close()
                    conn.close()

                    logger.info(f'✅ Report path saved to database')

                except Exception as e:
                    logger.error(f'❌ Failed to generate Excel report: {e}')
                    logger.exception(e)
                    # Don't fail the entire process if report generation fails
            else:
                logger.warning('⚠️  Excel report generation is disabled')

            # Update final status
            self.update_file_status(
                file_id=file_id,
                status='completed',
                progress=100,
                rows_processed=rows_total,
                rows_total=rows_total,
                rows_success=rows_success,
                rows_failed=rows_failed
            )

            # Send completion notification with validation stats
            validation_stats_to_send = None
            if pre_validation_result:
                validation_stats_to_send = pre_validation_result['validation_stats']

            self.ws_client.send_complete(
                rows_success=rows_success,
                rows_failed=rows_failed,
                rows_total=rows_total,
                errors=errors[:10] if errors else None,  # Send first 10 errors
                validation_stats=validation_stats_to_send  # Include pre-validation stats
            )

            logger.info(f'✅ File {file_id} processed successfully: {rows_success}/{rows_total} rows')
            if report_path:
                logger.info(f'📊 Excel report available at: {report_path}')

        except Exception as e:
            error_msg = str(e)
            logger.error(f'❌ Error processing file {file_id}: {error_msg}')

            # Update status to failed
            self.update_file_status(file_id, 'failed', error_message=error_msg)

            # Send error notification
            if self.ws_client:
                self.ws_client.send_error(error_msg)

        finally:
            # Disconnect WebSocket
            if self.ws_client:
                self.ws_client.disconnect()

    def run(self, interval: int = 10):
        """
        Run the processor in a loop

        Args:
            interval: Seconds to wait between checks
        """
        logger.info(f' Bulk Upload Processor started')
        logger.info(f' Watching directory: {self.upload_dir}')
        logger.info(f'🔌 WebSocket URL: {self.websocket_url}')
        logger.info('')
        logger.info('🔄 Starting main loop (checking every %d seconds)...', interval)

        loop_count = 0
        while True:
            try:
                loop_count += 1
                logger.debug(f'[Loop {loop_count}] Checking for pending files...')

                # Get pending files
                pending_files = self.get_pending_files()

                if pending_files:
                    logger.info(f'📋 Found {len(pending_files)} pending files')

                    for file_id, _filename, file_path, original_filename in pending_files:
                        self.process_file(file_id, file_path, original_filename)
                else:
                    logger.debug(f'[Loop {loop_count}] No pending files found')

                # Wait before next check
                time.sleep(interval)

            except KeyboardInterrupt:
                logger.info('👋 Shutting down processor...')
                break
            except Exception as e:
                logger.error(f'Error in main loop: {e}')
                time.sleep(interval)


if __name__ == '__main__':
    # Import configuration
    from config import DB_CONFIG, UPLOAD_DIR, WEBSOCKET_URL, PROCESSING_INTERVAL

    # Create and run processor
    processor = BulkUploadProcessor(DB_CONFIG, UPLOAD_DIR, WEBSOCKET_URL)
    processor.run(interval=PROCESSING_INTERVAL)

