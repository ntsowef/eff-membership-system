# 🚀 Production Deployment Checklist

## 📋 Pre-Deployment (Do This First!)

### ✅ Preparation
- [ ] Read `PRODUCTION_FIX_GUIDE.md` completely
- [ ] Schedule maintenance window (recommended: low-traffic hours)
- [ ] Notify team/users about potential brief downtime
- [ ] Have rollback plan ready
- [ ] Ensure you have database backup access

### ✅ Access Verification
- [ ] Can SSH into production server
- [ ] Can access production database
- [ ] Can access Redis
- [ ] Can restart application (PM2 access)
- [ ] Have database credentials ready

### ✅ File Preparation
- [ ] `fix_optimized_view_expiry_date.sql` is ready
- [ ] `apply_production_fix.sh` is ready (optional)
- [ ] Backend code changes deployed (safety checks)

---

## 🎯 Deployment Steps

### Step 1: Backup (MANDATORY)
```bash
# Create backup
pg_dump -h localhost -p 5432 -U postgres -d eff_membership_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```
- [ ] Backup created successfully
- [ ] Backup file size looks reasonable
- [ ] Backup file is readable

### Step 2: Upload Files
```bash
# Upload SQL file
scp database-recovery/fix_optimized_view_expiry_date.sql user@server:/tmp/
```
- [ ] SQL file uploaded to production server

### Step 3: Pre-Deployment Checks
```sql
-- Check current view
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'vw_member_details_optimized';

-- Check active connections
SELECT count(*) FROM pg_stat_activity 
WHERE datname = 'eff_membership_db';
```
- [ ] Current view structure documented
- [ ] Active connections checked (should be low)

### Step 4: Apply Database Fix
```bash
# Execute SQL
psql -h localhost -p 5432 -U postgres -d eff_membership_db -f /tmp/fix_optimized_view_expiry_date.sql
```
- [ ] SQL executed without errors
- [ ] Exit code is 0 (success)

### Step 5: Verify Fix
```sql
-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vw_member_details_optimized' 
  AND column_name IN ('expiry_date', 'membership_status', 'days_until_expiry', 'membership_amount');

-- Test query
SELECT member_id, firstname, surname, membership_status, expiry_date 
FROM vw_member_details_optimized 
LIMIT 5;
```
- [ ] All 4 required columns exist
- [ ] Test query returns data
- [ ] No errors in query execution

### Step 6: Clear Cache
```bash
redis-cli FLUSHALL
```
- [ ] Redis cache cleared successfully

### Step 7: Restart Application
```bash
pm2 restart eff-api
pm2 status
```
- [ ] Application restarted successfully
- [ ] Application status is "online"

### Step 8: Test Application
```bash
# Test member endpoint
curl -X GET "http://your-domain/api/v1/members/by-id-number/7501165402082"

# Test digital card
curl -X POST "http://your-domain/api/v1/digital-cards/generate-data/93087" \
  -H "Content-Type: application/json" \
  -d '{"template": "standard", "issued_by": "admin"}'
```
- [ ] Member endpoint returns data
- [ ] Digital card endpoint works
- [ ] No `.substring()` errors

### Step 9: Monitor
```bash
# Check logs
pm2 logs eff-api --lines 100

# Check for errors
pm2 logs eff-api --err --lines 50
```
- [ ] No errors in logs
- [ ] Application responding normally
- [ ] Response times are normal

---

## ✅ Post-Deployment Verification

### Functional Tests
- [ ] Digital card loads in browser
- [ ] PDF download works
- [ ] Print functionality works
- [ ] Member search works
- [ ] No JavaScript errors in browser console

### Performance Tests
- [ ] API response times are normal
- [ ] Database query performance is acceptable
- [ ] No increase in error rates
- [ ] CPU/Memory usage is normal

### Data Integrity
- [ ] Expiry dates are showing correctly
- [ ] Membership status is calculated correctly
- [ ] All member data is intact
- [ ] No data loss

---

## 🔄 Rollback Plan (If Needed)

### When to Rollback
- [ ] Critical errors in application logs
- [ ] Database queries failing
- [ ] Data integrity issues
- [ ] Performance degradation
- [ ] User-facing errors

### Rollback Steps
```bash
# 1. Stop application
pm2 stop eff-api

# 2. Restore database
psql -h localhost -p 5432 -U postgres -d eff_membership_db < backup_YYYYMMDD_HHMMSS.sql

# 3. Clear cache
redis-cli FLUSHALL

# 4. Restart application
pm2 restart eff-api

# 5. Verify
pm2 logs eff-api --lines 50
```

- [ ] Rollback completed
- [ ] Application is stable
- [ ] Users notified

---

## 📊 Monitoring (First 24 Hours)

### Immediate (First Hour)
- [ ] Check logs every 15 minutes
- [ ] Monitor error rates
- [ ] Check user reports
- [ ] Verify key functionality

### Short-term (First 24 Hours)
- [ ] Monitor application metrics
- [ ] Check database performance
- [ ] Review error logs
- [ ] Collect user feedback

---

## 📝 Deployment Report

**Date/Time**: _______________  
**Performed By**: _______________  
**Duration**: _______________  
**Downtime**: _______________  

**Issues Encountered**:
- [ ] None
- [ ] Minor issues (describe): _______________
- [ ] Major issues (describe): _______________

**Rollback Performed**:
- [ ] No
- [ ] Yes (reason): _______________

**Final Status**:
- [ ] Success - All tests passed
- [ ] Partial Success - Some issues
- [ ] Failed - Rolled back

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

---

## 🎯 Quick Reference Commands

```bash
# Backup
pg_dump -h localhost -p 5432 -U postgres -d eff_membership_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Apply fix
psql -h localhost -p 5432 -U postgres -d eff_membership_db -f /tmp/fix_optimized_view_expiry_date.sql

# Clear cache
redis-cli FLUSHALL

# Restart app
pm2 restart eff-api

# Check logs
pm2 logs eff-api --lines 100

# Rollback
psql -h localhost -p 5432 -U postgres -d eff_membership_db < backup_YYYYMMDD_HHMMSS.sql
```

---

## ✅ Sign-Off

**Deployment Approved By**: _______________  
**Date**: _______________  
**Signature**: _______________  

**Deployment Completed By**: _______________  
**Date**: _______________  
**Signature**: _______________  

---

**Print this checklist and check off each item as you complete it!** ✅

