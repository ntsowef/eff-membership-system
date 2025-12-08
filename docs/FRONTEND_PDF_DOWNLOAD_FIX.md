# Frontend PDF Download Fix

## Issue

The "Download Ward Attendance Register" buttons on both the Members page and Geographic Search page were still downloading Microsoft Word documents (.docx) instead of PDF files, even though the backend HTML-to-PDF implementation was complete.

## Root Cause

The frontend UI was offering "Word" format options instead of "PDF" format options:

1. **MembersListPage.tsx**: The export format dropdown only offered "Both", "Excel", and "Word" - no PDF option
2. **GeographicSearchPage.tsx**: The menu item said "Download Word Attendance Register" instead of "Download PDF Attendance Register"
3. **Backend views route**: Did not have PDF format support (only Excel and Word)

## Changes Made

### 1. Frontend - MembersListPage.tsx

**File**: `frontend/src/pages/members/MembersListPage.tsx`

**Changes**:
- Line 145: Changed default export format from `'both'` to `'pdf'`
- Line 1242: Updated type definition to include `'pdf'` format
- Lines 1245-1248: Updated dropdown menu options:
  - **Added**: "PDF Attendance Register (Recommended)" as first option
  - Reordered: PDF → Excel → Word → Both

**Before**:
```typescript
const [exportFormat, setExportFormat] = useState<'excel' | 'word' | 'both'>('both');

<MenuItem value="both">Both (Excel + Word in ZIP)</MenuItem>
<MenuItem value="excel">Excel Only (.xlsx)</MenuItem>
<MenuItem value="word">Word Only (.docx)</MenuItem>
```

**After**:
```typescript
const [exportFormat, setExportFormat] = useState<'excel' | 'word' | 'pdf' | 'both'>('pdf');

<MenuItem value="pdf">PDF Attendance Register (Recommended)</MenuItem>
<MenuItem value="excel">Excel Only (.xlsx)</MenuItem>
<MenuItem value="word">Word Only (.docx)</MenuItem>
<MenuItem value="both">Both (Excel + Word in ZIP)</MenuItem>
```

### 2. Frontend - GeographicSearchPage.tsx

**File**: `frontend/src/pages/search/GeographicSearchPage.tsx`

**Changes**:
- Line 170: Updated `handleDownload` function signature to include `'pdf'` format
- Lines 197-229: Updated filename generation logic to handle PDF format
- Lines 545-553: Changed menu item from "Word" to "PDF"

**Before**:
```typescript
const handleDownload = async (format: 'excel' | 'word' | 'both') => {
  // ...
  filename = `Ward_${filters.ward_code}_Attendance_Register_${timestamp}.docx`;
}

<MenuItem onClick={() => handleDownload('word')} disabled={!filters.ward_code}>
  <ListItemText
    primary="Download Word Attendance Register"
    secondary={!filters.ward_code ? 'Ward required' : 'Active members only'}
  />
</MenuItem>
```

**After**:
```typescript
const handleDownload = async (format: 'excel' | 'word' | 'pdf' | 'both') => {
  // ...
  filename = format === 'pdf'
    ? `Ward_${filters.ward_code}_Attendance_Register_${timestamp}.pdf`
    : `Ward_${filters.ward_code}_Attendance_Register_${timestamp}.docx`;
}

<MenuItem onClick={() => handleDownload('pdf')} disabled={!filters.ward_code}>
  <ListItemText
    primary="Download PDF Attendance Register (Recommended)"
    secondary={!filters.ward_code ? 'Ward required' : 'Active members only - Sent via email'}
  />
</MenuItem>
```

### 3. Frontend - API Service

**File**: `frontend/src/services/api.ts`

**Changes**:
- Line 288: Updated `exportMembersWithVotingDistricts` function signature
- Changed default format from `'both'` to `'pdf'`

