"""
Pre-Validation Processor
Validates uploaded data before database insertion
"""

import pandas as pd
import psycopg2
from typing import Dict, List, Tuple
import logging
from upload_validation_utils import validate_sa_id_number, normalize_id_number, detect_duplicates_in_dataframe

logger = logging.getLogger(__name__)


class PreValidationProcessor:
    """Performs pre-validation checks before database insertion"""
    
    def __init__(self, db_config: Dict):
        """
        Initialize pre-validation processor
        
        Args:
            db_config: Database configuration dict
        """
        self.db_config = db_config
    
    def connect_db(self):
        """Connect to PostgreSQL database"""
        return psycopg2.connect(**self.db_config)
    
    def validate_dataframe(self, df: pd.DataFrame) -> Dict:
        """
        Perform comprehensive pre-validation on the dataframe
        
        Args:
            df: DataFrame to validate
            
        Returns:
            Dict with validation results:
                - valid_df: DataFrame with only valid records (duplicates removed, keeping first)
                - invalid_ids: List of records with invalid ID numbers
                - duplicates: List of duplicate records
                - existing_members: List of members that already exist in database
                - validation_stats: Statistics about validation
        """
        logger.info(f"🔍 Starting pre-validation for {len(df)} records...")
        
        result = {
            'valid_df': pd.DataFrame(),
            'invalid_ids': [],
            'duplicates': [],
            'existing_members': [],
            'new_members': [],
            'validation_stats': {}
        }
        
        # Make a copy to avoid modifying original
        df_work = df.copy()
        
        # ============================================================
        # STEP 1: NORMALIZE AND VALIDATE ID NUMBERS
        # ============================================================
        logger.info("📋 Step 1: Validating ID numbers...")
        
        invalid_ids = []
        valid_mask = []
        
        for idx, row in df_work.iterrows():
            id_num = row.get('ID Number')
            
            # Normalize ID number
            normalized_id = normalize_id_number(id_num)
            
            if not normalized_id:
                invalid_ids.append({
                    'row_number': idx + 2,  # +2 for Excel row (header + 0-index)
                    'id_number': str(id_num) if id_num else 'MISSING',
                    'error': 'Invalid or missing ID number',
                    **row.to_dict()
                })
                valid_mask.append(False)
                continue
            
            # Update the dataframe with normalized ID
            df_work.at[idx, 'ID Number'] = normalized_id
            
            # Validate ID number
            is_valid, error_msg = validate_sa_id_number(normalized_id)
            
            if not is_valid:
                invalid_ids.append({
                    'row_number': idx + 2,
                    'id_number': normalized_id,
                    'error': error_msg,
                    **row.to_dict()
                })
                valid_mask.append(False)
            else:
                valid_mask.append(True)
        
        # Filter to only valid IDs
        df_valid = df_work[valid_mask].copy()
        
        logger.info(f"   ✅ Valid IDs: {len(df_valid)}")
        logger.info(f"   ❌ Invalid IDs: {len(invalid_ids)}")

        result['invalid_ids'] = invalid_ids
        logger.info(f"   🔍 DEBUG: Stored {len(invalid_ids)} invalid_ids in result")
        if invalid_ids:
            logger.info(f"   🔍 DEBUG: Sample invalid_id: {invalid_ids[0]}")
        
        if len(df_valid) == 0:
            logger.warning("⚠️  No valid records found after ID validation")
            result['validation_stats'] = {
                'total_records': len(df),
                'valid_ids': 0,
                'invalid_ids': len(invalid_ids),
                'duplicates': 0,
                'existing_members': 0,
                'new_members': 0
            }
            return result
        
        # ============================================================
        # STEP 2: DETECT DUPLICATES WITHIN FILE
        # ============================================================
        logger.info("📋 Step 2: Detecting duplicates...")
        
        duplicate_info = detect_duplicates_in_dataframe(df_valid, 'ID Number')
        
        # Keep only first occurrence of each duplicate
        df_no_duplicates = df_valid.drop_duplicates(subset=['ID Number'], keep='first').copy()
        
        logger.info(f"   ✅ Unique records: {len(df_no_duplicates)}")
        logger.info(f"   ⚠️  Duplicate IDs found: {duplicate_info['duplicate_count']}")
        logger.info(f"   ⚠️  Total duplicate records: {duplicate_info['total_duplicate_records']}")

        result['duplicates'] = duplicate_info['duplicate_records']
        logger.info(f"   🔍 DEBUG: Stored {len(duplicate_info['duplicate_records'])} duplicates in result")
        if duplicate_info['duplicate_records']:
            logger.info(f"   🔍 DEBUG: Sample duplicate: {duplicate_info['duplicate_records'][0]}")
        
        # ============================================================
        # STEP 3: CHECK EXISTING MEMBERS IN DATABASE
        # ============================================================
        logger.info("📋 Step 3: Checking for existing members in database...")
        
        id_numbers = df_no_duplicates['ID Number'].tolist()
        
        try:
            conn = self.connect_db()
            cursor = conn.cursor()
            
            # Check which IDs already exist
            cursor.execute("""
                SELECT id_number, member_id, created_at, updated_at
                FROM members_consolidated
                WHERE id_number = ANY(%s)
            """, (id_numbers,))
            
            existing_records = cursor.fetchall()
            existing_id_set = {row[0] for row in existing_records}
            
            cursor.close()
            conn.close()
            
            # Categorize records
            existing_members = []
            new_members = []
            
            for _, row in df_no_duplicates.iterrows():
                id_num = row['ID Number']
                record_dict = row.to_dict()
                
                if id_num in existing_id_set:
                    # Find the database record
                    db_record = next((r for r in existing_records if r[0] == id_num), None)
                    if db_record:
                        existing_members.append({
                            **record_dict,
                            'database_member_id': db_record[1],
                            'database_created_at': db_record[2],
                            'database_updated_at': db_record[3],
                            'status': 'Will be updated'
                        })
                else:
                    new_members.append({
                        **record_dict,
                        'status': 'Will be inserted'
                    })
            
            logger.info(f"   ✅ Existing members (will be updated): {len(existing_members)}")
            logger.info(f"   ✅ New members (will be inserted): {len(new_members)}")
            
            result['existing_members'] = existing_members
            result['new_members'] = new_members
            
        except Exception as e:
            logger.error(f"❌ Error checking existing members: {e}")
            logger.exception(e)
        
        # ============================================================
        # FINAL RESULT
        # ============================================================
        result['valid_df'] = df_no_duplicates
        result['validation_stats'] = {
            'total_records': len(df),
            'valid_ids': len(df_valid),
            'invalid_ids': len(invalid_ids),
            'unique_records': len(df_no_duplicates),
            'duplicates': duplicate_info['duplicate_count'],
            'total_duplicate_records': duplicate_info['total_duplicate_records'],
            'existing_members': len(existing_members) if 'existing_members' in locals() else 0,
            'new_members': len(new_members) if 'new_members' in locals() else 0
        }
        
        logger.info(f"✅ Pre-validation complete:")
        logger.info(f"   Total records: {result['validation_stats']['total_records']}")
        logger.info(f"   Valid for processing: {len(df_no_duplicates)}")
        logger.info(f"   Invalid IDs: {result['validation_stats']['invalid_ids']}")
        logger.info(f"   Duplicates removed: {result['validation_stats']['total_duplicate_records'] - result['validation_stats']['duplicates']}")
        
        return result

