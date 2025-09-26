-- Migration: Create Members with Voting District View
-- This creates a comprehensive view that joins members with their complete geographic hierarchy
-- including voting districts for easy reporting and analytics

-- Drop the view if it exists
DROP VIEW IF EXISTS members_with_voting_districts;

-- Create comprehensive members view with complete geographic hierarchy
CREATE VIEW members_with_voting_districts AS
SELECT 
  -- Member basic information
  m.member_id,
  m.id_number,
  m.firstname,
  m.surname,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  m.age,
  m.date_of_birth,
  m.gender_id,
  g.gender_name,
  m.race_id,
  r.race_name,
  m.citizenship_id,
  c.citizenship_name,
  m.language_id,
  l.language_name,
  
  -- Contact information
  m.residential_address,
  m.cell_number,
  m.landline_number,
  m.email,
  
  -- Professional information
  m.occupation_id,
  o.occupation_name,
  m.qualification_id,
  q.qualification_name,
  
  -- Voter information
  m.voter_status_id,
  vs.voter_status_name,
  m.voter_registration_number,
  m.voter_registration_date,
  m.voting_station_id,
  
  -- Complete Geographic Hierarchy
  m.voting_district_code,
  vd.voting_district_name,
  vd.voting_district_number,
  vd.latitude as voting_district_latitude,
  vd.longitude as voting_district_longitude,
  
  m.ward_code,
  w.ward_name,
  w.ward_number,
  
  w.municipal_code,
  mu.municipal_name,
  
  mu.district_code,
  d.district_name,
  
  d.province_code,
  p.province_name,
  
  -- Geographic hierarchy as concatenated string
  CONCAT(
    p.province_name, ' → ',
    d.district_name, ' → ',
    mu.municipal_name, ' → ',
    'Ward ', w.ward_number,
    CASE 
      WHEN vd.voting_district_name IS NOT NULL 
      THEN CONCAT(' → VD ', vd.voting_district_number, ' (', vd.voting_district_name, ')')
      ELSE ''
    END
  ) as full_geographic_hierarchy,
  
  -- Membership information
  m.membership_type,
  m.application_id,
  
  -- Timestamps
  m.created_at as member_created_at,
  m.updated_at as member_updated_at,
  
  -- Calculated fields
  CASE 
    WHEN m.voting_district_code IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_voting_district,
  
  CASE 
    WHEN m.voter_registration_number IS NOT NULL THEN 'Registered'
    ELSE 'Not Registered'
  END as voter_registration_status,
  
  -- Age group classification
  CASE 
    WHEN m.age IS NULL THEN 'Unknown'
    WHEN m.age < 18 THEN 'Under 18'
    WHEN m.age BETWEEN 18 AND 25 THEN '18-25'
    WHEN m.age BETWEEN 26 AND 35 THEN '26-35'
    WHEN m.age BETWEEN 36 AND 45 THEN '36-45'
    WHEN m.age BETWEEN 46 AND 55 THEN '46-55'
    WHEN m.age BETWEEN 56 AND 65 THEN '56-65'
    ELSE '65+'
  END as age_group

FROM members m

-- Geographic joins (complete hierarchy)
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipal_code = mu.municipal_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code

-- Lookup table joins
LEFT JOIN genders g ON m.gender_id = g.id
LEFT JOIN races r ON m.race_id = r.id
LEFT JOIN citizenships c ON m.citizenship_id = c.id
LEFT JOIN languages l ON m.language_id = l.id
LEFT JOIN occupations o ON m.occupation_id = o.id
LEFT JOIN qualifications q ON m.qualification_id = q.id
LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.id;

-- Create additional specialized views for common use cases

-- 1. Members by Voting District Summary
DROP VIEW IF EXISTS members_by_voting_district_summary;
CREATE VIEW members_by_voting_district_summary AS
SELECT 
  vd.voting_district_code,
  vd.voting_district_name,
  vd.voting_district_number,
  w.ward_code,
  w.ward_name,
  w.ward_number,
  mu.municipal_name,
  d.district_name,
  p.province_name,
  COUNT(m.member_id) as total_members,
  COUNT(CASE WHEN m.voter_registration_number IS NOT NULL THEN 1 END) as registered_voters,
  COUNT(CASE WHEN m.gender_id = 1 THEN 1 END) as male_members,
  COUNT(CASE WHEN m.gender_id = 2 THEN 1 END) as female_members,
  ROUND(AVG(m.age), 1) as average_age,
  MIN(m.created_at) as first_member_joined,
  MAX(m.created_at) as latest_member_joined
FROM voting_districts vd
LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code
LEFT JOIN wards w ON vd.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipal_code = mu.municipal_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
WHERE vd.is_active = TRUE
GROUP BY 
  vd.voting_district_code, vd.voting_district_name, vd.voting_district_number,
  w.ward_code, w.ward_name, w.ward_number,
  mu.municipal_name, d.district_name, p.province_name
