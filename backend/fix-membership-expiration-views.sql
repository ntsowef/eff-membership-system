-- ============================================================================
-- FIX MEMBERSHIP EXPIRATION VIEWS TO USE members_consolidated
-- ============================================================================
-- Problem: The views vw_expiring_soon and vw_expired_memberships are querying
-- from the memberships table (which has 0 records), but the actual membership
-- data is in members_consolidated table (which has 1,221,670 records).
--
-- Solution: Recreate the views to query from members_consolidated instead.
-- ============================================================================

-- Drop existing views
DROP VIEW IF EXISTS vw_expiring_soon CASCADE;
DROP VIEW IF EXISTS vw_expired_memberships CASCADE;

-- ============================================================================
-- 1. CREATE vw_expiring_soon VIEW (using members_consolidated)
-- ============================================================================
CREATE OR REPLACE VIEW vw_expiring_soon AS
SELECT
  m.member_id,
  m.id_number,
  m.firstname,
  m.surname,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  m.cell_number,
  m.email,

  -- Geographic information
  w.ward_number,
  mu.municipality_name,
  mu.municipality_code,
  COALESCE(mu.district_code, parent_mu.district_code) as district_code,
  COALESCE(d.district_name, parent_d.district_name) as district_name,
  COALESCE(p.province_code, parent_p.province_code) as province_code,
  COALESCE(p.province_name, parent_p.province_name) as province_name,

  -- Membership information (from members_consolidated)
  m.expiry_date,
  m.membership_amount,

  -- Calculate days until expiry
  (m.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,

  -- Renewal priority based on days until expiry
  CASE
    WHEN (m.expiry_date - CURRENT_DATE) <= 7 THEN 'Urgent (1 Week)'
    WHEN (m.expiry_date - CURRENT_DATE) <= 14 THEN 'High Priority (2 Weeks)'
    WHEN (m.expiry_date - CURRENT_DATE) <= 30 THEN 'Medium Priority (1 Month)'
    ELSE 'Low Priority'
  END as renewal_priority

FROM members_consolidated m

-- Join to membership_statuses
LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id

-- Join to geographic tables
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN municipalities parent_mu ON mu.parent_municipality_id = parent_mu.municipality_id
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN districts parent_d ON parent_mu.district_code = parent_d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN provinces parent_p ON parent_d.province_code = parent_p.province_code

WHERE
  -- Only active memberships
  mst.is_active = TRUE
  -- Expiring within next 30 days
  AND m.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
  -- Has valid expiry date
  AND m.expiry_date IS NOT NULL;

-- ============================================================================
-- 2. CREATE vw_expired_memberships VIEW (using members_consolidated)
-- ============================================================================
CREATE OR REPLACE VIEW vw_expired_memberships AS
SELECT
  m.member_id,
  m.id_number,
  m.firstname,
  m.surname,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as full_name,
  m.cell_number,
  m.email,

  -- Geographic information
  w.ward_number,
  mu.municipality_name,
  mu.municipality_code,
  COALESCE(mu.district_code, parent_mu.district_code) as district_code,
  COALESCE(d.district_name, parent_d.district_name) as district_name,
  COALESCE(p.province_code, parent_p.province_code) as province_code,
  COALESCE(p.province_name, parent_p.province_name) as province_name,

  -- Membership information (from members_consolidated)
  m.expiry_date,
  m.membership_amount,

  -- Calculate days expired
  (CURRENT_DATE - m.expiry_date)::INTEGER as days_expired,

  -- Expiry category based on days expired
  CASE
    WHEN (CURRENT_DATE - m.expiry_date) <= 30 THEN 'Recently Expired'
    WHEN (CURRENT_DATE - m.expiry_date) <= 90 THEN 'Expired 1-3 Months'
    WHEN (CURRENT_DATE - m.expiry_date) <= 365 THEN 'Expired 3-12 Months'
    ELSE 'Expired Over 1 Year'
  END as expiry_category

FROM members_consolidated m

-- Join to membership_statuses (optional for expired members)
LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id

-- Join to geographic tables
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN municipalities parent_mu ON mu.parent_municipality_id = parent_mu.municipality_id
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN districts parent_d ON parent_mu.district_code = parent_d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN provinces parent_p ON parent_d.province_code = parent_p.province_code

WHERE
  -- Expired memberships
  m.expiry_date < CURRENT_DATE
  -- Has valid expiry date
  AND m.expiry_date IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check the counts
SELECT 'vw_expiring_soon' as view_name, COUNT(*) as count FROM vw_expiring_soon
UNION ALL
SELECT 'vw_expired_memberships' as view_name, COUNT(*) as count FROM vw_expired_memberships;

-- Show sample data
SELECT 'Sample Expiring Soon Members' as info, renewal_priority, COUNT(*) as count
FROM vw_expiring_soon
GROUP BY renewal_priority
ORDER BY
  CASE renewal_priority
    WHEN 'Urgent (1 Week)' THEN 1
    WHEN 'High Priority (2 Weeks)' THEN 2
    WHEN 'Medium Priority (1 Month)' THEN 3
  END;

SELECT 'Sample Expired Members' as info, expiry_category, COUNT(*) as count
FROM vw_expired_memberships
GROUP BY expiry_category
ORDER BY
  CASE expiry_category
    WHEN 'Recently Expired' THEN 1
    WHEN 'Expired 1-3 Months' THEN 2
    WHEN 'Expired 3-12 Months' THEN 3
    WHEN 'Expired Over 1 Year' THEN 4
  END;

