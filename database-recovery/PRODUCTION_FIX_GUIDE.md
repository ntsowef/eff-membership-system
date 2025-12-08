# 🚨 PRODUCTION SERVER DATABASE FIX

## ⚠️ CRITICAL: Production Environment

This fix is for your **PRODUCTION SERVER**. Follow these steps carefully.

---

## 📋 Pre-Deployment Checklist

### 1. **Backup Database First** (MANDATORY)

```bash
# SSH into production server
ssh user@your-production-server

# Create backup
pg_dump -h localhost -p 5432 -U postgres -d eff_membership_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh backup_*.sql
```

### 2. **Check Current View Structure**

```sql
-- Connect to production database
psql -h localhost -p 5432 -U postgres -d eff_membership_db

-- Check if view exists
SELECT table_name FROM information_schema.views 
WHERE table_name = 'vw_member_details_optimized';

-- Check current columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vw_member_details_optimized'
ORDER BY ordinal_position;

-- Exit
\q
```

### 3. **Verify Required Tables Exist**

```sql
-- Check if all required tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('members', 'memberships', 'membership_statuses', 
                   'wards', 'municipalities', 'districts', 'provinces',
                   'voting_districts', 'voting_stations', 'genders', 'races');
```

---

## 🚀 Deployment Steps

### **Step 1: Upload SQL File to Production**

```bash
# From your local machine, upload the SQL file
scp database-recovery/fix_optimized_view_expiry_date.sql user@your-production-server:/tmp/
```

### **Step 2: Test on Production (Dry Run)**

```bash
# SSH into production
ssh user@your-production-server

# Test the SQL syntax (doesn't execute, just checks)
psql -h localhost -p 5432 -U postgres -d eff_membership_db --dry-run -f /tmp/fix_optimized_view_expiry_date.sql
```

### **Step 3: Schedule Maintenance Window**

**Recommended**: Apply during low-traffic hours (e.g., 2 AM - 4 AM)

```bash
# Check current server time
date

# Check active connections
psql -h localhost -p 5432 -U postgres -d eff_membership_db -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'eff_membership_db';"
```

### **Step 4: Apply the Fix**

```bash
# Execute the SQL fix
psql -h localhost -p 5432 -U postgres -d eff_membership_db -f /tmp/fix_optimized_view_expiry_date.sql

# Check for errors
echo $?
# If output is 0, success. If non-zero, there was an error.
```

### **Step 5: Verify the Fix**

```sql
-- Connect to database
psql -h localhost -p 5432 -U postgres -d eff_membership_db

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vw_member_details_optimized' 
  AND column_name IN ('expiry_date', 'membership_status', 'days_until_expiry', 'membership_amount')
ORDER BY column_name;

-- Test with actual data
SELECT 
    member_id,
    firstname,
    surname,
    membership_status,
    expiry_date,
    days_until_expiry,
    membership_amount
FROM vw_member_details_optimized 
WHERE id_number = '7501165402082'
LIMIT 1;

-- Exit
\q
```

### **Step 6: Clear Production Cache**

```bash
# Clear Redis cache
redis-cli FLUSHALL

# Or if Redis requires authentication
redis-cli -a your_redis_password FLUSHALL
```

### **Step 7: Restart Backend Application**

```bash
# If using PM2
pm2 restart eff-api

# Check status
pm2 status

# Check logs for errors
pm2 logs eff-api --lines 50
```

### **Step 8: Test Production Application**

```bash
# Test the API endpoint
curl -X GET "http://your-production-domain/api/v1/members/by-id-number/7501165402082"

# Test digital card generation
curl -X POST "http://your-production-domain/api/v1/digital-cards/generate-data/93087" \
  -H "Content-Type: application/json" \
  -d '{"template": "standard", "issued_by": "admin"}'
```

---

## 🔄 Rollback Plan (If Something Goes Wrong)

### **Option 1: Restore from Backup**

```bash
# Stop application
pm2 stop eff-api

# Restore database
psql -h localhost -p 5432 -U postgres -d eff_membership_db < backup_YYYYMMDD_HHMMSS.sql

# Clear cache
redis-cli FLUSHALL

# Restart application
pm2 restart eff-api
```

### **Option 2: Recreate Old View**

If you know the old view structure, you can recreate it:

```sql
DROP VIEW IF EXISTS vw_member_details_optimized CASCADE;
CREATE OR REPLACE VIEW vw_member_details_optimized AS
-- [old view definition]
```

---

## 📊 Monitoring After Deployment

### **Check Application Logs**

```bash
# Monitor logs in real-time
pm2 logs eff-api --lines 100

# Check for errors
pm2 logs eff-api --err --lines 50
```

### **Check Database Performance**

```sql
-- Check view query performance
EXPLAIN ANALYZE 
SELECT * FROM vw_member_details_optimized 
WHERE id_number = '7501165402082';

-- Check active queries
SELECT pid, query, state, query_start 
FROM pg_stat_activity 
WHERE datname = 'eff_membership_db' 
AND state = 'active';
```

### **Monitor Application Metrics**

```bash
# Check CPU and memory usage
pm2 monit

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s "http://your-production-domain/api/v1/health"
```

---

## ✅ Success Criteria

After deployment, verify:

- [ ] Database view has all required columns
- [ ] No errors in application logs
- [ ] Digital card loads without errors
- [ ] PDF download works
- [ ] Print functionality works
- [ ] API response times are normal
- [ ] No increase in error rates

---

## 🆘 Emergency Contacts

If something goes wrong:

1. **Rollback immediately** using backup
2. **Check logs**: `pm2 logs eff-api --err`
3. **Check database**: `psql -h localhost -p 5432 -U postgres -d eff_membership_db`
4. **Contact team** if needed

---

## 📝 Post-Deployment Notes

Document:
- Date and time of deployment
- Who performed the deployment
- Any issues encountered
- Rollback performed (yes/no)
- Final status (success/failure)

---

## ⏱️ Estimated Downtime

- **Database fix**: 30 seconds
- **Cache clear**: 10 seconds
- **Application restart**: 20 seconds
- **Total**: ~1 minute

---

## 🎯 Quick Command Summary

```bash
# 1. Backup
pg_dump -h localhost -p 5432 -U postgres -d eff_membership_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Upload SQL
scp database-recovery/fix_optimized_view_expiry_date.sql user@server:/tmp/

# 3. Apply fix
psql -h localhost -p 5432 -U postgres -d eff_membership_db -f /tmp/fix_optimized_view_expiry_date.sql

# 4. Clear cache
redis-cli FLUSHALL

# 5. Restart app
pm2 restart eff-api

# 6. Check logs
pm2 logs eff-api --lines 50
```

---

**Ready to deploy? Follow the steps above carefully!** 🚀

