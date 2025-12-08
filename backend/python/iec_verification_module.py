"""
IEC Verification Module for Bulk Upload Integration
Provides reusable IEC verification functionality for the membership ingestion workflow
"""

import requests
import pandas as pd
import logging
from typing import Dict, List, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# Import rate limit tracker
try:
    from iec_rate_limit_tracker import IECRateLimitTracker, RateLimitExceeded, RateLimitWarning
    RATE_LIMIT_TRACKING_AVAILABLE = True
except ImportError:
    RATE_LIMIT_TRACKING_AVAILABLE = False
    logger.warning('⚠️  Rate limit tracking not available')

# IEC API Configuration
API_USERNAME = 'IECWebAPIPartyEFF'
API_PASSWORD = '85316416dc5b498586ed519e670931e9'
TOKEN_URL = 'https://api.elections.org.za/token'
VOTER_ENDPOINT = 'https://api.elections.org.za/api/Voters/IDNumber/'
MAX_WORKERS = 15

logger = logging.getLogger(__name__)


class IECVerificationError(Exception):
    """Custom exception for IEC verification errors"""
    pass


class IECRateLimitError(Exception):
    """Custom exception for IEC rate limit errors"""
    def __init__(self, message: str, reset_time: int, current_count: int, rows_processed: int):
        super().__init__(message)
        self.reset_time = reset_time
        self.current_count = current_count
        self.rows_processed = rows_processed


