"""
Standalone script to process a specific Excel file with comprehensive reporting
Provides detailed statistics on duplicates, ID validation, IEC verification, and VD numbers
"""

import os
import sys
import pandas as pd
import logging
from datetime import datetime
from collections import Counter

# Add repository root to path
repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, repo_root)

from flexible_membership_ingestionV2 import FlexibleMembershipIngestion
from iec_verification_module import IECVerifier, IECVerificationError
from excel_report_generator import ExcelReportGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def validate_sa_id_number(id_number: str) -> bool:
    """Validate South African ID number using Luhn algorithm"""
    if not id_number or not isinstance(id_number, str):
        return False
    
    # Remove spaces and ensure it's 13 digits
    id_clean = id_number.strip().replace(' ', '')
    if not id_clean.isdigit() or len(id_clean) != 13:
        return False
    
    # Luhn algorithm check
    try:
        digits = [int(d) for d in id_clean]
        checksum = 0
        
        # Process odd positions (from right, 0-indexed)
        for i in range(0, 13, 2):
            checksum += digits[i]
        
        # Process even positions (from right, 0-indexed) - double and subtract 9 if > 9
        for i in range(1, 13, 2):
            doubled = digits[i] * 2
            checksum += doubled if doubled < 10 else doubled - 9
        
        return checksum % 10 == 0
    except:
        return False


def analyze_file_detailed(file_path: str) -> dict:
    """
    Analyze Excel file and provide comprehensive statistics
    
    Returns:
        Dictionary with detailed statistics
    """
    logger.info(f"\n{'='*80}")
    logger.info(f"COMPREHENSIVE FILE ANALYSIS REPORT")
    logger.info(f"{'='*80}")
    logger.info(f"File: {os.path.basename(file_path)}")
    logger.info(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"{'='*80}\n")
    
    # Load the file
    logger.info("📂 Loading Excel file...")
    df = pd.read_excel(file_path)
    
    report = {
        'file_name': os.path.basename(file_path),
        'total_records': len(df),
        'columns': list(df.columns),
    }
    
    logger.info(f"✅ Loaded {len(df):,} records")
    logger.info(f"📋 Columns found: {', '.join(df.columns)}\n")
    
    # ============================================================
    # 1. ID NUMBER ANALYSIS
    # ============================================================
    logger.info("="*80)
    logger.info("1. ID NUMBER VALIDATION")
    logger.info("="*80)
    
    if 'ID Number' in df.columns:
        # Clean ID numbers
        df['ID_Clean'] = df['ID Number'].apply(
            lambda x: str(x).strip().replace(' ', '').zfill(13)[:13] if pd.notna(x) else None
        )
        
        valid_ids = []
        invalid_ids = []
        
        for idx, row in df.iterrows():
            id_val = row['ID_Clean']
            if id_val:
                if validate_sa_id_number(id_val):
                    valid_ids.append(id_val)
                else:
                    invalid_ids.append((idx + 2, id_val))  # +2 for Excel row (header + 0-index)
        
        report['id_validation'] = {
            'total_ids': len(df),
            'valid_ids': len(valid_ids),
            'invalid_ids': len(invalid_ids),
            'invalid_examples': invalid_ids[:10]  # First 10 examples
        }
        
        logger.info(f"Total records: {len(df):,}")
        logger.info(f"✅ Valid SA ID numbers: {len(valid_ids):,} ({len(valid_ids)/len(df)*100:.1f}%)")
        logger.info(f"❌ Invalid ID numbers: {len(invalid_ids):,} ({len(invalid_ids)/len(df)*100:.1f}%)")
        
        if invalid_ids:
            logger.info(f"\nInvalid ID Examples (first 10):")
            for row_num, id_val in invalid_ids[:10]:
                logger.info(f"  Row {row_num}: {id_val}")
    
    logger.info("")
    
    # ============================================================
    # 2. DUPLICATE DETECTION
    # ============================================================
    logger.info("="*80)
    logger.info("2. DUPLICATE DETECTION")
    logger.info("="*80)
    
    if 'ID Number' in df.columns:
        id_counts = Counter(df['ID_Clean'].dropna())
        duplicates = {id_num: count for id_num, count in id_counts.items() if count > 1}

        # Create top duplicates list for report
        top_duplicates = [
            {'id_number': id_num, 'count': count}
            for id_num, count in sorted(duplicates.items(), key=lambda x: x[1], reverse=True)[:20]
        ]

        report['duplicates'] = {
            'unique_ids': len(id_counts),
            'total_duplicates': len(duplicates),
            'duplicate_records': sum(duplicates.values()),
            'duplicate_ids': list(duplicates.keys())[:20],  # First 20
            'top_duplicates': top_duplicates
        }

        logger.info(f"Unique ID numbers: {len(id_counts):,}")
        logger.info(f"🔄 Duplicate ID numbers: {len(duplicates):,}")
        logger.info(f"📊 Total duplicate records: {sum(duplicates.values()):,}")

        if duplicates:
            logger.info(f"\nTop 10 Most Duplicated IDs:")
            for id_num, count in sorted(duplicates.items(), key=lambda x: x[1], reverse=True)[:10]:
                logger.info(f"  {id_num}: appears {count} times")
    
    logger.info("")
    
    return report, df


