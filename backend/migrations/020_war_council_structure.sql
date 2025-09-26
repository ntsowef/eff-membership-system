-- War Council Structure Migration
-- This migration creates the War Council Structure for national leadership
-- including President, Deputy President, Secretary General, Deputy Secretary General,
-- National Chairperson, Treasurer General, and 9 CCT Deployees (one per province)

-- 1. Create leadership_structures table if it doesn't exist
CREATE TABLE IF NOT EXISTS leadership_structures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  structure_name VARCHAR(100) NOT NULL,
  structure_code VARCHAR(20) NOT NULL UNIQUE,
  hierarchy_level ENUM('National', 'Province', 'Region', 'Municipality', 'Ward') NOT NULL,
  total_positions INT NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_structure_hierarchy (hierarchy_level),
  INDEX idx_structure_active (is_active),
  INDEX idx_structure_code (structure_code)
);

-- 2. Insert War Council Structure
INSERT IGNORE INTO leadership_structures (
  structure_name, 
  structure_code, 
  hierarchy_level, 
  total_positions, 
  description
) VALUES (
  'War Council Structure',
  'WCS',
  'National',
  15, -- 6 core positions + 9 CCT Deployees
  'National War Council Structure comprising President, Deputy President, Secretary General, Deputy Secretary General, National Chairperson, Treasurer General, and 9 CCT Deployees (one for each province)'
);

