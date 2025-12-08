-- Add missing columns to membership_applications table
-- These columns are required by the backend API but missing from the PostgreSQL schema

-- Add citizenship_status column (VARCHAR instead of citizenship_id foreign key)
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS citizenship_status VARCHAR(100);

-- Add signature_type column
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS signature_type VARCHAR(20);

-- Add signature_data column (stores base64 encoded signature image)
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS signature_data TEXT;

-- Add declaration_accepted column (boolean for terms acceptance)
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS declaration_accepted BOOLEAN DEFAULT false;

-- Add constitution_accepted column (boolean for constitution acceptance)
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS constitution_accepted BOOLEAN DEFAULT false;

-- Add additional columns that may be referenced in the backend
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS hierarchy_level VARCHAR(50);

ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS entity_name VARCHAR(255);

ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS reason_for_joining TEXT;

ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS skills_experience TEXT;

ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS referred_by VARCHAR(255);

ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS province_code VARCHAR(20);

ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS district_code VARCHAR(20);

ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS municipal_code VARCHAR(20);

ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS voting_district_code VARCHAR(20);

-- Add check constraints for enum-like fields
ALTER TABLE membership_applications
DROP CONSTRAINT IF EXISTS membership_applications_citizenship_status_check;

ALTER TABLE membership_applications
ADD CONSTRAINT membership_applications_citizenship_status_check 
CHECK (citizenship_status IN ('South African Citizen', 'Permanent Resident', 'Work Permit', 'Refugee', 'Other'));

ALTER TABLE membership_applications
DROP CONSTRAINT IF EXISTS membership_applications_signature_type_check;

ALTER TABLE membership_applications
ADD CONSTRAINT membership_applications_signature_type_check 
CHECK (signature_type IN ('drawn', 'typed', 'uploaded'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_membership_applications_citizenship_status 
ON membership_applications(citizenship_status);

CREATE INDEX IF NOT EXISTS idx_membership_applications_province_code 
ON membership_applications(province_code);

CREATE INDEX IF NOT EXISTS idx_membership_applications_district_code 
ON membership_applications(district_code);

CREATE INDEX IF NOT EXISTS idx_membership_applications_municipal_code 
ON membership_applications(municipal_code);

CREATE INDEX IF NOT EXISTS idx_membership_applications_voting_district_code 
ON membership_applications(voting_district_code);

-- Add comments for documentation
COMMENT ON COLUMN membership_applications.citizenship_status IS 'Citizenship status of the applicant';
COMMENT ON COLUMN membership_applications.signature_type IS 'Type of signature: drawn, typed, or uploaded';
COMMENT ON COLUMN membership_applications.signature_data IS 'Base64 encoded signature image data';
COMMENT ON COLUMN membership_applications.declaration_accepted IS 'Whether applicant accepted the declaration';
COMMENT ON COLUMN membership_applications.constitution_accepted IS 'Whether applicant accepted the constitution';
COMMENT ON COLUMN membership_applications.hierarchy_level IS 'Organizational hierarchy level';
COMMENT ON COLUMN membership_applications.entity_name IS 'Name of the organizational entity';
COMMENT ON COLUMN membership_applications.reason_for_joining IS 'Applicant reason for joining';
COMMENT ON COLUMN membership_applications.skills_experience IS 'Applicant skills and experience';
COMMENT ON COLUMN membership_applications.referred_by IS 'Who referred this applicant';
COMMENT ON COLUMN membership_applications.province_code IS 'Province code for geographic location';
COMMENT ON COLUMN membership_applications.district_code IS 'District code for geographic location';
COMMENT ON COLUMN membership_applications.municipal_code IS 'Municipal code for geographic location';
COMMENT ON COLUMN membership_applications.voting_district_code IS 'Voting district code for geographic location';

