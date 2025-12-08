"""
Upload Validation Utilities
Pre-validation functions for bulk upload processing
"""

import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


def validate_sa_id_number(id_number: str) -> Tuple[bool, Optional[str]]:
    """
    Validate South African ID number using Luhn algorithm and date validation
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not id_number or not isinstance(id_number, str):
        return False, "ID number is required"
    
    # Remove spaces and ensure it's 13 digits
    id_clean = id_number.strip().replace(' ', '')
    if not id_clean.isdigit():
        return False, "ID number must contain only digits"
    
    if len(id_clean) != 13:
        return False, f"ID number must be exactly 13 digits (found {len(id_clean)})"
    
    # Validate date portion (YYMMDD)
    try:
        year = int(id_clean[0:2])
        month = int(id_clean[2:4])
        day = int(id_clean[4:6])
        
        # Validate month
        if month < 1 or month > 12:
            return False, f"Invalid month in ID number: {month:02d}"
        
        # Validate day
        if day < 1 or day > 31:
            return False, f"Invalid day in ID number: {day:02d}"
        
        # Determine full year (assume < 25 is 2000s, >= 25 is 1900s)
        if year < 25:
            full_year = 2000 + year
        else:
            full_year = 1900 + year
        
        # Validate the date is valid (e.g., no Feb 30, no Apr 31)
        birth_date = datetime(full_year, month, day)
        
        # Check if date is not in the future
        if birth_date > datetime.now():
            return False, "Date of birth cannot be in the future"
            
    except ValueError as e:
        return False, f"Invalid date in ID number: {str(e)}"
    
    # Luhn algorithm checksum validation
    try:
        digits = [int(d) for d in id_clean]
        checksum = 0
        
        # Process odd positions (from left, 0-indexed)
        for i in range(0, 13, 2):
            checksum += digits[i]
        
        # Process even positions (from left, 0-indexed) - double and subtract 9 if > 9
        for i in range(1, 13, 2):
            doubled = digits[i] * 2
            checksum += doubled if doubled < 10 else doubled - 9
        
        if checksum % 10 != 0:
            return False, "Invalid ID number checksum"
            
    except Exception as e:
        return False, f"Checksum validation error: {str(e)}"
    
    return True, None


def normalize_id_number(id_num) -> Optional[str]:
    """Normalize ID number - ensure 13 digits, pad with 0 if needed"""
    if not id_num or pd.isna(id_num):
        return None

    id_str = str(id_num).strip()

    # Handle Excel float formatting (e.g., "8412020217088.0" -> "8412020217088")
    if '.' in id_str:
        id_str = id_str.split('.')[0]

    # Remove any remaining non-digit characters
    import re
    id_digits = re.sub(r'\D', '', id_str)

    if not id_digits:
        return None

    # Pad with leading zeros if less than 13 digits
    if len(id_digits) < 13:
        id_digits = id_digits.zfill(13)

    # Validate length
    if len(id_digits) == 13:
        return id_digits

    return None


def detect_duplicates_in_dataframe(df: pd.DataFrame, id_column: str = 'ID Number') -> Dict:
    """
    Detect duplicate ID numbers within the dataframe
    
    Returns:
        Dict with:
            - duplicate_ids: List of duplicate ID numbers
            - duplicate_records: List of all duplicate records (including all occurrences)
            - unique_count: Number of unique IDs
            - duplicate_count: Number of duplicate IDs
    """
    # Find duplicates
    duplicate_mask = df.duplicated(subset=[id_column], keep=False)
    duplicate_records = df[duplicate_mask].copy()
    
    # Get unique duplicate IDs
    duplicate_ids = duplicate_records[id_column].unique().tolist()
    
    # Convert duplicate records to list of dicts
    duplicate_records_list = duplicate_records.to_dict('records')
    
    return {
        'duplicate_ids': duplicate_ids,
        'duplicate_records': duplicate_records_list,
        'unique_count': df[id_column].nunique(),
        'duplicate_count': len(duplicate_ids),
        'total_duplicate_records': len(duplicate_records)
    }

