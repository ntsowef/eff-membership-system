# Multi-User Upload Testing Guide

## 🎯 **Objective**
Verify that multiple users can upload files simultaneously and each user only sees their own upload progress.

---

## 🧪 **Test Scenario**

### **Setup: 3 Users Upload Simultaneously**

1. **User A** (Province Admin) uploads `members_province_1.xlsx`
2. **User B** (Municipality Admin) uploads `members_municipality_2.xlsx`
3. **User C** (National Admin) uploads `members_national.xlsx`

---

## 📋 **Test Steps**

### **Step 1: Prepare Test Users**

Create 3 test user accounts with different roles:
```sql
-- Check existing users
SELECT user_id, name, email, admin_level 
FROM users 
WHERE admin_level IN ('province_admin', 'municipality_admin', 'national_admin')
LIMIT 3;
```

### **Step 2: Start Python Processor**

```powershell
python backend/python/bulk_upload_processor.py
```

### **Step 3: Open 3 Browser Windows**

1. **Window 1**: Login as User A (Province Admin)
2. **Window 2**: Login as User B (Municipality Admin)
3. **Window 3**: Login as User C (National Admin)

### **Step 4: Upload Files Simultaneously**

In each window:
1. Navigate to Self Data Management → Bulk Upload
2. Select a test Excel file
3. Click "Upload" **at the same time** (within 5 seconds)

### **Step 5: Monitor Progress**

**Expected Behavior**:
- ✅ Each user sees **only their own** upload progress
- ✅ Progress bars update independently
- ✅ No cross-contamination of progress updates
- ✅ Each upload completes successfully

---

## ✅ **Verification Checklist**

### **1. WebSocket Isolation**

Open browser console in each window and check WebSocket messages:

**User A should see**:
```javascript
{
  event: "bulk_upload_progress",
  file_id: 1,  // User A's file
  progress: 50,
  message: "Processing..."
}
```

**User B should see**:
```javascript
{
  event: "bulk_upload_progress",
  file_id: 2,  // User B's file (different from User A)
  progress: 30,
  message: "Processing..."
}
```

**User C should see**:
```javascript
{
  event: "bulk_upload_progress",
  file_id: 3,  // User C's file (different from A and B)
  progress: 70,
  message: "Processing..."
}
```

### **2. Database Verification**

Check that each upload is linked to the correct user:

```sql
SELECT 
    file_id,
    original_filename,
    uploaded_by_user_id,
    status,
    progress_percentage,
    rows_processed,
    rows_total
FROM uploaded_files
ORDER BY upload_timestamp DESC
LIMIT 3;
```

**Expected Result**:
```
file_id | original_filename           | uploaded_by_user_id | status
--------|----------------------------|---------------------|----------
3       | members_national.xlsx      | 103                 | completed
2       | members_municipality_2.xlsx| 102                 | completed
1       | members_province_1.xlsx    | 101                 | completed
```

### **3. Upload History Isolation**

In each browser window, check "Upload History":

**User A should see**:
- ✅ Only files uploaded by User A
- ❌ Should NOT see User B's or User C's files

**User B should see**:
- ✅ Only files uploaded by User B
- ❌ Should NOT see User A's or User C's files

**User C should see**:
- ✅ Only files uploaded by User C
- ❌ Should NOT see User A's or User B's files

### **4. Report Generation**

Each user should be able to download **only their own** reports:

```sql
SELECT 
    file_id,
    original_filename,
    uploaded_by_user_id,
    report_file_path
FROM uploaded_files
WHERE report_file_path IS NOT NULL
ORDER BY upload_timestamp DESC
LIMIT 3;
```

**Expected**: Each file has a unique report path.

---

## 🔍 **Backend Logs Verification**

Check Python processor logs for concurrent processing:

```
🔍 Step 0: Pre-Validation - Starting... (file_id: 1)
🔍 Step 0: Pre-Validation - Starting... (file_id: 2)
🔍 Step 0: Pre-Validation - Starting... (file_id: 3)
📊 Sent bulk_upload_progress for file 1 to rooms: bulk_upload:1, bulk_upload
📊 Sent bulk_upload_progress for file 2 to rooms: bulk_upload:2, bulk_upload
📊 Sent bulk_upload_progress for file 3 to rooms: bulk_upload:3, bulk_upload
✅ Sent bulk_upload_complete for file 1
✅ Sent bulk_upload_complete for file 2
✅ Sent bulk_upload_complete for file 3
```

---

## ⚠️ **Potential Issues to Watch For**

### **Issue 1: Cross-User Progress Updates**
**Symptom**: User A sees User B's progress
**Cause**: WebSocket room subscription issue
**Fix**: Check frontend WebSocket subscription code

### **Issue 2: Upload History Shows All Users**
**Symptom**: User A sees all uploads, not just their own
**Cause**: Missing user_id filter in API call
**Fix**: Ensure frontend passes user_id to `/bulk-upload/history` endpoint

### **Issue 3: Report Download Fails**
**Symptom**: User A can't download their report
**Cause**: File permissions or path issue
**Fix**: Check report file path and permissions

---

## 📊 **Performance Testing**

### **Load Test: 10 Concurrent Users**

1. Create 10 test users
2. Use a script to upload files simultaneously
3. Monitor:
   - ✅ All uploads complete successfully
   - ✅ No database deadlocks
   - ✅ No WebSocket connection issues
   - ✅ Processing time remains reasonable

### **Expected Performance**:
- **Single upload**: ~30 seconds for 1000 records
- **10 concurrent uploads**: ~30-45 seconds each (slight overhead)
- **Database connections**: Should not exceed pool limit
- **WebSocket connections**: Should remain stable

---

## ✅ **Success Criteria**

The system passes multi-user testing if:

1. ✅ Each user only sees their own upload progress
2. ✅ WebSocket notifications are properly isolated
3. ✅ Upload history is filtered by user
4. ✅ Reports are generated for each upload
5. ✅ No cross-contamination of data
6. ✅ Concurrent uploads don't interfere with each other
7. ✅ Database maintains data integrity
8. ✅ Performance remains acceptable under load

---

## 🎯 **Conclusion**

The system is **designed for multi-user concurrent uploads** with:
- ✅ User tracking (`uploaded_by_user_id`)
- ✅ File isolation (`file_id`)
- ✅ WebSocket room-based notifications
- ✅ User-filtered upload history
- ✅ Independent report generation

**The architecture supports multiple users uploading simultaneously without interference!**

