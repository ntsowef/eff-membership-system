-- Complete fix for vw_enhanced_member_search to include ALL columns from members_consolidated
-- plus lookup names from related tables
-- Uses province_code and district_code directly from members_consolidated (source of truth)

DROP VIEW IF EXISTS vw_enhanced_member_search CASCADE;

CREATE VIEW vw_enhanced_member_search AS
SELECT
  -- Core member fields from members_consolidated
  m.member_id,
  m.id_number,
  m.firstname,
  m.surname,
  m.middle_name,
  CONCAT(m.firstname, ' ', COALESCE(m.middle_name, ''), ' ', COALESCE(m.surname, '')) AS full_name,
  m.date_of_birth,
  m.age,
  
  -- IDs for filtering/joining
  m.gender_id,
  m.race_id,
  m.citizenship_id,
  m.language_id,
  
  -- Lookup names
  g.gender_name,
  r.race_name,
  c.citizenship_name,
  l.language_name,
  
  -- Contact information
  m.cell_number,
  m.landline_number,
  m.alternative_contact,
  m.email,
  m.residential_address,
  m.postal_address,
  
  -- Geographic codes (from members_consolidated - source of truth)
  m.ward_code,
  m.voting_district_code,
  m.voter_district_code,
  m.municipality_code,
  m.district_code,
  m.province_code,
  
  -- Geographic names (from lookup tables)
  w.ward_name,
  w.ward_number,
  CONCAT('Ward ', w.ward_number, ' - ', w.ward_name) AS ward_display,
  mu.municipality_name,
  d.district_name,
  p.province_name,
  CONCAT(
    COALESCE(w.ward_name, ''), ', ',
    COALESCE(mu.municipality_name, ''), ', ',
    COALESCE(d.district_name, ''), ', ',
    COALESCE(p.province_name, '')
  ) AS location_display,
  
  -- Voter information
  m.voting_station_id,
  m.voter_status_id,
  vs.status_name AS voter_status_name,
  m.voter_registration_number,
  m.voter_registration_date,
  m.voter_verified_at,
  
  -- Occupation and qualification
  m.occupation_id,
  m.qualification_id,
  o.occupation_name,
  q.qualification_name,
  
  -- Membership information
  m.membership_type,
  m.application_id,
  m.current_membership_id,
  m.membership_number,
  m.date_joined,
  m.last_payment_date,
  m.expiry_date,
  m.subscription_type_id,
  m.membership_amount,
  m.membership_status_id,
  m.payment_method,
  m.payment_reference,
  m.payment_status,
  
  -- Timestamps
  m.created_at,
  m.updated_at,
  
  -- Search text for full-text search
  CONCAT(
    m.firstname, ' ',
    COALESCE(m.middle_name, ''), ' ',
    COALESCE(m.surname, ''), ' ',
    m.id_number, ' ',
    COALESCE(m.email, ''), ' ',
    COALESCE(m.cell_number, ''), ' ',
    COALESCE(m.landline_number, ''), ' ',
    COALESCE(m.residential_address, ''), ' ',
    COALESCE(w.ward_name, ''), ' ',
    COALESCE(mu.municipality_name, ''), ' ',
    COALESCE(d.district_name, ''), ' ',
    COALESCE(p.province_name, ''), ' ',
    COALESCE(o.occupation_name, ''), ' ',
    COALESCE(g.gender_name, ''), ' ',
    COALESCE(r.race_name, '')
  ) AS search_text
  
FROM members_consolidated m
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN provinces p ON m.province_code = p.province_code
LEFT JOIN voter_statuses vs ON m.voter_status_id = vs.status_id
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id;

-- Add comment to document the view
COMMENT ON VIEW vw_enhanced_member_search IS 'Complete member search view with all fields from members_consolidated plus lookup names. Uses province_code and district_code directly from members_consolidated as source of truth.';