-- 3. Add War Council Structure positions to leadership_positions table
INSERT IGNORE INTO leadership_positions (
  position_name, 
  position_code, 
  hierarchy_level, 
  description, 
  responsibilities,
  requirements,
  term_duration_months,
  max_consecutive_terms,
  order_index,
  is_active
) VALUES
-- Core War Council Positions
(
  'President', 
  'PRES', 
  'National', 
  'President of the organization - highest executive position in the War Council Structure',
  'Overall leadership and strategic direction of the organization; Chairperson of War Council meetings; Final decision-making authority on critical matters; External representation of the organization',
  'Must be an active member for at least 5 years; Must have held previous leadership positions; Must be nominated and elected by the membership',
  48, -- 4 years
  2,
  1,
  TRUE
),
(
  'Deputy President', 
  'DPRES', 
  'National', 
  'Deputy President - second highest executive position in the War Council Structure',
  'Assist the President in all duties; Act as President in their absence; Coordinate with provincial structures; Oversee special projects and initiatives',
  'Must be an active member for at least 4 years; Must have held previous leadership positions; Must be nominated and elected by the membership',
  48, -- 4 years
  2,
  2,
  TRUE
),
(
  'Secretary General', 
  'SG', 
  'National', 
  'Secretary General - chief administrative officer of the War Council Structure',
  'Manage all administrative functions; Maintain official records and correspondence; Coordinate meetings and communications; Oversee organizational policies and procedures',
  'Must be an active member for at least 3 years; Strong administrative and communication skills; Must be nominated and elected by the membership',
  48, -- 4 years
  2,
  3,
  TRUE
),
(
  'Deputy Secretary General', 
  'DSG', 
  'National', 
  'Deputy Secretary General - assistant to the Secretary General in the War Council Structure',
  'Assist Secretary General in administrative duties; Manage internal communications; Coordinate with regional and provincial secretaries; Handle special administrative projects',
  'Must be an active member for at least 2 years; Good administrative and organizational skills; Must be nominated and elected by the membership',
  48, -- 4 years
  2,
  4,
  TRUE
),
(
  'National Chairperson', 
  'NCHAIR', 
  'National', 
  'National Chairperson - presiding officer of the War Council Structure',
  'Chair War Council meetings; Ensure proper meeting procedures; Facilitate decision-making processes; Maintain order and decorum in meetings',
  'Must be an active member for at least 3 years; Strong leadership and facilitation skills; Must be nominated and elected by the membership',
  48, -- 4 years
  2,
  5,
  TRUE
),
(
  'Treasurer General', 
  'TG', 
  'National', 
  'Treasurer General - chief financial officer of the War Council Structure',
  'Manage organizational finances; Prepare financial reports; Oversee budgets and expenditures; Ensure financial compliance and transparency',
  'Must be an active member for at least 3 years; Financial management experience or qualifications; Must be nominated and elected by the membership',
  48, -- 4 years
  2,
  6,
  TRUE
),
-- CCT Deployees for each province (9 positions)
(
  'CCT Deployee - Eastern Cape', 
  'CCT-EC', 
  'National', 
  'CCT Deployee for Eastern Cape Province - War Council representative',
  'Represent War Council interests in Eastern Cape; Coordinate between national and provincial structures; Report on provincial activities; Implement national directives',
  'Must be an active member from Eastern Cape; Must have provincial leadership experience; Must be appointed by War Council',
  24, -- 2 years
  3,
  7,
  TRUE
),
(
  'CCT Deployee - Free State', 
  'CCT-FS', 
  'National', 
  'CCT Deployee for Free State Province - War Council representative',
  'Represent War Council interests in Free State; Coordinate between national and provincial structures; Report on provincial activities; Implement national directives',
  'Must be an active member from Free State; Must have provincial leadership experience; Must be appointed by War Council',
  24, -- 2 years
  3,
  8,
  TRUE
),
(
  'CCT Deployee - Gauteng', 
  'CCT-GP', 
  'National', 
  'CCT Deployee for Gauteng Province - War Council representative',
  'Represent War Council interests in Gauteng; Coordinate between national and provincial structures; Report on provincial activities; Implement national directives',
  'Must be an active member from Gauteng; Must have provincial leadership experience; Must be appointed by War Council',
  24, -- 2 years
  3,
  9,
  TRUE
),
(
  'CCT Deployee - KwaZulu-Natal', 
  'CCT-KZN', 
  'National', 
  'CCT Deployee for KwaZulu-Natal Province - War Council representative',
  'Represent War Council interests in KwaZulu-Natal; Coordinate between national and provincial structures; Report on provincial activities; Implement national directives',
  'Must be an active member from KwaZulu-Natal; Must have provincial leadership experience; Must be appointed by War Council',
  24, -- 2 years
  3,
  10,
  TRUE
),
(
  'CCT Deployee - Limpopo', 
  'CCT-LP', 
  'National', 
  'CCT Deployee for Limpopo Province - War Council representative',
  'Represent War Council interests in Limpopo; Coordinate between national and provincial structures; Report on provincial activities; Implement national directives',
  'Must be an active member from Limpopo; Must have provincial leadership experience; Must be appointed by War Council',
  24, -- 2 years
  3,
  11,
  TRUE
),
(
  'CCT Deployee - Mpumalanga', 
  'CCT-MP', 
  'National', 
  'CCT Deployee for Mpumalanga Province - War Council representative',
  'Represent War Council interests in Mpumalanga; Coordinate between national and provincial structures; Report on provincial activities; Implement national directives',
  'Must be an active member from Mpumalanga; Must have provincial leadership experience; Must be appointed by War Council',
  24, -- 2 years
  3,
  12,
  TRUE
),
(
  'CCT Deployee - Northern Cape', 
  'CCT-NC', 
  'National', 
  'CCT Deployee for Northern Cape Province - War Council representative',
  'Represent War Council interests in Northern Cape; Coordinate between national and provincial structures; Report on provincial activities; Implement national directives',
  'Must be an active member from Northern Cape; Must have provincial leadership experience; Must be appointed by War Council',
  24, -- 2 years
  3,
  13,
  TRUE
),
(
  'CCT Deployee - North West', 
  'CCT-NW', 
  'National', 
  'CCT Deployee for North West Province - War Council representative',
  'Represent War Council interests in North West; Coordinate between national and provincial structures; Report on provincial activities; Implement national directives',
  'Must be an active member from North West; Must have provincial leadership experience; Must be appointed by War Council',
  24, -- 2 years
  3,
  14,
  TRUE
),
(
  'CCT Deployee - Western Cape', 
  'CCT-WC', 
  'National', 
  'CCT Deployee for Western Cape Province - War Council representative',
  'Represent War Council interests in Western Cape; Coordinate between national and provincial structures; Report on provincial activities; Implement national directives',
  'Must be an active member from Western Cape; Must have provincial leadership experience; Must be appointed by War Council',
  24, -- 2 years
  3,
  15,
  TRUE
);

