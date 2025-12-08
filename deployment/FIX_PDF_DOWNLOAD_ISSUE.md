# Fix: PDF Download Failing with Geographic Filters

## 🚨 Problem Summary

**Issue:** PDF downloads fail with a 500 error when using geographic filters (province, municipality, ward) in production.

**Error Symptoms:**
- Frontend shows: `Failed to load resource: the server responded with a status of 500 ()`
- Frontend console: `Download failed: Pn`
- Backend PM2 logs show Puppeteer/Chromium errors (already fixed separately)
- PDF downloads work for some endpoints but fail for geographic search exports

---

## 🔍 Root Cause Analysis

### Primary Issue: Incorrect Content-Type Header

**Location:** `backend/src/routes/views.ts` (Line 495-512)

**Problem:** When downloading a PDF file from the geographic search export endpoint, the server was setting the wrong `Content-Type` header:

```typescript
// BEFORE (WRONG):
const contentType = file.type === 'excel'
  ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
```

This code only checked for `excel` format and defaulted to Word format for everything else, **including PDF files**. This caused:
1. Browser receives PDF data with Word document Content-Type
2. Browser tries to parse PDF as Word document
3. Download fails with 500 error

### Secondary Issue: Puppeteer/Chromium Dependencies

**Location:** Server system libraries

**Problem:** Missing system libraries required by Chromium for PDF generation (already addressed in separate fix).

---

## ✅ Solution Applied

### Fix 1: Correct Content-Type Header (APPLIED)

**File:** `backend/src/routes/views.ts`

**Changes:**
```typescript
// AFTER (CORRECT):
let contentType: string;
if (file.type === 'excel') {
  contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
} else if (file.type === 'pdf') {
  contentType = 'application/pdf';  // ✅ Now correctly handles PDF
} else {
  contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}
```

**Also updated:** Email notification headers to include PDF format:
```typescript
// BEFORE: Only Word format triggered email notification
if (file.type === 'word' && req.user?.email) {
  res.setHeader('X-Email-Sent-To', req.user.email);
}

// AFTER: Both Word and PDF formats trigger email notification
if ((file.type === 'word' || file.type === 'pdf') && req.user?.email) {
  res.setHeader('X-Email-Sent-To', req.user.email);
}
```

### Fix 2: Install Chromium Dependencies (SEPARATE)

See: `deployment/FIX_PDF_GENERATION_ERROR.md`

---

## 🧪 Testing the Fix

### Test 1: Geographic Search PDF Download

1. **Login** to the application
2. **Navigate** to Members → Geographic Search
3. **Select filters:**
   - Province: Any province
   - Municipality: Any municipality
   - Ward: Any ward with members
4. **Click** "Download Attendance Register"
5. **Select** "Download PDF Attendance Register"
6. **Verify:**
   - ✅ PDF downloads successfully
   - ✅ File opens correctly in PDF viewer
   - ✅ No 500 errors in console
   - ✅ Email notification shows (if user has email)

### Test 2: Ward Audit Export

1. **Navigate** to Members → Ward Audit
2. **Select** a ward with members
3. **Click** "Export PDF"
4. **Verify:**
   - ✅ PDF downloads successfully
   - ✅ File contains correct ward data

### Test 3: Check Backend Logs

```bash
pm2 logs eff-api --lines 50
```

**Success indicators:**
- `✅ PDF Attendance Register created with X members`
- `📧 Background HTML-based PDF email process initiated`
- No errors about Content-Type or file format

---

## 📊 Affected Endpoints

### Fixed Endpoint
- ✅ `GET /api/v1/views/members-with-voting-districts/export?format=pdf`
  - Used by: Geographic Search page
  - Filters: province_code, district_code, municipal_code, ward_code, voting_district_code

### Already Working Endpoints (No Changes Needed)
- ✅ `GET /api/v1/members/ward/:wardCode/audit-export?format=pdf`
- ✅ `GET /api/v1/statistics/demographics/report/pdf`
- ✅ `GET /api/v1/ward-audit/export?format=pdf`
- ✅ `GET /api/v1/voting-districts/export/pdf`

---

## 🔄 Deployment Steps

### Step 1: Pull Latest Code

```bash
cd /var/www/eff-membership-system
git pull origin main
```

### Step 2: Rebuild Backend

```bash
cd backend
npm run build
```

### Step 3: Restart Backend

```bash
pm2 restart eff-api
```

### Step 4: Verify Fix

```bash
pm2 logs eff-api --lines 20
```

---

## 📝 Technical Details

### Content-Type Headers by Format

| Format | Content-Type | File Extension |
|--------|-------------|----------------|
| Excel  | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` |
| Word   | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx` |
| **PDF**    | **`application/pdf`** | **`.pdf`** |
| ZIP    | `application/zip` | `.zip` |

### File Generation Flow

1. **Frontend** calls `/api/v1/views/members-with-voting-districts/export?format=pdf&ward_code=XXX`
2. **Backend** fetches members with geographic filters
3. **HtmlPdfService** generates PDF using Puppeteer/Chromium
4. **Backend** saves PDF to temp directory
5. **Backend** sets correct Content-Type header (`application/pdf`)
6. **Backend** sends file using `res.sendFile()`
7. **Frontend** receives PDF blob and triggers download
8. **Backend** cleans up temp file after download

---

## ✅ Success Checklist

- [x] Fixed Content-Type header for PDF format
- [x] Updated email notification headers for PDF
- [x] Tested geographic search PDF download
- [x] Verified backend logs show no errors
- [x] Confirmed PDF opens correctly in viewer
- [ ] Deployed to production
- [ ] Verified in production environment

---

**Created:** 2025-11-23  
**Issue:** PDF Download 500 Error with Geographic Filters  
**Cause:** Incorrect Content-Type header (Word instead of PDF)  
**Status:** Fixed ✅

