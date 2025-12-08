-- Migration: Add membership information to members_with_voting_districts view
-- This adds expiry_date and other membership fields from the memberships table

-- Drop the existing view
DROP VIEW IF EXISTS members_with_voting_districts CASCADE;

-- Recreate the view with membership information
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
  vs.status_name as voter_status_name,
  m.voter_registration_number,
  m.voter_registration_date,
  m.voting_station_id,
  
  -- Membership information from memberships table
  ms.membership_id,
  ms.membership_number,
  ms.date_joined,
  ms.last_payment_date,
  ms.expiry_date,
  ms.subscription_type_id,
  ms.membership_amount,
  ms.status_id as membership_status_id,
  mst.status_name as membership_status,
  
  -- Complete Geographic Hierarchy
  m.voting_district_code,
  vd.voting_district_name,
  
  m.ward_code,
  w.ward_name,
  w.ward_number,
  
  w.municipality_code,
  mu.municipality_name,

  mu.district_code,
  d.district_name,
  
  d.province_code,
  p.province_name,
  
  -- Geographic hierarchy as concatenated string
  CONCAT(
    p.province_name, ' → ',
    d.district_name, ' → ',
    mu.municipality_name, ' → ',
    'Ward ', w.ward_number,
    CASE
      WHEN vd.voting_district_name IS NOT NULL
      THEN CONCAT(' → VD (', vd.voting_district_name, ')')
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

-- Join with memberships table to get expiry_date and other membership info
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN membership_statuses mst ON ms.status_id = mst.status_id

-- Geographic joins (complete hierarchy)
LEFT JOIN voting_districts vd ON m.voting_district_code = vd.voting_district_code
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code

-- Lookup table joins
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id
LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id;

-- Grant permissions
GRANT SELECT ON members_with_voting_districts TO PUBLIC;

