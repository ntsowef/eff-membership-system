#!/usr/bin/env python3
"""
Flexible Membership Ingestion System
Handles Excel files with varying column names and formats
Supports special VD codes and comprehensive error handling
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
import re
import glob
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import traceback
import shutil

import io
import math

# Special VD Codes that don't require database validation
# BUSINESS RULE: These codes exist in the voting_districts table and have special meanings
# All special codes are 8 digits (matching the database schema)
SPECIAL_VD_CODES = {
    '33333333': 'International Voter',
    '00000000': 'Not Registered Voter',
    '22222222': 'Registered in Different Wards',  # Registered voters without VD code
    '11111111': 'Deceased',
    '99999999': 'NOT REGISTERED VOTER'  # Non-registered voters
}

class FlexibleMembershipIngestion:
    def __init__(self, docs_directory: str, db_config: Dict, use_optimized: bool = True, archive_enabled: bool = True):
        self.docs_directory = docs_directory
        self.db_config = db_config
        self.use_optimized = use_optimized
        self.archive_enabled = archive_enabled
        self.connection = None
        self.cursor = None

        # Performance settings
        self.lookup_cache = {}
        self.valid_wards = set()
        self.valid_vd_codes = set()
        self.bulk_size = 2000

        # Geographic hierarchy mappings
        self.ward_to_municipality = {}  # ward_code -> (municipality_code, municipality_name)
        self.municipality_to_district = {}  # municipality_code -> (district_code, district_name)
        self.district_to_province = {}  # district_code -> (province_code, province_name)
        self.municipality_to_province = {}  # municipality_code -> (province_code, province_name) - for metros

        # Setup logging
        self.setup_logging()

        # Connect to database
        self.connect_database()

        # Verify database schema
        self.verify_database_schema()

        # Pre-load lookup data if optimized
        if self.use_optimized:
            self.preload_lookup_data()
        else:
            # Always load geographic hierarchy (needed for resolution)
            self.load_geographic_hierarchy()

    def setup_logging(self):
        """Setup logging configuration"""
        log_dir = Path('data/logs')
        log_dir.mkdir(parents=True, exist_ok=True)

        log_file = log_dir / f'flexible_ingestion_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'

        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def connect_database(self):
        """Connect to PostgreSQL database"""
        try:
            self.connection = psycopg2.connect(**self.db_config)
            self.cursor = self.connection.cursor()
            self.logger.info("[OK] Database connected successfully")
        except Exception as e:
            self.logger.error(f"[ERROR] Database connection failed: {e}")
            raise

    def verify_database_schema(self):
        """
        Verify that members_consolidated and membership_history tables exist with required columns.
        Logs column names and data types for validation.
        """
        print("\n" + "=" * 80)
        print("DATABASE SCHEMA VERIFICATION (CONSOLIDATED SCHEMA)")
        print("=" * 80)

        required_tables = {
            'members_consolidated': [
                'member_id', 'id_number', 'firstname', 'surname', 'date_of_birth', 'age',
                'gender_id', 'race_id', 'citizenship_id', 'language_id', 'ward_code',
                'voter_district_code', 'voting_district_code', 'voting_station_id',
                'residential_address', 'cell_number', 'email', 'occupation_id',
                'qualification_id', 'voter_status_id', 'membership_type',
                'province_name', 'province_code', 'district_name', 'district_code',
                'municipality_name', 'municipality_code',
                # Consolidated membership fields (all data in ONE table)
                'current_membership_id', 'membership_number', 'date_joined',
                'last_payment_date', 'expiry_date', 'subscription_type_id',
                'membership_amount', 'membership_status_id', 'payment_method',
                'payment_reference', 'payment_status'
            ]
            # NOTE: membership_history table exists for backward compatibility but is NOT used for new ingestion
        }

        all_valid = True

        for table_name, required_cols in required_tables.items():
            print(f"\n[*] Verifying table: {table_name}")

            try:
                # Get table columns and data types
                self.cursor.execute("""
                    SELECT column_name, data_type, character_maximum_length, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = %s
                    ORDER BY ordinal_position
                """, (table_name,))

                columns = self.cursor.fetchall()

                if not columns:
                    print(f"    [ERROR] Table '{table_name}' does not exist!")
                    all_valid = False
                    continue

                # Create a dict of existing columns
                existing_cols = {col[0]: col for col in columns}

                print(f"    Found {len(existing_cols)} columns:")
                for col_name, data_type, max_length, nullable in columns:
                    length_str = f"({max_length})" if max_length else ""
                    null_str = "NULL" if nullable == 'YES' else "NOT NULL"
                    print(f"      - {col_name:<30} {data_type}{length_str:<15} {null_str}")

                # Check for missing required columns
                missing_cols = [col for col in required_cols if col not in existing_cols]

                if missing_cols:
                    print(f"    [WARNING] Missing required columns: {', '.join(missing_cols)}")
                    all_valid = False
                else:
                    print(f"    [OK] All required columns present")

            except Exception as e:
                print(f"    [ERROR] Failed to verify table: {e}")
                self.logger.error(f"Schema verification failed for {table_name}: {e}")
                all_valid = False

        print("\n" + "=" * 80)
        if all_valid:
            print("[OK] Database schema verification PASSED")
        else:
            print("[ERROR] Database schema verification FAILED")
            raise Exception("Database schema validation failed. Please ensure all required tables and columns exist.")
        print("=" * 80 + "\n")

        return all_valid

    def preload_lookup_data(self):
        """Pre-load all lookup tables into memory for fast access"""
        print("[*] Pre-loading lookup data...")

        lookup_configs = [
            ('genders', 'gender_id', 'gender_name'),
            ('races', 'race_id', 'race_name'),
            ('citizenships', 'citizenship_id', 'citizenship_name'),
            ('languages', 'language_id', 'language_name'),
            ('qualifications', 'qualification_id', 'qualification_name'),
            ('voter_statuses', 'status_id', 'status_name'),  # FIXED: Changed voter_status_id to status_id
            ('membership_statuses', 'status_id', 'status_name'),  # ADDED: Load membership statuses
            ('occupations', 'occupation_id', 'occupation_name'),
            ('voter_registration_statuses', 'registration_status_id', 'status_name'),  # ADDED: Voter registration tracking
        ]

        for table, id_col, name_col in lookup_configs:
            try:
                query = f"SELECT {name_col}, {id_col} FROM {table}"
                self.cursor.execute(query)
                results = self.cursor.fetchall()

                self.lookup_cache[table] = {}
                for row in results:
                    name, id_val = row
                    if name:
                        self.lookup_cache[table][str(name).strip().lower()] = id_val

                print(f"   [OK] {table}: {len(results)} entries")

            except Exception as e:
                # FIXED: Rollback transaction after error to prevent "transaction aborted" errors
                try:
                    self.connection.rollback()
                except:
                    pass
                print(f"   [WARN] {table}: {e}")
                self.lookup_cache[table] = {}

        # Load valid wards
        try:
            self.cursor.execute("SELECT ward_code FROM wards")
            self.valid_wards = {row[0] for row in self.cursor.fetchall()}
            print(f"   [OK] wards: {len(self.valid_wards)} valid ward codes")
        except Exception as e:
            try:
                self.connection.rollback()
            except:
                pass
            self.valid_wards = set()
            print(f"   [WARN] wards: Could not load ward codes - {e}")

        # Load valid VD codes (excluding special codes)
        try:
            # Try voting_district_code first (PostgreSQL convention), then vd_code (MySQL convention)
            try:
                self.cursor.execute("SELECT voting_district_code FROM voting_districts WHERE voting_district_code IS NOT NULL")
                self.valid_vd_codes = {row[0] for row in self.cursor.fetchall()}
                print(f"   [OK] voting_districts: {len(self.valid_vd_codes)} valid VD codes")
            except Exception as e1:
                # Fallback to vd_code column name
                self.cursor.execute("SELECT voting_district_code FROM voting_districts WHERE voting_district_code IS NOT NULL")
                self.valid_vd_codes = {row[0] for row in self.cursor.fetchall()}
                print(f"   [OK] voting_districts: {len(self.valid_vd_codes)} valid VD codes")
        except Exception as e:
            try:
                self.connection.rollback()
            except:
                pass
            self.valid_vd_codes = set()
            print(f"   [WARN] voting_districts: Could not load VD codes - {e}")

        # Load geographic lookups for provinces, districts, municipalities
        try:
            # Province lookup: name -> code
            self.cursor.execute("SELECT province_name, province_code FROM provinces")
            self.province_lookup = {row[0].strip(): row[1] for row in self.cursor.fetchall()}
            print(f"   [OK] provinces: {len(self.province_lookup)} entries")
        except Exception as e:
            try:
                self.connection.rollback()
            except:
                pass
            self.province_lookup = {}
            print(f"   [WARN] provinces: Could not load - {e}")

        try:
            # District lookup: name -> code
            self.cursor.execute("SELECT district_name, district_code FROM districts")
            self.district_lookup = {row[0].strip(): row[1] for row in self.cursor.fetchall()}
            # Also add uppercase version for case-insensitive matching
            self.district_lookup_upper = {k.upper(): v for k, v in self.district_lookup.items()}
            print(f"   [OK] districts: {len(self.district_lookup)} entries")
        except Exception as e:
            try:
                self.connection.rollback()
            except:
                pass
            self.district_lookup = {}
            self.district_lookup_upper = {}
            print(f"   [WARN] districts: Could not load - {e}")

        try:
            # Municipality lookup: name -> code (with partial matching support)
            self.cursor.execute("SELECT municipality_name, municipality_code FROM municipalities")
            self.municipality_lookup = {row[0].strip(): row[1] for row in self.cursor.fetchall()}
            # Also create a simplified lookup (remove prefixes and normalize)
            self.municipality_lookup_simple = {}
            for name, code in self.municipality_lookup.items():
                # Store full name (uppercase)
                self.municipality_lookup_simple[name.upper()] = code

                # Extract key words (remove "Local Municipality", "Metropolitan Municipality", etc.)
                name_clean = name.upper()
                name_clean = name_clean.replace(' LOCAL MUNICIPALITY', '')
                name_clean = name_clean.replace(' METROPOLITAN MUNICIPALITY', '')
                name_clean = name_clean.replace(' MUNICIPALITY', '')
                name_clean = name_clean.strip()
                self.municipality_lookup_simple[name_clean] = code

                # If name contains " - ", also store the part after it
                if ' - ' in name:
                    simple_name = name.split(' - ', 1)[1].strip().upper()
                    self.municipality_lookup_simple[simple_name] = code
                    # Also store cleaned version
                    simple_clean = simple_name.replace(' LOCAL MUNICIPALITY', '')
                    simple_clean = simple_clean.replace(' METROPOLITAN MUNICIPALITY', '')
                    simple_clean = simple_clean.replace(' MUNICIPALITY', '')
                    self.municipality_lookup_simple[simple_clean.strip()] = code
            print(f"   [OK] municipalities: {len(self.municipality_lookup)} entries")
        except Exception as e:
            try:
                self.connection.rollback()
            except:
                pass
            self.municipality_lookup = {}
            self.municipality_lookup_simple = {}
            print(f"   [WARN] municipalities: Could not load - {e}")

        # Load geographic hierarchy mappings for automatic resolution
        self.load_geographic_hierarchy()

    def load_geographic_hierarchy(self):
        """Load complete geographic hierarchy for automatic resolution"""
        print("\n[STEP] Loading geographic hierarchy mappings...")

        try:
            # Load ward -> municipality mapping
            self.cursor.execute("""
                SELECT w.ward_code, w.municipality_code, m.municipality_name
                FROM wards w
                JOIN municipalities m ON w.municipality_code = m.municipality_code
                WHERE w.ward_code IS NOT NULL AND w.municipality_code IS NOT NULL
            """)
            for row in self.cursor.fetchall():
                ward_code, muni_code, muni_name = row
                self.ward_to_municipality[ward_code] = (muni_code, muni_name)
            print(f"   [OK] ward_to_municipality: {len(self.ward_to_municipality)} mappings")
        except Exception as e:
            try:
                self.connection.rollback()
            except:
                pass
            print(f"   [WARN] ward_to_municipality: Could not load - {e}")
            self.ward_to_municipality = {}

        try:
            # Load municipality -> district mapping
            self.cursor.execute("""
                SELECT m.municipality_code, m.district_code, d.district_name
                FROM municipalities m
                LEFT JOIN districts d ON m.district_code = d.district_code
                WHERE m.municipality_code IS NOT NULL
            """)
            for row in self.cursor.fetchall():
                muni_code, dist_code, dist_name = row
                if dist_code:  # Some metros don't have districts
                    self.municipality_to_district[muni_code] = (dist_code, dist_name)
            print(f"   [OK] municipality_to_district: {len(self.municipality_to_district)} mappings")
        except Exception as e:
            try:
                self.connection.rollback()
            except:
                pass
            print(f"   [WARN] municipality_to_district: Could not load - {e}")
            self.municipality_to_district = {}

        try:
            # Load district -> province mapping
            self.cursor.execute("""
                SELECT d.district_code, d.province_code, p.province_name
                FROM districts d
                JOIN provinces p ON d.province_code = p.province_code
                WHERE d.district_code IS NOT NULL AND d.province_code IS NOT NULL
            """)
            for row in self.cursor.fetchall():
                dist_code, prov_code, prov_name = row
                self.district_to_province[dist_code] = (prov_code, prov_name)
            print(f"   [OK] district_to_province: {len(self.district_to_province)} mappings")
        except Exception as e:
            try:
                self.connection.rollback()
            except:
                pass
            print(f"   [WARN] district_to_province: Could not load - {e}")
            self.district_to_province = {}

        try:
            # Load municipality -> province mapping (for metros and sub-regions)
            # This handles both direct district links and parent municipality links
            self.cursor.execute("""
                SELECT
                    m.municipality_code,
                    COALESCE(d.province_code, parent_d.province_code) as province_code,
                    COALESCE(p.province_name, parent_p.province_name) as province_name
                FROM municipalities m
                LEFT JOIN districts d ON m.district_code = d.district_code
                LEFT JOIN provinces p ON d.province_code = p.province_code
                LEFT JOIN municipalities parent_m ON m.parent_municipality_id = parent_m.municipality_id
                LEFT JOIN districts parent_d ON parent_m.district_code = parent_d.district_code
                LEFT JOIN provinces parent_p ON parent_d.province_code = parent_p.province_code
                WHERE COALESCE(d.province_code, parent_d.province_code) IS NOT NULL
            """)
            self.municipality_to_province = {}
            for row in self.cursor.fetchall():
                muni_code, prov_code, prov_name = row
                self.municipality_to_province[muni_code] = (prov_code, prov_name)
            print(f"   [OK] municipality_to_province: {len(self.municipality_to_province)} mappings")
        except Exception as e:
            try:
                self.connection.rollback()
            except:
                pass
            print(f"   [WARN] municipality_to_province: Could not load - {e}")
            self.municipality_to_province = {}

    def resolve_geographic_hierarchy(self, ward_code: str) -> Dict[str, Optional[str]]:
        """
        Given a ward_code, return complete geographic hierarchy.
        Returns dict with: municipality_code, municipality_name, district_code, district_name, province_code, province_name
        """
        result = {
            'municipality_code': None,
            'municipality_name': None,
            'district_code': None,
            'district_name': None,
            'province_code': None,
            'province_name': None
        }

        if not ward_code or ward_code not in self.ward_to_municipality:
            return result

        # Get municipality from ward
        muni_code, muni_name = self.ward_to_municipality[ward_code]
        result['municipality_code'] = muni_code
        result['municipality_name'] = muni_name

        # Get district from municipality (if exists - metros don't have districts)
        if muni_code in self.municipality_to_district:
            dist_code, dist_name = self.municipality_to_district[muni_code]
            result['district_code'] = dist_code
            result['district_name'] = dist_name

            # Get province from district
            if dist_code in self.district_to_province:
                prov_code, prov_name = self.district_to_province[dist_code]
                result['province_code'] = prov_code
                result['province_name'] = prov_name

        # Try to get province from municipality_to_province mapping (for metros and sub-regions)
        if not result['province_code'] and muni_code in self.municipality_to_province:
            prov_code, prov_name = self.municipality_to_province[muni_code]
            result['province_code'] = prov_code
            result['province_name'] = prov_name

        return result

    def lookup_id(self, table: str, value: str, default=None) -> Optional[int]:
        """Fast lookup using cached data"""
        if not value or pd.isna(value):
            return default

        value_lower = str(value).strip().lower()
        return self.lookup_cache.get(table, {}).get(value_lower, default)

    def get_voter_registration_status(self, vd_code: Optional[str]) -> Tuple[int, bool]:
        """
        Determine voter registration status based on VD code.

        Business Logic (all VD codes are 8 digits):
        - '22222222', '33333333': Registered to vote, but not in that ward → Registered (1)
        - '99999999', '00000000': NOT registered to vote → Not Registered (2)
        - Empty/NULL VD code: Unknown (3)
        - Any other valid VD code: Registered (1)

        Args:
            vd_code: Voting District code from IEC verification

        Returns:
            Tuple of (voter_registration_id, is_registered_voter)
        """
        # VD codes for registered voters who are not in that specific ward (8 digits)
        REGISTERED_NOT_IN_WARD_CODES = {'22222222', '33333333'}
        # VD codes for non-registered voters (8 digits)
        NOT_REGISTERED_CODES = {'99999999', '00000000'}

        if not vd_code or pd.isna(vd_code) or str(vd_code).strip() == '':
            # Unknown - no VD code available
            return (3, None)  # Unknown status, is_registered_voter = NULL

        vd_code_str = str(vd_code).strip()

        if vd_code_str in NOT_REGISTERED_CODES:
            # Not Registered to vote
            return (2, False)

        # All other codes (including 22222222, 33333333) are registered voters
        # 22222222 and 33333333 are registered but not in that ward
        return (1, True)

    def lookup_province_code(self, province_name: str) -> Optional[str]:
        """Lookup province code by name"""
        if not province_name or pd.isna(province_name):
            return None
        return self.province_lookup.get(str(province_name).strip())

    def lookup_district_code(self, district_name: str) -> Optional[str]:
        """Lookup district code by name (case-insensitive)"""
        if not district_name or pd.isna(district_name):
            return None
        # Try exact match first
        district_str = str(district_name).strip()
        if district_str in self.district_lookup:
            return self.district_lookup[district_str]
        # Try uppercase match
        return self.district_lookup_upper.get(district_str.upper())

    def lookup_municipality_code(self, municipality_name: str) -> Optional[str]:
        """Lookup municipality code by name (with partial matching)"""
        if not municipality_name or pd.isna(municipality_name):
            return None

        muni_str = str(municipality_name).strip()

        # Try exact match first
        if muni_str in self.municipality_lookup:
            return self.municipality_lookup[muni_str]

        # Try simplified/uppercase match
        muni_upper = muni_str.upper()
        if muni_upper in self.municipality_lookup_simple:
            return self.municipality_lookup_simple[muni_upper]

        # If Excel format is "CODE - Name", extract the part after " - "
        if ' - ' in muni_str:
            name_part = muni_str.split(' - ', 1)[1].strip().upper()
            if name_part in self.municipality_lookup_simple:
                return self.municipality_lookup_simple[name_part]

        return None

    def extract_dob_from_id(self, id_number: str) -> Optional[date]:
        """Extract date of birth from South African ID number (first 6 digits: YYMMDD)"""
        if not id_number or pd.isna(id_number):
            return None

        try:
            id_str = str(id_number).strip()
            if len(id_str) < 6:
                return None

            # Extract YYMMDD from first 6 digits
            yy = int(id_str[0:2])
            mm = int(id_str[2:4])
            dd = int(id_str[4:6])

            # Determine century (assume < 25 is 2000s, >= 25 is 1900s)
            if yy < 25:
                yyyy = 2000 + yy
            else:
                yyyy = 1900 + yy

            # Create date object
            dob = date(yyyy, mm, dd)
            return dob
        except:
            return None

    def calculate_age(self, date_of_birth) -> Optional[int]:
        """Calculate age from date of birth"""
        if pd.isna(date_of_birth):
            return None

        try:
            if isinstance(date_of_birth, str):
                dob = pd.to_datetime(date_of_birth).date()
            elif isinstance(date_of_birth, pd.Timestamp):
                dob = date_of_birth.date()
            elif isinstance(date_of_birth, date):
                dob = date_of_birth
            else:
                return None

            today = datetime.now().date()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            return age if age >= 0 else None
        except:
            return None

    def validate_vd_code(self, vd_code: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validate VD code - returns (is_valid, vd_code_to_store, reason)
        Special codes are always valid and stored as-is
        """
        if not vd_code or pd.isna(vd_code):
            return False, None, "Empty VD code"

        vd_str = str(vd_code).strip()

        # Check if it's a special code
        if vd_str in SPECIAL_VD_CODES:
            return True, vd_str, f"Special code: {SPECIAL_VD_CODES[vd_str]}"

        # Validate format (8 digits)
        if not vd_str.isdigit() or len(vd_str) != 8:
            return False, None, f"Invalid format (not 8 digits): {vd_str}"

        # Check if exists in database
        if vd_str in self.valid_vd_codes:
            return True, vd_str, "Valid VD code in database"

        return False, None, f"VD code not found in database: {vd_str}"

    def format_cell_number(self, cell: str) -> Optional[str]:
        """Format cell number to start with 27"""
        if not cell or pd.isna(cell):
            return None

        cell_str = str(cell).strip()
        # Remove any non-digit characters
        cell_digits = re.sub(r'\D', '', cell_str)

        if not cell_digits:
            return None

        # If starts with 0, replace with 27
        if cell_digits.startswith('0'):
            cell_digits = '27' + cell_digits[1:]
        # If doesn't start with 27, add it
        elif not cell_digits.startswith('27'):
            cell_digits = '27' + cell_digits

        # Validate length (should be 11 digits: 27 + 9 digits)
        if len(cell_digits) == 11:
            return cell_digits

        return None

    def parse_date_flexible(self, date_value) -> Optional[date]:
        """Parse date from various formats"""
        if pd.isna(date_value):
            return None

        if isinstance(date_value, date):
            return date_value

        if isinstance(date_value, datetime):
            return date_value.date()

        if isinstance(date_value, str):
            # First try ISO format with timezone (e.g., "2022-06-06T00:00:00+02:00")
            try:
                from dateutil import parser
                parsed = parser.isoparse(date_value)
                return parsed.date()
            except:
                pass

            # Try multiple date formats
            formats = [
                '%Y-%m-%d',
                '%d/%m/%Y',
                '%m/%d/%Y',
                '%d-%m-%Y',
                '%Y/%m/%d',
                '%Y.%m.%d',  # Added: dot-separated format (2025.08.22)
                '%d.%m.%Y'   # Added: dot-separated format (22.08.2025)
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(date_value, fmt).date()
                except:
                    continue

        return None

    def calculate_expiry_date_with_fallback(self, row: pd.Series) -> Optional[date]:
        """
        Calculate expiry date with fallback logic:
        1. If 'Expiry Date' column exists in the row, use it
        2. If 'Expiry Date' is missing but 'Last Payment Date' exists, calculate expiry as Last Payment Date + 24 months
        3. Otherwise, return None
        """
        # Check if 'Expiry Date' column exists and has a value
        if 'Expiry Date' in row.index and pd.notna(row['Expiry Date']):
            return self.parse_date_flexible(row['Expiry Date'])

        # Fallback: Check if 'Last Payment Date' exists (note: Excel column name is 'Last Payment')
        if 'Last Payment' in row.index and pd.notna(row['Last Payment']):
            last_payment = self.parse_date_flexible(row['Last Payment'])
            if last_payment:
                # Add 24 months to last payment date
                expiry = last_payment + relativedelta(months=24)
                return expiry

        return None

    def normalize_id_number(self, id_num: str) -> Optional[str]:
        """Normalize ID number - ensure 13 digits, pad with 0 if needed"""
        if not id_num or pd.isna(id_num):
            return None

        id_str = str(id_num).strip()

        # Handle Excel float formatting (e.g., "8412020217088.0" -> "8412020217088")
        # Remove trailing .0 or . before removing all non-digits
        if '.' in id_str:
            # Split on decimal point and take only the integer part
            id_str = id_str.split('.')[0]

        # Remove any remaining non-digit characters
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

    def map_membership_type(self, excel_status: str) -> str:
        """Map Excel status to membership_type (for members table CHECK constraint)"""
        if pd.isna(excel_status):
            return 'Regular'

        status_lower = str(excel_status).strip().lower()

        if status_lower in ['student']:
            return 'Student'
        elif status_lower in ['senior', 'pensioner']:
            return 'Senior'
        elif status_lower in ['honorary']:
            return 'Honorary'
        else:
            return 'Regular'

    def normalize_voter_status(self, value) -> Optional[str]:
        """
        Normalize voter status values from Excel to match database lookup values.

        Excel values like "REGISTERED IN WARD", "REGISTERED IN DIFFERENT WARD"
        are normalized to "Registered".
        "NOT REGISTERED VOTER" is normalized to "Not Registered".
        """
        if pd.isna(value):
            return None

        value_str = str(value).strip().lower()

        # Handle empty strings
        if not value_str:
            return None

        # Check for "not registered" patterns
        if 'not registered' in value_str:
            return 'Not Registered'
        # Check for any "registered" patterns (includes "registered in ward", "registered in different ward", etc.)
        elif 'registered' in value_str:
            return 'Registered'
        # Check for deceased
        elif 'deceased' in value_str:
            return 'Deceased'
        # Check for pending verification
        elif 'pending' in value_str:
            return 'Pending Verification'
        # Check for verification failed
        elif 'failed' in value_str or 'verification failed' in value_str:
            return 'Verification Failed'
        else:
            # Default to "Other" for unrecognized values
            return 'Other'

    def normalize_membership_status(self, value) -> Optional[str]:
        """
        Normalize membership status values from Excel to match database lookup values.

        Excel values like "Invalid" are normalized to "Inactive".
        """
        if pd.isna(value):
            return None

        value_str = str(value).strip().lower()

        # Handle empty strings
        if not value_str:
            return None

        # Check for exact or close matches first (order matters - check longer strings first)
        if 'good standing' in value_str or value_str == 'good':
            return 'Good Standing'
        elif 'grace period' in value_str or 'grace' in value_str:
            return 'Grace Period'
        # Check "inactive" before "active" to avoid substring match issues
        elif 'inactive' in value_str or 'invalid' in value_str:
            return 'Inactive'
        elif 'active' in value_str:
            return 'Active'
        elif 'expired' in value_str:
            return 'Expired'
        elif 'suspended' in value_str or 'suspend' in value_str:
            return 'Suspended'
        elif 'cancelled' in value_str or 'cancel' in value_str:
            return 'Cancelled'
        elif 'pending' in value_str:
            return 'Pending'
        else:
            # Default to "Good Standing" for unrecognized values
            return 'Good Standing'

    def process_vd_number(self, vd_value) -> Optional[str]:
        """
        Process VD NUMBER field - returns the VD number as-is for storage in voter_district_code.
        Validates and rejects invalid values like cell phone numbers or oversized integers.
        """
        if pd.isna(vd_value):
            return None

        # Convert to string
        vd_str = str(int(vd_value)) if isinstance(vd_value, (int, float)) else str(vd_value).strip()

        # Remove trailing .0 if present
        if vd_str.endswith('.0'):
            vd_str = vd_str[:-2]

        # Remove any non-digit characters
        vd_str = ''.join(filter(str.isdigit, vd_str))

        if not vd_str:
            return None

        # VALIDATION 1: Reject cell phone numbers
        # South African cell numbers: 27XXXXXXXXX (11 digits starting with 27)
        if vd_str.startswith('27') and len(vd_str) == 11:
            # This is a cell number, not a VD code - return None
            return None

        # VALIDATION 2: Reject values that exceed PostgreSQL INTEGER limit
        # PostgreSQL INTEGER max: 2,147,483,647
        if vd_str.isdigit() and int(vd_str) > 2147483647:
            # Too large to fit in INTEGER column - return None
            return None

        # VALIDATION 3: Reject unreasonably long values
        # Valid VD codes are typically 8-9 digits, allow up to 10 for safety
        if len(vd_str) > 10:
            # Too long to be a valid VD code
            return None

        # Return the VD number as-is (validation happens separately for voting_district_code)
        return vd_str[:20] if vd_str else None

    def parse_membership_amount(self, amount_value) -> float:
        """Parse membership amount from various formats"""
        if pd.isna(amount_value):
            return 10.00

        try:
            amount_str = str(amount_value).strip()
            # Remove currency symbols
            amount_str = amount_str.replace('R', '').replace('$', '').replace(',', '').strip()
            return float(amount_str)
        except:
            return 10.00

    def load_and_clean_excel_data_test(self, df: pd.DataFrame) -> pd.DataFrame:
        """Test method for ID number cleaning"""
        df = df.dropna(subset=['ID Number'])
        df['ID Number'] = df['ID Number'].apply(self.normalize_id_number)
        df = df[df['ID Number'].notna()]
        return df

    def validate_and_prepare_wards(self, df: pd.DataFrame) -> Dict:
        """Validate wards and separate valid/invalid records"""
        print("Validating ward codes...")

        # Get unique wards from Excel
        excel_wards = set()
        if 'Ward' in df.columns:
            ward_values = df['Ward'].dropna().unique()
            excel_wards = {str(int(ward)) for ward in ward_values}

        # Check which wards exist in database
        valid_excel_wards = excel_wards.intersection(self.valid_wards)
        missing_wards = excel_wards - self.valid_wards

        print(f"   [DATA] Excel wards: {len(excel_wards)}")
        print(f"   [OK] Valid wards: {len(valid_excel_wards)}")
        print(f"   [ERROR] Missing wards: {len(missing_wards)}")

        if missing_wards:
            print(f"   [INFO] Sample missing wards: {list(missing_wards)[:10]}")

        # Filter dataframe to only valid wards
        if 'Ward' in df.columns and valid_excel_wards:
            df['ward_str'] = df['Ward'].astype(str).str.replace('.0', '')
            valid_df = df[df['ward_str'].isin(valid_excel_wards)].copy()
            invalid_df = df[~df['ward_str'].isin(valid_excel_wards)].copy()
        else:
            # If no ward validation possible, process all
            valid_df = df.copy()
            invalid_df = pd.DataFrame()

        return {
            'valid_df': valid_df,
            'invalid_df': invalid_df,
            'valid_count': len(valid_df),
            'invalid_count': len(invalid_df),
            'missing_wards': missing_wards
        }

    def bulk_insert_members_consolidated_with_id_mapping(self, member_data: List[Tuple], id_numbers: List[str]) -> Dict[str, int]:
        """
        Bulk insert members into members_consolidated table and return a mapping of id_number -> member_id.
        Handles ON CONFLICT by fetching existing member_ids for duplicates.

        Args:
            member_data: List of tuples with member data (including membership fields)
            id_numbers: List of id_numbers in same order as member_data

        Returns:
            Dict mapping id_number to member_id for all records (new and existing)
        """
        if not member_data:
            return {}

        print(f"[*] Bulk inserting {len(member_data):,} members into members_consolidated with ID mapping...", flush=True)

        # De-duplicate member_data by id_number (keep last occurrence)
        # This prevents "ON CONFLICT DO UPDATE command cannot affect row a second time" error
        seen_ids = {}
        deduped_data = []
        deduped_id_numbers = []

        for i, (data, id_num) in enumerate(zip(member_data, id_numbers)):
            if id_num in seen_ids:
                # Duplicate found - keep the later occurrence (overwrite)
                old_idx = seen_ids[id_num]
                deduped_data[old_idx] = data
                deduped_id_numbers[old_idx] = id_num
            else:
                # First occurrence
                seen_ids[id_num] = len(deduped_data)
                deduped_data.append(data)
                deduped_id_numbers.append(id_num)

        duplicates_removed = len(member_data) - len(deduped_data)
        if duplicates_removed > 0:
            print(f"      Removed {duplicates_removed} duplicate ID numbers from batch (kept last occurrence)", flush=True)

        # Use deduplicated data for insert
        member_data = deduped_data
        id_numbers = deduped_id_numbers

        import time
        start_time = time.time()

        try:
            # Step 1: Attempt bulk insert with RETURNING
            # Now includes 38 fields (35 original + 3 voter registration tracking fields)
            query = """
                INSERT INTO members_consolidated (
                    id_number, firstname, surname, date_of_birth, age, gender_id, race_id,
                    citizenship_id, language_id, ward_code, voter_district_code, voting_district_code,
                    voting_station_id, residential_address, cell_number, email, occupation_id,
                    qualification_id, voter_status_id, membership_type,
                    province_name, province_code, district_name, district_code,
                    municipality_name, municipality_code,
                    date_joined, last_payment_date, expiry_date, subscription_type_id,
                    membership_amount, membership_status_id, payment_method, payment_reference, payment_status,
                    voter_registration_id, is_registered_voter, last_voter_verification_date
                ) VALUES %s
                ON CONFLICT (id_number) DO UPDATE SET
                    date_joined = COALESCE(EXCLUDED.date_joined, members_consolidated.date_joined),
                    last_payment_date = COALESCE(EXCLUDED.last_payment_date, members_consolidated.last_payment_date),
                    expiry_date = COALESCE(EXCLUDED.expiry_date, members_consolidated.expiry_date),
                    subscription_type_id = COALESCE(EXCLUDED.subscription_type_id, members_consolidated.subscription_type_id),
                    membership_amount = COALESCE(EXCLUDED.membership_amount, members_consolidated.membership_amount),
                    membership_status_id = COALESCE(EXCLUDED.membership_status_id, members_consolidated.membership_status_id),
                    payment_method = COALESCE(EXCLUDED.payment_method, members_consolidated.payment_method),
                    payment_reference = COALESCE(EXCLUDED.payment_reference, members_consolidated.payment_reference),
                    payment_status = COALESCE(EXCLUDED.payment_status, members_consolidated.payment_status),
                    voter_registration_id = COALESCE(EXCLUDED.voter_registration_id, members_consolidated.voter_registration_id),
                    is_registered_voter = COALESCE(EXCLUDED.is_registered_voter, members_consolidated.is_registered_voter),
                    last_voter_verification_date = COALESCE(EXCLUDED.last_voter_verification_date, members_consolidated.last_voter_verification_date),
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id_number, member_id
            """

            # Insert all records in one batch and capture RETURNING results
            # When fetch=True, execute_values() returns the results directly
            # CRITICAL: Use explicit template with VARCHAR casting to prevent integer overflow
            # Cast all code fields (ward_code, voter_district_code, voting_district_code, cell_number,
            # province_code, district_code, municipality_code) to VARCHAR
            # Positions: 10=ward_code, 11=voter_district_code, 12=voting_district_code, 15=cell_number,
            #            22=province_code, 24=district_code, 26=municipality_code
            # Added 3 new fields at positions 36, 37, 38 for voter registration tracking
            template = """(
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::VARCHAR, %s::VARCHAR, %s::VARCHAR, %s, %s, %s::VARCHAR, %s, %s, %s, %s, %s,
                %s, %s::VARCHAR, %s, %s::VARCHAR, %s, %s::VARCHAR, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s
            )"""
            inserted_results = execute_values(
                self.cursor, query, member_data,
                template=template, page_size=1000, fetch=True
            )

            # Build mapping from RETURNING results (both new and updated records)
            id_mapping = {row[0]: row[1] for row in inserted_results}

            mapped_count = len(id_mapping)
            print(f"      Processed {mapped_count:,} members (new + updated)", flush=True)

            # Step 2: For any records that didn't return (shouldn't happen with DO UPDATE), fetch their member_ids
            missing_ids = [id_num for id_num in id_numbers if id_num not in id_mapping]

            if missing_ids:
                print(f"      Fetching {len(missing_ids):,} missing member_ids...", flush=True)

                # Fetch in batches to avoid parameter limits
                batch_size = 1000
                for i in range(0, len(missing_ids), batch_size):
                    batch = missing_ids[i:i + batch_size]

                    placeholders = ','.join(['%s'] * len(batch))
                    fetch_query = f"""
                        SELECT id_number, member_id
                        FROM members_consolidated
                        WHERE id_number IN ({placeholders})
                    """

                    self.cursor.execute(fetch_query, batch)
                    existing_results = self.cursor.fetchall()

                    for id_num, member_id in existing_results:
                        id_mapping[id_num] = member_id

            elapsed = time.time() - start_time
            total_mapped = len(id_mapping)
            print(f"[OK] Mapped {total_mapped:,} members in {elapsed:.2f}s", flush=True)

            return id_mapping

        except Exception as e:
            print(f"[ERROR] Bulk insert failed: {e}", flush=True)
            self.logger.error(f"Bulk insert error: {e}")
            self.logger.error(traceback.format_exc())
            return {}

    def disable_membership_history_indexes(self) -> Dict:
        """
        Disable all non-primary key indexes AND UNIQUE constraints on membership_history table
        for faster bulk inserts.

        Returns dict with:
            - 'constraints': List of constraint names that were dropped
            - 'indexes': List of index tuples (name, definition) that were dropped

        Note: This commits any pending transaction and operates outside of transactions.
        """
        print("[INDEX] Disabling membership_history constraints and indexes...")

        result = {
            'constraints': [],
            'indexes': []
        }

        try:
            # Commit any pending transaction first
            self.connection.commit()

            # Set autocommit mode for DDL operations
            self.connection.autocommit = True

            # Step 1: Query for ALL UNIQUE constraints dynamically
            self.cursor.execute("""
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'membership_history'::regclass
                AND contype = 'u'
                ORDER BY conname
            """)

            constraints = [row[0] for row in self.cursor.fetchall()]

            # Step 2: Drop all UNIQUE constraints (this also drops their backing indexes)
            for constraint_name in constraints:
                try:
                    print(f"        Dropping UNIQUE constraint: {constraint_name}...", end='', flush=True)
                    self.cursor.execute(f"""
                        ALTER TABLE membership_history
                        DROP CONSTRAINT IF EXISTS {constraint_name}
                    """)
                    result['constraints'].append(constraint_name)
                    print(" Done")
                except Exception as e:
                    print(f" Failed: {e}")
                    self.logger.warning(f"Failed to drop constraint {constraint_name}: {e}")

            # Step 3: Get all remaining indexes (excluding primary key and constraint-backed indexes)
            # Build exclusion list from constraints we just dropped
            constraint_exclusions = " AND ".join([f"indexname != '{c}'" for c in constraints])

            query = f"""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'membership_history'
                  AND indexname NOT LIKE '%_pkey'
            """
            if constraint_exclusions:
                query += f" AND {constraint_exclusions}"
            query += " ORDER BY indexname"

            self.cursor.execute(query)
            indexes = self.cursor.fetchall()

            # Step 4: Drop all remaining indexes
            for idx_name, idx_def in indexes:
                try:
                    print(f"        Dropping index: {idx_name}...", end='', flush=True)
                    self.cursor.execute(f"DROP INDEX IF EXISTS {idx_name}")
                    result['indexes'].append((idx_name, idx_def))
                    print(" Done")
                except Exception as e:
                    print(f" Failed: {e}")
                    self.logger.warning(f"Failed to drop index {idx_name}: {e}")

            # Restore autocommit mode
            self.connection.autocommit = False

            print(f"[OK] Disabled {len(result['constraints'])} constraint(s) + {len(result['indexes'])} index(es)")

            return result

        except Exception as e:
            print(f"[ERROR] Failed to disable indexes: {e}")
            self.logger.error(f"Failed to disable indexes: {e}")
            # Restore autocommit mode
            self.connection.autocommit = False
            return result

    def enable_membership_history_indexes(self, disabled_data: Dict) -> bool:
        """
        Re-enable indexes and UNIQUE constraints on membership_history table.

        Args:
            disabled_data: Dict with 'constraints' (list of names) and 'indexes' (list of tuples)

        Returns:
            True if all indexes/constraints were successfully re-enabled, False otherwise

        Note: This operates outside of transactions using autocommit mode.
        """
        constraints = disabled_data.get('constraints', [])
        indexes = disabled_data.get('indexes', [])

        total = len(constraints) + len(indexes)
        if total == 0:
            print("[INDEX] No indexes or constraints to re-enable")
            return True

        print(f"[INDEX] Re-enabling {len(constraints)} constraint(s) + {len(indexes)} index(es)...")

        try:
            # Rollback any failed transaction first
            try:
                self.connection.rollback()
            except:
                pass

            # Set autocommit mode for DDL operations
            self.connection.autocommit = True

            success_count = 0
            failed_items = []

            import time
            start_time = time.time()

            # Step 1: Re-create UNIQUE constraints
            # Map constraint names to their definitions (if any exist for membership_history)
            constraint_definitions = {
                # Add any specific constraint definitions here if needed
            }

            for i, constraint_name in enumerate(constraints, 1):
                try:
                    print(f"        [{i}/{total}] Creating UNIQUE constraint: {constraint_name}...", end='', flush=True)
                    constraint_start = time.time()

                    # Get the constraint definition
                    constraint_def = constraint_definitions.get(constraint_name, 'UNIQUE (member_id)')

                    self.cursor.execute(f"""
                        ALTER TABLE membership_history
                        ADD CONSTRAINT {constraint_name}
                        {constraint_def}
                    """)

                    constraint_time = time.time() - constraint_start
                    print(f" Done ({constraint_time:.1f}s)")
                    success_count += 1

                except Exception as e:
                    print(f" Failed: {e}")
                    self.logger.error(f"Failed to create UNIQUE constraint {constraint_name}: {e}")
                    failed_items.append(constraint_name)

            # Step 2: Re-create all indexes
            offset = len(constraints)
            for i, (idx_name, idx_def) in enumerate(indexes, 1):
                try:
                    print(f"        [{i + offset}/{total}] Creating index: {idx_name}...", end='', flush=True)
                    idx_start = time.time()

                    self.cursor.execute(idx_def)

                    idx_time = time.time() - idx_start
                    print(f" Done ({idx_time:.1f}s)")
                    success_count += 1

                except Exception as e:
                    print(f" Failed: {e}")
                    self.logger.error(f"Failed to create index {idx_name}: {e}")
                    failed_items.append(idx_name)

            # Restore autocommit mode
            self.connection.autocommit = False

            total_time = time.time() - start_time

            if failed_items:
                print(f"[WARN] Re-enabled {success_count}/{total} items ({total_time:.1f}s)")
                print(f"[WARN] Failed items: {', '.join(failed_items)}")
                return False
            else:
                print(f"[OK] All {success_count} items re-enabled successfully ({total_time:.1f}s)")
                return True

        except Exception as e:
            print(f"[ERROR] Failed to re-enable indexes: {e}")
            self.logger.error(f"Failed to re-enable indexes: {e}")
            # Restore autocommit mode
            self.connection.autocommit = False
            return False

    # NOTE: Removed prepare_consolidated_dataframe and prepare_membership_history_dataframe methods
    # No need to split or prepare dataframes since we only insert into one table (members_consolidated)
    # The original df already has all the columns we need

    def bulk_insert_membership_history(self, membership_data: List[Tuple]) -> int:
        """
        Bulk insert membership history records with foreign key relationships.

        OPTIMIZED: Inserts ALL records in a single execute_values() call for maximum performance.
        """
        if not membership_data:
            return 0

        print(f"[*] Bulk inserting {len(membership_data):,} membership history records...")

        query = """
            INSERT INTO membership_history (
                member_id, date_joined, last_payment_date, expiry_date,
                subscription_type_id, membership_amount, status_id,
                payment_method, payment_reference, payment_status
            ) VALUES %s
            ON CONFLICT DO NOTHING
        """

        try:
            import time
            start_time = time.time()

            # Reduce commit fsync cost for this transaction
            self.cursor.execute("SET LOCAL synchronous_commit = OFF")

            total = 0
            chunk_size = 20000
            for i in range(0, len(membership_data), chunk_size):
                batch = membership_data[i:i + chunk_size]
                execute_values(
                    self.cursor,
                    query,
                    batch,
                    template=None,
                    page_size=10000,
                    fetch=False
                )
                total += len(batch)

            elapsed = time.time() - start_time
            rows_per_sec = total / elapsed if elapsed > 0 else 0

            print(f"[OK] Inserted {total:,} records in {elapsed:.2f}s ({rows_per_sec:.0f} rows/sec)")

            return total

        except Exception as e:
            print(f"[ERROR] Bulk insert failed: {e}")
            return 0
    def bulk_insert_membership_history_via_copy(self, membership_data: List[Tuple]) -> int:
        """
        High-throughput bulk insert using COPY into a temp table, then INSERT .. SELECT
        with ON CONFLICT DO NOTHING into membership_history. Much faster than client-side
        multi-row VALUES for large batches.
        """
        if not membership_data:
            return 0

        print(f"[*] Bulk inserting {len(membership_data):,} membership history records via COPY...")

        try:
            import time
            start_time = time.time()

            # Create temp table (dropped automatically at transaction end)
            self.cursor.execute(
                """
                CREATE TEMP TABLE tmp_membership_history (
                    member_id INTEGER NOT NULL,
                    date_joined DATE,
                    last_payment_date DATE,
                    expiry_date DATE,
                    subscription_type_id INTEGER NOT NULL,
                    membership_amount NUMERIC,
                    status_id INTEGER NOT NULL,
                    payment_method VARCHAR(50),
                    payment_reference VARCHAR(100),
                    payment_status VARCHAR(20)
                ) ON COMMIT DROP
                """
            )

            # Prepare COPY buffer (tab-separated, \N as NULL)
            buf = io.StringIO()

            def fmt_date(v):
                if v is None:
                    return "\\N"
                # Handle pandas/np Timestamp, datetime, date
                try:
                    if hasattr(v, "date"):
                        v = v.date()
                except Exception:
                    pass
                if hasattr(v, "strftime"):
                    return v.strftime("%Y-%m-%d")
                s = str(v)
                return s if s else "\\N"

            def fmt_num(v):
                if v is None:
                    return "\\N"
                try:
                    if isinstance(v, float) and math.isnan(v):
                        return "\\N"
                except Exception:
                    pass
                return str(v)

            def fmt_str(v):
                if v is None or (isinstance(v, float) and math.isnan(v)):
                    return "\\N"
                return str(v).replace('\t', ' ').replace('\n', ' ')

            for (member_id, date_joined, last_payment_date, expiry_date,
                 subscription_type_id, membership_amount, status_id,
                 payment_method, payment_reference, payment_status) in membership_data:
                row = [
                    fmt_num(member_id),
                    fmt_date(date_joined),
                    fmt_date(last_payment_date),
                    fmt_date(expiry_date),
                    fmt_num(subscription_type_id),
                    fmt_num(membership_amount),
                    fmt_num(status_id),
                    fmt_str(payment_method),
                    fmt_str(payment_reference),
                    fmt_str(payment_status),
                ]
                buf.write("\t".join(row) + "\n")
            buf.seek(0)

            # COPY into temp table
            self.cursor.copy_from(
                buf,
                "tmp_membership_history",
                sep="\t",
                null="\\N",
                columns=(
                    "member_id",
                    "date_joined",
                    "last_payment_date",
                    "expiry_date",
                    "subscription_type_id",
                    "membership_amount",
                    "status_id",
                    "payment_method",
                    "payment_reference",
                    "payment_status",
                ),
            )

            # Reduce commit fsync cost for this transaction
            self.cursor.execute("SET LOCAL synchronous_commit = OFF")

            # Insert from temp into real table
            self.cursor.execute(
                """
                INSERT INTO membership_history (
                    member_id, date_joined, last_payment_date, expiry_date,
                    subscription_type_id, membership_amount, status_id,
                    payment_method, payment_reference, payment_status
                )
                SELECT member_id, date_joined, last_payment_date, expiry_date,
                       subscription_type_id, membership_amount, status_id,
                       payment_method, payment_reference, payment_status
                FROM tmp_membership_history
                ON CONFLICT DO NOTHING
                """
            )
            inserted = self.cursor.rowcount if self.cursor.rowcount is not None else 0

            elapsed = time.time() - start_time
            rps = inserted / elapsed if elapsed > 0 else 0
            print(f"[OK] Inserted {inserted:,} records via COPY in {elapsed:.2f}s ({rps:.0f} rows/sec)")

            return inserted

        except Exception as e:
            print(f"[ERROR] COPY bulk insert failed: {e}")
            self.logger.error(f"COPY bulk insert failed: {e}")
            self.connection.rollback()
            return 0


    def process_file_flexible(self, file_path: str) -> Dict:

        result = {
            'filename': os.path.basename(file_path),
            'success': False,
            'members_imported': 0,
            'memberships_imported': 0,
            'members_skipped': 0,
            'processing_time': 0,
            'error_message': None
        }

        start_time = datetime.now()
        print(f"\n[FILE] Processing: {result['filename']}")

        try:
            # ========================================================================
            # STEP 1: Load Excel data into DataFrame
            # ========================================================================
            import time
            step_start = time.time()
            print("[1/7] Loading Excel data...")
            df = pd.read_excel(file_path)
            step_time = time.time() - step_start
            print(f"      Loaded {len(df):,} records in {step_time:.2f}s")

            # ========================================================================
            # STEP 2: Perform all data validation and transformation on DataFrame
            # ========================================================================
            step_start = time.time()
            print("[2/7] Validating and transforming data...")

            # Clean ID numbers
            df = df.dropna(subset=['ID Number'])
            df['ID Number'] = df['ID Number'].apply(self.normalize_id_number)
            df = df[df['ID Number'].notna()]
            print(f"      After ID cleaning: {len(df):,} records")

            # Validate ward codes
            ward_result = self.validate_and_prepare_wards(df)
            df = ward_result['valid_df']

            if len(df) == 0:
                result['error_message'] = f"No valid wards found. Missing {len(ward_result['missing_wards'])} ward codes."
                result['members_skipped'] = len(df)
                return result

            step_time = time.time() - step_start
            print(f"      After ward validation: {len(df):,} records in {step_time:.2f}s")

            # ========================================================================
            # STEP 3: Transform all fields for members and memberships
            # ========================================================================
            step_start = time.time()
            print("[3/7] Transforming all fields...")

            # Transform all member fields in DataFrame
            df['firstname'] = df['Firstname'].apply(lambda x: str(x).strip()[:50] if pd.notna(x) else '') if 'Firstname' in df.columns else ''
            df['surname'] = df['Surname'].apply(lambda x: str(x).strip()[:50] if pd.notna(x) else None) if 'Surname' in df.columns else None
            df['ward_code'] = df['Ward'].apply(lambda x: str(int(x)) if pd.notna(x) else None)

            # Date of Birth - extract from ID number (SA ID format: YYMMDD...)
            df['date_of_birth'] = df['ID Number'].apply(self.extract_dob_from_id)

            # Age - use from Excel if available, otherwise calculate from DOB
            if 'Age' in df.columns:
                def safe_int_age(x):
                    try:
                        if pd.isna(x) or x == '':
                            return None
                        return int(float(x))
                    except:
                        return None
                df['age'] = df['Age'].apply(safe_int_age)
            else:
                df['age'] = df['date_of_birth'].apply(self.calculate_age)

            # Geographic fields - DERIVE from ward_code using database hierarchy
            # This ensures ALL geographic fields are populated and consistent
            print("      Resolving geographic hierarchy from ward codes...")

            # First, extract Excel data (for comparison/validation)
            df['excel_province_name'] = df['Province'].apply(lambda x: str(x).strip() if pd.notna(x) else None) if 'Province' in df.columns else None
            df['excel_district_name'] = df['Region'].apply(lambda x: str(x).strip() if pd.notna(x) else None) if 'Region' in df.columns else None
            df['excel_municipality_name'] = df['Municipality'].apply(lambda x: str(x).strip() if pd.notna(x) else None) if 'Municipality' in df.columns else None

            # Resolve ALL geographic fields from ward_code
            geo_resolution = df['ward_code'].apply(self.resolve_geographic_hierarchy)

            # Extract resolved fields
            df['municipality_code'] = geo_resolution.apply(lambda x: x['municipality_code'] if x else None)
            df['municipality_name'] = geo_resolution.apply(lambda x: x['municipality_name'] if x else None)
            df['district_code'] = geo_resolution.apply(lambda x: x['district_code'] if x else None)
            df['district_name'] = geo_resolution.apply(lambda x: x['district_name'] if x else None)
            df['province_code'] = geo_resolution.apply(lambda x: x['province_code'] if x else None)
            df['province_name'] = geo_resolution.apply(lambda x: x['province_name'] if x else None)

            # Report resolution statistics
            total_records = len(df)
            muni_resolved = df['municipality_code'].notna().sum()
            dist_resolved = df['district_code'].notna().sum()
            prov_resolved = df['province_code'].notna().sum()

            print(f"      Geographic resolution: {muni_resolved}/{total_records} municipalities, {dist_resolved}/{total_records} districts, {prov_resolved}/{total_records} provinces")

            # Optional: Compare Excel data with resolved data (for validation)
            if 'excel_municipality_name' in df.columns:
                mismatches = df[
                    (df['excel_municipality_name'].notna()) &
                    (df['municipality_name'].notna()) &
                    (df['excel_municipality_name'].str.upper() != df['municipality_name'].str.upper())
                ]
                if len(mismatches) > 0:
                    print(f"      [WARN] {len(mismatches)} municipality name mismatches between Excel and database (using database values)")

            # Lookup IDs with defaults
            df['gender_id'] = df['Gender'].apply(lambda x: self.lookup_id('genders', x) or 1) if 'Gender' in df.columns else 1
            df['race_id'] = df['Race'].apply(lambda x: self.lookup_id('races', x) or 1) if 'Race' in df.columns else 1
            df['citizenship_id'] = df['Citizenship'].apply(lambda x: self.lookup_id('citizenships', x) or 1) if 'Citizenship' in df.columns else 1
            df['language_id'] = df['Language'].apply(lambda x: self.lookup_id('languages', x) or 1) if 'Language' in df.columns else 1
            df['occupation_id'] = df['Occupation'].apply(lambda x: self.lookup_id('occupations', x) or 1) if 'Occupation' in df.columns else 1
            df['qualification_id'] = df['Qualification'].apply(lambda x: self.lookup_id('qualifications', x) or 1) if 'Qualification' in df.columns else 1
            # Try both "VOTER STATUS" and "Voter Status" column names
            # Normalize voter status values before lookup (e.g., "REGISTERED IN WARD" -> "Registered")
            voter_status_col = 'VOTER STATUS' if 'VOTER STATUS' in df.columns else ('Voter Status' if 'Voter Status' in df.columns else None)
            if voter_status_col:
                df['voter_status_normalized'] = df[voter_status_col].apply(self.normalize_voter_status)
                df['voter_status_id'] = df['voter_status_normalized'].apply(lambda x: self.lookup_id('voter_statuses', x) or 1)
            else:
                df['voter_status_id'] = 1

            # Contact information
            df['residential_address'] = df['Residential Address'].apply(lambda x: str(x)[:200] if pd.notna(x) else None) if 'Residential Address' in df.columns else None
            df['cell_number'] = df['Cell Number'].apply(self.format_cell_number) if 'Cell Number' in df.columns else None
            df['email'] = df['Email'].apply(lambda x: str(x).strip()[:100] if pd.notna(x) else None) if 'Email' in df.columns else None

            # Membership type (for members table)
            # Normalize membership status values before lookup (e.g., "Invalid" -> "Inactive")
            if 'Status' in df.columns:
                df['excel_status'] = df['Status'].apply(lambda x: str(x).strip() if pd.notna(x) else 'Good Standing')
                df['membership_status_normalized'] = df['excel_status'].apply(self.normalize_membership_status)
                df['status_id'] = df['membership_status_normalized'].apply(lambda x: self.lookup_id('membership_statuses', x) or 8)
            else:
                df['excel_status'] = 'Good Standing'
                df['status_id'] = 8
            df['membership_type'] = df['excel_status'].apply(self.map_membership_type)

            # VD NUMBER - process and separate special codes from real VD codes
            # Check for both 'VD NUMBER' (all caps) and 'VD Number' (IEC verification format)
            vd_col = None
            if 'VD NUMBER' in df.columns:
                vd_col = 'VD NUMBER'
            elif 'VD Number' in df.columns:
                vd_col = 'VD Number'

            if vd_col:
                # Count original non-null VD numbers
                original_vd_count = df[vd_col].notna().sum()

                # Process VD numbers (this will filter out invalid ones)
                df['vd_number'] = df[vd_col].apply(self.process_vd_number)

                # Count how many VD codes were rejected during processing
                processed_vd_count = df['vd_number'].notna().sum()
                rejected_vd_count = original_vd_count - processed_vd_count

                if rejected_vd_count > 0:
                    print(f"      [WARNING] Rejected {rejected_vd_count:,} invalid VD codes (likely cell numbers or oversized values)")

                # BUSINESS RULE: Assign special VD codes based on IEC verification status
                # If IEC verification was performed, override VD codes based on verification status
                if 'iec_verification_status' in df.columns:
                    def assign_vd_based_on_iec_status(row):
                        status = row.get('iec_verification_status')
                        current_vd = row.get('vd_number')

                        # If already has a special code, keep it
                        if current_vd in SPECIAL_VD_CODES:
                            return current_vd

                        # Assign special codes based on IEC verification status (8 digits - matches DB)
                        if status == 'DIFFERENT_WARD':
                            return '22222222'  # Registered in Different Ward (8 digits)
                        elif status == 'NOT_REGISTERED':
                            return '99999999'  # Not Registered Voter (8 digits)
                        elif status == 'DECEASED':
                            return '11111111'  # Deceased (8 digits)
                        else:
                            # For REGISTERED_IN_WARD or other statuses, keep the original VD
                            return current_vd

                    df['vd_number'] = df.apply(assign_vd_based_on_iec_status, axis=1)
                    print(f"      [INFO] Applied special VD codes based on IEC verification status")

                # voting_district_code should contain BOTH valid VD codes AND special codes
                # Special codes (222222222, 999999999, etc.) should be stored in voting_district_code
                # This allows the system to track special voter statuses
                def get_voting_district_code(vd_num):
                    if not vd_num:
                        return None
                    # Special codes are valid and should be stored
                    if vd_num in SPECIAL_VD_CODES:
                        return vd_num
                    # Check if VD code exists in database
                    if vd_num in self.valid_vd_codes:
                        return vd_num
                    return None
                df['voting_district_code'] = df['vd_number'].apply(get_voting_district_code)
            else:
                df['vd_number'] = None
                df['voting_district_code'] = None

            # Membership dates
            df['date_joined'] = df['Date Joined'].apply(self.parse_date_flexible) if 'Date Joined' in df.columns else None
            df['last_payment_date'] = df['Last Payment'].apply(self.parse_date_flexible) if 'Last Payment' in df.columns else None

            # Expiry date with fallback logic: use 'Expiry Date' if available, otherwise calculate from 'Last Payment' + 24 months
            df['expiry_date'] = df.apply(self.calculate_expiry_date_with_fallback, axis=1)

            # Subscription type
            df['subscription_type'] = df['Subscription'].apply(lambda x: str(x).strip() if pd.notna(x) else 'New') if 'Subscription' in df.columns else 'New'
            df['subscription_type_id'] = df['subscription_type'].apply(lambda x: self.lookup_id('subscription_types', x) or 1)

            # Membership amount
            df['membership_amount'] = df['Memebership Amount'].apply(self.parse_membership_amount) if 'Memebership Amount' in df.columns else 10.00

            # Payment fields (new for consolidated schema)
            df['payment_method'] = None  # Not in current Excel files
            df['payment_reference'] = None  # Not in current Excel files
            df['payment_status'] = 'Pending'  # Default status

            step_time = time.time() - step_start
            print(f"      Prepared {len(df):,} records for import in {step_time:.2f}s")

            # ========================================================================
            # STEP 4: Bulk insert into members_consolidated (FINAL STEP)
            # ========================================================================
            print("[4/4] Bulk inserting into members_consolidated...")

            # Create consolidated tuples directly from df (no need to split/prepare)
            consolidated_tuples = []
            id_numbers = []
            skipped_invalid_vd = 0

            for _, row in df.iterrows():
                # Ensure age is int or None (not float)
                age_val = row['age']
                if pd.notna(age_val):
                    age_val = int(age_val)
                else:
                    age_val = None

                # FINAL VALIDATION: Ensure voter_district_code doesn't exceed INTEGER limit
                # This is a safety check in case any invalid values slipped through
                vd_code = row['vd_number']
                if vd_code and isinstance(vd_code, str) and vd_code.isdigit():
                    vd_int = int(vd_code)
                    if vd_int > 2147483647:  # PostgreSQL INTEGER max
                        # Set to None to prevent integer overflow error
                        vd_code = None
                        skipped_invalid_vd += 1

                # ALSO validate voting_district_code (the validated VD code for DB lookup)
                voting_dist_code = row['voting_district_code']
                if voting_dist_code and isinstance(voting_dist_code, str) and voting_dist_code.isdigit():
                    voting_dist_int = int(voting_dist_code)
                    if voting_dist_int > 2147483647:  # PostgreSQL INTEGER max
                        # Set to None to prevent integer overflow error
                        voting_dist_code = None
                        skipped_invalid_vd += 1

                # CRITICAL: Ensure cell_number is a string, not an integer
                # Pandas may convert numeric strings to integers, which causes overflow
                cell_num = row['cell_number']
                if cell_num is not None and not isinstance(cell_num, str):
                    cell_num = str(cell_num)

                # Determine voter registration status based on VD code
                voter_reg_id, is_registered = self.get_voter_registration_status(voting_dist_code)
                from datetime import datetime
                last_verification_date = datetime.now()

                consolidated_tuple = (
                    row['ID Number'], row['firstname'], row['surname'], row['date_of_birth'],
                    age_val, row['gender_id'], row['race_id'], row['citizenship_id'], row['language_id'],
                    row['ward_code'], vd_code, voting_dist_code, None,
                    row['residential_address'], cell_num, row['email'],
                    row['occupation_id'], row['qualification_id'], row['voter_status_id'],
                    row['membership_type'],
                    row['province_name'], row['province_code'],
                    row['district_name'], row['district_code'],
                    row['municipality_name'], row['municipality_code'],
                    # Membership fields
                    row['date_joined'], row['last_payment_date'], row['expiry_date'],
                    row['subscription_type_id'], row['membership_amount'], row['status_id'],
                    row['payment_method'], row['payment_reference'], row['payment_status'],
                    # Voter registration tracking fields (migration 011)
                    voter_reg_id, is_registered, last_verification_date
                )
                consolidated_tuples.append(consolidated_tuple)
                id_numbers.append(row['ID Number'])

            if skipped_invalid_vd > 0:
                print(f"      [WARNING] Set {skipped_invalid_vd:,} oversized VD codes to NULL during final validation")

            # Bulk insert and get id_number -> member_id mapping
            id_mapping = self.bulk_insert_members_consolidated_with_id_mapping(consolidated_tuples, id_numbers)

            if not id_mapping:
                result['error_message'] = "No members were inserted or mapped into members_consolidated"
                result['members_skipped'] = len(df)
                self.connection.rollback()
                return result

            # Commit transaction
            self.connection.commit()

            # Update result
            result['success'] = True
            result['members_imported'] = len(id_mapping)
            result['memberships_imported'] = 0  # Not used anymore - all data in members_consolidated
            result['members_skipped'] = 0

            processing_time = (datetime.now() - start_time).total_seconds()
            result['processing_time'] = processing_time

            speed = result['members_imported'] / processing_time if processing_time > 0 else 0

            print(f"\n[OK] COMPLETED:")
            print(f"     Members: {result['members_imported']:,} imported")
            print(f"     Memberships: {result['memberships_imported']:,} imported")
            print(f"     Time: {processing_time:.1f}s")
            print(f"     Speed: {speed:.0f} records/sec")

            # Archive file if enabled
            if self.archive_enabled and result['success']:
                self.archive_file(file_path)

        except Exception as e:
            result['error_message'] = str(e)
            self.logger.error(f"Error processing {result['filename']}: {e}")
            self.logger.error(traceback.format_exc())
            self.connection.rollback()

        return result

    def process_single_file(self, file_path: str) -> Dict:
        """Alias for process_file_flexible for backward compatibility"""
        return self.process_file_flexible(file_path)

    def archive_file(self, file_path: str):
        """Move processed file to archive directory with timestamp"""
        try:
            archive_dir = Path('docs/archive')
            archive_dir.mkdir(parents=True, exist_ok=True)

            # Get filename without extension
            filename = os.path.basename(file_path)
            name_without_ext, ext = os.path.splitext(filename)

            # Add timestamp to filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            new_filename = f"{name_without_ext}_{timestamp}{ext}"

            archive_path = archive_dir / new_filename

            shutil.move(file_path, archive_path)
            print(f"[OK] Archived: {filename} -> {new_filename}")
            self.logger.info(f"Archived file: {file_path} -> {archive_path}")
        except Exception as e:
            print(f"[WARN] Archive failed: {e}")
            self.logger.warning(f"Archive failed for {file_path}: {e}")

    def process_all_files(self):
        """
        Process all Excel files in the docs directory.
        Uses index optimization: disables indexes before processing all files,
        then re-enables them after all files are processed.
        """
        excel_files = glob.glob(os.path.join(self.docs_directory, '*.xlsx'))

        if not excel_files:
            print(f"[ERROR] No Excel files found in {self.docs_directory}")
            return

        print(f"[*] FLEXIBLE MEMBERSHIP INGESTION - {len(excel_files)} files")
        print("=" * 60)

        total_imported_members = 0
        total_imported_memberships = 0
        total_skipped = 0
        total_time = 0
        successful_files = 0

        # Disable indexes once before processing all files
        print("\n[OPTIMIZATION] Disabling indexes for batch processing...")
        disabled_indexes = self.disable_membership_history_indexes()

        try:
            for i, file_path in enumerate(excel_files, 1):
                print(f"\n[FILE {i}/{len(excel_files)}] Processing: {os.path.basename(file_path)}")
                print("-" * 60)

                result = self.process_file_flexible_no_index_mgmt(file_path)

                if result['success']:
                    total_imported_members += result['members_imported']
                    total_imported_memberships += result.get('memberships_imported', 0)
                    total_skipped += result['members_skipped']
                    total_time += result['processing_time']
                    successful_files += 1

                    print(f"[OK] {result['filename']}: {result['members_imported']:,} members, {result.get('memberships_imported', 0):,} memberships")
                else:
                    print(f"[ERROR] {result['filename']}: {result.get('error_message', 'Unknown error')}")
                    total_skipped += result.get('members_skipped', 0)

        finally:
            # Always re-enable indexes after processing all files
            if disabled_indexes:
                print("\n[OPTIMIZATION] Re-enabling indexes after batch processing...")
                self.enable_membership_history_indexes(disabled_indexes)

        print("\n" + "=" * 60)
        print(f"[SUMMARY] BATCH PROCESSING COMPLETE:")
        print(f"   Files processed: {successful_files}/{len(excel_files)}")
        print(f"   Total members imported: {total_imported_members:,}")
        print(f"   Total memberships imported: {total_imported_memberships:,}")
        print(f"   Total skipped: {total_skipped:,}")
        print(f"   Total time: {total_time:.1f}s")
        if total_time > 0:
            print(f"   Average speed: {total_imported_members/total_time:.0f} records/sec")
        print("=" * 60)

    def process_file_flexible_no_index_mgmt(self, file_path: str) -> Dict:
        """
        REFACTORED: Process a single Excel file WITHOUT index management.
        Used internally by process_all_files() which manages indexes at batch level.

        Uses the same 7-step refactored pipeline as process_file_flexible() but without
        the index disable/enable logic (handled at batch level instead).
        """
        result = {
            'filename': os.path.basename(file_path),
            'success': False,
            'members_imported': 0,
            'memberships_imported': 0,
            'members_skipped': 0,
            'processing_time': 0,
            'error_message': None
        }

        start_time = datetime.now()

        try:
            # Load Excel data
            df = pd.read_excel(file_path)
            print(f"      Loaded {len(df):,} records")

            # Basic cleaning
            df = df.dropna(subset=['ID Number'])
            df['ID Number'] = df['ID Number'].apply(self.normalize_id_number)
            df = df[df['ID Number'].notna()]

            # Ward validation
            ward_result = self.validate_and_prepare_wards(df)
            df = ward_result['valid_df']

            if len(df) == 0:
                result['error_message'] = f"No valid wards found."
                result['members_skipped'] = len(df)
                return result

            # Prepare member and membership data (same as process_file_flexible)
            # Transform all fields
            df['firstname'] = df['Firstname'].apply(lambda x: str(x).strip()[:50] if pd.notna(x) else '') if 'Firstname' in df.columns else ''
            df['surname'] = df['Surname'].apply(lambda x: str(x).strip()[:50] if pd.notna(x) else None) if 'Surname' in df.columns else None
            df['ward_code'] = df['Ward'].apply(lambda x: str(int(x)) if pd.notna(x) else None)

            # Date of Birth - extract from ID number (SA ID format: YYMMDD...)
            df['date_of_birth'] = df['ID Number'].apply(self.extract_dob_from_id)

            # Age - use from Excel if available, otherwise calculate from DOB
            if 'Age' in df.columns:
                def safe_int_age(x):
                    try:
                        if pd.isna(x) or x == '':
                            return None
                        age_val = int(float(x))
                        # VALIDATION: Reject unreasonable age values (likely data errors)
                        # Valid age range: 0-150 years
                        if age_val < 0 or age_val > 150:
                            return None
                        return age_val
                    except:
                        return None
                df['age'] = df['Age'].apply(safe_int_age)

                # Count how many invalid ages were rejected
                original_age_count = df['Age'].notna().sum()
                processed_age_count = df['age'].notna().sum()
                rejected_age_count = original_age_count - processed_age_count
                if rejected_age_count > 0:
                    print(f"      [WARNING] Rejected {rejected_age_count:,} invalid age values (outside 0-150 range)")
            else:
                df['age'] = df['date_of_birth'].apply(self.calculate_age)

            # Geographic fields - extract from Excel and lookup codes
            df['province_name'] = df['Province'].apply(lambda x: str(x).strip() if pd.notna(x) else None) if 'Province' in df.columns else None
            df['province_code'] = df['province_name'].apply(self.lookup_province_code)

            df['district_name'] = df['Region'].apply(lambda x: str(x).strip() if pd.notna(x) else None) if 'Region' in df.columns else None
            df['district_code'] = df['district_name'].apply(self.lookup_district_code)

            df['municipality_name'] = df['Municipality'].apply(lambda x: str(x).strip() if pd.notna(x) else None) if 'Municipality' in df.columns else None
            df['municipality_code'] = df['municipality_name'].apply(self.lookup_municipality_code)

            df['gender_id'] = df['Gender'].apply(lambda x: self.lookup_id('genders', x) or 1) if 'Gender' in df.columns else 1
            df['race_id'] = df['Race'].apply(lambda x: self.lookup_id('races', x) or 1) if 'Race' in df.columns else 1
            df['citizenship_id'] = df['Citizenship'].apply(lambda x: self.lookup_id('citizenships', x) or 1) if 'Citizenship' in df.columns else 1
            df['language_id'] = df['Language'].apply(lambda x: self.lookup_id('languages', x) or 1) if 'Language' in df.columns else 1
            df['occupation_id'] = df['Occupation'].apply(lambda x: self.lookup_id('occupations', x) or 1) if 'Occupation' in df.columns else 1
            df['qualification_id'] = df['Qualification'].apply(lambda x: self.lookup_id('qualifications', x) or 1) if 'Qualification' in df.columns else 1
            # Try both "VOTER STATUS" and "Voter Status" column names
            # Normalize voter status values before lookup (e.g., "REGISTERED IN WARD" -> "Registered")
            voter_status_col = 'VOTER STATUS' if 'VOTER STATUS' in df.columns else ('Voter Status' if 'Voter Status' in df.columns else None)
            if voter_status_col:
                df['voter_status_normalized'] = df[voter_status_col].apply(self.normalize_voter_status)
                df['voter_status_id'] = df['voter_status_normalized'].apply(lambda x: self.lookup_id('voter_statuses', x) or 1)
            else:
                df['voter_status_id'] = 1

            df['residential_address'] = df['Residential Address'].apply(lambda x: str(x)[:200] if pd.notna(x) else None) if 'Residential Address' in df.columns else None
            df['cell_number'] = df['Cell Number'].apply(self.format_cell_number) if 'Cell Number' in df.columns else None
            # CRITICAL: Force cell_number to be string type to prevent pandas from converting to integer
            df['cell_number'] = df['cell_number'].astype('object')  # Use 'object' dtype to preserve None values
            df['email'] = df['Email'].apply(lambda x: str(x).strip()[:100] if pd.notna(x) else None) if 'Email' in df.columns else None

            # Membership type (for members table)
            # Normalize membership status values before lookup (e.g., "Invalid" -> "Inactive")
            if 'Status' in df.columns:
                df['excel_status'] = df['Status'].apply(lambda x: str(x).strip() if pd.notna(x) else 'Good Standing')
                df['membership_status_normalized'] = df['excel_status'].apply(self.normalize_membership_status)
                df['status_id'] = df['membership_status_normalized'].apply(lambda x: self.lookup_id('membership_statuses', x) or 8)
            else:
                df['excel_status'] = 'Good Standing'
                df['status_id'] = 8
            df['membership_type'] = df['excel_status'].apply(self.map_membership_type)

            # VD NUMBER - process and separate special codes from real VD codes
            # Check for both 'VD NUMBER' (all caps) and 'VD Number' (IEC verification format)
            vd_col = None
            if 'VD NUMBER' in df.columns:
                vd_col = 'VD NUMBER'
            elif 'VD Number' in df.columns:
                vd_col = 'VD Number'

            if vd_col:
                # Count original non-null VD numbers
                original_vd_count = df[vd_col].notna().sum()

                # DEBUG: Show sample VD numbers before processing
                print(f"      [DEBUG] Sample VD numbers before processing (column: {vd_col}): {df[vd_col].head(10).tolist()}")

                # Process VD numbers (this will filter out invalid ones)
                df['vd_number'] = df[vd_col].apply(self.process_vd_number)

                # DEBUG: Show sample VD numbers after processing
                print(f"      [DEBUG] Sample VD numbers after processing: {df['vd_number'].head(10).tolist()}")

                # Count how many VD codes were rejected during processing
                processed_vd_count = df['vd_number'].notna().sum()
                rejected_vd_count = original_vd_count - processed_vd_count

                print(f"      [DEBUG] Original VD count: {original_vd_count:,}, Processed VD count: {processed_vd_count:,}, Rejected: {rejected_vd_count:,}")

                if rejected_vd_count > 0:
                    print(f"      [WARNING] Rejected {rejected_vd_count:,} invalid VD codes (likely cell numbers or oversized values)")

                # BUSINESS RULE: Assign special VD codes based on IEC verification status
                # If IEC verification was performed, override VD codes based on verification status
                if 'iec_verification_status' in df.columns:
                    def assign_vd_based_on_iec_status(row):
                        status = row.get('iec_verification_status')
                        current_vd = row.get('vd_number')

                        # If already has a special code, keep it
                        if current_vd in SPECIAL_VD_CODES:
                            return current_vd

                        # Assign special codes based on IEC verification status (8 digits - matches DB)
                        if status == 'DIFFERENT_WARD':
                            return '22222222'  # Registered in Different Ward (8 digits)
                        elif status == 'NOT_REGISTERED':
                            return '99999999'  # Not Registered Voter (8 digits)
                        elif status == 'DECEASED':
                            return '11111111'  # Deceased (8 digits)
                        else:
                            # For REGISTERED_IN_WARD or other statuses, keep the original VD
                            return current_vd

                    df['vd_number'] = df.apply(assign_vd_based_on_iec_status, axis=1)
                    print(f"      [INFO] Applied special VD codes based on IEC verification status")

                # voting_district_code should contain BOTH valid VD codes AND special codes
                # Special codes (222222222, 999999999, etc.) should be stored in voting_district_code
                # This allows the system to track special voter statuses
                def get_voting_district_code(vd_num):
                    if not vd_num:
                        return None
                    # Special codes are valid and should be stored
                    if vd_num in SPECIAL_VD_CODES:
                        return vd_num
                    # Check if VD code exists in database
                    if vd_num in self.valid_vd_codes:
                        return vd_num
                    return None
                df['voting_district_code'] = df['vd_number'].apply(get_voting_district_code)
            else:
                df['vd_number'] = None
                df['voting_district_code'] = None

            df['date_joined'] = df['Date Joined'].apply(self.parse_date_flexible) if 'Date Joined' in df.columns else None
            df['last_payment_date'] = df['Last Payment'].apply(self.parse_date_flexible) if 'Last Payment' in df.columns else None

            # Expiry date with fallback logic: use 'Expiry Date' if available, otherwise calculate from 'Last Payment' + 24 months
            df['expiry_date'] = df.apply(self.calculate_expiry_date_with_fallback, axis=1)

            # DEBUG: Check date parsing results
            # Count how many expiry dates came from 'Expiry Date' column vs calculated from 'Last Payment'
            if 'Expiry Date' in df.columns:
                original_expiry_count = df['Expiry Date'].notna().sum()
                parsed_expiry_count = df['expiry_date'].notna().sum()
                calculated_from_payment = parsed_expiry_count - original_expiry_count
                if calculated_from_payment > 0:
                    print(f"      [INFO] Calculated {calculated_from_payment:,} expiry dates from 'Last Payment' + 24 months")
                if original_expiry_count > 0:
                    print(f"      [OK] Successfully parsed {original_expiry_count:,} expiry dates from 'Expiry Date' column")
            else:
                # No 'Expiry Date' column, all expiry dates calculated from 'Last Payment'
                parsed_expiry_count = df['expiry_date'].notna().sum()
                if parsed_expiry_count > 0:
                    print(f"      [INFO] Calculated {parsed_expiry_count:,} expiry dates from 'Last Payment' + 24 months (no 'Expiry Date' column)")

            # DEBUG: Show sample parsed expiry dates
            if df['expiry_date'].notna().sum() > 0:
                print(f"      [DEBUG] Sample parsed expiry dates (first 5): {df['expiry_date'].head(5).tolist()}")

            df['subscription_type'] = df['Subscription'].apply(lambda x: str(x).strip() if pd.notna(x) else 'New') if 'Subscription' in df.columns else 'New'
            df['subscription_type_id'] = df['subscription_type'].apply(lambda x: self.lookup_id('subscription_types', x) or 1)

            df['membership_amount'] = df['Memebership Amount'].apply(self.parse_membership_amount) if 'Memebership Amount' in df.columns else 10.00

            # Payment fields (new for consolidated schema)
            df['payment_method'] = None  # Not in current Excel files
            df['payment_reference'] = None  # Not in current Excel files
            df['payment_status'] = 'Pending'  # Default status

            # Bulk insert into members_consolidated with ID mapping
            # NOTE: We ONLY insert into members_consolidated, NOT membership_history
            # No need to split/prepare - use df directly
            consolidated_tuples = []
            id_numbers = []
            skipped_invalid_vd = 0

            for _, row in df.iterrows():
                # Ensure age is int or None (not float)
                age_val = row['age']
                if pd.notna(age_val):
                    age_val = int(age_val)
                else:
                    age_val = None

                # FINAL VALIDATION: Ensure voter_district_code doesn't exceed INTEGER limit
                # This is a safety check in case any invalid values slipped through
                vd_code = row['vd_number']
                if vd_code and isinstance(vd_code, str) and vd_code.isdigit():
                    vd_int = int(vd_code)
                    if vd_int > 2147483647:  # PostgreSQL INTEGER max
                        # Set to None to prevent integer overflow error
                        vd_code = None
                        skipped_invalid_vd += 1

                # ALSO validate voting_district_code (the validated VD code for DB lookup)
                voting_dist_code = row['voting_district_code']
                if voting_dist_code and isinstance(voting_dist_code, str) and voting_dist_code.isdigit():
                    voting_dist_int = int(voting_dist_code)
                    if voting_dist_int > 2147483647:  # PostgreSQL INTEGER max
                        # Set to None to prevent integer overflow error
                        voting_dist_code = None
                        skipped_invalid_vd += 1

                # CRITICAL: Ensure cell_number is a string, not an integer
                # Pandas may convert numeric strings to integers, which causes overflow
                cell_num = row['cell_number']
                if cell_num is not None and not isinstance(cell_num, str):
                    cell_num = str(cell_num)

                # Determine voter registration status based on VD code
                voter_reg_id, is_registered = self.get_voter_registration_status(voting_dist_code)
                from datetime import datetime
                last_verification_date = datetime.now()

                consolidated_tuple = (
                    row['ID Number'], row['firstname'], row['surname'], row['date_of_birth'],
                    age_val, row['gender_id'], row['race_id'], row['citizenship_id'], row['language_id'],
                    row['ward_code'], vd_code, voting_dist_code, None,
                    row['residential_address'], cell_num, row['email'],
                    row['occupation_id'], row['qualification_id'], row['voter_status_id'],
                    row['membership_type'],
                    row['province_name'], row['province_code'],
                    row['district_name'], row['district_code'],
                    row['municipality_name'], row['municipality_code'],
                    # Membership fields
                    row['date_joined'], row['last_payment_date'], row['expiry_date'],
                    row['subscription_type_id'], row['membership_amount'], row['status_id'],
                    row['payment_method'], row['payment_reference'], row['payment_status'],
                    # Voter registration tracking fields (migration 011)
                    voter_reg_id, is_registered, last_verification_date
                )

                # DEBUG: Log first tuple to verify expiry_date is included
                if len(consolidated_tuples) == 0:
                    print(f"      [DEBUG] First tuple expiry_date: {row['expiry_date']} (type: {type(row['expiry_date']).__name__})")
                    print(f"      [DEBUG] First tuple voter_reg: id={voter_reg_id}, is_registered={is_registered}")

                consolidated_tuples.append(consolidated_tuple)
                id_numbers.append(row['ID Number'])

            if skipped_invalid_vd > 0:
                print(f"      [WARNING] Set {skipped_invalid_vd:,} oversized VD codes to NULL during final validation")

            # DEBUG: Show sample tuple data
            if len(consolidated_tuples) > 0:
                sample_tuple = consolidated_tuples[0]
                print(f"      [DEBUG] Sample tuple (first 15 fields):")
                print(f"        ID: {sample_tuple[0]}, Name: {sample_tuple[1]} {sample_tuple[2]}")
                print(f"        Ward: {sample_tuple[9]}, VD: {sample_tuple[10]}, Voting Dist: {sample_tuple[11]}")
                print(f"        Cell: {sample_tuple[14]}")

            # Use new consolidated ID mapping method
            id_mapping = self.bulk_insert_members_consolidated_with_id_mapping(consolidated_tuples, id_numbers)

            if not id_mapping:
                result['error_message'] = "No members were inserted into members_consolidated"
                result['members_skipped'] = len(df)
                self.connection.rollback()
                return result

            # Commit transaction
            self.connection.commit()

            result['success'] = True
            result['members_imported'] = len(id_mapping)
            result['memberships_imported'] = 0  # Not used anymore - all data in members_consolidated
            result['members_skipped'] = 0

            processing_time = (datetime.now() - start_time).total_seconds()
            result['processing_time'] = processing_time

            # Archive file if enabled
            if self.archive_enabled and result['success']:
                self.archive_file(file_path)

        except Exception as e:
            result['error_message'] = str(e)
            self.logger.error(f"Error processing {result['filename']}: {e}")
            self.logger.error(traceback.format_exc())
            self.connection.rollback()

        return result

    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        print("[OK] Database connection closed")


if __name__ == "__main__":
    # Database configuration
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'user': 'eff_admin',
        'password': 'Frames!123',
        'database': 'eff_membership_database'  # Development database with consolidated schema
    }

    docs_directory = 'docs'

    print("=" * 80)
    print("REFACTORED FLEXIBLE MEMBERSHIP INGESTION SYSTEM")
    print("=" * 80)
    print("\nKEY IMPROVEMENTS:")
    print("  1. Database Schema Verification - Validates all required columns at startup")
    print("  2. DataFrame Splitting - Separates members and memberships data for clarity")
    print("  3. Improved ID Mapping - Handles duplicates correctly with id_number->member_id mapping")
    print("  4. Performance Timing - Tracks execution time for each major step")
    print("  5. Bulk Insert Optimization - Uses execute_values() with proper conflict handling")
    print("\nFEATURES:")
    print("  - Flexible column name handling")
    print("  - Special VD codes support (22222222, 99999999, 33333333, 11111111, 00000000)")
    print("  - Handles missing wards gracefully")
    print("  - Fast bulk operations with in-memory caching")
    print("  - Cell number formatting (27 prefix)")
    print("  - ID number normalization (13 digits with leading zeros)")
    print("  - Geographic resolution (province, district, municipality codes)")
    print("  - Comprehensive error handling and logging")
    print("  - File archiving after successful processing")
    print("\nPERFORMANCE TARGETS (10,000 rows on local PostgreSQL):")
    print("  - Excel read: 0.5 - 1.5s")
    print("  - DataFrame cleaning/validation: < 0.5s")
    print("  - DataFrame splitting: < 0.05s")
    print("  - Members bulk insert: 0.2 - 1s")
    print("  - Memberships bulk insert: 0.2 - 1s")
    print("  - Total end-to-end: 2 - 5s (local), 5 - 10s (remote)")
    print("=" * 80)

    # Run flexible ingestion
    ingestion = FlexibleMembershipIngestion(docs_directory, db_config, use_optimized=True)
    try:
        ingestion.process_all_files()
    finally:
        ingestion.close()