def perform_iec_verification(df: pd.DataFrame, report: dict) -> pd.DataFrame:
    """Perform IEC verification and add statistics to report"""
    logger.info("="*80)
    logger.info("3. IEC VERIFICATION")
    logger.info("="*80)

    try:
        verifier = IECVerifier(max_workers=15)
        verified_df, iec_report = verifier.verify_dataframe(df)

        report['iec_verification'] = iec_report

        logger.info(f"Total records verified: {iec_report['total_records']:,}")
        logger.info(f"✅ Successfully verified: {iec_report['verified_count']:,}")
        logger.info(f"📊 Registered in correct ward: {iec_report['registered_in_ward']:,} ({iec_report['registered_in_ward']/iec_report['total_records']*100:.1f}%)")
        logger.info(f"📊 Not registered to vote: {iec_report['not_registered']:,} ({iec_report['not_registered']/iec_report['total_records']*100:.1f}%)")
        logger.info(f"📊 Registered in different ward: {iec_report['different_ward']:,} ({iec_report['different_ward']/iec_report['total_records']*100:.1f}%)")
        logger.info(f"📊 Deceased: {iec_report['deceased']:,}")
        logger.info(f"❌ API errors: {iec_report['api_errors']:,}")

        # VD Number statistics
        vd_populated = verified_df['VD Number'].notna().sum()
        vd_empty = verified_df['VD Number'].isna().sum()

        report['vd_numbers'] = {
            'populated': vd_populated,
            'empty': vd_empty,
            'percentage_populated': vd_populated / len(verified_df) * 100 if len(verified_df) > 0 else 0
        }

        logger.info(f"\n📍 VD Number Population:")
        logger.info(f"  ✅ Records with VD numbers: {vd_populated:,} ({vd_populated/len(verified_df)*100:.1f}%)")
        logger.info(f"  ❌ Records without VD numbers: {vd_empty:,} ({vd_empty/len(verified_df)*100:.1f}%)")

        return verified_df

    except Exception as e:
        logger.error(f"❌ IEC verification failed: {e}")
        logger.exception(e)
        report['iec_verification'] = {'error': str(e)}
        return df


def process_to_database(file_path: str, report: dict):
    """Process verified file to database"""
    logger.info("\n" + "="*80)
    logger.info("4. DATABASE INGESTION")
    logger.info("="*80)

    # Database configuration - use correct credentials
    db_config = {
        'host': 'localhost',
        'user': 'eff_admin',
        'password': 'Frames!123',
        'database': 'eff_membership_database'
    }

    try:
        processor = FlexibleMembershipIngestion(
            docs_directory=os.path.dirname(file_path),
            db_config=db_config,
            use_optimized=True,
            archive_enabled=False
        )

        logger.info("Processing file to database...")
        result = processor.process_file_flexible(file_path)

        report['database_ingestion'] = result

        logger.info(f"\n📊 Database Ingestion Results:")
        logger.info(f"  ✅ Members imported: {result.get('members_imported', 0):,}")
        logger.info(f"  ⏭️  Members skipped: {result.get('members_skipped', 0):,}")
        logger.info(f"  ⏱️  Processing time: {result.get('processing_time', 0):.2f} seconds")
        logger.info(f"  Status: {'SUCCESS' if result.get('success') else 'FAILED'}")

        if result.get('error_message'):
            logger.error(f"  ❌ Error: {result['error_message']}")

    except Exception as e:
        logger.error(f"❌ Database ingestion failed: {e}")
        logger.exception(e)
        report['database_ingestion'] = {'error': str(e)}


