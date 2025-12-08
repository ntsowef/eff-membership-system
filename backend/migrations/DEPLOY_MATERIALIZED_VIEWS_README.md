# Materialized Views Production Deployment Guide

## Overview

This deployment creates 6 materialized views for optimal performance:

| View Name | Purpose | Performance Impact |
|-----------|---------|-------------------|
| `mv_hierarchical_dashboard_stats` | Hierarchical Dashboard (national/province/region/municipality/ward) | 27s → <100ms |
| `mv_membership_analytics_summary` | Analytics Dashboard age/gender distribution | 15s → <100ms |
| `mv_geographic_performance` | Geographic performance metrics | 10s → <100ms |
| `mv_membership_growth_monthly` | Monthly membership growth trends | 10s → <100ms |
| `mv_voting_district_compliance` | Ward Audit - VD compliance | 6s → <50ms |
| `mv_ward_compliance_summary` | Ward Audit - Ward compliance summary | 13s → <50ms |

## Deployment Steps

### Option 1: Run all 3 parts in sequence

```bash
# Connect to production database
psql -U eff_admin -d eff_membership_database -h <production-host>

# Run Part 1 (Hierarchical Dashboard + Analytics)
\i deploy-all-materialized-views.sql

# Run Part 2 (Growth + Ward Audit Views)
\i deploy-all-materialized-views-part2.sql

# Run Part 3 (Functions + Permissions + Verification)
\i deploy-all-materialized-views-part3.sql
```

### Option 2: Run individual view scripts

If you only need specific views:

```bash
# Hierarchical Dashboard only
\i create-mv-hierarchical-dashboard-stats.sql

# Analytics views only
\i create-analytics-materialized-views.sql

# Ward Audit views only
\i create-materialized-views-ward-audit.sql
```

## Post-Deployment

### Automatic Refresh
The backend Node.js application automatically refreshes all views every 15 minutes via cron job in `backend/src/jobs/refreshMaterializedViews.ts`.

### Manual Refresh Commands

```sql
-- Refresh ALL views
SELECT refresh_all_materialized_views();

-- Refresh Ward Audit views only
SELECT refresh_ward_audit_materialized_views();

-- Refresh individual view
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hierarchical_dashboard_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_analytics_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_geographic_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_growth_monthly;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_voting_district_compliance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_compliance_summary;
```

## Verification

After deployment, verify the views are working:

```sql
-- Check view counts
SELECT 
    'mv_hierarchical_dashboard_stats' as view_name,
    COUNT(*) as rows,
    SUM(active_members) as active_members
FROM mv_hierarchical_dashboard_stats;

-- Test dashboard query performance
EXPLAIN ANALYZE
SELECT SUM(active_members), COUNT(DISTINCT province_code)
FROM mv_hierarchical_dashboard_stats;
-- Should show execution time < 50ms
```

## Rollback

If needed, drop the views:

```sql
DROP MATERIALIZED VIEW IF EXISTS mv_hierarchical_dashboard_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_membership_analytics_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_geographic_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_membership_growth_monthly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_ward_compliance_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_voting_district_compliance CASCADE;
DROP FUNCTION IF EXISTS refresh_all_materialized_views();
DROP FUNCTION IF EXISTS refresh_ward_audit_materialized_views();
```

## Files

| File | Description |
|------|-------------|
| `deploy-all-materialized-views.sql` | Part 1: Hierarchical + Analytics views |
| `deploy-all-materialized-views-part2.sql` | Part 2: Growth + Ward Audit views |
| `deploy-all-materialized-views-part3.sql` | Part 3: Functions + Permissions |
| `create-mv-hierarchical-dashboard-stats.sql` | Standalone: Hierarchical Dashboard view |
| `create-analytics-materialized-views.sql` | Standalone: Analytics views |
| `create-materialized-views-ward-audit.sql` | Standalone: Ward Audit views |

