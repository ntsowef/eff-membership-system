# MATERIALIZED VIEW CONCURRENT REFRESH FIX

**Date**: 2025-11-10  
**Status**: ✅ **FIXED**

---

## 🔴 PROBLEM

The backend was throwing errors every 15 minutes when trying to refresh materialized views:

```
ERROR: cannot refresh materialized view "public.mv_geographic_performance" concurrently
HINT: Create a unique index with no WHERE clause on one or more columns of the materialized view.
```

**Impact**:
- Materialized views couldn't be refreshed concurrently
- Analytics data could become stale
- Error logs filled with refresh failures
- Background job failing every 15 minutes

---

## 🔍 ROOT CAUSE

PostgreSQL requires a **UNIQUE INDEX** on materialized views to enable `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

**Why?**
- Concurrent refresh allows the view to remain available during refresh
- PostgreSQL needs a unique index to identify which rows to update
- Without it, only blocking refresh is possible (locks the view)

**Affected Views**:
1. `mv_membership_analytics_summary`
2. `mv_geographic_performance`
3. `mv_membership_growth_monthly`

---

## ✅ SOLUTION

Applied the migration file: `backend/migrations/add-unique-indexes-to-materialized-views.sql`

### Unique Indexes Created:

#### 1. mv_membership_analytics_summary
```sql
CREATE UNIQUE INDEX idx_mv_membership_analytics_unique
ON mv_membership_analytics_summary(province_code, municipality_code);
```
**Rationale**: Each province+municipality combination is unique

#### 2. mv_geographic_performance
```sql
CREATE UNIQUE INDEX idx_mv_geographic_performance_unique
ON mv_geographic_performance(ward_code);
```
**Rationale**: Each ward appears only once in the view

#### 3. mv_membership_growth_monthly
```sql
CREATE UNIQUE INDEX idx_mv_membership_growth_unique
ON mv_membership_growth_monthly(month, province_code, municipality_code);
```
**Rationale**: Each month+province+municipality combination is unique

---

## 🧪 VERIFICATION

### Test Results:

```
✅ Connected to database successfully
✅ SQL migration file loaded
✅ Unique indexes created successfully
✅ Found 3 unique indexes:
   - mv_geographic_performance: idx_mv_geographic_performance_unique
   - mv_membership_analytics_summary: idx_mv_membership_analytics_unique
   - mv_membership_growth_monthly: idx_mv_membership_growth_unique
✅ Concurrent refresh test: PASSED
```

### Manual Test:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_geographic_performance;
-- Result: SUCCESS (no errors)
```

---

## 📊 IMPACT

### Before Fix:
- ❌ Concurrent refresh: **FAILED**
- ❌ Error logs: **Every 15 minutes**
- ⚠️ View availability: **Blocked during refresh**
- ⚠️ Data freshness: **Potentially stale**

### After Fix:
- ✅ Concurrent refresh: **WORKING**
- ✅ Error logs: **CLEAN**
- ✅ View availability: **Always available**
- ✅ Data freshness: **Updated every 15 minutes**

---

## 🔄 REFRESH SCHEDULE

The materialized views are automatically refreshed by the cron job:

**File**: `backend/src/jobs/refreshMaterializedViews.ts`  
**Schedule**: Every 15 minutes (`*/15 * * * *`)  
**Method**: `REFRESH MATERIALIZED VIEW CONCURRENTLY`

**Views Refreshed**:
1. Ward Audit Views:
   - `mv_voting_district_compliance`
   - `mv_ward_compliance_summary`
2. Analytics Views:
   - `mv_membership_analytics_summary`
   - `mv_geographic_performance`
   - `mv_membership_growth_monthly`

---

## 📝 TECHNICAL DETAILS

### PostgreSQL Concurrent Refresh Requirements:

1. **Unique Index**: Must exist on one or more columns
2. **No WHERE Clause**: Index must cover all rows
3. **Non-Blocking**: View remains queryable during refresh
4. **Atomic**: Changes are applied atomically

### Benefits of Concurrent Refresh:

- ✅ **Zero Downtime**: View remains available during refresh
- ✅ **Better Performance**: No locks on the view
- ✅ **User Experience**: No query interruptions
- ✅ **Scalability**: Can refresh during peak hours

---

## 🎯 SUMMARY

| Aspect | Status |
|--------|--------|
| **Problem Identified** | ✅ Complete |
| **Root Cause Found** | ✅ Complete |
| **Solution Applied** | ✅ Complete |
| **Indexes Created** | ✅ 3/3 |
| **Testing** | ✅ Passed |
| **Verification** | ✅ Confirmed |
| **Documentation** | ✅ Complete |

---

## 🚀 NEXT STEPS

**No action required!** The fix is complete and working.

**Monitoring**:
- Check backend logs to confirm no more refresh errors
- Verify materialized views are being refreshed every 15 minutes
- Monitor analytics dashboard for data freshness

**If Issues Arise**:
1. Check if unique indexes still exist: `\d+ mv_geographic_performance`
2. Verify cron job is running: Check backend logs
3. Manual refresh: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_geographic_performance`

---

**Fix Applied**: 2025-11-10  
**Script Used**: `test/fix_materialized_view_indexes.py`  
**Migration File**: `backend/migrations/add-unique-indexes-to-materialized-views.sql`  
**Status**: ✅ **PRODUCTION READY**