**Before**:
```typescript
exportMembersWithVotingDistricts: async (filters: any, format: 'excel' | 'word' | 'both' = 'both'): Promise<{...}>
```

**After**:
```typescript
exportMembersWithVotingDistricts: async (filters: any, format: 'excel' | 'word' | 'pdf' | 'both' = 'pdf'): Promise<{...}>
```

### 4. Backend - Views Route

**File**: `backend/src/routes/views.ts`

**Changes**:
- Lines 356-403: Added new PDF generation section before Word generation
- Uses `HtmlPdfService.generateWardAttendanceRegisterPDF()` for direct HTML-to-PDF conversion
- Triggers background email with `processAttendanceRegisterEmailFromHtml()`
- Sets response headers for email status

**New Code**:
```typescript
// Generate PDF file if requested using HTML-to-PDF conversion
if (format === 'pdf') {
  if (!wardInfo) {
    throw new NotFoundError('Ward information is required for PDF attendance register.');
  }

  const pdfFilename = `${wordBaseFilename}.pdf`;
  const pdfFilePath = path.join(tempDir, pdfFilename);

  // Filter Active & Registered members
  const attendanceMembers = members.filter((member: any) => {
    const isActive = member.membership_status_id === 1;
    const isRegistered = member.voter_status_id === 1;
    return isActive && isRegistered;
  });

  // Generate PDF using HtmlPdfService
  const { HtmlPdfService } = require('../services/htmlPdfService');
  const pdfBuffer = await HtmlPdfService.generateWardAttendanceRegisterPDF(wardInfo, attendanceMembers);
  fs.writeFileSync(pdfFilePath, pdfBuffer);

  // Trigger background email
  AttendanceRegisterEmailService.processAttendanceRegisterEmailFromHtml({
    userEmail: req.user.email,
    userName: req.user.name || req.user.email,
    wardInfo: wardInfo,
    members: attendanceMembers
  });
}
```

## Result

✅ **Members Page** (`http://localhost:3000/admin/members`):
- Default format is now "PDF Attendance Register (Recommended)"
- Clicking "Download Ward [X] Attendance Register" generates and downloads a PDF
- PDF is also emailed to the logged-in user

✅ **Geographic Search Page** (`http://localhost:3000/admin/search/geographic`):
- Menu item now says "Download PDF Attendance Register (Recommended)"
- Clicking the button generates and downloads a PDF
- PDF is also emailed to the logged-in user

✅ **Backend**:
- Both `/api/v1/members/ward/:wardCode/audit-export?format=pdf` and `/api/v1/views/members-with-voting-districts/export?format=pdf` now generate PDFs using HTML-to-PDF conversion
- Email delivery works for both endpoints

## Testing

### Quick Test

1. **Login** to the system
2. **Navigate** to Members page: `http://localhost:3000/admin/members`
3. **Filter** by a ward
4. **Click** "Download Ward [X] Attendance Register"
5. **Verify**:
   - Dialog shows "PDF Attendance Register (Recommended)" as default
   - Clicking "Download" generates a PDF file (not Word)
   - PDF downloads immediately
   - Email arrives with PDF attachment

### Alternative Test (Geographic Search)

1. **Navigate** to Geographic Search: `http://localhost:3000/admin/search/geographic`
2. **Search** for a ward
3. **Click** "Download Attendance Register" button
4. **Select** "Download PDF Attendance Register (Recommended)"
5. **Verify** PDF downloads and email arrives

## Files Modified

- `frontend/src/pages/members/MembersListPage.tsx`
- `frontend/src/pages/search/GeographicSearchPage.tsx`
- `frontend/src/services/api.ts`
- `backend/src/routes/views.ts`

## Related Documentation

- Full implementation: `docs/HTML_PDF_ATTENDANCE_REGISTER.md`
- Quick start guide: `docs/QUICK_START_PDF_GENERATION.md`
- Test script: `test/test-html-pdf-generation.js`

