-- ============================================================================
-- Create Membership Expiration Views
-- ============================================================================
-- This script creates the database views required for the membership expiration
-- management system: vw_expiring_soon and vw_expired_memberships
--
-- These views are used by the Enhanced Membership Overview dashboard
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DROP EXISTING VIEWS (if they exist)
-- ============================================================================
DROP VIEW IF EXISTS vw_expiring_soon CASCADE;
DROP VIEW IF EXISTS vw_expired_memberships CASCADE;

-- ============================================================================
-- 2. CREATE vw_expiring_soon VIEW
-- ============================================================================
-- This view shows members whose memberships are expiring within the next 30 days
-- Categorized by renewal priority: Urgent (1 Week), High Priority (2 Weeks), Medium Priority (1 Month)
--
-- METROPOLITAN MUNICIPALITY SUPPORT:
-- This view properly handles metropolitan municipalities with sub-regions by:
-- 1. Showing the actual sub-region name (not the parent metro name)
-- 2. Properly joining through parent_municipality_id for metro sub-regions
-- 3. Getting province_code from parent metro when sub-region has NULL district_code

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
  -- Show actual municipality name (sub-region name for metro sub-regions)
  mu.municipality_name,
  mu.municipality_code,
  -- For metro sub-regions, district_code may be NULL, so use parent's district
  COALESCE(mu.district_code, parent_mu.district_code) as district_code,
  COALESCE(d.district_name, parent_d.district_name) as district_name,
  -- For metro sub-regions, get province from parent metro's district
  COALESCE(p.province_code, parent_p.province_code) as province_code,
  COALESCE(p.province_name, parent_p.province_name) as province_name,

  -- Membership information
  ms.expiry_date,
  ms.membership_amount,

  -- Calculate days until expiry
  (ms.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,

  -- Renewal priority categorization
  CASE
    WHEN (ms.expiry_date - CURRENT_DATE) <= 7 THEN 'Urgent (1 Week)'
    WHEN (ms.expiry_date - CURRENT_DATE) <= 14 THEN 'High Priority (2 Weeks)'
    WHEN (ms.expiry_date - CURRENT_DATE) <= 30 THEN 'Medium Priority (1 Month)'
    ELSE 'Low Priority'
  END as renewal_priority

FROM members m
INNER JOIN memberships ms ON m.member_id = ms.member_id
INNER JOIN membership_statuses mst ON ms.status_id = mst.status_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code

-- Join to parent municipality for metro sub-regions
LEFT JOIN municipalities parent_mu ON mu.parent_municipality_id = parent_mu.municipality_id

-- Join to districts (may be NULL for metro sub-regions)
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN districts parent_d ON parent_mu.district_code = parent_d.district_code

-- Join to provinces (use parent's province for metro sub-regions)
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN provinces parent_p ON parent_d.province_code = parent_p.province_code

WHERE
  -- Only active memberships
  mst.is_active = TRUE
  -- Expiring within next 30 days
  AND ms.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
  -- Has valid expiry date
  AND ms.expiry_date IS NOT NULL;

-- ============================================================================
-- 3. CREATE vw_expired_memberships VIEW
-- ============================================================================
-- This view shows members whose memberships have expired
-- Categorized by expiry category: Recently Expired, Expired 1-3 Months, etc.
--
-- METROPOLITAN MUNICIPALITY SUPPORT:
-- This view properly handles metropolitan municipalities with sub-regions by:
-- 1. Showing the actual sub-region name (not the parent metro name)
-- 2. Properly joining through parent_municipality_id for metro sub-regions
-- 3. Getting province_code from parent metro when sub-region has NULL district_code

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
  -- Show actual municipality name (sub-region name for metro sub-regions)
  mu.municipality_name,
  mu.municipality_code,
  -- For metro sub-regions, district_code may be NULL, so use parent's district
  COALESCE(mu.district_code, parent_mu.district_code) as district_code,
  COALESCE(d.district_name, parent_d.district_name) as district_name,
  -- For metro sub-regions, get province from parent metro's district
  COALESCE(p.province_code, parent_p.province_code) as province_code,
  COALESCE(p.province_name, parent_p.province_name) as province_name,

  -- Membership information
  ms.expiry_date,
  ms.membership_amount,

  -- Calculate days expired
  (CURRENT_DATE - ms.expiry_date)::INTEGER as days_expired,

  -- Expiry category
  CASE
    WHEN (CURRENT_DATE - ms.expiry_date) <= 30 THEN 'Recently Expired'
    WHEN (CURRENT_DATE - ms.expiry_date) <= 90 THEN 'Expired 1-3 Months'
    WHEN (CURRENT_DATE - ms.expiry_date) <= 365 THEN 'Expired 3-12 Months'
    ELSE 'Expired Over 1 Year'
  END as expiry_category

FROM members m
INNER JOIN memberships ms ON m.member_id = ms.member_id
INNER JOIN membership_statuses mst ON ms.status_id = mst.status_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code

-- Join to parent municipality for metro sub-regions
LEFT JOIN municipalities parent_mu ON mu.parent_municipality_id = parent_mu.municipality_id

-- Join to districts (may be NULL for metro sub-regions)
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN districts parent_d ON parent_mu.district_code = parent_d.district_code

-- Join to provinces (use parent's province for metro sub-regions)
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN provinces parent_p ON parent_d.province_code = parent_p.province_code

WHERE
  -- Expired memberships
  ms.expiry_date < CURRENT_DATE
  -- Has valid expiry date
  AND ms.expiry_date IS NOT NULL;

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Note: Views don't have indexes, but we can create indexes on the underlying tables
-- to improve view query performance

-- Index on expiry_date for fast filtering
CREATE INDEX IF NOT EXISTS idx_memberships_expiry_date
ON memberships(expiry_date)
WHERE expiry_date IS NOT NULL;

-- Index on status_id for active membership filtering
CREATE INDEX IF NOT EXISTS idx_memberships_status_id
ON memberships(status_id);

-- Index on member_id for joins
CREATE INDEX IF NOT EXISTS idx_memberships_member_id
ON memberships(member_id);

-- Composite index for expiring soon queries
CREATE INDEX IF NOT EXISTS idx_memberships_expiry_status
ON memberships(expiry_date, status_id)
WHERE expiry_date IS NOT NULL;

-- Index on parent_municipality_id for metropolitan hierarchy joins
CREATE INDEX IF NOT EXISTS idx_municipalities_parent
ON municipalities(parent_municipality_id)
WHERE parent_municipality_id IS NOT NULL;

-- Index on municipality_type for filtering metro sub-regions
CREATE INDEX IF NOT EXISTS idx_municipalities_type
ON municipalities(municipality_type);

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT permission on views to application user
GRANT SELECT ON vw_expiring_soon TO eff_admin;
GRANT SELECT ON vw_expired_memberships TO eff_admin;

-- ============================================================================
-- 6. VERIFICATION QUERIES
-- ============================================================================

-- Count members expiring soon by priority
DO $$
DECLARE
  urgent_count INTEGER;
  high_priority_count INTEGER;
  medium_priority_count INTEGER;
  total_expiring INTEGER;
BEGIN
  SELECT COUNT(*) INTO urgent_count FROM vw_expiring_soon WHERE renewal_priority = 'Urgent (1 Week)';
  SELECT COUNT(*) INTO high_priority_count FROM vw_expiring_soon WHERE renewal_priority = 'High Priority (2 Weeks)';
  SELECT COUNT(*) INTO medium_priority_count FROM vw_expiring_soon WHERE renewal_priority = 'Medium Priority (1 Month)';
  SELECT COUNT(*) INTO total_expiring FROM vw_expiring_soon;
  
  RAISE NOTICE '✅ vw_expiring_soon view created successfully';
  RAISE NOTICE '   - Urgent (1 Week): % members', urgent_count;
  RAISE NOTICE '   - High Priority (2 Weeks): % members', high_priority_count;
  RAISE NOTICE '   - Medium Priority (1 Month): % members', medium_priority_count;
  RAISE NOTICE '   - Total Expiring Soon: % members', total_expiring;
END $$;

-- Count expired members by category
DO $$
DECLARE
  recently_expired_count INTEGER;
  expired_1_3_months_count INTEGER;
  expired_3_12_months_count INTEGER;
  expired_over_1_year_count INTEGER;
  total_expired INTEGER;
BEGIN
  SELECT COUNT(*) INTO recently_expired_count FROM vw_expired_memberships WHERE expiry_category = 'Recently Expired';
  SELECT COUNT(*) INTO expired_1_3_months_count FROM vw_expired_memberships WHERE expiry_category = 'Expired 1-3 Months';
  SELECT COUNT(*) INTO expired_3_12_months_count FROM vw_expired_memberships WHERE expiry_category = 'Expired 3-12 Months';
  SELECT COUNT(*) INTO expired_over_1_year_count FROM vw_expired_memberships WHERE expiry_category = 'Expired Over 1 Year';
  SELECT COUNT(*) INTO total_expired FROM vw_expired_memberships;
  
  RAISE NOTICE '✅ vw_expired_memberships view created successfully';
  RAISE NOTICE '   - Recently Expired: % members', recently_expired_count;
  RAISE NOTICE '   - Expired 1-3 Months: % members', expired_1_3_months_count;
  RAISE NOTICE '   - Expired 3-12 Months: % members', expired_3_12_months_count;
  RAISE NOTICE '   - Expired Over 1 Year: % members', expired_over_1_year_count;
  RAISE NOTICE '   - Total Expired: % members', total_expired;
END $$;

-- Display sample data from vw_expiring_soon
SELECT 
  'Sample Expiring Soon Members' as info,
  renewal_priority,
  COUNT(*) as count
FROM vw_expiring_soon
GROUP BY renewal_priority
ORDER BY
  CASE renewal_priority
    WHEN 'Urgent (1 Week)' THEN 1
    WHEN 'High Priority (2 Weeks)' THEN 2
    WHEN 'Medium Priority (1 Month)' THEN 3
  END;

-- Display sample data from vw_expired_memberships
SELECT 
  'Sample Expired Members' as info,
  expiry_category,
  COUNT(*) as count
FROM vw_expired_memberships
GROUP BY expiry_category
ORDER BY
  CASE expiry_category
    WHEN 'Recently Expired' THEN 1
    WHEN 'Expired 1-3 Months' THEN 2
    WHEN 'Expired 3-12 Months' THEN 3
    WHEN 'Expired Over 1 Year' THEN 4
  END;

COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Membership Expiration Views Created Successfully!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Views Created:';
  RAISE NOTICE '   1. vw_expiring_soon - Members expiring within 30 days';
  RAISE NOTICE '   2. vw_expired_memberships - Members with expired memberships';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next Steps:';
  RAISE NOTICE '   1. Restart the backend server';
  RAISE NOTICE '   2. Test the Enhanced Membership Overview dashboard';
  RAISE NOTICE '   3. Verify the /api/v1/membership-expiration/enhanced-overview endpoint';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Test Queries:';
  RAISE NOTICE '   SELECT * FROM vw_expiring_soon LIMIT 10;';
  RAISE NOTICE '   SELECT * FROM vw_expired_memberships LIMIT 10;';
  RAISE NOTICE '';
END $$;

