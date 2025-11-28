-- =====================================================
-- Ward Audit System - Database Schema Migration
-- =====================================================
-- This migration adds comprehensive ward audit functionality including:
-- 1. Ward compliance tracking
-- 2. Delegate assignments for assemblies (SRPA, PPA, NPA)
-- 3. Enhanced meeting tracking for BPA/BGA
-- 4. Voting district compliance checks
-- =====================================================

-- =====================================================
-- STEP 1: Add compliance field to wards table
-- =====================================================
ALTER TABLE wards 
ADD COLUMN IF NOT EXISTS is_compliant BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS compliance_approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS compliance_approved_by INTEGER,
ADD COLUMN IF NOT EXISTS last_audit_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS audit_notes TEXT;

-- Add index for compliance queries
CREATE INDEX IF NOT EXISTS idx_wards_compliant ON wards(is_compliant);

-- Add foreign key for compliance approver
ALTER TABLE wards
ADD CONSTRAINT fk_wards_compliance_approver
FOREIGN KEY (compliance_approved_by)
REFERENCES users(user_id)
ON DELETE SET NULL;

-- =====================================================
-- STEP 2: Create Assembly Types Table
-- =====================================================
CREATE TABLE IF NOT EXISTS assembly_types (
    assembly_type_id SERIAL PRIMARY KEY,
    assembly_code VARCHAR(10) NOT NULL UNIQUE,
    assembly_name VARCHAR(100) NOT NULL,
    assembly_level VARCHAR(50) NOT NULL, -- 'Sub-Regional', 'Provincial', 'National'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default assembly types
INSERT INTO assembly_types (assembly_code, assembly_name, assembly_level, description) VALUES
('SRPA', 'Sub-Regional People''s Assembly', 'Sub-Regional', 'Sub-regional level people''s assembly'),
('PPA', 'Provincial People''s Assembly', 'Provincial', 'Provincial level people''s assembly'),
('NPA', 'National People''s Assembly', 'National', 'National level people''s assembly'),
('BPA', 'Branch People''s Assembly', 'Ward', 'Ward/Branch level people''s assembly'),
('BGA', 'Branch General Assembly', 'Ward', 'Ward/Branch general assembly')
ON CONFLICT (assembly_code) DO NOTHING;

-- =====================================================
-- STEP 3: Create Ward Delegates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ward_delegates (
    delegate_id SERIAL PRIMARY KEY,
    ward_code VARCHAR(20) NOT NULL,
    member_id INTEGER NOT NULL,
    assembly_type_id INTEGER NOT NULL,
    selection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    selection_method VARCHAR(50), -- 'Elected', 'Appointed', 'Ex-Officio'
    delegate_status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Inactive', 'Replaced'
    term_start_date DATE,
    term_end_date DATE,
    replacement_reason TEXT,
    replaced_by_delegate_id INTEGER,
    notes TEXT,
    selected_by INTEGER, -- user_id who recorded the selection
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_ward_delegates_ward FOREIGN KEY (ward_code) REFERENCES wards(ward_code) ON DELETE CASCADE,
    CONSTRAINT fk_ward_delegates_member FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
    CONSTRAINT fk_ward_delegates_assembly_type FOREIGN KEY (assembly_type_id) REFERENCES assembly_types(assembly_type_id) ON DELETE CASCADE,
    CONSTRAINT fk_ward_delegates_selected_by FOREIGN KEY (selected_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_ward_delegates_replaced_by FOREIGN KEY (replaced_by_delegate_id) REFERENCES ward_delegates(delegate_id) ON DELETE SET NULL,
    
    -- Ensure a member can only be an active delegate once per assembly type per ward
    CONSTRAINT unique_active_delegate_per_assembly UNIQUE (ward_code, member_id, assembly_type_id, delegate_status)
);

-- Create indexes for ward_delegates
CREATE INDEX IF NOT EXISTS idx_ward_delegates_ward ON ward_delegates(ward_code);
CREATE INDEX IF NOT EXISTS idx_ward_delegates_member ON ward_delegates(member_id);
CREATE INDEX IF NOT EXISTS idx_ward_delegates_assembly ON ward_delegates(assembly_type_id);
CREATE INDEX IF NOT EXISTS idx_ward_delegates_status ON ward_delegates(delegate_status);
CREATE INDEX IF NOT EXISTS idx_ward_delegates_selection_date ON ward_delegates(selection_date);

-- =====================================================
-- STEP 4: Create Ward Compliance Audit Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ward_compliance_audit_log (
    audit_log_id SERIAL PRIMARY KEY,
    ward_code VARCHAR(20) NOT NULL,
    audit_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    audited_by INTEGER NOT NULL, -- user_id
    
    -- Criterion 1: Membership & Voting District Compliance
    total_members INTEGER NOT NULL DEFAULT 0,
    meets_member_threshold BOOLEAN DEFAULT FALSE, -- >= 200 members
    total_voting_districts INTEGER NOT NULL DEFAULT 0,
    compliant_voting_districts INTEGER NOT NULL DEFAULT 0, -- VDs with >= 5 members
    meets_vd_threshold BOOLEAN DEFAULT FALSE, -- All VDs have >= 5 members
    criterion_1_passed BOOLEAN DEFAULT FALSE,
    
    -- Criterion 2: Meeting Quorum Verification
    last_meeting_id INTEGER,
    quorum_required INTEGER,
    quorum_achieved INTEGER,
    quorum_met BOOLEAN DEFAULT FALSE,
    criterion_2_passed BOOLEAN DEFAULT FALSE,
    
    -- Criterion 3: Meeting Attendance
    meeting_attended BOOLEAN DEFAULT FALSE,
    criterion_3_passed BOOLEAN DEFAULT FALSE,
    
    -- Criterion 4: Presiding Officer
    presiding_officer_id INTEGER,
    presiding_officer_recorded BOOLEAN DEFAULT FALSE,
    criterion_4_passed BOOLEAN DEFAULT FALSE,
    
    -- Criterion 5: Delegate Selection
    delegates_selected BOOLEAN DEFAULT FALSE,
    criterion_5_passed BOOLEAN DEFAULT FALSE,
    
    -- Overall compliance
    overall_compliant BOOLEAN DEFAULT FALSE,
    compliance_score DECIMAL(5,2), -- Percentage score
    
    audit_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_ward_audit_ward FOREIGN KEY (ward_code) REFERENCES wards(ward_code) ON DELETE CASCADE,
    CONSTRAINT fk_ward_audit_auditor FOREIGN KEY (audited_by) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_ward_audit_meeting FOREIGN KEY (last_meeting_id) REFERENCES meetings(meeting_id) ON DELETE SET NULL,
    CONSTRAINT fk_ward_audit_presiding_officer FOREIGN KEY (presiding_officer_id) REFERENCES members(member_id) ON DELETE SET NULL
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_ward_audit_ward ON ward_compliance_audit_log(ward_code);
CREATE INDEX IF NOT EXISTS idx_ward_audit_date ON ward_compliance_audit_log(audit_date);
CREATE INDEX IF NOT EXISTS idx_ward_audit_compliant ON ward_compliance_audit_log(overall_compliant);

-- =====================================================
-- STEP 5: Create Ward Meeting Records Table (extends meetings)
-- =====================================================
CREATE TABLE IF NOT EXISTS ward_meeting_records (
    record_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL,
    ward_code VARCHAR(20) NOT NULL,
    meeting_type VARCHAR(10) NOT NULL, -- 'BPA' or 'BGA'
    presiding_officer_id INTEGER,
    secretary_id INTEGER,
    quorum_required INTEGER NOT NULL DEFAULT 0,
    quorum_achieved INTEGER NOT NULL DEFAULT 0,
    quorum_met BOOLEAN DEFAULT FALSE,
    total_attendees INTEGER NOT NULL DEFAULT 0,
    meeting_outcome VARCHAR(50), -- 'Successful', 'Inquorate', 'Cancelled', 'Postponed'
    key_decisions TEXT,
    action_items TEXT,
    next_meeting_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_ward_meeting_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    CONSTRAINT fk_ward_meeting_ward FOREIGN KEY (ward_code) REFERENCES wards(ward_code) ON DELETE CASCADE,
    CONSTRAINT fk_ward_meeting_presiding_officer FOREIGN KEY (presiding_officer_id) REFERENCES members(member_id) ON DELETE SET NULL,
    CONSTRAINT fk_ward_meeting_secretary FOREIGN KEY (secretary_id) REFERENCES members(member_id) ON DELETE SET NULL
);

-- Create indexes for ward meeting records
CREATE INDEX IF NOT EXISTS idx_ward_meeting_meeting ON ward_meeting_records(meeting_id);
CREATE INDEX IF NOT EXISTS idx_ward_meeting_ward ON ward_meeting_records(ward_code);
CREATE INDEX IF NOT EXISTS idx_ward_meeting_type ON ward_meeting_records(meeting_type);
CREATE INDEX IF NOT EXISTS idx_ward_meeting_quorum ON ward_meeting_records(quorum_met);

-- =====================================================
-- STEP 6: Create Voting District Compliance View
-- =====================================================
CREATE OR REPLACE VIEW vw_voting_district_compliance AS
SELECT 
    vd.voting_district_code,
    vd.voting_district_name,
    vd.ward_code,
    w.ward_name,
    w.municipality_code,
    COUNT(DISTINCT m.member_id) as member_count,
    CASE 
        WHEN COUNT(DISTINCT m.member_id) >= 5 THEN TRUE 
        ELSE FALSE 
    END as is_compliant,
    CASE 
        WHEN COUNT(DISTINCT m.member_id) >= 5 THEN 'Compliant'
        WHEN COUNT(DISTINCT m.member_id) > 0 THEN 'Non-Compliant'
        ELSE 'No Members'
    END as compliance_status
FROM voting_districts vd
LEFT JOIN wards w ON vd.ward_code = w.ward_code
LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code
WHERE vd.voting_district_code NOT IN ('99999999', '33333333', '22222222', '11111111') -- Exclude special VDs
GROUP BY vd.voting_district_code, vd.voting_district_name, vd.ward_code, w.ward_name, w.municipality_code;

-- =====================================================
-- STEP 7: Create Ward Compliance Summary View
-- =====================================================
CREATE OR REPLACE VIEW vw_ward_compliance_summary AS
SELECT 
    w.ward_code,
    w.ward_name,
    w.ward_number,
    w.municipality_code,
    m.municipality_name,
    m.district_code,
    d.province_code,
    
    -- Member counts
    COUNT(DISTINCT mem.member_id) as total_members,
    CASE WHEN COUNT(DISTINCT mem.member_id) >= 200 THEN TRUE ELSE FALSE END as meets_member_threshold,
    
    -- Voting district compliance
    COUNT(DISTINCT vdc.voting_district_code) as total_voting_districts,
    COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END) as compliant_voting_districts,
    CASE 
        WHEN COUNT(DISTINCT vdc.voting_district_code) > 0 
        AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
        THEN TRUE 
        ELSE FALSE 
    END as all_vds_compliant,
    
    -- Overall criterion 1 compliance
    CASE 
        WHEN COUNT(DISTINCT mem.member_id) >= 200 
        AND COUNT(DISTINCT vdc.voting_district_code) > 0
        AND COUNT(DISTINCT vdc.voting_district_code) = COUNT(DISTINCT CASE WHEN vdc.is_compliant THEN vdc.voting_district_code END)
        THEN TRUE 
        ELSE FALSE 
    END as criterion_1_compliant,
    
    -- Compliance status
    w.is_compliant,
    w.compliance_approved_at,
    w.compliance_approved_by,
    w.last_audit_date,
    
    -- Delegate counts
    COUNT(DISTINCT CASE WHEN wd.assembly_type_id = (SELECT assembly_type_id FROM assembly_types WHERE assembly_code = 'SRPA') AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as srpa_delegates,
    COUNT(DISTINCT CASE WHEN wd.assembly_type_id = (SELECT assembly_type_id FROM assembly_types WHERE assembly_code = 'PPA') AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as ppa_delegates,
    COUNT(DISTINCT CASE WHEN wd.assembly_type_id = (SELECT assembly_type_id FROM assembly_types WHERE assembly_code = 'NPA') AND wd.delegate_status = 'Active' THEN wd.delegate_id END) as npa_delegates,
    
    w.created_at,
    w.updated_at
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN members mem ON w.ward_code = mem.ward_code
LEFT JOIN vw_voting_district_compliance vdc ON w.ward_code = vdc.ward_code
LEFT JOIN ward_delegates wd ON w.ward_code = wd.ward_code
WHERE w.is_active = TRUE
GROUP BY 
    w.ward_code, w.ward_name, w.ward_number, w.municipality_code, 
    m.municipality_name, m.district_code, d.province_code,
    w.is_compliant, w.compliance_approved_at, w.compliance_approved_by, 
    w.last_audit_date, w.created_at, w.updated_at;

-- =====================================================
-- STEP 8: Add comments for documentation
-- =====================================================
COMMENT ON TABLE ward_delegates IS 'Stores delegate assignments for various assemblies (SRPA, PPA, NPA)';
COMMENT ON TABLE ward_compliance_audit_log IS 'Tracks historical compliance audits for wards with detailed criteria checks';
COMMENT ON TABLE ward_meeting_records IS 'Extended meeting information specific to ward-level meetings (BPA/BGA)';
COMMENT ON TABLE assembly_types IS 'Defines types of assemblies for delegate selection';
COMMENT ON VIEW vw_voting_district_compliance IS 'Shows compliance status of voting districts (>= 5 members)';
COMMENT ON VIEW vw_ward_compliance_summary IS 'Comprehensive ward compliance summary with all criteria';

-- =====================================================
-- Migration Complete
-- =====================================================