def print_final_summary(report: dict):
    """Print final summary report"""
    logger.info("\n" + "="*80)
    logger.info("FINAL SUMMARY")
    logger.info("="*80)

    logger.info(f"\n📄 File: {report['file_name']}")
    logger.info(f"📊 Total Records: {report['total_records']:,}")

    if 'id_validation' in report:
        logger.info(f"\n🆔 ID Validation:")
        logger.info(f"  Valid IDs: {report['id_validation']['valid_ids']:,}")
        logger.info(f"  Invalid IDs: {report['id_validation']['invalid_ids']:,}")

    if 'duplicates' in report:
        logger.info(f"\n🔄 Duplicates:")
        logger.info(f"  Duplicate ID numbers: {report['duplicates']['total_duplicates']:,}")
        logger.info(f"  Total duplicate records: {report['duplicates']['duplicate_records']:,}")

    if 'iec_verification' in report and 'total_records' in report['iec_verification']:
        iec = report['iec_verification']
        logger.info(f"\n🔍 IEC Verification:")
        logger.info(f"  Registered in ward: {iec['registered_in_ward']:,}")
        logger.info(f"  Not registered: {iec['not_registered']:,}")
        logger.info(f"  Different ward: {iec['different_ward']:,}")
        logger.info(f"  Deceased: {iec['deceased']:,}")

    if 'vd_numbers' in report:
        logger.info(f"\n📍 VD Numbers:")
        logger.info(f"  Populated: {report['vd_numbers']['populated']:,} ({report['vd_numbers']['percentage_populated']:.1f}%)")
        logger.info(f"  Empty: {report['vd_numbers']['empty']:,}")

    if 'database_ingestion' in report and 'members_imported' in report['database_ingestion']:
        db = report['database_ingestion']
        logger.info(f"\n💾 Database Ingestion:")
        logger.info(f"  Imported: {db.get('members_imported', 0):,}")
        logger.info(f"  Skipped: {db.get('members_skipped', 0):,}")
        logger.info(f"  Success: {db.get('success', False)}")

    logger.info("\n" + "="*80)


