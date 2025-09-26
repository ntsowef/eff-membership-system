-- SQL Query to show only members eligible for leadership positions
-- Eligibility Criteria: ALL MEMBERS ARE NOW ELIGIBLE (no restrictions)

-- =====================================================
-- NATIONAL LEVEL - All eligible members (no geographic restrictions)
-- =====================================================
SELECT 
  m.member_id,
  CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
  m.firstname as first_name,
  COALESCE(m.surname, '') as last_name,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  m.id_number,
  m.email,
  COALESCE(m.cell_number, '') as phone,
  'Active' as membership_status,
  m.province_name,
  m.municipality_name,
  m.ward_name,
  m.ward_number,
  m.member_created_at as membership_date,
  COALESCE(TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()), 0) as membership_duration_months,
  'Eligible for National Leadership' as eligibility_level,
  'All members are eligible for leadership positions' as eligibility_notes
FROM members m
WHERE m.member_id IS NOT NULL
ORDER BY m.firstname, m.surname
LIMIT 50;

-- =====================================================
-- PROVINCIAL LEVEL - Eligible members by province
-- =====================================================
SELECT 
  m.member_id,
  CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  m.id_number,
  m.email,
  m.province_name,
  m.municipality_name,
  COALESCE(TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()), 0) as membership_duration_months,
  'Eligible for Provincial Leadership' as eligibility_level
FROM members m
WHERE m.member_id IS NOT NULL
  AND m.province_name IS NOT NULL
ORDER BY m.province_name, m.firstname, m.surname
LIMIT 50;

-- =====================================================
-- MUNICIPAL LEVEL - Eligible members by municipality
-- =====================================================
SELECT 
  m.member_id,
  CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  m.id_number,
  m.email,
  m.province_name,
  m.municipality_name,
  TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) as membership_duration_months,
  'Eligible for Municipal Leadership' as eligibility_level
FROM members m
WHERE m.member_id IS NOT NULL
  AND TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6
  AND m.municipality_name IS NOT NULL
ORDER BY m.municipality_name, m.firstname, m.surname
LIMIT 50;

-- =====================================================
-- WARD LEVEL - Eligible members by ward
-- =====================================================
SELECT 
  m.member_id,
  CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  m.id_number,
  m.email,
  m.province_name,
  m.municipality_name,
  m.ward_name,
  m.ward_number,
  TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) as membership_duration_months,
  'Eligible for Ward Leadership' as eligibility_level
FROM members m
WHERE m.member_id IS NOT NULL
  AND TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6
  AND m.ward_name IS NOT NULL
ORDER BY m.ward_name, m.firstname, m.surname
LIMIT 50;

-- =====================================================
-- SUMMARY STATISTICS - Eligible members count by level
-- =====================================================
SELECT 
  'National' as hierarchy_level,
  COUNT(*) as eligible_members_count,
  'All members with 6+ months active membership' as criteria
FROM members m
WHERE m.member_id IS NOT NULL
  AND TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6

UNION ALL

SELECT 
  'Provincial' as hierarchy_level,
  COUNT(*) as eligible_members_count,
  'Members with 6+ months active membership and province data' as criteria
FROM members m
WHERE m.member_id IS NOT NULL
  AND TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6
  AND m.province_name IS NOT NULL

UNION ALL

SELECT 
  'Municipal' as hierarchy_level,
  COUNT(*) as eligible_members_count,
  'Members with 6+ months active membership and municipality data' as criteria
FROM members m
WHERE m.member_id IS NOT NULL
  AND TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6
  AND m.municipality_name IS NOT NULL

UNION ALL

SELECT 
  'Ward' as hierarchy_level,
  COUNT(*) as eligible_members_count,
  'Members with 6+ months active membership and ward data' as criteria
FROM members m
WHERE m.member_id IS NOT NULL
  AND TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6
  AND m.ward_name IS NOT NULL;

-- =====================================================
-- SPECIFIC PROVINCE EXAMPLE - Gauteng Province
-- =====================================================
SELECT 
  m.member_id,
  CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  m.id_number,
  m.email,
  m.municipality_name,
  TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) as membership_duration_months,
  'Eligible for Gauteng Provincial Leadership' as eligibility_level
FROM members m
WHERE m.member_id IS NOT NULL
  AND TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6
  AND m.province_name = 'Gauteng'
ORDER BY m.municipality_name, m.firstname, m.surname
LIMIT 25;

-- =====================================================
-- ELIGIBILITY CHECK FOR SPECIFIC MEMBER
-- =====================================================
-- Replace 123 with actual member_id
SELECT 
  m.member_id,
  CONCAT('MEM', LPAD(m.member_id, 6, '0')) as membership_number,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  m.member_created_at as membership_date,
  TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) as membership_duration_months,
  CASE 
    WHEN TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6 THEN 'ELIGIBLE'
    ELSE 'NOT ELIGIBLE - Less than 6 months'
  END as eligibility_status,
  CASE 
    WHEN TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()) >= 6 THEN 'Member meets all eligibility criteria'
    ELSE CONCAT('Member needs ', 6 - TIMESTAMPDIFF(MONTH, m.member_created_at, NOW()), ' more months to be eligible')
  END as eligibility_notes
FROM members m
WHERE m.member_id = 123; -- Replace with actual member ID
