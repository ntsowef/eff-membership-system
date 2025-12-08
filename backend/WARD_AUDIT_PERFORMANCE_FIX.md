# Ward Audit Performance Optimization - Complete Fix

## 🎯 Problem Statement

The ward audit endpoint `GET /api/v1/ward-audit/wards?municipality_code=JHB004` was taking **10-13 seconds** to return data for just 38 wards. This affected ALL municipalities, making the ward audit system unusable.

---

## 🔍 Root Cause Analysis

### Issue 1: Old `members` Table Usage ❌
- `vw_ward_compliance_summary` was using the OLD `members` table (508,869 stale records)
- `vw_voting_district_compliance` was ALSO using the OLD `members` table
- **Impact:** Querying stale data + slow performance

### Issue 2: Full Table Scans ❌
- The view `vw_voting_district_compliance` performed a **sequential scan on ALL 626,759 members**
- This took **6.3 seconds** even after fixing the table reference
- The view materialized compliance for ALL 23,133 voting districts on every query
- **Impact:** No filtering before aggregation = extremely slow

### Issue 3: Nested View Dependencies ❌
- `vw_ward_compliance_summary` depends on `vw_voting_district_compliance`
- Every query triggered a cascade of expensive aggregations
- **Impact:** Compounding performance issues

---

## ✅ Solution Implemented: Materialized Views

### What Are Materialized Views?
Materialized views are **pre-calculated** query results stored as physical tables. They trade real-time data for dramatic performance improvements.

### Benefits:
- ✅ **270x faster queries** (10,800ms → 40ms)
- ✅ **Indexed for fast lookups** by municipality, district, province, ward
- ✅ **Refreshed periodically** (every 15 minutes) to keep data current
- ✅ **Concurrent refresh** - no downtime during updates

---

## 📊 Performance Results

| Test Case | Before | After | Improvement |
|-----------|--------|-------|-------------|
| **JHB004 (38 wards)** | 10,800ms | 40ms | **270x faster** |
| **Cape Town** | ~12,000ms | 2ms | **6000x faster** |
| **Gauteng Province** | ~15,000ms | 8ms | **1875x faster** |
| **Voting Districts** | ~8,000ms | 21ms | **380x faster** |

---

## 🛠️ Changes Made

### 1. Database Migrations

#### `fix-ward-compliance-view-members-consolidated.sql`
- Updated `vw_ward_compliance_summary` to use `members_consolidated`
- **Status:** ✅ Applied

#### `fix-voting-district-compliance-view.sql`
- Updated `vw_voting_district_compliance` to use `members_consolidated`
- **Status:** ✅ Applied

#### `create-materialized-views-ward-audit.sql`
- Created `mv_voting_district_compliance` materialized view
- Created `mv_ward_compliance_summary` materialized view
- Created indexes for fast lookups
- Created `refresh_ward_audit_materialized_views()` function
- **Status:** ✅ Applied

### 2. Backend Code Changes

#### `backend/src/models/wardAudit.ts`
**Changed:**
```typescript
// BEFORE
SELECT * FROM vw_ward_compliance_summary WHERE municipality_code = $1

// AFTER
SELECT * FROM mv_ward_compliance_summary WHERE municipality_code = $1
```

**Impact:** All ward audit queries now use materialized views

#### `backend/src/routes/wardAudit.ts`
**Added:**
```typescript
POST /api/v1/ward-audit/refresh-materialized-views
```
- Manual refresh endpoint for administrators
- Requires `ward_audit.admin` permission

#### `backend/src/jobs/refreshMaterializedViews.ts`
**Created:**
- Scheduled job to refresh materialized views every 15 minutes
- Runs on server startup (after 5 seconds)
- Logs refresh duration and status

#### `backend/src/app.ts`
**Added:**
- Import and start the scheduled refresh job
- Logs job status on startup

---

## 🔄 Materialized View Refresh Strategy

### Automatic Refresh (Recommended)
- **Frequency:** Every 15 minutes
- **Method:** Scheduled cron job in Node.js
- **Status:** ✅ Active on server startup

### Manual Refresh Options

#### Option 1: API Endpoint
```bash
POST http://localhost:5000/api/v1/ward-audit/refresh-materialized-views
Authorization: Bearer <admin_token>
```

#### Option 2: PostgreSQL Function
```sql
SELECT refresh_ward_audit_materialized_views();
```

#### Option 3: Direct SQL
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_voting_district_compliance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_compliance_summary;
```

---

## 📋 Materialized Views Created

### 1. `mv_voting_district_compliance`
**Purpose:** Pre-calculated voting district compliance data

**Columns:**
- `voting_district_code`, `voting_district_name`
- `ward_code`, `ward_name`, `municipality_code`
- `member_count`, `is_compliant`, `compliance_status`
- `last_refreshed`

**Indexes:**
- `idx_mv_vdc_ward_code` (ward_code)
- `idx_mv_vdc_municipality` (municipality_code)
- `idx_mv_vdc_voting_district` (voting_district_code)
- `idx_mv_vdc_compliant` (is_compliant)
- `idx_mv_vdc_unique` (voting_district_code) - UNIQUE for CONCURRENT refresh

**Rows:** 23,133 voting districts

### 2. `mv_ward_compliance_summary`
**Purpose:** Pre-calculated ward compliance summary data

**Columns:**
- `ward_code`, `ward_name`, `ward_number`
- `municipality_code`, `municipality_name`
- `district_code`, `province_code`
- `total_members`, `meets_member_threshold`
- `total_voting_districts`, `compliant_voting_districts`
- `all_vds_compliant`, `criterion_1_compliant`
- `is_compliant`, `compliance_approved_at`, `compliance_approved_by`
- `srpa_delegates`, `ppa_delegates`, `npa_delegates`
- `last_refreshed`

**Indexes:**
- `idx_mv_wcs_ward_code` (ward_code)
- `idx_mv_wcs_municipality` (municipality_code)
- `idx_mv_wcs_district` (district_code)
- `idx_mv_wcs_province` (province_code)
- `idx_mv_wcs_compliant` (is_compliant)
- `idx_mv_wcs_criterion_1` (criterion_1_compliant)
- `idx_mv_wcs_unique` (ward_code) - UNIQUE for CONCURRENT refresh

**Rows:** 4,479 wards

---

## 🚀 Deployment Checklist

- [x] Create materialized views migration
- [x] Apply migration to database
- [x] Update backend model to use materialized views
- [x] Create refresh function
- [x] Create scheduled job
- [x] Add job to server startup
- [x] Create manual refresh API endpoint
- [x] Test query performance
- [x] Document changes

---

## 📝 Maintenance Notes

### When to Manually Refresh
- After bulk member imports
- After bulk member updates
- After ward boundary changes
- After voting district changes

### Monitoring
- Check `last_refreshed` column in materialized views
- Monitor refresh duration (should be < 60 seconds)
- Check server logs for refresh job status

### Troubleshooting
If queries are slow again:
1. Check if materialized views exist: `\d+ mv_ward_compliance_summary`
2. Check last refresh time: `SELECT last_refreshed FROM mv_ward_compliance_summary LIMIT 1`
3. Manually refresh: `SELECT refresh_ward_audit_materialized_views()`
4. Check indexes: `\d+ mv_ward_compliance_summary`

---

## 🎉 Summary

**Problem:** Ward audit queries taking 10-13 seconds  
**Solution:** Materialized views with periodic refresh  
**Result:** Queries now take 40ms (270x faster!)  
**Trade-off:** Data refreshed every 15 minutes (acceptable for audit data)  
**Status:** ✅ Complete and deployed