-- 4. Add additional fields to leadership_positions for War Council specific functionality
ALTER TABLE leadership_positions 
ADD COLUMN IF NOT EXISTS structure_id INT NULL AFTER hierarchy_level,
ADD COLUMN IF NOT EXISTS province_specific BOOLEAN DEFAULT FALSE AFTER structure_id,
ADD COLUMN IF NOT EXISTS province_code VARCHAR(10) NULL AFTER province_specific,
ADD COLUMN IF NOT EXISTS is_unique_position BOOLEAN DEFAULT TRUE AFTER province_code;

-- Add foreign key constraint for structure_id
ALTER TABLE leadership_positions 
ADD CONSTRAINT fk_leadership_positions_structure 
FOREIGN KEY (structure_id) REFERENCES leadership_structures(id) ON DELETE SET NULL;

-- 5. Update War Council positions with structure reference and province specificity
UPDATE leadership_positions 
SET 
  structure_id = (SELECT id FROM leadership_structures WHERE structure_code = 'WCS'),
  province_specific = CASE 
    WHEN position_code LIKE 'CCT-%' THEN TRUE 
    ELSE FALSE 
  END,
  province_code = CASE 
    WHEN position_code = 'CCT-EC' THEN 'EC'
    WHEN position_code = 'CCT-FS' THEN 'FS'
    WHEN position_code = 'CCT-GP' THEN 'GP'
    WHEN position_code = 'CCT-KZN' THEN 'KZN'
    WHEN position_code = 'CCT-LP' THEN 'LP'
    WHEN position_code = 'CCT-MP' THEN 'MP'
    WHEN position_code = 'CCT-NC' THEN 'NC'
    WHEN position_code = 'CCT-NW' THEN 'NW'
    WHEN position_code = 'CCT-WC' THEN 'WC'
    ELSE NULL
  END,
  is_unique_position = TRUE
WHERE position_code IN ('PRES', 'DPRES', 'SG', 'DSG', 'NCHAIR', 'TG', 'CCT-EC', 'CCT-FS', 'CCT-GP', 'CCT-KZN', 'CCT-LP', 'CCT-MP', 'CCT-NC', 'CCT-NW', 'CCT-WC');

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leadership_positions_structure ON leadership_positions(structure_id);
CREATE INDEX IF NOT EXISTS idx_leadership_positions_province ON leadership_positions(province_code);
CREATE INDEX IF NOT EXISTS idx_leadership_positions_unique ON leadership_positions(is_unique_position);

-- 7. Create a view for War Council Structure
CREATE OR REPLACE VIEW vw_war_council_structure AS
SELECT 
  lp.id as position_id,
  lp.position_name,
  lp.position_code,
  lp.description,
  lp.responsibilities,
  lp.requirements,
  lp.order_index,
  lp.province_specific,
  lp.province_code,
  CASE 
    WHEN lp.province_code IS NOT NULL THEN p.name 
    ELSE NULL 
  END as province_name,
  la.id as appointment_id,
  la.member_id,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
  CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
  la.appointment_type,
  la.start_date,
  la.end_date,
  la.appointment_status,
  CASE 
    WHEN la.id IS NULL THEN 'Vacant'
    WHEN la.appointment_status = 'Active' THEN 'Filled'
    ELSE 'Vacant'
  END as position_status
FROM leadership_positions lp
LEFT JOIN leadership_structures ls ON lp.structure_id = ls.id
LEFT JOIN leadership_appointments la ON lp.id = la.position_id 
  AND la.appointment_status = 'Active'
  AND la.hierarchy_level = 'National'
  AND la.entity_id = 1
LEFT JOIN vw_member_details m ON la.member_id = m.member_id
LEFT JOIN provinces p ON lp.province_code = p.code
WHERE ls.structure_code = 'WCS'
  AND lp.is_active = TRUE
ORDER BY lp.order_index;

-- 8. Insert sample comment for documentation
INSERT IGNORE INTO leadership_structures (structure_name, structure_code, hierarchy_level, total_positions, description) 
VALUES ('War Council Structure Documentation', 'WCS-DOC', 'National', 0, 
'This structure represents the highest decision-making body of the organization, comprising 15 positions: 6 core executive positions (President, Deputy President, Secretary General, Deputy Secretary General, National Chairperson, Treasurer General) and 9 CCT Deployees representing each of the 9 provinces of South Africa. Each position has specific responsibilities and requirements, with core positions serving 4-year terms and CCT Deployees serving 2-year terms.');