class IECVerifier:
    """Handles IEC voter verification for bulk uploads"""

    def __init__(self, max_workers: int = MAX_WORKERS):
        self.max_workers = max_workers
        self.token = None
        self.token_expiry = None
        self.rate_limit_tracker = IECRateLimitTracker() if RATE_LIMIT_TRACKING_AVAILABLE else None
        self.requests_made = 0  # Track requests in current batch

    @staticmethod
    def get_voter_status_display(status_code: str) -> str:
        """
        Convert verification status code to human-readable format

        Args:
            status_code: Internal status code (e.g., 'REGISTERED_IN_WARD')

        Returns:
            Human-readable status string
        """
        status_map = {
            'REGISTERED_IN_WARD': 'Registered in Ward',
            'NOT_REGISTERED': 'Not Registered',
            'DIFFERENT_WARD': 'Registered in Different Ward',
            'DECEASED': 'Deceased',
            'API_ERROR': 'Verification Error',
            'UNKNOWN': 'Unknown Status'
        }
        return status_map.get(status_code, 'Unknown Status')
    
    def get_access_token(self) -> str:
        """Get IEC API access token"""
        try:
            data = {
                'grant_type': 'password',
                'username': API_USERNAME,
                'password': API_PASSWORD
            }
            response = requests.post(TOKEN_URL, data=data, timeout=15)
            response.raise_for_status()
            
            token_data = response.json()
            self.token = token_data['access_token']
            logger.info("✅ IEC API token obtained successfully")
            return self.token
            
        except Exception as e:
            logger.error(f"❌ Failed to get IEC API token: {e}")
            raise IECVerificationError(f"Failed to authenticate with IEC API: {e}")
    
    def fetch_voter(self, id_number: str, token: str) -> Optional[Dict]:
        """Fetch voter details from IEC API with rate limit checking"""
        # Check rate limit before making request
        if self.rate_limit_tracker:
            try:
                self.rate_limit_tracker.check_and_increment()
                self.requests_made += 1
            except RateLimitExceeded as e:
                logger.error(f"❌ Rate limit exceeded: {e}")
                raise IECRateLimitError(
                    str(e),
                    e.reset_time,
                    e.current_count,
                    self.requests_made
                )
            except RateLimitWarning as e:
                # Just log warning, continue processing
                logger.warning(f"⚠️  {e}")

        headers = {'Authorization': f'Bearer {token}'}
        try:
            response = requests.get(
                f"{VOTER_ENDPOINT}{id_number}",
                headers=headers,
                timeout=12
            )

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return {"bRegistered": False, "VotingStation": {}}
            elif response.status_code == 429:
                # IEC API returned rate limit error
                logger.error(f"❌ IEC API rate limit (429) for ID {id_number}")
                raise IECRateLimitError(
                    "IEC API rate limit exceeded (HTTP 429)",
                    int(time.time() * 1000) + 3600000,  # 1 hour from now
                    self.requests_made,
                    self.requests_made
                )
            else:
                logger.warning(f"Unexpected status {response.status_code} for ID {id_number}")
                return None

        except IECRateLimitError:
            # Re-raise rate limit errors
            raise
        except Exception as e:
            logger.warning(f"Error fetching voter {id_number}: {e}")
            return None
    
    def verify_dataframe(self, df: pd.DataFrame, id_column: str = 'ID Number',
                        ward_column: str = 'Ward') -> Tuple[pd.DataFrame, Dict]:
        """
        Verify all ID numbers in a DataFrame against IEC database
        
        Args:
            df: DataFrame containing member data
            id_column: Name of the column containing ID numbers
            ward_column: Name of the column containing expected ward numbers
            
        Returns:
            Tuple of (verified_df, verification_report)
            - verified_df: DataFrame with IEC verification results added
            - verification_report: Dict with verification statistics and errors
        """
        logger.info(f"🔍 Starting IEC verification for {len(df)} records...")
        
        # Initialize report
        report = {
            'total_records': len(df),
            'verified_count': 0,
            'registered_in_ward': 0,
            'not_registered': 0,
            'different_ward': 0,
            'deceased': 0,
            'api_errors': 0,
            'errors': [],
            'success': False
        }
        
        # Validate required columns
        if id_column not in df.columns:
            error_msg = f"Required column '{id_column}' not found in DataFrame"
            logger.error(f"❌ {error_msg}")
            report['errors'].append(error_msg)
            return df, report
        
        # Get access token
        try:
            token = self.get_access_token()
        except IECVerificationError as e:
            report['errors'].append(str(e))
            return df, report
        
        # Prepare ID list
        id_list = []
        for idx, row in df.iterrows():
            id_val = row[id_column]
            if pd.notna(id_val):
                clean_id = str(id_val).strip().replace(' ', '').zfill(13)[:13]
                if clean_id.isdigit() and len(clean_id) == 13:
                    id_list.append((idx, clean_id))
        
        if not id_list:
            error_msg = "No valid 13-digit ID numbers found"
            logger.error(f"❌ {error_msg}")
            report['errors'].append(error_msg)
            return df, report
        
        logger.info(f"📋 Found {len(id_list)} valid ID numbers to verify")
        
        # Initialize result columns
        df['iec_verification_status'] = None
        df['iec_registered'] = False
        df['iec_ward'] = None
        df['iec_vd_number'] = None
        df['iec_voting_station'] = None
        # User-friendly columns
        df['VD Number'] = None
        df['VOTER STATUS'] = None
        
        # Perform bulk verification with threading
        start_time = time.time()
        rate_limit_hit = False

        try:
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {
                    executor.submit(self.fetch_voter, id_num, token): (idx, id_num)
                    for idx, id_num in id_list
                }

                for i, future in enumerate(as_completed(futures), 1):
                    idx, id_num = futures[future]

                    try:
                        data = future.result()
                    except IECRateLimitError as e:
                        # Rate limit hit - stop processing
                        logger.error(f"❌ Rate limit exceeded after {i} requests")
                        report['rate_limit_hit'] = True
                        report['rate_limit_message'] = str(e)
                        report['rate_limit_reset_time'] = e.reset_time
                        report['rows_processed_before_limit'] = i
                        rate_limit_hit = True
                        break

                    # Progress indicator
                    if i % 10 == 0 or i == len(id_list):
                        logger.info(f"Progress: {i}/{len(id_list)} ({(i/len(id_list)*100):.1f}%)")

                    if not data:
                        report['api_errors'] += 1
                        df.at[idx, 'iec_verification_status'] = 'API_ERROR'
                        df.at[idx, 'VOTER STATUS'] = self.get_voter_status_display('API_ERROR')
                        df.at[idx, 'VD Number'] = ''
                        continue

                    report['verified_count'] += 1

                    # Extract voter details
                    is_registered = data.get('bRegistered', False)
                    ward = data.get('VotingStation', {}).get('Delimitation', {}).get('WardID')
                    vd_number = data.get('VotingStation', {}).get('Delimitation', {}).get('VDNumber', '')
                    vs_name = data.get('VotingStation', {}).get('Name', '')

                    # Get expected ward from DataFrame
                    expected_ward = None
                    if ward_column in df.columns:
                        expected_ward = df.at[idx, ward_column]
                        if pd.notna(expected_ward):
                            # Convert to int to remove decimal points, then to string
                            try:
                                expected_ward = str(int(float(expected_ward)))
                            except:
                                expected_ward = str(expected_ward).strip()

                    # Update DataFrame with IEC data
                    df.at[idx, 'iec_registered'] = is_registered
                    df.at[idx, 'iec_ward'] = ward
                    df.at[idx, 'iec_vd_number'] = vd_number
                    df.at[idx, 'iec_voting_station'] = vs_name

                    # Populate user-friendly VD Number column
                    df.at[idx, 'VD Number'] = vd_number if vd_number else ''

                    # Normalize ward for comparison (convert to int string to handle float formatting)
                    ward_str = None
                    if ward:
                        try:
                            ward_str = str(int(float(ward)))
                        except:
                            ward_str = str(ward).strip()

                    # Determine verification status
                    status_code = None
                    if is_registered and expected_ward and ward_str and ward_str == expected_ward:
                        status_code = 'REGISTERED_IN_WARD'
                        report['registered_in_ward'] += 1
                    elif not is_registered and not ward:
                        status_code = 'NOT_REGISTERED'
                        report['not_registered'] += 1
                    elif is_registered and expected_ward and ward_str and ward_str != expected_ward:
                        status_code = 'DIFFERENT_WARD'
                        report['different_ward'] += 1
                    elif is_registered and not expected_ward:
                        # Registered but no ward in Excel to compare - treat as registered in different ward
                        status_code = 'DIFFERENT_WARD'
                        report['different_ward'] += 1
                    elif vs_name and not is_registered:
                        status_code = 'DECEASED'
                        report['deceased'] += 1
                    else:
                        status_code = 'UNKNOWN'

                    # Set status code and user-friendly status
                    df.at[idx, 'iec_verification_status'] = status_code
                    df.at[idx, 'VOTER STATUS'] = self.get_voter_status_display(status_code)

        except IECRateLimitError as e:
            # Rate limit hit during setup
            logger.error(f"❌ Rate limit exceeded: {e}")
            report['rate_limit_hit'] = True
            report['rate_limit_message'] = str(e)
            report['rate_limit_reset_time'] = e.reset_time
            report['rows_processed_before_limit'] = 0
            rate_limit_hit = True
        
        elapsed = time.time() - start_time

        if rate_limit_hit:
            logger.warning(f"⚠️  IEC verification paused due to rate limit after {elapsed:.1f} seconds")
            logger.warning(f"📊 Processed {report.get('rows_processed_before_limit', 0)} of {len(id_list)} records before limit")
            report['success'] = False
            report['paused'] = True
        else:
            logger.info(f"✅ IEC verification completed in {elapsed:.1f} seconds")
            logger.info(f"📊 Results: {report['registered_in_ward']} in ward, "
                       f"{report['not_registered']} not registered, "
                       f"{report['different_ward']} different ward, "
                       f"{report['deceased']} deceased")
            report['success'] = True

        return df, report

