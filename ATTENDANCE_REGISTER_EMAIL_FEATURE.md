# Ward Attendance Register PDF Email Feature

## Overview
This document describes the implementation of the automatic PDF email feature for Ward Attendance Register downloads in the EFF Membership System.

## Feature Description
When users download a Ward Attendance Register in Word format or Both formats (Word + Excel), the system now automatically:
1. Downloads the requested file(s) to the user's browser (existing behavior)
2. In the background:
   - Converts the Word document to PDF format
   - Saves the PDF temporarily (24-hour retention)
   - Emails the PDF to the logged-in user's email address

## Implementation Details

### Backend Changes

#### 1. New Service: `AttendanceRegisterEmailService`
**File:** `backend/src/services/attendanceRegisterEmailService.ts`

**Key Features:**
- Converts Word buffer to PDF using `WordToPdfService`
- Saves PDF temporarily in `uploads/temp` directory
- Sends professional HTML email with PDF attachment
- Schedules automatic cleanup after 24 hours
- Fire-and-forget background process (non-blocking)
- Comprehensive error handling and logging

**Email Template:**
- Subject: `Ward {wardNumber} Attendance Register - {municipalityName}`
- Professional HTML email with EFF branding
- Includes ward information table (province, district, municipality, member count)
- Plain text fallback for email clients that don't support HTML

#### 2. Updated Routes

**File:** `backend/src/routes/views.ts`
- Endpoint: `GET /api/v1/views/members-with-voting-districts/export`
- Added import for `AttendanceRegisterEmailService`
- Triggers background email process after Word document generation
- Adds `X-Email-Sent-To` response header to inform frontend
- Non-blocking: Email process runs in background, doesn't affect download response

**File:** `backend/src/routes/members.ts`
- Endpoint: `GET /api/v1/members/ward/:wardCode/audit-export`
- Added import for `AttendanceRegisterEmailService`
- Triggers background email process after Word document generation
- Adds `X-Email-Sent-To` response header to inform frontend
- Non-blocking: Email process runs in background, doesn't affect download response

### Frontend Changes

#### 1. Updated API Service
**File:** `frontend/src/services/api.ts`

**Changes:**
- Modified `exportMembersWithVotingDistricts` to return both blob and email header
- Return type changed from `Promise<Blob>` to `Promise<{ blob: Blob; emailSentTo?: string }>`
- Extracts `X-Email-Sent-To` header from response

#### 2. Updated Geographic Search Page
**File:** `frontend/src/pages/search/GeographicSearchPage.tsx`

**Changes:**
- Added `useNotification` hook import
- Updated `handleDownload` function to:
  - Extract email address from API response
  - Show success toast notification when email will be sent
  - Message: "Attendance register PDF will be emailed to {email}"

## User Experience

### Download Flow
1. User navigates to `http://localhost:3000/admin/search/geographic`
2. User selects Ward tab or Subregion tab
3. User performs a search and gets results
4. User clicks "Download Attendance Register" menu
5. User selects "Download Word Attendance Register" or "Download Both"

### What Happens
1. **Immediate:** File downloads to browser (Word or ZIP with Word + Excel)
2. **Background:** System converts Word to PDF and emails it
3. **Notification:** Green success toast appears: "Attendance register PDF will be emailed to user@example.com"
4. **Email:** User receives professional email with PDF attachment within seconds

### Email Content Example
```
Subject: Ward 123 Attendance Register - City of Johannesburg

Dear John Doe,

Please find attached the Ward Attendance Register for Ward 123 in City of Johannesburg. 
This document contains 150 active registered members.

Ward Information:
- Ward Number: 123
- Ward Name: Ward 123
- Municipality: City of Johannesburg
- District: Johannesburg Metro
- Province: Gauteng
- Total Members: 150

Note: This attendance register includes only Active members who are Registered Voters.

Aluta Continua!
EFF Membership System
```

## Technical Specifications

### PDF Storage
- **Location:** `uploads/temp/` directory
- **Naming:** `ATTENDANCE_REGISTER_WARD_{wardNumber}_{municipalityName}_{timestamp}.pdf`
- **Retention:** 24 hours (automatic cleanup via setTimeout)
- **Cleanup:** Scheduled deletion after 24 hours, immediate deletion on error

### Email Configuration
Uses existing `EmailService` with SMTP configuration from environment variables:
- `SMTP_HOST` or `MAIL_HOST`
- `SMTP_PORT` or `MAIL_PORT`
- `SMTP_USER` or `MAIL_USERNAME`
- `SMTP_PASS` or `MAIL_PASSWORD`
- `SMTP_FROM` or `MAIL_FROM_ADDRESS`

### Error Handling
- Background process errors are logged but don't affect user download
- PDF conversion failures are caught and logged
- Email sending failures are caught and logged
- Temporary files are cleaned up even on error
- User always gets their download regardless of email status

## Testing Checklist

### Backend Testing
- [ ] Test Word download triggers email process
- [ ] Test Both download triggers email process
- [ ] Test Excel download does NOT trigger email (correct behavior)
- [ ] Verify PDF is created in temp directory
- [ ] Verify email is sent with correct content
- [ ] Verify PDF attachment is valid and opens correctly
- [ ] Test with missing user email (should log warning, not crash)
- [ ] Test PDF conversion failure (should log error, not crash)
- [ ] Test email sending failure (should log error, not crash)
- [ ] Verify 24-hour cleanup works (or test with shorter timeout)

### Frontend Testing
- [ ] Test Word download shows success notification
- [ ] Test Both download shows success notification
- [ ] Test Excel download does NOT show notification (correct behavior)
- [ ] Verify notification displays correct email address
- [ ] Test notification auto-dismisses after 5 seconds
- [ ] Test download still works if backend doesn't send email header

### Integration Testing
- [ ] Test end-to-end flow: Search → Download → Email received
- [ ] Test with different ward codes
- [ ] Test with different user accounts
- [ ] Test concurrent downloads from multiple users
- [ ] Verify email content matches ward information
- [ ] Verify PDF content matches Word document

## Dependencies
- `docx-pdf`: Word to PDF conversion (already installed)
- `nodemailer`: Email sending (already installed)
- Existing services: `WordDocumentService`, `WordToPdfService`, `EmailService`

## Configuration Required
Ensure SMTP email settings are configured in `.env` file:
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@eff.org.za
```

## Future Enhancements
1. Add database tracking of sent emails
2. Add retry mechanism for failed emails
3. Add user preference to opt-out of email notifications
4. Add email delivery status tracking
5. Add scheduled cleanup job for old PDFs (instead of setTimeout)
6. Add PDF storage in database or cloud storage for longer retention
7. Add email queue system for better reliability

## Notes
- Email process is fire-and-forget (non-blocking)
- User download is never delayed by email processing
- PDF cleanup is automatic after 24 hours
- Only Active & Registered members are included in attendance register
- Email is only sent for Word and Both formats, not Excel

