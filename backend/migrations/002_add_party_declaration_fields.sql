-- Migration: Add Party Declaration and Signature fields to membership_applications table
-- Date: 2025-01-19
-- Description: Adds fields for EFF party declaration, signature capture, and additional membership details

-- Add new columns to membership_applications table
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS signature_type ENUM('typed', 'drawn') DEFAULT NULL AFTER admin_notes,
ADD COLUMN IF NOT EXISTS signature_data TEXT DEFAULT NULL AFTER signature_type,
ADD COLUMN IF NOT EXISTS declaration_accepted BOOLEAN DEFAULT FALSE AFTER signature_data,
ADD COLUMN IF NOT EXISTS constitution_accepted BOOLEAN DEFAULT FALSE AFTER declaration_accepted,
ADD COLUMN IF NOT EXISTS hierarchy_level VARCHAR(50) DEFAULT NULL AFTER constitution_accepted,
ADD COLUMN IF NOT EXISTS entity_name VARCHAR(200) DEFAULT NULL AFTER hierarchy_level,
ADD COLUMN IF NOT EXISTS membership_type ENUM('Regular', 'Associate', 'Student', 'Senior') DEFAULT 'Regular' AFTER entity_name,
ADD COLUMN IF NOT EXISTS reason_for_joining TEXT DEFAULT NULL AFTER membership_type,
ADD COLUMN IF NOT EXISTS skills_experience TEXT DEFAULT NULL AFTER reason_for_joining,
ADD COLUMN IF NOT EXISTS referred_by VARCHAR(200) DEFAULT NULL AFTER skills_experience,
ADD COLUMN IF NOT EXISTS province_code VARCHAR(10) DEFAULT NULL AFTER referred_by,
ADD COLUMN IF NOT EXISTS district_code VARCHAR(10) DEFAULT NULL AFTER province_code,
ADD COLUMN IF NOT EXISTS municipal_code VARCHAR(10) DEFAULT NULL AFTER district_code,
ADD COLUMN IF NOT EXISTS voting_district_code VARCHAR(20) DEFAULT NULL AFTER municipal_code;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_membership_applications_signature_type ON membership_applications(signature_type);
CREATE INDEX IF NOT EXISTS idx_membership_applications_declaration_accepted ON membership_applications(declaration_accepted);
CREATE INDEX IF NOT EXISTS idx_membership_applications_constitution_accepted ON membership_applications(constitution_accepted);
CREATE INDEX IF NOT EXISTS idx_membership_applications_hierarchy_level ON membership_applications(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_membership_applications_membership_type ON membership_applications(membership_type);
CREATE INDEX IF NOT EXISTS idx_membership_applications_province_code ON membership_applications(province_code);
CREATE INDEX IF NOT EXISTS idx_membership_applications_district_code ON membership_applications(district_code);
CREATE INDEX IF NOT EXISTS idx_membership_applications_municipal_code ON membership_applications(municipal_code);

-- Add foreign key constraints for geographic codes
ALTER TABLE membership_applications 
ADD CONSTRAINT IF NOT EXISTS fk_membership_applications_province 
    FOREIGN KEY (province_code) REFERENCES provinces(province_code) ON DELETE SET NULL;

ALTER TABLE membership_applications 
ADD CONSTRAINT IF NOT EXISTS fk_membership_applications_district 
    FOREIGN KEY (district_code) REFERENCES districts(district_code) ON DELETE SET NULL;

ALTER TABLE membership_applications 
ADD CONSTRAINT IF NOT EXISTS fk_membership_applications_municipality 
    FOREIGN KEY (municipal_code) REFERENCES municipalities(municipal_code) ON DELETE SET NULL;

-- Update existing applications to have default values for new required fields
UPDATE membership_applications 
SET 
    declaration_accepted = FALSE,
    constitution_accepted = FALSE,
    membership_type = 'Regular',
    hierarchy_level = 'Ward'
WHERE declaration_accepted IS NULL 
   OR constitution_accepted IS NULL 
   OR membership_type IS NULL
   OR hierarchy_level IS NULL;

-- Create a view for complete application details including party declaration
CREATE OR REPLACE VIEW membership_applications_complete AS
SELECT 
    ma.*,
    p.name as province_name,
    d.name as district_name,
    m.name as municipality_name,
    w.name as ward_name,
    vd.name as voting_district_name,
    CASE 
        WHEN ma.declaration_accepted = TRUE 
         AND ma.constitution_accepted = TRUE 
         AND ma.signature_data IS NOT NULL 
         AND ma.signature_type IS NOT NULL
        THEN 'Declaration Complete'
        ELSE 'Declaration Incomplete'
    END as declaration_status
FROM membership_applications ma
LEFT JOIN provinces p ON ma.province_code = p.province_code
LEFT JOIN districts d ON ma.district_code = d.district_code
LEFT JOIN municipalities m ON ma.municipal_code = m.municipal_code
LEFT JOIN wards w ON ma.ward_code = w.ward_code
LEFT JOIN voting_districts vd ON ma.voting_district_code = vd.voting_district_code;

-- Create a view for party declaration compliance tracking
CREATE OR REPLACE VIEW party_declaration_compliance AS
SELECT 
    ma.id,
    ma.application_number,
    ma.first_name,
    ma.last_name,
    ma.email,
    ma.declaration_accepted,
    ma.constitution_accepted,
    ma.signature_type,
    ma.signature_data IS NOT NULL as has_signature,
    ma.created_at,
    ma.status,
    CASE 
        WHEN ma.declaration_accepted = TRUE 
         AND ma.constitution_accepted = TRUE 
         AND ma.signature_data IS NOT NULL 
         AND ma.signature_type IS NOT NULL
        THEN 'Fully Compliant'
        WHEN ma.declaration_accepted = TRUE 
         AND ma.constitution_accepted = TRUE 
        THEN 'Partially Compliant'
        ELSE 'Non-Compliant'
    END as compliance_status
FROM membership_applications ma;
