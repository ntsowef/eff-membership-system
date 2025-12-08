# Bulk Upload System Configuration Guide

## Overview
This guide explains how to configure the bulk upload system for both development and production environments. The system consists of:
- **Frontend**: React components for file upload
- **Backend**: Node.js/Express endpoints for receiving files
- **Python Processor**: Watches directory and processes files

**Date**: 2025-11-21  
**Status**: ✅ **CONFIGURED**

---

## 🏗️ **System Architecture**

```
┌─────────────────┐
│   Frontend      │
│  (React App)    │
└────────┬────────┘
         │ Upload File
         ▼
┌─────────────────────────────────────┐
│   Backend (Node.js/Express)         │
│   - Receives file via multer        │
│   - Saves to _upload_file_directory │
│   - Records in uploaded_files table │
└────────┬────────────────────────────┘
         │ File saved
         ▼
┌─────────────────────────────────────┐
│   _upload_file_directory            │
│   (Repository Root)                 │
└────────┬────────────────────────────┘
         │ Watches directory
         ▼
┌─────────────────────────────────────┐
│   Python Processor                  │
│   - Detects new files               │
│   - Processes with ingestion script │
│   - Sends WebSocket updates         │
│   - Updates database status         │
└─────────────────────────────────────┘
```

---

## 📂 **Upload Directory Structure**

### **Development** (Windows)
```
C:\Development\NewProj\Membership-newV2\
└── _upload_file_directory\
    ├── upload-1732156789-123456789.xlsx
    ├── renewal-upload-1732156790-987654321.xlsx
    └── member-application_1732156791.xlsx
```

### **Production** (Linux)
```
/var/www/eff-membership-system/
└── _upload_file_directory/
    ├── upload-1732156789-123456789.xlsx
    ├── renewal-upload-1732156790-987654321.xlsx
    └── member-application_1732156791.xlsx
```

---

## ⚙️ **Configuration Files**

### **1. Backend .env** (Development)
**Location**: `backend/.env`

```env
# File Upload Configuration
UPLOAD_DIR=_upload_file_directory

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=eff_admin
DB_PASSWORD=Frames!123
DB_NAME=eff_membership_database

# WebSocket Configuration
WEBSOCKET_URL=http://localhost:5000
```

### **2. Production .env** (Linux Server)
**Location**: `/var/www/eff-membership-system/.env`

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=eff_admin
DB_PASSWORD=Frames!123
DB_NAME=eff_membership_database

# WebSocket Configuration
WEBSOCKET_URL=http://localhost:5000

# Upload Directory (relative to repository root)
UPLOAD_DIR=_upload_file_directory

# Processing Interval (seconds)
PROCESSING_INTERVAL=10

# IEC Verification
IEC_VERIFICATION_ENABLED=true

# Optional: Logging
LOG_LEVEL=INFO
LOG_FILE=/var/www/eff-membership-system/backend/python/bulk_upload_processor.log
```

---

## 🔧 **Backend Endpoints Configuration**

All three bulk upload endpoints now use the **same upload directory**:

### **1. Self Data Management Bulk Upload**
- **Endpoint**: `POST /api/v1/self-data-management/bulk-upload`
- **File**: `backend/src/routes/selfDataManagement.ts`
- **Upload Dir**: `_upload_file_directory` ✅
- **Frontend**: `frontend/src/pages/selfDataManagement/BulkFileUploadTab.tsx`

### **2. Member Application Bulk Upload**
- **Endpoint**: `POST /api/v1/member-application-bulk-upload/upload`
- **File**: `backend/src/routes/memberApplicationBulkUpload.ts`
- **Upload Dir**: `_upload_file_directory` ✅ **UPDATED**
- **Frontend**: `frontend/src/components/members/bulk-upload/BulkUploadTab.tsx`

### **3. Renewal Bulk Upload**
- **Endpoint**: `POST /api/v1/renewal-bulk-upload/upload`
- **File**: `backend/src/routes/renewalBulkUpload.ts`
- **Upload Dir**: `_upload_file_directory` ✅ **UPDATED**
- **Frontend**: `frontend/src/components/renewal/BulkUploadManager.tsx`

---

## 📝 **Code Changes Made**

### **1. backend/.env**
Added:
```env
# File Upload Configuration
UPLOAD_DIR=_upload_file_directory
```

### **2. backend/src/routes/memberApplicationBulkUpload.ts** (Lines 13-40)
**Before**:
```typescript
const uploadDir = path.join(__dirname, '../../uploads/member-applications');
```

**After**:
```typescript
const repoRoot = path.join(__dirname, '..', '..', '..');
const uploadDir = path.join(repoRoot, process.env.UPLOAD_DIR || '_upload_file_directory');
console.log('📂 [Member Application Bulk Upload] Upload directory:', uploadDir);
```

### **3. backend/src/routes/renewalBulkUpload.ts** (Lines 16-43)
**Before**:
```typescript
const uploadDir = path.join(__dirname, '../../uploads/bulk-renewals');
```

**After**:
```typescript
const repoRoot = path.join(__dirname, '..', '..', '..');
const uploadDir = path.join(repoRoot, process.env.UPLOAD_DIR || '_upload_file_directory');
console.log('📂 [Renewal Bulk Upload] Upload directory:', uploadDir);
```

---

## 🚀 **Production Deployment Steps**

### **Step 1: Create Production .env File**

On your production server:

```bash
cd /var/www/eff-membership-system
nano .env
```

Paste this configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=eff_admin
DB_PASSWORD=Frames!123
DB_NAME=eff_membership_database

# WebSocket Configuration
WEBSOCKET_URL=http://localhost:5000

# Upload Directory
UPLOAD_DIR=_upload_file_directory

# Processing Interval (seconds)
PROCESSING_INTERVAL=10

# IEC Verification
IEC_VERIFICATION_ENABLED=true

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/www/eff-membership-system/backend/python/bulk_upload_processor.log
```

