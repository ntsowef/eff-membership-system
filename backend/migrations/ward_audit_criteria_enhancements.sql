-- =====================================================
-- Ward Audit Criteria Enhancements Migration
-- =====================================================
-- This migration enhances the ward audit system with:
-- 1. Manual verification checkboxes for Criteria 2 & 3
-- 2. Province-based presiding officer selection support
-- 3. Enhanced compliance tracking
-- =====================================================

-- =====================================================
-- STEP 1: Add manual verification fields to ward_meeting_records
-- =====================================================

-- Add checkbox fields for Criterion 2 (Quorum Verification)
ALTER TABLE ward_meeting_records
ADD COLUMN IF NOT EXISTS quorum_verified_manually BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quorum_verified_by INTEGER,
ADD COLUMN IF NOT EXISTS quorum_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS quorum_verification_notes TEXT;

-- Add checkbox fields for Criterion 3 (Meeting Attendance)
ALTER TABLE ward_meeting_records
ADD COLUMN IF NOT EXISTS meeting_took_place_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS meeting_verified_by INTEGER,
ADD COLUMN IF NOT EXISTS meeting_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS meeting_verification_notes TEXT;

-- Add foreign keys for verification tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ward_meeting_quorum_verifier'
    ) THEN
        ALTER TABLE ward_meeting_records
        ADD CONSTRAINT fk_ward_meeting_quorum_verifier
        FOREIGN KEY (quorum_verified_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ward_meeting_verifier'
    ) THEN
        ALTER TABLE ward_meeting_records
        ADD CONSTRAINT fk_ward_meeting_verifier
        FOREIGN KEY (meeting_verified_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for verification queries
CREATE INDEX IF NOT EXISTS idx_ward_meeting_quorum_verified ON ward_meeting_records(quorum_verified_manually);
CREATE INDEX IF NOT EXISTS idx_ward_meeting_verified ON ward_meeting_records(meeting_took_place_verified);

-- =====================================================
-- STEP 2: Update ward_compliance_audit_log for enhanced tracking
-- =====================================================

-- Add manual verification tracking to audit log
ALTER TABLE ward_compliance_audit_log
ADD COLUMN IF NOT EXISTS quorum_verified_manually BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS meeting_took_place_verified BOOLEAN DEFAULT FALSE;

-- =====================================================
-- STEP 3: Add province tracking to members table (if not exists)
-- =====================================================

-- Ensure members table has province_code for filtering
-- This should already exist, but we add it conditionally
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'province_code'
    ) THEN
        ALTER TABLE members ADD COLUMN province_code VARCHAR(3);
        
        -- Populate province_code from ward relationships
        UPDATE members m
        SET province_code = (
            SELECT p.province_code
            FROM wards w
            JOIN municipalities mu ON w.municipality_code = mu.municipality_code
            JOIN districts d ON mu.district_code = d.district_code
            JOIN provinces p ON d.province_code = p.province_code
            WHERE w.ward_code = m.ward_code
            LIMIT 1
        )
        WHERE m.province_code IS NULL;
        
        -- Create index for province filtering
        CREATE INDEX idx_members_province ON members(province_code);
    END IF;
END $$;

-- =====================================================
-- STEP 4: Create helper view for presiding officer selection
-- =====================================================

CREATE OR REPLACE VIEW vw_eligible_presiding_officers AS
SELECT 
    m.member_id,
    m.firstname,
    m.surname,
    CONCAT(m.firstname, ' ', m.surname) as full_name,
    m.id_number,
    m.cell_number,
    m.ward_code,
    w.ward_name,
    w.municipality_code,
    mu.municipality_name,
    d.district_code,
    d.district_name,
    p.province_code,
    p.province_name,
    ms.status_name as membership_status
FROM members m
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN memberships mb ON m.member_id = mb.member_id
LEFT JOIN membership_statuses ms ON mb.status_id = ms.status_id
WHERE ms.status_name = 'Active' OR ms.status_name IS NULL;

-- =====================================================
-- STEP 5: Update compliance summary view
-- =====================================================

-- Drop existing view first to avoid column name conflicts
DROP VIEW IF EXISTS vw_ward_compliance_summary CASCADE;