def generate_excel_report(file_path: str, df_original: pd.DataFrame, df_verified: pd.DataFrame, report: dict):
    """Generate comprehensive Excel report"""
    logger.info("\n" + "="*80)
    logger.info("5. EXCEL REPORT GENERATION")
    logger.info("="*80)

    try:
        # Prepare data for report
        output_dir = os.path.dirname(file_path)
        original_filename = os.path.basename(file_path)

        # Extract invalid IDs
        invalid_ids = []
        if 'id_validation' in report and 'invalid_examples' in report['id_validation']:
            for example in report['id_validation']['invalid_examples']:
                # example is a tuple: (row_num, id_val)
                if isinstance(example, tuple) and len(example) == 2:
                    row_num, id_num = example
                else:
                    continue

                # Find the record in original DataFrame
                try:
                    # row_num is Excel row (1-based with header), so subtract 2 for 0-based index
                    df_idx = row_num - 2
                    if 0 <= df_idx < len(df_original):
                        row_data = df_original.iloc[df_idx]

                        # Determine reason for invalidity
                        id_str = str(id_num).replace('.', '').replace(' ', '')
                        if len(id_str) < 13:
                            reason = f"{len(id_str)} digits - too short"
                        elif len(id_str) > 13:
                            reason = f"{len(id_str)} digits - too long"
                        else:
                            reason = "Failed Luhn algorithm check"

                        invalid_ids.append({
                            'Row Number': row_num,
                            'ID Number': df_original.iloc[df_idx]['ID Number'] if 'ID Number' in df_original.columns else id_num,
                            'Firstname': row_data.get('Firstname', '') if 'Firstname' in row_data else '',
                            'Surname': row_data.get('Surname', '') if 'Surname' in row_data else '',
                            'Reason': reason
                        })
                except Exception as e:
                    logger.warning(f"Error processing invalid ID at row {row_num}: {e}")
                    pass

        # Extract duplicates
        duplicates = []
        if 'duplicates' in report and 'top_duplicates' in report['duplicates']:
            for dup in report['duplicates']['top_duplicates']:
                id_num = dup.get('id_number', '')
                count = dup.get('count', 0)

                # Find all rows with this ID using the cleaned ID column
                if 'ID_Clean' in df_original.columns:
                    matching_rows = df_original[df_original['ID_Clean'] == id_num]
                else:
                    # Fallback to manual cleaning
                    matching_rows = df_original[
                        df_original['ID Number'].astype(str).str.replace('.', '').str.replace(' ', '').str.zfill(13) == str(id_num)
                    ]

                rows_info = []
                for idx, row in matching_rows.iterrows():
                    # Excel row is idx + 2 (header + 0-based index)
                    rows_info.append(f"Row {idx + 2}: {row.get('Firstname', '')} {row.get('Surname', '')}")

                duplicates.append({
                    'ID Number': id_num,
                    'Occurrences': count,
                    'Rows': ' | '.join(rows_info) if rows_info else 'N/A',
                    'Record Kept': 'Last occurrence'
                })

        # Extract different ward members
        different_ward = []
        if df_verified is not None:
            diff_ward_df = df_verified[df_verified['iec_verification_status'] == 'DIFFERENT_WARD']
            for idx, row in diff_ward_df.iterrows():
                different_ward.append({
                    'ID Number': row.get('ID Number', ''),
                    'Firstname': row.get('Firstname', ''),
                    'Surname': row.get('Surname', ''),
                    'Excel Ward': row.get('Ward', ''),
                    'IEC Ward': row.get('iec_ward', ''),
                    'VD Number': row.get('VD Number', ''),
                    'Voting Station': row.get('iec_voting_station', '')
                })

        # Extract not registered members
        not_registered = []
        if df_verified is not None:
            not_reg_df = df_verified[df_verified['iec_verification_status'] == 'NOT_REGISTERED']
            for idx, row in not_reg_df.iterrows():
                not_registered.append({
                    'ID Number': row.get('ID Number', ''),
                    'Firstname': row.get('Firstname', ''),
                    'Surname': row.get('Surname', ''),
                    'Cell Number': row.get('Cell Number', ''),
                    'Email': row.get('Email', '')
                })

        # Extract successfully imported members
        successfully_imported = []
        if df_verified is not None:
            imported_df = df_verified[df_verified['iec_verification_status'].notna()]
            for idx, row in imported_df.iterrows():
                successfully_imported.append({
                    'ID Number': row.get('ID Number', ''),
                    'Firstname': row.get('Firstname', ''),
                    'Surname': row.get('Surname', ''),
                    'Ward': row.get('Ward', ''),
                    'VD Number': row.get('VD Number', ''),
                    'Voter Status': row.get('VOTER STATUS', ''),
                    'Date Joined': row.get('Date Joined', ''),
                    'Last Payment': row.get('Last Payment', '')
                })

        # Prepare processing stats
        processing_stats = {
            'total_records': report.get('total_records', 0),
            'valid_ids': report.get('id_validation', {}).get('valid_ids', 0),
            'invalid_ids': report.get('id_validation', {}).get('invalid_ids', 0),
            'verified_count': report.get('iec_verification', {}).get('verified_count', 0),
            'registered_in_ward': report.get('iec_verification', {}).get('registered_in_ward', 0),
            'different_ward': report.get('iec_verification', {}).get('different_ward', 0),
            'not_registered': report.get('iec_verification', {}).get('not_registered', 0),
            'deceased': report.get('iec_verification', {}).get('deceased', 0),
            'api_errors': report.get('iec_verification', {}).get('api_errors', 0),
            'vd_populated': report.get('vd_numbers', {}).get('populated', 0),
            'vd_empty': report.get('vd_numbers', {}).get('empty', 0),
            'unique_ids': report.get('duplicates', {}).get('unique_ids', 0),
            'duplicate_ids': report.get('duplicates', {}).get('total_duplicates', 0),
            'duplicate_records': report.get('duplicates', {}).get('duplicate_records', 0),
            'imported': report.get('database_ingestion', {}).get('members_imported', 0),
            'skipped': report.get('database_ingestion', {}).get('members_skipped', 0),
            'processing_time': report.get('database_ingestion', {}).get('processing_time', 0),
            'processing_speed': report.get('database_ingestion', {}).get('processing_speed', 0),
            'status': 'SUCCESS' if report.get('database_ingestion', {}).get('success', False) else 'FAILED'
        }

        # Generate report
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

        logger.info(f"\n📊 Excel Report Generated:")
        logger.info(f"  File: {os.path.basename(report_path)}")
        logger.info(f"  Location: {report_path}")

        # Store report path in report dict
        report['excel_report'] = {
            'filename': os.path.basename(report_path),
            'path': report_path
        }

    except Exception as e:
        logger.error(f"❌ Failed to generate Excel report: {e}")
        import traceback
        traceback.print_exc()


def main():
    # File to process
    file_path = r"c:\Development\NewProj\Membership-newV2\reports\Copy of 2nd Matjhabeng Ward 11 Duplicates 14.11.2025(1).xlsx"

    if not os.path.exists(file_path):
        logger.error(f"❌ File not found: {file_path}")
        return

    # Step 1: Analyze file
    report, df = analyze_file_detailed(file_path)

    # Step 2: IEC Verification
    verified_df = perform_iec_verification(df, report)

    # Save verified file
    verified_file_path = file_path.replace('.xlsx', '_verified.xlsx')
    verified_df.to_excel(verified_file_path, index=False)
    logger.info(f"\n💾 Verified data saved to: {verified_file_path}")

    # Step 3: Database ingestion
    process_to_database(verified_file_path, report)

    # Step 4: Generate Excel Report
    generate_excel_report(file_path, df, verified_df, report)

    # Step 5: Final summary
    print_final_summary(report)


if __name__ == '__main__':
    main()

