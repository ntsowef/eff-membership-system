-- Migration: Add IEC Verification Fields to Member Application Bulk Upload
-- Purpose: Store IEC verification results for bulk membership applications
-- Created: 2025-12-07

BEGIN;

-- Add IEC verification tracking fields to uploads table
ALTER TABLE member_application_bulk_uploads
ADD COLUMN IF NOT EXISTS iec_verification_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS iec_verified_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS iec_not_registered_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS iec_failed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS iec_rate_limited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS iec_rate_limit_reset_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS report_file_path VARCHAR(500);

-- Add IEC verification fields to upload records table
ALTER TABLE member_application_bulk_upload_records
ADD COLUMN IF NOT EXISTS iec_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS iec_is_registered BOOLEAN,
ADD COLUMN IF NOT EXISTS iec_voter_status VARCHAR(100),
ADD COLUMN IF NOT EXISTS iec_province_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS iec_province_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS iec_district_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS iec_district_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS iec_municipality_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS iec_municipality_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS iec_ward_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS iec_ward_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS iec_voting_district_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS iec_voting_district_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS iec_voting_station_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS iec_verification_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS iec_verification_error TEXT,
ADD COLUMN IF NOT EXISTS application_id INTEGER REFERENCES membership_applications(application_id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_member_app_bulk_upload_records_iec_verified 
ON member_application_bulk_upload_records(iec_verified);

CREATE INDEX IF NOT EXISTS idx_member_app_bulk_upload_records_iec_registered 
ON member_application_bulk_upload_records(iec_is_registered);

CREATE INDEX IF NOT EXISTS idx_member_app_bulk_upload_records_application_id 
ON member_application_bulk_upload_records(application_id);

-- Add IEC verification fields to membership_applications table if not exists
ALTER TABLE membership_applications
ADD COLUMN IF NOT EXISTS iec_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS iec_is_registered BOOLEAN,
ADD COLUMN IF NOT EXISTS iec_voter_status VARCHAR(100),
ADD COLUMN IF NOT EXISTS iec_province_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS iec_district_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS iec_municipality_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS iec_ward_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS iec_voting_district_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS iec_voting_station_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS iec_verification_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS iec_verification_error TEXT,
ADD COLUMN IF NOT EXISTS bulk_upload_id INTEGER REFERENCES member_application_bulk_uploads(upload_id) ON DELETE SET NULL;

-- Create index for bulk upload reference
CREATE INDEX IF NOT EXISTS idx_membership_applications_bulk_upload_id 
ON membership_applications(bulk_upload_id);

CREATE INDEX IF NOT EXISTS idx_membership_applications_iec_verified 
ON membership_applications(iec_verified);

COMMENT ON COLUMN member_application_bulk_upload_records.iec_verified IS 'Whether IEC verification was attempted';
COMMENT ON COLUMN member_application_bulk_upload_records.iec_is_registered IS 'Whether member is registered to vote per IEC';
COMMENT ON COLUMN member_application_bulk_upload_records.iec_voting_district_code IS 'VD code from IEC; 999999999 for non-registered voters';
COMMENT ON COLUMN member_application_bulk_upload_records.iec_verification_error IS 'Error message if IEC verification failed';

COMMIT;

