# Super Admin Interface - Testing Guide

This guide will help you test the newly implemented Super Admin Interface for the EFF Membership Management System.

---

## Prerequisites

Before testing, ensure you have:

1. ✅ **Backend server running** on `http://localhost:5000`
2. ✅ **Frontend server running** on `http://localhost:3000`
3. ✅ **PostgreSQL database** running on localhost
4. ✅ **Redis server** running on localhost
5. ✅ **Super admin user account** created in the database

---

## Step 1: Create a Super Admin User

If you don't have a super admin user yet, create one using the database:

```sql
-- Connect to your database
psql -U postgres -d your_database_name

-- Update an existing user to super_admin role
UPDATE users 
SET role_name = 'super_admin' 
WHERE email = 'your-email@example.com';

-- Or create a new super admin user
INSERT INTO users (email, password_hash, first_name, last_name, role_name, admin_level, is_active)
VALUES (
  'superadmin@eff.org',
  '$2b$10$...',  -- Use bcrypt to hash a password
  'Super',
  'Admin',
  'super_admin',
  'national',
  true
);
```

---

## Step 2: Login and Get JWT Token

### Option A: Login via Frontend
1. Navigate to `http://localhost:3000/login`
2. Login with your super admin credentials
3. Open browser DevTools (F12)
4. Go to Application/Storage → Local Storage
5. Copy the JWT token value

### Option B: Login via API
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@eff.org",
    "password": "your-password"
  }'
```

Copy the `token` from the response.

---

## Step 3: Test Backend APIs

### Manual Testing with cURL

Replace `YOUR_TOKEN` with your actual JWT token:

```bash
# Test Dashboard
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/super-admin/dashboard

# Test System Health
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/super-admin/system/health

# Test Redis Metrics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/super-admin/redis/status

# Test Database Connections
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/super-admin/database/connections

# Test Queue Jobs
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/super-admin/queue/jobs?limit=10

# Test All Uploads
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/super-admin/uploads/all?limit=10

# Test Active Sessions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/super-admin/sessions/active

# Test System Configuration
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/super-admin/config

# Test Lookup Tables
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/super-admin/lookups/tables

# Test Lookup Entries (Provinces)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/super-admin/lookups/provinces
```

### Automated Testing with Test Script

1. **Install dependencies** (if not already installed):
   ```bash
   cd test
   npm install axios
   ```

2. **Edit the test script**:
   ```bash
   # Open test/super-admin-api-test.js
   # Replace YOUR_SUPER_ADMIN_TOKEN with your actual token
   ```

3. **Run the test script**:
   ```bash
   node test/super-admin-api-test.js
   ```

Expected output:
```
🚀 Starting Super Admin API Tests...
============================================================

🧪 Testing: Dashboard Data
✅ PASSED: Dashboard Data

🧪 Testing: System Health
✅ PASSED: System Health

... (more tests)

============================================================
📊 TEST SUMMARY
============================================================
✅ Passed: 12
❌ Failed: 0
📈 Total:  12
🎯 Success Rate: 100.0%
```

---

## Step 4: Test Frontend Interface

### Access Super Admin Interface

1. **Login** to the frontend at `http://localhost:3000/login` with super admin credentials

2. **Verify Super Admin Menu** appears in the sidebar:
   - Super Admin (with 8 sub-items)
     - Dashboard
     - System Monitoring
     - Queue Management
     - User Management
     - Bulk Upload Management
     - Audit & Logs
     - Configuration
     - Lookup Data

3. **Test Dashboard Page**:
   - Navigate to `/admin/super-admin/dashboard`
   - Verify stats cards display:
     - Total Users
     - Queue Jobs
     - Total Uploads
     - System Health
   - Verify system health cards show:
     - Database status
     - Redis status
     - File System status

4. **Test System Monitoring Page**:
   - Navigate to `/admin/super-admin/system-monitoring`
   - Verify tabs work:
     - Database tab
     - Redis tab
     - Queue System tab
   - Verify metrics display correctly
   - Test "Refresh" button

5. **Test Queue Management Page**:
   - Navigate to `/admin/super-admin/queue-management`
   - Verify filters work:
     - Queue Type (All/Upload/Renewal)
     - Status (All/Waiting/Processing/Completed/Failed)
   - Verify job cards display
   - Test "Retry" button on failed jobs (if any)
   - Test "Cancel" button on waiting jobs (if any)
   - Verify pagination works

---

## Step 5: Test Authorization

### Verify Super Admin Only Access

1. **Login as a non-super-admin user** (e.g., national admin, province admin)

2. **Verify Super Admin menu is NOT visible** in the sidebar

3. **Try to access super admin pages directly**:
   - Navigate to `http://localhost:3000/admin/super-admin/dashboard`
   - Should be redirected or see "Access Denied" message

4. **Test API authorization**:
   ```bash
   # Login as non-super-admin user and get their token
   # Try to access super admin endpoint
   curl -H "Authorization: Bearer NON_SUPER_ADMIN_TOKEN" \
     http://localhost:5000/api/v1/super-admin/dashboard
   
   # Expected response: 403 Forbidden
   ```

---

## Expected Results

### ✅ Success Criteria

- [ ] All backend API endpoints return 200 OK with valid data
- [ ] Super Admin menu appears ONLY for super_admin role users
- [ ] Dashboard page loads and displays all metrics
- [ ] System Monitoring page shows real-time data
- [ ] Queue Management page displays jobs and allows actions
- [ ] Non-super-admin users cannot access super admin features
- [ ] All API calls are logged in audit logs

### ❌ Common Issues

**Issue**: "Authorization header missing" error
- **Solution**: Ensure JWT token is included in Authorization header

**Issue**: "This feature is restricted to Super Admin users only" error
- **Solution**: Verify user has `role_name = 'super_admin'` in database

**Issue**: "Cannot connect to Redis" error
- **Solution**: Ensure Redis server is running on localhost:6379

**Issue**: Dashboard shows "0" for all metrics
- **Solution**: Ensure database has data (users, uploads, etc.)

---

## Next Steps

After successful testing:

1. ✅ Mark Phase 2 tasks as complete
2. 🔄 Implement remaining pages (User Management, Bulk Upload Management, etc.)
3. 🔄 Implement WebSocket for real-time updates
4. 📝 Write unit tests and integration tests
5. 📚 Create user documentation

---

## Support

If you encounter any issues during testing:

1. Check backend logs: `backend/logs/`
2. Check browser console for frontend errors
3. Verify all services are running (PostgreSQL, Redis, Backend, Frontend)
4. Review `SUPER_ADMIN_IMPLEMENTATION_PROGRESS.md` for implementation details

---

**Happy Testing! 🚀**