CREATE VIEW vw_ward_compliance_summary AS
SELECT 
    w.ward_code,
    w.ward_name,
    w.municipality_code,
    m.municipality_name,
    m.district_code,
    d.district_name,
    d.province_code,
    p.province_name,
    w.is_compliant,
    w.compliance_approved_at,
    w.compliance_approved_by,
    
    -- Criterion 1: Membership & Voting District Compliance
    COUNT(DISTINCT mem.member_id) as total_members,
    CASE WHEN COUNT(DISTINCT mem.member_id) >= 200 THEN TRUE ELSE FALSE END as meets_member_threshold,
    COUNT(DISTINCT vd.voting_district_code) as total_voting_districts,
    COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vd.voting_district_code END) as compliant_voting_districts,
    CASE 
        WHEN COUNT(DISTINCT vd.voting_district_code) > 0 
        AND COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vd.voting_district_code END) = COUNT(DISTINCT vd.voting_district_code)
        THEN TRUE 
        ELSE FALSE 
    END as all_vds_compliant,
    CASE 
        WHEN COUNT(DISTINCT mem.member_id) >= 200 
        AND COUNT(DISTINCT vd.voting_district_code) > 0
        AND COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vd.voting_district_code END) = COUNT(DISTINCT vd.voting_district_code)
        THEN TRUE 
        ELSE FALSE 
    END as criterion_1_compliant,
    
    -- Criterion 2: Meeting Quorum Verification (with manual verification)
    (SELECT wmr.quorum_met AND wmr.quorum_verified_manually
     FROM ward_meeting_records wmr
     WHERE wmr.ward_code = w.ward_code
     ORDER BY wmr.created_at DESC
     LIMIT 1) as criterion_2_passed,
    
    -- Criterion 3: Meeting Attendance (with manual verification)
    (SELECT wmr.meeting_took_place_verified
     FROM ward_meeting_records wmr
     WHERE wmr.ward_code = w.ward_code
     ORDER BY wmr.created_at DESC
     LIMIT 1) as criterion_3_passed,
    
    -- Criterion 4: Presiding Officer Information
    (SELECT CASE WHEN wmr.presiding_officer_id IS NOT NULL THEN TRUE ELSE FALSE END
     FROM ward_meeting_records wmr
     WHERE wmr.ward_code = w.ward_code
     ORDER BY wmr.created_at DESC
     LIMIT 1) as criterion_4_passed,
    
    -- Criterion 5: Delegate Selection (SRPA delegates assigned)
    (SELECT COUNT(*) 
     FROM ward_delegates wd
     JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
     WHERE wd.ward_code = w.ward_code 
     AND at.assembly_code = 'SRPA'
     AND wd.delegate_status = 'Active') as srpa_delegates,
    
    (SELECT COUNT(*) 
     FROM ward_delegates wd
     JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
     WHERE wd.ward_code = w.ward_code 
     AND at.assembly_code = 'PPA'
     AND wd.delegate_status = 'Active') as ppa_delegates,
    
    (SELECT COUNT(*) 
     FROM ward_delegates wd
     JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
     WHERE wd.ward_code = w.ward_code 
     AND at.assembly_code = 'NPA'
     AND wd.delegate_status = 'Active') as npa_delegates,
    
    CASE 
        WHEN (SELECT COUNT(*) 
              FROM ward_delegates wd
              JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
              WHERE wd.ward_code = w.ward_code 
              AND at.assembly_code = 'SRPA'
              AND wd.delegate_status = 'Active') > 0
        THEN TRUE 
        ELSE FALSE 
    END as criterion_5_passed,
    
    -- Overall compliance check
    CASE 
        WHEN COUNT(DISTINCT mem.member_id) >= 200 
        AND COUNT(DISTINCT vd.voting_district_code) > 0
        AND COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vd.voting_district_code END) = COUNT(DISTINCT vd.voting_district_code)
        AND (SELECT wmr.quorum_met AND wmr.quorum_verified_manually
             FROM ward_meeting_records wmr
             WHERE wmr.ward_code = w.ward_code
             ORDER BY wmr.created_at DESC
             LIMIT 1) = TRUE
        AND (SELECT wmr.meeting_took_place_verified
             FROM ward_meeting_records wmr
             WHERE wmr.ward_code = w.ward_code
             ORDER BY wmr.created_at DESC
             LIMIT 1) = TRUE
        AND (SELECT CASE WHEN wmr.presiding_officer_id IS NOT NULL THEN TRUE ELSE FALSE END
             FROM ward_meeting_records wmr
             WHERE wmr.ward_code = w.ward_code
             ORDER BY wmr.created_at DESC
             LIMIT 1) = TRUE
        AND (SELECT COUNT(*) 
             FROM ward_delegates wd
             JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
             WHERE wd.ward_code = w.ward_code 
             AND at.assembly_code = 'SRPA'
             AND wd.delegate_status = 'Active') > 0
        THEN TRUE 
        ELSE FALSE 
    END as all_criteria_passed

FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN members mem ON w.ward_code = mem.ward_code
LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code
LEFT JOIN vw_voting_district_compliance vdc ON vd.voting_district_code = vdc.voting_district_code
GROUP BY 
    w.ward_code, w.ward_name, w.municipality_code, m.municipality_name,
    m.district_code, d.district_name, d.province_code, p.province_name,
    w.is_compliant, w.compliance_approved_at, w.compliance_approved_by;

-- =====================================================
-- STEP 6: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN ward_meeting_records.quorum_verified_manually IS 'Manual checkbox verification that meeting quorum was met (Criterion 2)';
COMMENT ON COLUMN ward_meeting_records.meeting_took_place_verified IS 'Manual checkbox verification that the meeting actually took place (Criterion 3)';
COMMENT ON COLUMN ward_meeting_records.presiding_officer_id IS 'Member ID of presiding officer, filtered by province (Criterion 4)';

-- =====================================================
-- Migration Complete
-- =====================================================

