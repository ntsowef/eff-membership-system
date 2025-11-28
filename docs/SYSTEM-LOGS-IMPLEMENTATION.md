# System Logs Implementation - Real Data

## ✅ Implementation Complete

The System Logs feature now displays **real data** from the database instead of mock data.

---

## 📊 Data Sources

The system logs are aggregated from **three database tables**:

### 1. **audit_logs** Table
- **Purpose:** User actions and entity changes
- **Columns:** 
  - `audit_id`, `user_id`, `action`, `entity_type`, `entity_id`
  - `old_values`, `new_values`, `ip_address`, `user_agent`
  - `session_id`, `created_at`
- **Examples:**
  - User login/logout
  - Member creation/updates
  - System setting changes
  - Permission grants/revokes

### 2. **system_logs** Table
- **Purpose:** System-wide events and errors
- **Columns:**
  - `id`, `level`, `category`, `message`, `details`
  - `user_id`, `ip_address`, `user_agent`, `request_id`
  - `created_at`
- **Examples:**
  - Database errors
  - Cache operations
  - API errors
  - Performance warnings

### 3. **user_activity_logs** Table
- **Purpose:** User activity tracking
- **Columns:**
  - `log_id`, `user_id`, `action_type`, `resource_type`, `resource_id`
  - `description`, `ip_address`, `user_agent`
  - `request_method`, `request_url`, `response_status`, `response_time_ms`
  - `metadata`, `created_at`
- **Examples:**
  - Page views
  - API requests
  - Resource access
  - Export operations

---

## 🔧 Backend Implementation

### API Endpoint: `GET /api/v1/system/logs`

**File:** `backend/src/routes/system.ts`

**Features:**
- ✅ Fetches logs from all three tables
- ✅ Combines and sorts by timestamp (newest first)
- ✅ Maps log levels (info, warning, error, debug)
- ✅ Categorizes logs (Authentication, System, Members, etc.)
- ✅ Includes user information (name, IP address)
- ✅ Returns structured JSON with details
- ✅ Limits to 20 most recent logs per source (60 total max)

**Query Parameters:**
- `level` - Filter by log level (info, warning, error, debug)
- `category` - Filter by category
- `limit` - Number of logs to return (default: 50)
- `offset` - Pagination offset (default: 0)
- `startDate` - Filter logs after this date
- `endDate` - Filter logs before this date

**Response Format:**
```json
{
  "success": true,
  "message": "System logs retrieved successfully",
  "data": {
    "logs": [
      {
        "id": 123,
        "source": "audit",
        "level": "info",
        "category": "Authentication",
        "message": "John Doe performed login on user",
        "details": {
          "action": "login",
          "entity_type": "user",
          "user": "John Doe",
          "ip_address": "192.168.1.100"
        },
        "timestamp": "2025-10-09T10:30:00Z"
      }
    ],
    "total": 150
  },
  "timestamp": "2025-10-09T10:35:00Z"
}
```

---

## 🎨 Frontend Implementation

### Component: `SystemPage.tsx`

**File:** `frontend/src/pages/system/SystemPage.tsx`

**Features:**
- ✅ Fetches real logs from API using React Query
- ✅ Auto-refreshes every 30 seconds
- ✅ Loading state with spinner
- ✅ Empty state message
- ✅ Color-coded log levels (info=blue, warning=orange, error=red)
- ✅ Formatted timestamps
- ✅ Expandable details (via menu)
- ✅ Refresh button

**Log Level Colors:**
- 🔵 **Info** - Blue chip
- 🟠 **Warning** - Orange chip
- 🔴 **Error** - Red chip
- ⚪ **Debug** - Gray chip

**Log Level Icons:**
- ℹ️ **Info** - Info icon
- ⚠️ **Warning** - Warning icon
- ❌ **Error** - Error icon
- 🐛 **Debug** - Bug emoji

---

## 📋 Log Categories

Logs are automatically categorized based on their source:

| Category | Source | Examples |
|----------|--------|----------|
| **Authentication** | audit_logs | Login, logout, password changes |
| **System** | audit_logs, system_logs | System settings, backups, errors |
| **Members** | audit_logs | Member creation, updates, deletions |
| **General** | All sources | Miscellaneous activities |
| **Performance** | system_logs | High memory, slow queries |
| **Database** | system_logs | Connection errors, timeouts |
| **API** | user_activity_logs | API requests, rate limits |
| **Security** | audit_logs | Permission changes, access denials |

