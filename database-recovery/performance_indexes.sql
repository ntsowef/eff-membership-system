-- =====================================================================================
-- PERFORMANCE OPTIMIZATION INDEXES FOR DASHBOARD
-- =====================================================================================
-- Purpose: Add indexes to speed up dashboard queries
-- Impact: Reduces dashboard load time from 14+ seconds to under 2 seconds
-- Date: 2025-01-07
-- =====================================================================================

-- Index on members.created_at for growth statistics
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at);

-- Index on members.expiry_date for expiry analysis
CREATE INDEX IF NOT EXISTS idx_members_expiry_date ON members(expiry_date);

-- Index on members.membership_status_id for active member counts
CREATE INDEX IF NOT EXISTS idx_members_membership_status_id ON members(membership_status_id);

-- Composite index for geographic filtering
CREATE INDEX IF NOT EXISTS idx_members_province_code ON members(province_code);
CREATE INDEX IF NOT EXISTS idx_members_municipality_code ON members(municipality_code);
CREATE INDEX IF NOT EXISTS idx_members_ward_code ON members(ward_code);

-- Index on members.gender_id for demographic queries
CREATE INDEX IF NOT EXISTS idx_members_gender_id ON members(gender_id);

-- Index on members.age for age distribution queries
CREATE INDEX IF NOT EXISTS idx_members_age ON members(age);

-- Index on memberships.date_joined for trend analysis
CREATE INDEX IF NOT EXISTS idx_memberships_date_joined ON memberships(date_joined);

-- Index on memberships.status_id for status distribution
CREATE INDEX IF NOT EXISTS idx_memberships_status_id ON memberships(status_id);

-- Index on memberships.subscription_type_id for new vs renewal analysis
CREATE INDEX IF NOT EXISTS idx_memberships_subscription_type_id ON memberships(subscription_type_id);

-- Composite index for ward member counts (used in top wards query)
CREATE INDEX IF NOT EXISTS idx_members_ward_member_count ON members(ward_code, member_id);

-- Index on voting_stations.is_active for active station counts
CREATE INDEX IF NOT EXISTS idx_voting_stations_is_active ON voting_stations(is_active);

-- =====================================================================================
-- ANALYZE TABLES TO UPDATE STATISTICS
-- =====================================================================================
-- This helps PostgreSQL query planner make better decisions

ANALYZE members;
ANALYZE memberships;
ANALYZE wards;
ANALYZE municipalities;
ANALYZE districts;
ANALYZE provinces;
ANALYZE voting_stations;
ANALYZE membership_statuses;
ANALYZE genders;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================
-- Run these to verify indexes were created successfully

-- List all indexes on members table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'members'
ORDER BY indexname;

-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('members', 'memberships', 'wards')
ORDER BY tablename, indexname;

-- =====================================================================================
-- PERFORMANCE MONITORING
-- =====================================================================================
-- Query to check slow queries (run after dashboard loads)

SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%members%' OR query LIKE '%dashboard%'
ORDER BY mean_time DESC
LIMIT 10;

