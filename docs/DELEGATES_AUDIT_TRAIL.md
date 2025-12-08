# Delegates Management Audit Trail System

## Overview

A comprehensive audit trail system has been implemented for the Delegates Management module to track all changes, assignments, and removals of delegates. This ensures full accountability and transparency in delegate management operations.

---

## Features

### 1. **Automatic Audit Logging**
All delegate-related operations are automatically logged with:
- User who performed the action
- Timestamp of the action
- IP address and user agent
- Previous values (before change)
- New values (after change)
- Session information

### 2. **Tracked Actions**
The following delegate actions are tracked:
- **DELEGATE_ASSIGNED** - When a new delegate is assigned to a ward
- **DELEGATE_UPDATED** - When delegate information is modified
- **DELEGATE_REMOVED** - When a delegate is removed from the system
- **DELEGATE_STATUS_CHANGED** - When delegate status changes (Active/Inactive/Replaced)

### 3. **Audit Trail UI**
A dedicated "Audit Trail" tab in the Delegates Management page displays:
- Chronological list of all delegate-related actions
- Filterable by action type
- Expandable rows showing detailed before/after values
- User information and IP addresses
- Session tracking

---

## Backend Implementation

### New Audit Actions (backend/src/models/auditLogs.ts)
```typescript
export enum AuditAction {
  // ... existing actions
  
  // Delegate actions
  DELEGATE_ASSIGNED = 'delegate_assigned',
  DELEGATE_UPDATED = 'delegate_updated',
  DELEGATE_REMOVED = 'delegate_removed',
  DELEGATE_STATUS_CHANGED = 'delegate_status_changed'
}
```

### New Entity Type
```typescript
export enum EntityType {
  // ... existing types
  DELEGATE = 'delegate',
}
```

### Audit Logging Functions (backend/src/middleware/auditLogger.ts)

#### logDelegateAssignment
Logs when a delegate is assigned to a ward.
```typescript
await logDelegateAssignment(userId, delegateId, delegateData, req);
```

#### logDelegateUpdate
Logs when delegate information is updated.
```typescript
await logDelegateUpdate(userId, delegateId, oldData, newData, req);
```

#### logDelegateRemoval
Logs when a delegate is removed from the system.
```typescript
await logDelegateRemoval(userId, delegateId, delegateData, reason, req);
```

#### logDelegateStatusChange
Logs when delegate status changes.
```typescript
await logDelegateStatusChange(userId, delegateId, oldStatus, newStatus, req);
```

---

## Integration Points

### 1. Ward Audit Routes (backend/src/routes/wardAudit.ts)
- **POST /api/v1/ward-audit/delegates** - Logs delegate assignment
- **DELETE /api/v1/ward-audit/delegate/:delegateId** - Logs delegate removal with reason

### 2. Delegates Management Routes (backend/src/routes/delegatesManagement.ts)
- **PUT /api/v1/delegates-management/delegate/:delegate_id** - Logs delegate updates
- **DELETE /api/v1/delegates-management/delegate/:delegate_id** - Logs delegate removal

---

## Frontend Implementation

### New Components

#### 1. DelegatesAuditTrailTab.tsx
Location: `frontend/src/pages/delegatesManagement/DelegatesAuditTrailTab.tsx`

Features:
- Table view of all delegate audit logs
- Action filter dropdown
- Expandable rows showing detailed changes
- Color-coded action chips
- Pagination support
- JSON formatting for old/new values

#### 2. Audit Logs API Service
Location: `frontend/src/services/auditLogsApi.ts`

Functions:
- `getAuditLogs(filters)` - Get audit logs with filters
- `getDelegateAuditLogs(delegateId)` - Get logs for specific delegate
- `getAllDelegateAuditLogs(filters)` - Get all delegate-related logs

### Updated Components

#### DelegatesManagementPage.tsx
- Added 4th tab: "Audit Trail" with History icon
- Integrated DelegatesAuditTrailTab component

---

## API Endpoints

### Get All Delegate Audit Logs
```
GET /api/v1/audit-logs?entity_type=delegate
```

**Query Parameters:**
- `entity_type` - Filter by entity type (delegate)
- `entity_id` - Filter by specific delegate ID
- `action` - Filter by action type
- `user_id` - Filter by user who performed action
- `limit` - Number of records to return
- `offset` - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "audit_logs": [
      {
        "id": 123,
        "user_id": 45,
        "user_name": "John Doe",
        "action": "delegate_assigned",
        "entity_type": "delegate",
        "entity_id": 789,
        "old_values": null,
        "new_values": {
          "ward_code": "EC101001",
          "member_id": 12345,
          "assembly_code": "SRPA"
        },
        "ip_address": "192.168.1.100",
        "created_at": "2025-01-09T10:30:00Z"
      }
    ]
  }
}
```

---

## Usage Examples

### View Audit Trail
1. Navigate to **Delegates Management** page
2. Click on the **"Audit Trail"** tab
3. Use the action filter to narrow down results
4. Click the expand icon (▼) to see detailed changes

### Filter by Action Type
- **All Actions** - Show all delegate-related activities
- **Delegate Assigned** - Show only new assignments
- **Delegate Updated** - Show only updates
- **Delegate Removed** - Show only removals
- **Status Changed** - Show only status changes

---

## Security & Permissions

### Required Permissions
- **View Audit Trail**: `system.audit` permission
- **Manage Delegates**: `ward_audit.manage_delegates` permission

### Data Captured
- User ID and name
- IP address
- User agent (browser/device info)
- Session ID
- Timestamp (UTC)
- Complete before/after values

---

## Benefits

1. **Accountability** - Every delegate change is tracked with user information
2. **Transparency** - Full visibility into who made what changes and when
3. **Compliance** - Meets audit requirements for organizational governance
4. **Troubleshooting** - Easy to identify when and why changes were made
5. **Security** - IP addresses and session tracking for security analysis

---

## Files Modified/Created

### Backend
- ✅ `backend/src/models/auditLogs.ts` - Added delegate actions and entity type
- ✅ `backend/src/middleware/auditLogger.ts` - Added delegate logging functions
- ✅ `backend/src/routes/delegatesManagement.ts` - Integrated audit logging
- ✅ `backend/src/routes/wardAudit.ts` - Integrated audit logging

### Frontend
- ✅ `frontend/src/services/auditLogsApi.ts` - New API service
- ✅ `frontend/src/pages/delegatesManagement/DelegatesAuditTrailTab.tsx` - New component
- ✅ `frontend/src/pages/delegatesManagement/DelegatesManagementPage.tsx` - Added audit trail tab

---

## Testing

The audit trail can be tested by:
1. Assigning a new delegate
2. Updating delegate information
3. Removing a delegate
4. Viewing the Audit Trail tab to see all logged actions

All actions will be automatically logged with complete details.