---

## 🔍 How Logs Are Generated

### Automatic Logging

Logs are automatically created when:

1. **User Actions** (via `auditLogger` middleware)
   - Login/logout
   - CRUD operations on entities
   - Permission changes
   - System setting updates

2. **System Events** (via application code)
   - Database errors
   - Cache operations
   - API errors
   - Performance issues

3. **User Activity** (via activity tracking middleware)
   - Page views
   - API requests
   - Resource access
   - Export operations

### Manual Logging

You can also manually create logs:

```typescript
// Audit log
await logAudit(
  userId,
  AuditAction.UPDATE,
  EntityType.MEMBER,
  memberId,
  oldValues,
  newValues,
  req
);

// System log
await executeQuery(`
  INSERT INTO system_logs (level, category, message, details)
  VALUES ($1, $2, $3, $4)
`, ['error', 'Database', 'Connection timeout', JSON.stringify({ timeout: 5000 })]);

// Activity log
await executeQuery(`
  INSERT INTO user_activity_logs (
    user_id, action_type, resource_type, resource_id,
    description, ip_address, user_agent
  ) VALUES ($1, $2, $3, $4, $5, $6, $7)
`, [userId, 'VIEW', 'MEMBER', memberId, 'Viewed member profile', ipAddress, userAgent]);
```

---

## 🎯 Usage

### Viewing Logs in UI

1. Navigate to **System → Logs** tab
2. View real-time logs from the database
3. Logs auto-refresh every 30 seconds
4. Click **Refresh** button for manual refresh
5. Click **⋮** menu on any log for more options

### Filtering Logs (Future Enhancement)

Currently shows all logs. Future enhancements could include:
- Filter by level (info, warning, error)
- Filter by category
- Filter by date range
- Search by message content
- Export logs to CSV/Excel

---

## 📈 Performance Considerations

### Current Implementation

- **Limit:** 20 logs per source (60 total max)
- **Sorting:** In-memory sort after fetching
- **Refresh:** Every 30 seconds
- **Indexes:** Database indexes on `created_at`, `level`, `category`, `user_id`

### Optimization Tips

1. **Pagination:** Implement proper pagination for large datasets
2. **Caching:** Cache logs for 10-30 seconds to reduce database load
3. **Archiving:** Archive old logs (>90 days) to separate table
4. **Aggregation:** Pre-aggregate logs for analytics/reporting

---

## 🔐 Security

- **Access Control:** Only National Admin (level 1) can view logs
- **Sensitive Data:** Passwords and tokens are never logged
- **IP Tracking:** All logs include IP address for audit trail
- **Session Tracking:** Audit logs include session ID

---

## 🐛 Troubleshooting

### No Logs Appearing

**Possible Causes:**
1. Tables don't exist in database
2. No activity has occurred yet
3. User doesn't have admin access
4. Backend API error

**Solutions:**
1. Check database tables exist:
   ```sql
   SELECT * FROM audit_logs LIMIT 5;
   SELECT * FROM system_logs LIMIT 5;
   SELECT * FROM user_activity_logs LIMIT 5;
   ```

2. Generate test logs:
   ```sql
   INSERT INTO system_logs (level, category, message, created_at)
   VALUES ('info', 'System', 'Test log entry', CURRENT_TIMESTAMP);
   ```

3. Check browser console for API errors

4. Check backend logs for database errors

### Logs Not Refreshing

**Solutions:**
1. Click the **Refresh** button manually
2. Check React Query is working (no console errors)
3. Verify API endpoint is responding: `GET /api/v1/system/logs`

---

## 📝 Summary

✅ **System Logs now display real data from the database**
✅ **Three data sources:** audit_logs, system_logs, user_activity_logs
✅ **Auto-refresh every 30 seconds**
✅ **Color-coded log levels**
✅ **Loading and empty states**
✅ **Admin-only access**
✅ **Proper error handling**

The system logs feature is now fully functional and production-ready! 🎉

---

**Last Updated:** 2025-10-09  
**Status:** ✅ COMPLETE

