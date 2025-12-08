# Membership Status Automation - Analysis & Implementation Plan

## Executive Summary

**Current Situation:**
- 508,869 total members in the system
- 99.99% (508,812) members have `membership_status_id = 8` ("Good Standing")
- **Critical Issue**: 5,946 members (1.17%) have incorrect status:
  - 4,047 members should be in "Grace Period" (expired 0-90 days ago)
  - 1,899 members should be "Expired" (expired >90 days ago)

**Business Impact:**
- Members with expired memberships are incorrectly shown as "Good Standing"
- This affects voting rights, leadership eligibility, and reporting accuracy
- Ward audit compliance calculations may be incorrect

---

## 1. Current Database Structure

### Membership Status Lookup Table
```
status_id | status_name     | status_code | is_active | allows_voting | allows_leadership
----------|-----------------|-------------|-----------|---------------|------------------
1         | Active          | ACT         | true      | true          | true
2         | Expired         | EXP         | false     | false         | false
3         | Suspended       | SUS         | false     | false         | false
4         | Cancelled       | CAN         | false     | false         | false
5         | Pending         | PEN         | false     | false         | false
6         | Inactive        | INA         | false     | false         | false
7         | Grace Period    | GRA         | true      | false         | false
8         | Good Standing   | (null)      | true      | false         | false
```

### Members Table (members_consolidated)
- **Primary Key**: `member_id`
- **Status Field**: `membership_status_id` (INT, references `membership_statuses.status_id`)
- **Expiry Field**: `expiry_date` (DATE)
- **Total Records**: 508,869 members

### Current Status Distribution
```
membership_status_id | status_name     | member_count | percentage
---------------------|-----------------|--------------|------------
8                    | Good Standing   | 508,812      | 99.99%
null                 | (no status)     | 55           | 0.01%
1                    | Active          | 2            | 0.00%
```

---

## 2. Business Rules for Status Calculation

Based on the `expiry_date` field:

1. **Good Standing** (status_id = 8):
   - `expiry_date >= CURRENT_DATE`
   - Member can vote and hold leadership positions

2. **Grace Period** (status_id = 7):
   - `expiry_date >= CURRENT_DATE - INTERVAL '90 days'`
   - `expiry_date < CURRENT_DATE`
   - Member is still considered active but cannot vote or hold leadership

3. **Expired** (status_id = 2):
   - `expiry_date < CURRENT_DATE - INTERVAL '90 days'`
   - Member is inactive and cannot vote or hold leadership

4. **Unknown/Null**:
   - `expiry_date IS NULL`
   - Should be handled as a special case (possibly set to Pending or Inactive)

---

## 3. Members Needing Status Update

### Summary
```
Category                  | Count   | Percentage
--------------------------|---------|------------
Needs "Active" (status 1) | 502,776 | 98.80%
Needs "Grace Period" (7)  | 4,047   | 0.80%
Needs "Expired" (2)       | 1,899   | 0.37%
No Expiry Date            | 146     | 0.03%
--------------------------|---------|------------
TOTAL                     | 508,869 | 100.00%
```

### Critical Findings
1. **502,776 members** currently have status_id=8 ("Good Standing") and should have status_id=1 ("Active")
   - This is a naming inconsistency: "Good Standing" vs "Active"
   - Both have `is_active=true` and `allows_voting=true`
   
2. **4,047 members** are in grace period but marked as "Good Standing"
   - These members' expiry dates are 0-90 days in the past
   - Should be status_id=7 ("Grace Period")

3. **1,899 members** are expired but marked as "Good Standing"
   - These members' expiry dates are >90 days in the past
   - Should be status_id=2 ("Expired")

---

## 4. Implementation Options Analysis

### Option A: PostgreSQL Trigger (RECOMMENDED)
**Approach**: Create a trigger that fires on INSERT/UPDATE of `expiry_date` or `membership_status_id`

**Pros:**
- ✅ Real-time updates (immediate consistency)
- ✅ No external dependencies
- ✅ Guaranteed execution (database-level enforcement)
- ✅ Minimal application code changes
- ✅ Works for all data entry methods (API, direct SQL, imports)

**Cons:**
- ❌ Adds overhead to every INSERT/UPDATE operation
- ❌ Cannot easily audit status changes (unless we add audit logging)
- ❌ May conflict with explicit status updates (e.g., Suspended, Cancelled)

**Performance Impact**: Minimal (simple CASE statement)

---

### Option B: Daily Scheduled Job (ALTERNATIVE)
**Approach**: Use node-cron to run a batch update job daily at midnight

**Pros:**
- ✅ No overhead on individual transactions
- ✅ Easy to audit (single batch operation)
- ✅ Can be monitored and logged
- ✅ Can be run manually for testing

**Cons:**
- ❌ Status may be stale for up to 24 hours
- ❌ Requires application to be running
- ❌ External dependency (cron scheduler)

**Performance Impact**: One-time batch update (< 1 minute for 500k records)

---

### Option C: Computed Column / Database View (NOT RECOMMENDED)
**Approach**: Create a view that calculates status dynamically

**Pros:**
- ✅ Always accurate (no stale data)
- ✅ No storage overhead

**Cons:**
- ❌ Requires changing all queries to use the view
- ❌ Cannot use `membership_status_id` for filtering/indexing
- ❌ Performance impact on every query
- ❌ Major refactoring required

---

## 5. Recommended Solution: Hybrid Approach

**Primary**: PostgreSQL Trigger (Option A)
**Secondary**: Daily Scheduled Job (Option B) as a safety net

### Why Hybrid?
1. **Trigger** ensures real-time updates for new/renewed memberships
2. **Daily Job** catches any edge cases and ensures consistency
3. **Best of both worlds**: Real-time + periodic validation

---

## 6. Implementation Plan

### Phase 1: Database Trigger (Week 1)
1. Create trigger function to auto-update `membership_status_id`
2. Add audit logging for status changes
3. Test trigger with sample data
4. Deploy to production

### Phase 2: Scheduled Job (Week 1)
1. Create Node.js cron job for daily status updates
2. Add monitoring and logging
3. Integrate with existing job scheduler
4. Deploy to production

### Phase 3: One-Time Data Fix (Week 1)
1. Run batch update to fix existing 5,946 incorrect statuses
2. Verify results
3. Document changes

### Phase 4: Testing & Validation (Week 2)
1. Monitor trigger performance
2. Verify daily job execution
3. Check audit logs
4. Validate business logic

---

## 7. Next Steps

1. **Review and Approve** this analysis document
2. **Implement** database trigger (see `MEMBERSHIP_STATUS_TRIGGER.sql`)
3. **Implement** scheduled job (see `membershipStatusJob.ts`)
4. **Run** one-time data fix script
5. **Monitor** and validate for 1 week
6. **Document** the new system

---

**Document Version**: 1.0  
**Date**: 2025-11-20  
**Author**: System Analysis

