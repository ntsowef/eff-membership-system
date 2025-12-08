-- =====================================================
-- PRODUCTION DEPLOYMENT: All Materialized Views (Part 3)
-- =====================================================
-- Final part: Refresh function, permissions, and verification
-- Date: 2025-12-01
-- =====================================================

BEGIN;

-- =====================================================
-- SECTION 7: CREATE REFRESH FUNCTIONS
-- =====================================================
\echo '>>> Creating refresh functions...'

-- Function to refresh ward audit views
CREATE OR REPLACE FUNCTION refresh_ward_audit_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_voting_district_compliance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_compliance_summary;
    RAISE NOTICE 'Ward audit materialized views refreshed successfully at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    RAISE NOTICE 'Starting refresh of all materialized views at %', NOW();
    
    -- Refresh hierarchical dashboard
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hierarchical_dashboard_stats;
    RAISE NOTICE 'Refreshed mv_hierarchical_dashboard_stats';
    
    -- Refresh analytics views
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_analytics_summary;
    RAISE NOTICE 'Refreshed mv_membership_analytics_summary';
    
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_geographic_performance;
    RAISE NOTICE 'Refreshed mv_geographic_performance';
    
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_growth_monthly;
    RAISE NOTICE 'Refreshed mv_membership_growth_monthly';
    
    -- Refresh ward audit views (in correct order)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_voting_district_compliance;
    RAISE NOTICE 'Refreshed mv_voting_district_compliance';
    
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_compliance_summary;
    RAISE NOTICE 'Refreshed mv_ward_compliance_summary';
    
    RAISE NOTICE 'All materialized views refreshed successfully at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_ward_audit_materialized_views() IS 'Refresh ward audit materialized views in correct dependency order';
COMMENT ON FUNCTION refresh_all_materialized_views() IS 'Refresh ALL materialized views used by the application';

\echo '>>> Refresh functions created successfully!'

-- =====================================================
-- SECTION 8: GRANT PERMISSIONS
-- =====================================================
\echo '>>> Granting permissions...'

GRANT SELECT ON mv_hierarchical_dashboard_stats TO eff_admin;
GRANT SELECT ON mv_membership_analytics_summary TO eff_admin;
GRANT SELECT ON mv_geographic_performance TO eff_admin;
GRANT SELECT ON mv_membership_growth_monthly TO eff_admin;
GRANT SELECT ON mv_voting_district_compliance TO eff_admin;
GRANT SELECT ON mv_ward_compliance_summary TO eff_admin;

\echo '>>> Permissions granted successfully!'

COMMIT;

-- =====================================================
-- SECTION 9: VERIFICATION
-- =====================================================
\echo ''
\echo '============================================='
\echo 'MATERIALIZED VIEWS DEPLOYMENT VERIFICATION'
\echo '============================================='

SELECT 
    'mv_hierarchical_dashboard_stats' as view_name,
    COUNT(*) as row_count,
    SUM(active_members) as total_active_members
FROM mv_hierarchical_dashboard_stats
UNION ALL
SELECT 
    'mv_membership_analytics_summary',
    COUNT(*),
    SUM(total_members)
FROM mv_membership_analytics_summary
UNION ALL
SELECT 
    'mv_geographic_performance',
    COUNT(*),
    SUM(member_count)
FROM mv_geographic_performance
UNION ALL
SELECT 
    'mv_membership_growth_monthly',
    COUNT(*),
    SUM(new_members)
FROM mv_membership_growth_monthly
UNION ALL
SELECT 
    'mv_voting_district_compliance',
    COUNT(*),
    SUM(member_count)
FROM mv_voting_district_compliance
UNION ALL
SELECT 
    'mv_ward_compliance_summary',
    COUNT(*),
    SUM(total_members)
FROM mv_ward_compliance_summary;

\echo ''
\echo '============================================='
\echo 'DEPLOYMENT COMPLETE!'
\echo '============================================='
\echo ''
\echo 'The backend will automatically refresh these views every 15 minutes.'
\echo 'To manually refresh all views, run:'
\echo '  SELECT refresh_all_materialized_views();'
\echo ''
\echo 'To manually refresh ward audit views only, run:'
\echo '  SELECT refresh_ward_audit_materialized_views();'
\echo ''

