-- Fix vw_enhanced_member_search to use province_code and district_code directly from members_consolidated
-- instead of getting them from districts/municipalities tables through JOINs
-- This fixes the issue where MP and other provinces/districts show as NULL

DROP VIEW IF EXISTS vw_enhanced_member_search CASCADE;

CREATE VIEW vw_enhanced_member_search AS
SELECT
  m.member_id,
  m.id_number,
  m.firstname,
  m.surname,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) AS full_name,
  m.age,
  m.date_of_birth,
  g.gender_name,
  r.race_name,
  c.citizenship_name,
  l.language_name,
  m.cell_number,
  m.landline_number,
  m.email,
  m.residential_address,
  m.ward_code,
  w.ward_name,
  w.ward_number,
  CONCAT('Ward ', w.ward_number, ' - ', w.ward_name) AS ward_display,
  m.municipality_code,
  mu.municipality_name,
  m.district_code,  -- ✅ FIXED: Use district_code directly from members_consolidated
  d.district_name,
  m.province_code,  -- ✅ FIXED: Use province_code directly from members_consolidated
  p.province_name,
  CONCAT(w.ward_name, ', ', mu.municipality_name, ', ', d.district_name, ', ', p.province_name) AS location_display,
  o.occupation_name,
  q.qualification_name,
  CONCAT(
    m.firstname, ' ',
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
  ) AS search_text,
  m.created_at,
  m.updated_at
FROM members_consolidated m
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
LEFT JOIN citizenships c ON m.citizenship_id = c.citizenship_id
LEFT JOIN languages l ON m.language_id = l.language_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON m.municipality_code = mu.municipality_code
LEFT JOIN municipalities pm ON mu.parent_municipality_id = pm.municipality_id
LEFT JOIN districts d ON m.district_code = d.district_code  -- ✅ FIXED: Join on m.district_code
LEFT JOIN provinces p ON m.province_code = p.province_code  -- ✅ FIXED: Join on m.province_code
LEFT JOIN occupations o ON m.occupation_id = o.occupation_id
LEFT JOIN qualifications q ON m.qualification_id = q.qualification_id;