ORDER BY p.province_name, d.district_name, mu.municipal_name, w.ward_number, vd.voting_district_number;

-- 2. Geographic Membership Distribution
DROP VIEW IF EXISTS geographic_membership_distribution;
CREATE VIEW geographic_membership_distribution AS
SELECT 
  'Province' as level_type,
  p.province_code as code,
  p.province_name as name,
  NULL as parent_code,
  NULL as parent_name,
  COUNT(DISTINCT m.member_id) as member_count,
  COUNT(DISTINCT vd.voting_district_code) as voting_districts_count,
  COUNT(DISTINCT w.ward_code) as wards_count,
  COUNT(DISTINCT mu.municipal_code) as municipalities_count,
  COUNT(DISTINCT d.district_code) as districts_count
FROM provinces p
LEFT JOIN districts d ON p.province_code = d.province_code
LEFT JOIN municipalities mu ON d.district_code = mu.district_code
LEFT JOIN wards w ON mu.municipal_code = w.municipal_code
LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code
LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code OR w.ward_code = m.ward_code
WHERE p.is_active = TRUE
GROUP BY p.province_code, p.province_name

UNION ALL

SELECT 
  'District' as level_type,
  d.district_code as code,
  d.district_name as name,
  d.province_code as parent_code,
  p.province_name as parent_name,
  COUNT(DISTINCT m.member_id) as member_count,
  COUNT(DISTINCT vd.voting_district_code) as voting_districts_count,
  COUNT(DISTINCT w.ward_code) as wards_count,
  COUNT(DISTINCT mu.municipal_code) as municipalities_count,
  1 as districts_count
FROM districts d
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN municipalities mu ON d.district_code = mu.district_code
LEFT JOIN wards w ON mu.municipal_code = w.municipal_code
LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code
LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code OR w.ward_code = m.ward_code
WHERE d.is_active = TRUE
GROUP BY d.district_code, d.district_name, d.province_code, p.province_name

UNION ALL

SELECT 
  'Municipality' as level_type,
  mu.municipal_code as code,
  mu.municipal_name as name,
  mu.district_code as parent_code,
  d.district_name as parent_name,
  COUNT(DISTINCT m.member_id) as member_count,
  COUNT(DISTINCT vd.voting_district_code) as voting_districts_count,
  COUNT(DISTINCT w.ward_code) as wards_count,
  1 as municipalities_count,
  1 as districts_count
FROM municipalities mu
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN wards w ON mu.municipal_code = w.municipal_code
LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code
LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code OR w.ward_code = m.ward_code
WHERE mu.is_active = TRUE
GROUP BY mu.municipal_code, mu.municipal_name, mu.district_code, d.district_name

UNION ALL

SELECT 
  'Ward' as level_type,
  w.ward_code as code,
  CONCAT('Ward ', w.ward_number, ' - ', w.ward_name) as name,
  w.municipal_code as parent_code,
  mu.municipal_name as parent_name,
  COUNT(DISTINCT m.member_id) as member_count,
  COUNT(DISTINCT vd.voting_district_code) as voting_districts_count,
  1 as wards_count,
  1 as municipalities_count,
  1 as districts_count
FROM wards w
LEFT JOIN municipalities mu ON w.municipal_code = mu.municipal_code
LEFT JOIN voting_districts vd ON w.ward_code = vd.ward_code
LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code OR w.ward_code = m.ward_code
WHERE w.is_active = TRUE
GROUP BY w.ward_code, w.ward_number, w.ward_name, w.municipal_code, mu.municipal_name

UNION ALL

SELECT 
  'Voting District' as level_type,
  vd.voting_district_code as code,
  CONCAT('VD ', vd.voting_district_number, ' - ', vd.voting_district_name) as name,
  vd.ward_code as parent_code,
  CONCAT('Ward ', w.ward_number, ' - ', w.ward_name) as parent_name,
  COUNT(DISTINCT m.member_id) as member_count,
  1 as voting_districts_count,
  1 as wards_count,
  1 as municipalities_count,
  1 as districts_count
FROM voting_districts vd
LEFT JOIN wards w ON vd.ward_code = w.ward_code
LEFT JOIN members m ON vd.voting_district_code = m.voting_district_code
WHERE vd.is_active = TRUE
GROUP BY vd.voting_district_code, vd.voting_district_number, vd.voting_district_name, 
         vd.ward_code, w.ward_number, w.ward_name

ORDER BY level_type, name;

-- Create indexes on the base tables to improve view performance
CREATE INDEX IF NOT EXISTS idx_members_voting_district_code ON members(voting_district_code);
CREATE INDEX IF NOT EXISTS idx_members_ward_code ON members(ward_code);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at);
CREATE INDEX IF NOT EXISTS idx_voting_districts_ward_code ON voting_districts(ward_code);

-- Display completion message
SELECT 'Members with Voting Districts views created successfully!' as message;