Save and exit (Ctrl+O, Enter, Ctrl+X)

### **Step 2: Set Proper Permissions**

```bash
# Secure the .env file
chmod 600 /var/www/eff-membership-system/.env
chown root:root /var/www/eff-membership-system/.env

# Ensure upload directory exists and has proper permissions
mkdir -p /var/www/eff-membership-system/_upload_file_directory
chmod 755 /var/www/eff-membership-system/_upload_file_directory
chown www-data:www-data /var/www/eff-membership-system/_upload_file_directory
```

### **Step 3: Restart Backend**

```bash
cd /var/www/eff-membership-system/backend
pm2 restart eff-backend
pm2 logs eff-backend --lines 50
```

Look for these log messages:
```
📂 [Self Data Management] Upload directory: /var/www/eff-membership-system/_upload_file_directory
📂 [Member Application Bulk Upload] Upload directory: /var/www/eff-membership-system/_upload_file_directory
📂 [Renewal Bulk Upload] Upload directory: /var/www/eff-membership-system/_upload_file_directory
```

### **Step 4: Restart Python Processor**

```bash
cd /var/www/eff-membership-system/backend/python

# Stop current processor (if running)
pkill -f bulk_upload_processor.py

# Start processor
python3 bulk_upload_processor.py
```

You should see:
```
✓ Configuration loaded from .env file
 Configuration loaded:
   Database: eff_admin@localhost:5432/eff_membership_database
   WebSocket: http://localhost:5000
   Upload Dir: /var/www/eff-membership-system/_upload_file_directory
   Interval: 10s
   IEC Verification: Enabled
 Bulk Upload Processor started
 Watching directory: /var/www/eff-membership-system/_upload_file_directory
```

### **Step 5: Test File Upload**

1. **Login to frontend**: `https://effmemberportal.org`
2. **Navigate to**: Self Data Management → Bulk File Upload
3. **Upload a test Excel file**
4. **Monitor logs**:
   ```bash
   # Backend logs
   pm2 logs eff-backend

   # Python processor logs
   tail -f /var/www/eff-membership-system/backend/python/bulk_upload_processor.log
   ```

---

## ✅ **Verification Checklist**

### **Backend Configuration**
- [ ] `.env` file exists in repository root
- [ ] `UPLOAD_DIR=_upload_file_directory` is set
- [ ] Backend shows correct upload directory in logs
- [ ] All three endpoints log the same directory

### **Python Processor Configuration**
- [ ] `.env` file exists in repository root
- [ ] Processor shows "Configuration loaded from .env file"
- [ ] Upload directory is absolute path (not relative)
- [ ] WebSocket URL is correct

### **Directory Permissions**
- [ ] `_upload_file_directory` exists
- [ ] Directory is writable by web server user (www-data)
- [ ] Directory is readable by Python processor

### **File Upload Test**
- [ ] Frontend can upload files
- [ ] Files appear in `_upload_file_directory`
- [ ] Python processor detects files
- [ ] Files are processed successfully
- [ ] WebSocket updates are received in frontend

---

## 🔍 **Troubleshooting**

### **Problem: Files not appearing in directory**

**Check**:
```bash
# Verify backend is using correct directory
pm2 logs eff-backend | grep "Upload directory"

# Check directory permissions
ls -la /var/www/eff-membership-system/_upload_file_directory

# Check disk space
df -h
```

**Solution**:
- Ensure directory has write permissions for www-data user
- Check if backend is running and not crashed

### **Problem: Python processor not detecting files**

**Check**:
```bash
# Verify processor is watching correct directory
ps aux | grep bulk_upload_processor

# Check processor logs
tail -f /var/www/eff-membership-system/backend/python/bulk_upload_processor.log

# Manually check for files
ls -la /var/www/eff-membership-system/_upload_file_directory
```

**Solution**:
- Restart Python processor
- Verify `.env` file has correct `UPLOAD_DIR`
- Check database connection

### **Problem: WebSocket not connecting**

**Check**:
```bash
# Verify backend is running on port 5000
netstat -tlnp | grep 5000

# Test WebSocket endpoint
curl http://localhost:5000/socket.io/
```

**Solution**:
- Ensure backend is running
- Check firewall rules
- Verify `WEBSOCKET_URL` in `.env`

---

## 📊 **File Flow Diagram**

```
User uploads file via Frontend
         ↓
Frontend sends POST request to Backend
         ↓
Backend (multer) saves file to _upload_file_directory
         ↓
Backend records file in uploaded_files table (status: 'pending')
         ↓
Python Processor detects new file (polls every 10s)
         ↓
Python Processor processes file with FlexibleMembershipIngestion
         ↓
Python Processor sends WebSocket updates to Frontend
         ↓
Python Processor updates uploaded_files table (status: 'completed' or 'failed')
         ↓
Frontend displays processing results
```

---

## 🎯 **Key Benefits**

1. **Single Upload Directory**: All bulk uploads go to one location
2. **Centralized Processing**: One Python processor handles all file types
3. **Real-time Updates**: WebSocket provides live progress updates
4. **Environment-based**: Configuration via .env for easy deployment
5. **Consistent Behavior**: Same upload flow across all bulk upload features

---

## 📝 **Summary**

✅ **All three bulk upload endpoints now use `_upload_file_directory`**
✅ **Python processor watches this single directory**
✅ **Configuration via environment variables**
✅ **Works in both development and production**
✅ **Real-time WebSocket updates**


